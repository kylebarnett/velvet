import { logger } from "@/lib/logger";
import type {
  ParsedSheet,
  ParsedWorkbook,
  AIAnalysisResult,
  DetectedValue,
  CellValue,
} from "./types";
import { getSampleData } from "./parser";
import { normalizePeriod } from "@/lib/utils/period-normalization";

const GEMINI_BASE = "https://generativelanguage.googleapis.com";
const OPENAI_BASE = "https://api.openai.com/v1";

/** System prompt for Excel structure analysis */
export const EXCEL_STRUCTURE_ANALYSIS_PROMPT = `You are a financial spreadsheet analysis specialist. Your task is to analyze the structure of an Excel spreadsheet and map its data layout so values can be extracted programmatically.

You will receive a JSON array of sheets, each with a "name" and "rows" (first 50 rows as arrays of cell values).

Analyze the structure and return a JSON object with:

1. "layout": One of:
   - "metrics_as_rows": Metrics are listed vertically (row labels), periods are column headers
   - "metrics_as_columns": Metrics are column headers, each row is a different period
   - "single_metric_per_sheet": Each sheet contains a single metric across periods

2. "companies_detected": Array of companies found. Look for:
   - Sheet names that are company names (not "Summary", "Overview", "Sheet1", etc.)
   - A "Company" or "Portfolio Company" column
   - Company name labels in headers or section dividers
   Each entry: { "name": string, "source": "sheet_name"|"column_value"|"header_label", "sheet_name": string }

3. "metric_mappings": Array of detected metrics. Canonicalize names:
   - "Rev" / "Total Revenue" / "Net Sales" / "Top Line" → "Revenue"
   - "MRR" / "Monthly Recurring Revenue" → "MRR"
   - "ARR" / "Annual Recurring Revenue" → "ARR"
   - "HC" / "Headcount" / "FTEs" / "Employees" / "Team Size" → "Headcount"
   - "Burn" / "Monthly Burn" / "Cash Burn" / "Net Burn" → "Burn Rate"
   - "Runway" / "Cash Runway" → "Runway"
   - "EBITDA" stays as "EBITDA"
   - "Gross Margin" / "GM" / "Gross Margin %" → "Gross Margin"
   - "Net Income" / "Net Profit" / "Bottom Line" → "Net Income"
   - "Cash" / "Cash Balance" / "Cash on Hand" → "Cash Balance"
   - "CAC" / "Customer Acquisition Cost" → "CAC"
   - "LTV" / "Customer Lifetime Value" / "CLTV" → "LTV"
   - "Churn" / "Churn Rate" / "Monthly Churn" → "Churn Rate"
   - "NRR" / "Net Revenue Retention" / "NDR" → "NRR"
   - "GRR" / "Gross Revenue Retention" → "GRR"
   - Keep other names as-is but clean up
   Each entry: { "original_label": string, "canonical_name": string, "row_index": number|null, "col_index": number|null }

4. "period_mappings": Array of detected time periods. Parse headers like:
   - "Jan-24", "Jan 2024", "January 2024" → monthly
   - "Q1 2024", "Q1'24", "1Q24" → quarterly
   - "2023", "FY2023", "FY 2023" → annual
   - "H1 2024", "1H 2024" → treat as two quarters
   Each entry: { "original_label": string, "period_type": "monthly"|"quarterly"|"annual", "period_start": "YYYY-MM-DD", "period_end": "YYYY-MM-DD", "row_index": number|null, "col_index": number|null }

5. "scale_multiplier": Number to multiply all values by. Detect from:
   - "(in thousands)", "(000s)", "($K)" → 1000
   - "(in millions)", "($M)", "(MM)" → 1000000
   - "(in billions)", "($B)" → 1000000000
   - Default: 1

6. "values": Array of all detected metric values from the sample. For each:
   { "metric_name": string (canonical), "raw_value": string, "numeric_value": number|null, "unit": string|null, "period_type": string, "period_start": "YYYY-MM-DD", "period_end": "YYYY-MM-DD", "company_name": string|null, "sheet_name": string, "cell_reference": string (e.g. "B3"), "confidence": 0.0-1.0 }

Rules:
- Skip totals, subtotals, averages, projections, forecasts, budgets
- Skip blank/null cells
- For currency: detect from $ signs, "USD", column headers. Unit = "USD"
- For percentages: detect from % signs, "percent", names ending in "Rate"/"Margin". Store as raw number (85 for 85%). Unit = "percent"
- For counts (headcount, customers): Unit = null
- Cell references use Excel notation: column letter + row number (A1, B2, etc.)
- Confidence: 0.95+ for clearly labeled values, 0.7-0.95 for reasonable inferences, <0.7 for uncertain
- Apply scale_multiplier to numeric_value (but keep raw_value as the cell text)

Respond with valid JSON only. No markdown, no code fences.`;

