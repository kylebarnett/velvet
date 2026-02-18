import { logger } from "@/lib/logger";
import type {
  ParsedSheet,
  ParsedWorkbook,
  AIAnalysisResult,
  DetectedValue,
  CellValue,
  TabularColumnMapping,
} from "./types";
import { getSampleData } from "./parser";
import { normalizePeriod } from "@/lib/utils/period-normalization";

const GEMINI_BASE = "https://generativelanguage.googleapis.com";
const OPENAI_BASE = "https://api.openai.com/v1";

/** System prompt for Excel structure analysis */
export const EXCEL_STRUCTURE_ANALYSIS_PROMPT = `You are a financial spreadsheet analysis specialist. Your task is to analyze the structure of an Excel spreadsheet and map its data layout so values can be extracted programmatically.

You will receive a JSON array of sheets, each with a "name" and "rows" (first rows as arrays of cell values).

Analyze the structure and return a JSON object with:

1. "layout": One of:
   - "metrics_as_rows": Metrics are listed vertically (row labels), periods are column headers
   - "metrics_as_columns": Metrics are column headers, each row is a different period
   - "single_metric_per_sheet": Each sheet contains a single metric across periods
   - "tabular": Flat/tabular layout where each row is a self-contained data point with company, metric, period, and value in separate columns (e.g. Company | Metric | Period | Value)

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

5. "tabular_columns": (REQUIRED when layout is "tabular") Object mapping column roles:
   { "company_col_index": number, "metric_col_index": number, "period_col_index": number, "value_col_index": number, "header_row_index": number }
   - company_col_index: 0-based column index containing company/portfolio company names
   - metric_col_index: 0-based column index containing metric names
   - period_col_index: 0-based column index containing period labels (Q1 2024, Jan-24, 2024, etc.)
   - value_col_index: 0-based column index containing the numeric values
   - header_row_index: 0-based row index of the header row (data rows start after this)

6. "scale_multiplier": Number to multiply all values by. Detect from:
   - "(in thousands)", "(000s)", "($K)" → 1000
   - "(in millions)", "($M)", "(MM)" → 1000000
   - "(in billions)", "($B)" → 1000000000
   - Default: 1

7. "values": Array of all detected metric values from the sample. For each:
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
 * Parse period text like "Q1 2024", "Jan-24", "2024", "January 2024" into period info.
 * Returns null if the text can't be parsed as a period.
 */
function parsePeriodText(text: string): { type: "monthly" | "quarterly" | "annual"; start: string; end: string } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Quarterly: "Q1 2024", "Q1'24", "1Q24", "Q1 '24", "Q1-2024"
  const quarterMatch = trimmed.match(/^(?:Q(\d)['\s-]*(\d{2,4})|(\d)Q['\s-]*(\d{2,4}))$/i);
  if (quarterMatch) {
    const q = parseInt(quarterMatch[1] ?? quarterMatch[3]);
    let yearStr = quarterMatch[2] ?? quarterMatch[4];
    if (yearStr.length === 2) yearStr = (parseInt(yearStr) >= 50 ? "19" : "20") + yearStr;
    const year = parseInt(yearStr);
    if (q >= 1 && q <= 4 && year >= 1900 && year <= 2100) {
      const startMonth = (q - 1) * 3;
      const startDate = `${year}-${String(startMonth + 1).padStart(2, "0")}-01`;
      const normalized = normalizePeriod(startDate, null, "quarterly");
      if (normalized) return { type: "quarterly", start: normalized.period_start, end: normalized.period_end };
    }
  }

  // Monthly: "Jan-24", "Jan 2024", "January 2024", "Jan-2024", "01/2024", "2024-01"
  const monthNames: Record<string, number> = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5,
    jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8,
    oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
  };

  // "Jan-24", "Jan 2024", "January 2024"
  const monthNameMatch = trimmed.match(/^([a-z]+)[.\s-]+(\d{2,4})$/i);
  if (monthNameMatch) {
    const monthNum = monthNames[monthNameMatch[1].toLowerCase()];
    if (monthNum !== undefined) {
      let yearStr = monthNameMatch[2];
      if (yearStr.length === 2) yearStr = (parseInt(yearStr) >= 50 ? "19" : "20") + yearStr;
      const year = parseInt(yearStr);
      if (year >= 1900 && year <= 2100) {
        const startDate = `${year}-${String(monthNum + 1).padStart(2, "0")}-01`;
        const normalized = normalizePeriod(startDate, null, "monthly");
        if (normalized) return { type: "monthly", start: normalized.period_start, end: normalized.period_end };
      }
    }
  }

  // "01/2024", "1/2024"
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const month = parseInt(slashMatch[1]);
    const year = parseInt(slashMatch[2]);
    if (month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const normalized = normalizePeriod(startDate, null, "monthly");
      if (normalized) return { type: "monthly", start: normalized.period_start, end: normalized.period_end };
    }
  }

  // "2024-01" (ISO month)
  const isoMonthMatch = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (isoMonthMatch) {
    const year = parseInt(isoMonthMatch[1]);
    const month = parseInt(isoMonthMatch[2]);
    if (month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const normalized = normalizePeriod(startDate, null, "monthly");
      if (normalized) return { type: "monthly", start: normalized.period_start, end: normalized.period_end };
    }
  }

  // Annual: "2024", "FY2024", "FY 2024", "FY'24"
  const annualMatch = trimmed.match(/^(?:FY['\s]?)?(\d{2,4})$/i);
  if (annualMatch) {
    let yearStr = annualMatch[1];
    if (yearStr.length === 2) yearStr = (parseInt(yearStr) >= 50 ? "19" : "20") + yearStr;
    const year = parseInt(yearStr);
    if (year >= 1900 && year <= 2100) {
      const normalized = normalizePeriod(`${year}-01-01`, null, "annual");
      if (normalized) return { type: "annual", start: normalized.period_start, end: normalized.period_end };
    }
  }

  // Full date: "2024-01-01" — infer annual
  const fullDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (fullDateMatch) {
    const year = parseInt(fullDateMatch[1]);
    const month = parseInt(fullDateMatch[2]);
    if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12) {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const normalized = normalizePeriod(startDate, null, "monthly");
      if (normalized) return { type: "monthly", start: normalized.period_start, end: normalized.period_end };
    }
  }

  return null;
}

/**
 * Extract values from a tabular layout where each row has company, metric, period, value columns.
 */
function extractTabularValues(
  workbook: ParsedWorkbook,
  tabularMapping: TabularColumnMapping,
  metricMappings: Array<Record<string, unknown>>,
  scaleMultiplier: number,
): DetectedValue[] {
  const values: DetectedValue[] = [];

  // Build canonical name lookup from AI metric mappings
  const canonicalNames = new Map<string, string>();
  for (const m of metricMappings) {
    const original = String(m.original_label ?? "").toLowerCase().trim();
    const canonical = String(m.canonical_name ?? "");
    if (original && canonical) {
      canonicalNames.set(original, canonical);
    }
  }

  const { companyColIndex, metricColIndex, periodColIndex, valueColIndex, headerRowIndex } = tabularMapping;

  for (const sheet of workbook.sheets) {
    for (let rowIdx = 0; rowIdx < sheet.rows.length; rowIdx++) {
      // Skip header row and rows before it
      if (rowIdx <= headerRowIndex) continue;

      const row = sheet.rows[rowIdx];

      // Read company, metric, period, value from their column indices
      const companyRaw = row[companyColIndex];
      const metricRaw = row[metricColIndex];
      const periodRaw = row[periodColIndex];
      const valueRaw = row[valueColIndex];

      if (metricRaw == null || metricRaw === "" || valueRaw == null || valueRaw === "") continue;

      const companyName = companyRaw != null && companyRaw !== "" ? String(companyRaw).trim() : null;
      const metricLabel = String(metricRaw).trim();
      const periodText = String(periodRaw ?? "").trim();

      // Canonicalize metric name
      const metricName = canonicalNames.get(metricLabel.toLowerCase()) ?? metricLabel;

      // Parse period
      const period = parsePeriodText(periodText);
      if (!period) continue;

      // Parse numeric value
      let numericValue: number | null = null;
      let unit: string | null = null;

      if (typeof valueRaw === "number") {
        numericValue = valueRaw * scaleMultiplier;
      } else if (typeof valueRaw === "string") {
        if (valueRaw.includes("$") || valueRaw.includes("USD")) unit = "USD";
        else if (valueRaw.includes("%")) unit = "percent";
        const cleaned = valueRaw.replace(/[$,\s%]/g, "").replace(/^\((.+)\)$/, "-$1");
        const parsed = parseFloat(cleaned);
        if (!isNaN(parsed)) {
          numericValue = parsed * scaleMultiplier;
        }
      }

      if (numericValue === null) continue;

      const cellRef = `${colToLetter(valueColIndex)}${rowIdx + 1}`;

      values.push({
        metricName,
        rawValue: String(valueRaw),
        numericValue,
        unit,
        periodType: period.type,
        periodStart: period.start,
        periodEnd: period.end,
        companyName,
        sheetName: sheet.name,
        cellReference: cellRef,
        confidence: 0.85,
      });
    }
  }

  return values;
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
  let companyColumnIndex: number | null = null;
  for (const c of companiesDetected) {
    if (c.source === "sheet_name" && c.sheet_name) {
      sheetToCompany.set(String(c.sheet_name), String(c.name));
    }
    if (c.source === "column_value" && companyColumnIndex === null) {
      // Find the column index for company names from metric mappings context
      // The AI detected companies from a column — we need the column index
      // Check if any metric mapping has the company column info
      for (const m of metricMappings) {
        if (m.col_index != null && String(m.canonical_name ?? "").toLowerCase().includes("company")) {
          companyColumnIndex = Number(m.col_index);
          break;
        }
      }
    }
  }

  // Extract values based on layout
  for (const sheet of workbook.sheets) {
    for (let rowIdx = 0; rowIdx < sheet.rows.length; rowIdx++) {
      const row = sheet.rows[rowIdx];

      // Determine company name: from sheet mapping, or from column if detected
      let companyName = sheetToCompany.get(sheet.name) ?? null;
      if (!companyName && companyColumnIndex !== null && row[companyColumnIndex] != null) {
        const colVal = row[companyColumnIndex];
        if (colVal !== null && colVal !== undefined && colVal !== "") {
          companyName = String(colVal).trim();
        }
      }

      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        const cell = row[colIdx];
        if (cell === null || cell === undefined || cell === "") continue;

        // Skip the company column itself — it's not a metric value
        if (companyColumnIndex !== null && colIdx === companyColumnIndex) continue;

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
          companyName,
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

  const layout = String(parsed.layout ?? "metrics_as_rows");
  const scaleMultiplier = Number(parsed.scale_multiplier) || 1;
  const aiMetricMappings = (parsed.metric_mappings as Array<Record<string, unknown>>) ?? [];

  // Use AI-detected values from sample + programmatic extraction for full dataset
  const aiSampleValues = (parsed.values as Array<Record<string, unknown>>) ?? [];

  // Dispatch to the right extractor based on layout
  let programmaticValues: DetectedValue[];
  let tabularMapping: TabularColumnMapping | undefined;

  if (layout === "tabular") {
    // Parse tabular column mapping from AI response
    const tc = parsed.tabular_columns as Record<string, unknown> | undefined;
    if (tc) {
      tabularMapping = {
        companyColIndex: Number(tc.company_col_index ?? 0),
        metricColIndex: Number(tc.metric_col_index ?? 1),
        periodColIndex: Number(tc.period_col_index ?? 2),
        valueColIndex: Number(tc.value_col_index ?? 3),
        headerRowIndex: Number(tc.header_row_index ?? 0),
      };
      programmaticValues = extractTabularValues(workbook, tabularMapping, aiMetricMappings, scaleMultiplier);
    } else {
      // Fallback: AI said tabular but didn't provide column indices
      programmaticValues = extractAllValues(workbook, parsed);
    }
  } else {
    programmaticValues = extractAllValues(workbook, parsed);
  }

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

  // Build companies from AI detection
  const companiesDetected = ((parsed.companies_detected as Array<Record<string, unknown>>) ?? []).map((c) => ({
    name: String(c.name ?? ""),
    source: (c.source ?? "sheet_name") as "sheet_name" | "column_value" | "header_label",
    sheetName: c.sheet_name ? String(c.sheet_name) : undefined,
  }));

  // Augment companiesDetected with all unique company names found in the full dataset
  // (the AI sample may have only captured 1-2 companies from the first few rows)
  const existingCompanyNames = new Set(companiesDetected.map((c) => c.name.toLowerCase()));
  for (const v of finalValues) {
    if (v.companyName && !existingCompanyNames.has(v.companyName.toLowerCase())) {
      existingCompanyNames.add(v.companyName.toLowerCase());
      companiesDetected.push({
        name: v.companyName,
        source: "column_value",
        sheetName: v.sheetName,
      });
    }
  }

  const metricMappings = aiMetricMappings.map((m) => ({
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
    `[excel-ai] Analysis complete: layout=${layout}, ${finalValues.length} values, ` +
    `${companiesDetected.length} companies, ${metricMappings.length} metrics, ` +
    `${periodMappings.length} periods (provider: ${provider}/${result.model})`,
  );

  return {
    layout: layout as AIAnalysisResult["layout"],
    companiesDetected,
    metricMappings,
    periodMappings,
    scaleMultiplier,
    values: finalValues,
    provider,
    model: result.model,
    tabularMapping,
  };
}