/** Convert column index (0-based) to Excel letter(s) */
function colToLetter(col: number): string {
  let result = "";
  let c = col;
  while (c >= 0) {
    result = String.fromCharCode((c % 26) + 65) + result;
    c = Math.floor(c / 26) - 1;
  }
  return result;
}

/**
 * Build the user prompt with spreadsheet sample data
 */
function buildAnalysisPrompt(samples: ParsedSheet[]): string {
  const sheetsData = samples.map((s) => ({
    name: s.name,
    rows: s.rows,
  }));

  return `Analyze this spreadsheet data and extract its structure:\n\n${JSON.stringify(sheetsData)}`;
}

/**
 * Call Gemini API for structure analysis
 */
async function callGemini(prompt: string): Promise<{ text: string; model: string }> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not configured");

  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const url = `${GEMINI_BASE}/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const MAX_RETRIES = 3;
  let response: Response | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: EXCEL_STRUCTURE_ANALYSIS_PROMPT }] },
        generationConfig: {
          temperature: 0.1,
          topP: 0.95,
          responseMimeType: "application/json",
        },
      }),
    });

    if (response.status !== 429 || attempt === MAX_RETRIES) break;
    const delay = Math.min(2000 * Math.pow(2, attempt), 30000);
    logger.warn(`[excel-ai] Rate limited (429), retrying in ${delay}ms`);
    await new Promise((r) => setTimeout(r, delay));
  }

  if (!response!.ok) {
    const errText = await response!.text().catch(() => "Unknown error");
    throw new Error(`Gemini API error (${response!.status}): ${errText}`);
  }

  const data = await response!.json();
  let text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Strip markdown code fences if present
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  return { text, model };
}

/**
 * Call OpenAI API for structure analysis
 */
async function callOpenAI(prompt: string): Promise<{ text: string; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const model = "gpt-4o-mini";
  const response = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: EXCEL_STRUCTURE_ANALYSIS_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    throw new Error(`OpenAI API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content ?? "";

  return { text, model };
}

/** Parse the AI response JSON safely */
function parseAIResponse(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text);
  } catch {
    logger.error("[excel-ai] Failed to parse AI response (first 500 chars):", text.slice(0, 500));
    throw new Error("AI returned an invalid response. Please try again.");
  }
}

/**
 * Pass 2: Use AI-detected structure to programmatically extract ALL values
 * from the full dataset (not just the sample).
 */
function extractAllValues(
  workbook: ParsedWorkbook,
  aiResult: Record<string, unknown>,
): DetectedValue[] {
  const values: DetectedValue[] = [];
  const scaleMultiplier = Number(aiResult.scale_multiplier) || 1;
  const layout = String(aiResult.layout || "metrics_as_rows");

  // Build lookup maps from AI mappings
  const metricsByRow = new Map<string, string>(); // "sheetName:rowIdx" → canonicalName
  const metricsByCol = new Map<string, string>(); // "sheetName:colIdx" → canonicalName
  const periodsByCol = new Map<string, { type: string; start: string; end: string }>(); // "sheetName:colIdx" → period
  const periodsByRow = new Map<string, { type: string; start: string; end: string }>(); // "sheetName:rowIdx" → period

  const metricMappings = (aiResult.metric_mappings as Array<Record<string, unknown>>) ?? [];
  const periodMappings = (aiResult.period_mappings as Array<Record<string, unknown>>) ?? [];

  for (const m of metricMappings) {
    const canonical = String(m.canonical_name ?? "");
    if (!canonical) continue;
    if (m.row_index != null) {
      // Apply to all sheets unless sheet-specific
      for (const sheet of workbook.sheets) {
        metricsByRow.set(`${sheet.name}:${m.row_index}`, canonical);
      }
    }
    if (m.col_index != null) {
      for (const sheet of workbook.sheets) {
        metricsByCol.set(`${sheet.name}:${m.col_index}`, canonical);
      }
    }
  }

  for (const p of periodMappings) {
    const periodType = String(p.period_type ?? "quarterly");
    const periodStart = String(p.period_start ?? "");
    const periodEnd = String(p.period_end ?? "");
    if (!periodStart) continue;

    const periodInfo = { type: periodType, start: periodStart, end: periodEnd };
    if (p.col_index != null) {
      for (const sheet of workbook.sheets) {
        periodsByCol.set(`${sheet.name}:${p.col_index}`, periodInfo);
      }
    }
    if (p.row_index != null) {
      for (const sheet of workbook.sheets) {
        periodsByRow.set(`${sheet.name}:${p.row_index}`, periodInfo);
      }
    }
  }

  // Build company mapping from AI detection
  const companiesDetected = (aiResult.companies_detected as Array<Record<string, unknown>>) ?? [];
  const sheetToCompany = new Map<string, string>();
  for (const c of companiesDetected) {
    if (c.source === "sheet_name" && c.sheet_name) {
      sheetToCompany.set(String(c.sheet_name), String(c.name));
    }
  }

  // Extract values based on layout
  for (const sheet of workbook.sheets) {
    const companyName = sheetToCompany.get(sheet.name) ?? null;

    for (let rowIdx = 0; rowIdx < sheet.rows.length; rowIdx++) {
      const row = sheet.rows[rowIdx];
      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        const cell = row[colIdx];
        if (cell === null || cell === undefined || cell === "") continue;

        // Determine if this cell is a value (has both metric and period context)
        let metricName: string | undefined;
        let period: { type: string; start: string; end: string } | undefined;

        if (layout === "metrics_as_rows") {
          metricName = metricsByRow.get(`${sheet.name}:${rowIdx}`);
          period = periodsByCol.get(`${sheet.name}:${colIdx}`);
        } else if (layout === "metrics_as_columns") {
          metricName = metricsByCol.get(`${sheet.name}:${colIdx}`);
          period = periodsByRow.get(`${sheet.name}:${rowIdx}`);
        } else if (layout === "single_metric_per_sheet") {
          // Sheet name may encode the metric
          metricName = metricsByRow.get(`${sheet.name}:${rowIdx}`) ??
            metricsByCol.get(`${sheet.name}:${colIdx}`);
          period = periodsByCol.get(`${sheet.name}:${colIdx}`) ??
            periodsByRow.get(`${sheet.name}:${rowIdx}`);
        }

        if (!metricName || !period) continue;

        // Parse numeric value
        const rawValue = String(cell);
        let numericValue: number | null = null;

        if (typeof cell === "number") {
          numericValue = cell * scaleMultiplier;
        } else if (typeof cell === "string") {
          // Strip currency, commas, parens (negative)
          const cleaned = cell.replace(/[$,\s%]/g, "").replace(/^\((.+)\)$/, "-$1");
          const parsed = parseFloat(cleaned);
          if (!isNaN(parsed)) {
            numericValue = parsed * scaleMultiplier;
          }
        }

        if (numericValue === null) continue;

        // Normalize the period
        const normalized = normalizePeriod(period.start, period.end, period.type);
        if (!normalized) continue;

        // Detect unit
        let unit: string | null = null;
        if (typeof cell === "string") {
          if (cell.includes("$") || cell.includes("USD")) unit = "USD";
          else if (cell.includes("%")) unit = "percent";
        }

        const cellRef = `${colToLetter(colIdx)}${rowIdx + 1}`;

        values.push({
          metricName,
          rawValue,
          numericValue,
          unit,
          periodType: normalized.period_type as "monthly" | "quarterly" | "annual",
          periodStart: normalized.period_start,
          periodEnd: normalized.period_end,
          companyName: companyName,
          sheetName: sheet.name,
          cellReference: cellRef,
          confidence: 0.85, // Base confidence for programmatic extraction
        });
      }
    }
  }

  return values;
}

/**
 * Analyze a parsed workbook using AI to detect structure,
 * then programmatically extract all values.
 *
 * Two-pass approach:
 * - Pass 1: AI analyzes sample rows to detect layout
 * - Pass 2: Code uses the detected structure to extract from full dataset
 */
export async function analyzeWorkbook(
  workbook: ParsedWorkbook,
): Promise<AIAnalysisResult> {
  const samples = getSampleData(workbook);
  const prompt = buildAnalysisPrompt(samples);

  // Select AI provider (prefer Gemini, fallback to OpenAI)
  let result: { text: string; model: string };
  let provider: string;

  const geminiKey = process.env.GOOGLE_AI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey) {
    provider = "gemini";
    result = await callGemini(prompt);
  } else if (openaiKey) {
    provider = "openai";
    result = await callOpenAI(prompt);
  } else {
    throw new Error("No AI provider configured. Set GOOGLE_AI_API_KEY or OPENAI_API_KEY.");
  }

  const parsed = parseAIResponse(result.text);

  // Use AI-detected values from sample + programmatic extraction for full dataset
  const aiSampleValues = (parsed.values as Array<Record<string, unknown>>) ?? [];
  const programmaticValues = extractAllValues(workbook, parsed);

  // Merge: use programmatic values (covers full dataset), but inherit confidence
  // from AI sample values for matching cells
  const aiConfidenceMap = new Map<string, number>();
  for (const v of aiSampleValues) {
    const key = `${v.sheet_name}:${v.cell_reference}`;
    aiConfidenceMap.set(key, Number(v.confidence) || 0.85);
  }

  const mergedValues: DetectedValue[] = programmaticValues.map((v) => {
    const aiConf = aiConfidenceMap.get(`${v.sheetName}:${v.cellReference}`);
    return {
      ...v,
      confidence: aiConf ?? v.confidence,
    };
  });

  // If programmatic extraction yielded nothing, fall back to AI sample values
  const finalValues = mergedValues.length > 0 ? mergedValues : aiSampleValues.map((v): DetectedValue => {
    const normalized = normalizePeriod(
      String(v.period_start ?? ""),
      String(v.period_end ?? ""),
      String(v.period_type ?? "quarterly"),
    );
    return {
      metricName: String(v.metric_name ?? ""),
      rawValue: String(v.raw_value ?? ""),
      numericValue: v.numeric_value != null ? Number(v.numeric_value) : null,
      unit: v.unit ? String(v.unit) : null,
      periodType: (normalized?.period_type ?? "quarterly") as "monthly" | "quarterly" | "annual",
      periodStart: normalized?.period_start ?? String(v.period_start ?? ""),
      periodEnd: normalized?.period_end ?? String(v.period_end ?? ""),
      companyName: v.company_name ? String(v.company_name) : null,
      sheetName: String(v.sheet_name ?? ""),
      cellReference: String(v.cell_reference ?? ""),
      confidence: Number(v.confidence) || 0.85,
    };
  });

  const companiesDetected = ((parsed.companies_detected as Array<Record<string, unknown>>) ?? []).map((c) => ({
    name: String(c.name ?? ""),
    source: (c.source ?? "sheet_name") as "sheet_name" | "column_value" | "header_label",
    sheetName: c.sheet_name ? String(c.sheet_name) : undefined,
  }));

  const metricMappings = ((parsed.metric_mappings as Array<Record<string, unknown>>) ?? []).map((m) => ({
    originalLabel: String(m.original_label ?? ""),
    canonicalName: String(m.canonical_name ?? ""),
    rowIndex: m.row_index != null ? Number(m.row_index) : undefined,
    colIndex: m.col_index != null ? Number(m.col_index) : undefined,
  }));

  const periodMappings = ((parsed.period_mappings as Array<Record<string, unknown>>) ?? []).map((p) => ({
    originalLabel: String(p.original_label ?? ""),
    periodType: String(p.period_type ?? "quarterly") as "monthly" | "quarterly" | "annual",
    periodStart: String(p.period_start ?? ""),
    periodEnd: String(p.period_end ?? ""),
    rowIndex: p.row_index != null ? Number(p.row_index) : undefined,
    colIndex: p.col_index != null ? Number(p.col_index) : undefined,
  }));

  logger.info(
    `[excel-ai] Analysis complete: ${finalValues.length} values, ` +
    `${companiesDetected.length} companies, ${metricMappings.length} metrics, ` +
    `${periodMappings.length} periods (provider: ${provider}/${result.model})`,
  );

  return {
    layout: (parsed.layout ?? "metrics_as_rows") as AIAnalysisResult["layout"],
    companiesDetected,
    metricMappings,
    periodMappings,
    scaleMultiplier: Number(parsed.scale_multiplier) || 1,
    values: finalValues,
    provider,
    model: result.model,
  };
}
