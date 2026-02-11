import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  aggregateMetricValues,
  extractNumericValue,
  AVERAGE_ONLY_METRICS,
} from "@/lib/reports/aggregation";

/**
 * Flow metrics that can be summed across time periods (Q1+Q2+Q3+Q4 = annual).
 * Point-in-time/snapshot metrics (ARR, MRR, Headcount, etc.) should NOT be
 * summed over time — use latest instead. This is distinct from canSumMetric()
 * which checks cross-company summability (portfolio totals).
 */
const TEMPORALLY_SUMMABLE = new Set([
  "revenue",
  "net revenue",
  "gmv",
  "total transaction volume",
  "operating expenses",
  "api calls",
  "data processing volume",
]);
import { unwrapJoin } from "@/lib/api/utils";
import { formatValue } from "@/components/charts/types";
import { similarity } from "@/lib/utils/string-similarity";

/* ------------------------------------------------------------------ */
/*  System prompt                                                       */
/* ------------------------------------------------------------------ */

export const PORTFOLIO_QUERY_SYSTEM_PROMPT = `You are a portfolio analytics assistant for an investment platform. You help investors answer questions about their portfolio companies and metrics.

Available data:
- Company names and details (industry, stage, business_model)
- Metric values for each company (metric_name, value, period_type, period_start, period_end)
- Common metrics: Revenue, MRR, ARR, Burn Rate, Runway, Gross Margin, Headcount, Customer Count, etc.

Convert natural language questions into structured queries. Output JSON with this exact structure:

{
  "type": "metric_lookup" | "company_metrics" | "comparison" | "aggregation" | "ranking" | "time_series" | "unknown",
  "params": { ... }
}

Query types:
1. metric_lookup: Get a specific metric for a specific company
   params: { companyName: string, metricName: string, year?: number, quarter?: number, month?: number }
   Example: "What is Stripe's MRR?" → { "type": "metric_lookup", "params": { "companyName": "Stripe", "metricName": "MRR" } }
   Example: "What is Stripe's Q4 2023 ARR?" → { "type": "metric_lookup", "params": { "companyName": "Stripe", "metricName": "ARR", "year": 2023, "quarter": 4 } }
   Example: "Airtable's Q4 '23 ARR" → { "type": "metric_lookup", "params": { "companyName": "Airtable", "metricName": "ARR", "year": 2023, "quarter": 4 } }
   Example: "What's Airtable's 2023 ARR?" → { "type": "metric_lookup", "params": { "companyName": "Airtable", "metricName": "ARR", "year": 2023 } }

2. company_metrics: Get ALL metrics for a specific company (when no single metric is specified)
   params: { companyName: string, year?: number, quarter?: number, month?: number }
   Example: "What are Airtable's Q1 2026 metrics?" → { "type": "company_metrics", "params": { "companyName": "Airtable", "year": 2026, "quarter": 1 } }
   Example: "Show me everything for Stripe" → { "type": "company_metrics", "params": { "companyName": "Stripe" } }
   Example: "How is Plaid doing?" → { "type": "company_metrics", "params": { "companyName": "Plaid" } }

3. comparison: Compare a metric across 2+ companies
   params: { companyNames: string[], metricName: string, year?: number, quarter?: number, month?: number }
   Example: "Compare revenue of Stripe vs Plaid" → { "type": "comparison", "params": { "companyNames": ["Stripe", "Plaid"], "metricName": "Revenue" } }
   Example: "Compare Q1 2024 MRR for Stripe and Plaid" → { "type": "comparison", "params": { "companyNames": ["Stripe", "Plaid"], "metricName": "MRR", "year": 2024, "quarter": 1 } }

4. aggregation: Calculate aggregate stats across portfolio
   params: { metricName: string, aggregation: "average" | "sum" | "median" | "min" | "max", filters?: { industry?: string, stage?: string }, year?: number, quarter?: number, month?: number }
   Example: "What's the average burn rate?" → { "type": "aggregation", "params": { "metricName": "Burn Rate", "aggregation": "average" } }

5. ranking: Rank or list companies by a metric. Use this for "list all X by company" or "show X for all companies" queries.
   params: { metricName: string, order: "top" | "bottom", limit: number, filters?: { industry?: string, stage?: string }, year?: number, quarter?: number, month?: number }
   Example: "Top 5 companies by revenue" → { "type": "ranking", "params": { "metricName": "Revenue", "order": "top", "limit": 5 } }
   Example: "List all ARR figures by company" → { "type": "ranking", "params": { "metricName": "ARR", "order": "top", "limit": 100 } }
   Example: "Show me everyone's burn rate" → { "type": "ranking", "params": { "metricName": "Burn Rate", "order": "top", "limit": 100 } }

6. time_series: Get a metric's value over multiple periods for trend analysis
   params: { companyName: string, metricName: string, periods?: number (2-12, default 4), periodType?: "monthly" | "quarterly" (default "quarterly"), year?: number, quarter?: number, month?: number }
   Example: "Show me Airtable's revenue over the last 4 quarters" → { "type": "time_series", "params": { "companyName": "Airtable", "metricName": "Revenue", "periods": 4, "periodType": "quarterly" } }
   Example: "Stripe's MRR trend over the last 6 months" → { "type": "time_series", "params": { "companyName": "Stripe", "metricName": "MRR", "periods": 6, "periodType": "monthly" } }
   Example: "Revenue history for Plaid" → { "type": "time_series", "params": { "companyName": "Plaid", "metricName": "Revenue", "periods": 4, "periodType": "quarterly" } }

Rules:
- Map informal language to standard metric names (e.g., "burn" → "Burn Rate", "revenue" → "Revenue", "arr" → "ARR")
- When a specific period is mentioned (e.g., "Q4 2023", "Q4 '23", "2024", "March 2024"), ALWAYS extract year, quarter, and/or month. Year abbreviations like '23 or '24 mean 2023, 2024, etc.
- Default to latest period ONLY when no specific period is mentioned
- Default limit to 5 for rankings unless specified. When the user says "all" or "list" or "every", use limit: 100
- For year-only queries ("2023 revenue"), use metric_lookup with year only — the system will aggregate sub-period data automatically
- For trend/history/over-time questions, use time_series
- For "total" or "sum" queries about a single company's annual data, use metric_lookup with year only
- If the message is a clear, specific portfolio question, produce the best matching query type
- If the message is vague, conversational, a reaction (e.g. "thanks", "ok", "this is wrong", "not correct"), or has no clear data request, return { "type": "unknown", "params": { "reason": "<a helpful message>" } }
- Use conversation history (if provided) to resolve ambiguous follow-ups. E.g. if the user previously asked about Stripe's ARR and then says "what about revenue?", interpret it as Stripe's Revenue
- If a follow-up message cannot be resolved even with conversation history, return unknown with a helpful suggestion

Respond with valid JSON only.`;

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type StructuredQueryType =
  | "metric_lookup"
  | "company_metrics"
  | "comparison"
  | "aggregation"
  | "ranking"
  | "time_series"
  | "unknown";

export type StructuredQuery = {
  type: StructuredQueryType;
  params: Record<string, unknown>;
};

export type QueryResult = {
  type: StructuredQueryType;
  answer: string;
  data?: Record<string, unknown>[];
  chartData?: { label: string; value: number }[];
  chartType?: "bar" | "line";
};

/* ------------------------------------------------------------------ */
/*  Zod schema for AI response validation                               */
/* ------------------------------------------------------------------ */

const periodFields = {
  periodType: z.string().optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  quarter: z.number().int().min(1).max(4).optional(),
  month: z.number().int().min(1).max(12).optional(),
};

const filtersSchema = z
  .object({ industry: z.string().optional(), stage: z.string().optional() })
  .optional();

const structuredQuerySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("metric_lookup"),
    params: z
      .object({
        companyName: z.string(),
        metricName: z.string(),
        ...periodFields,
      })
      .passthrough(),
  }),
  z.object({
    type: z.literal("company_metrics"),
    params: z
      .object({
        companyName: z.string(),
        ...periodFields,
      })
      .passthrough(),
  }),
  z.object({
    type: z.literal("comparison"),
    params: z
      .object({
        companyNames: z.array(z.string()).min(2),
        metricName: z.string(),
        ...periodFields,
      })
      .passthrough(),
  }),
  z.object({
    type: z.literal("aggregation"),
    params: z
      .object({
        metricName: z.string(),
        aggregation: z
          .enum(["average", "sum", "median", "min", "max"])
          .catch("average"),
        filters: filtersSchema,
        ...periodFields,
      })
      .passthrough(),
  }),
  z.object({
    type: z.literal("ranking"),
    params: z
      .object({
        metricName: z.string(),
        order: z.enum(["top", "bottom"]).catch("top"),
        limit: z.number().int().min(1).max(1000).catch(5),
        filters: filtersSchema,
        ...periodFields,
      })
      .passthrough(),
  }),
  z.object({
    type: z.literal("time_series"),
    params: z
      .object({
        companyName: z.string(),
        metricName: z.string(),
        periods: z.number().int().min(2).max(12).catch(4),
        periodType: z.enum(["monthly", "quarterly"]).catch("quarterly"),
        year: periodFields.year,
        quarter: periodFields.quarter,
        month: periodFields.month,
      })
      .passthrough(),
  }),
  z.object({
    type: z.literal("unknown"),
    params: z.object({ reason: z.string().optional() }).passthrough(),
  }),
]);

/**
 * Parse and validate AI response with fallback recovery.
 * If the strict schema fails, attempts to salvage a usable query
 * from the raw JSON rather than giving up entirely.
 */
function parseAndValidateAIResponse(text: string): StructuredQuery {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { type: "unknown", params: { reason: "I had trouble processing that. Please try rephrasing your question." } };
  }

  // Try strict schema first
  const result = structuredQuerySchema.safeParse(raw);
  if (result.success) {
    return result.data as StructuredQuery;
  }

  // Fallback: salvage what we can from the raw JSON
  if (typeof raw === "object" && raw !== null && "type" in raw && "params" in raw) {
    const obj = raw as { type: string; params: Record<string, unknown> };
    const validTypes = ["metric_lookup", "company_metrics", "comparison", "aggregation", "ranking", "time_series"];
    if (validTypes.includes(obj.type) && typeof obj.params === "object") {
      return { type: obj.type as StructuredQueryType, params: obj.params };
    }
  }

  return { type: "unknown", params: { reason: "I had trouble processing that. Please try rephrasing your question." } };
}

/* ------------------------------------------------------------------ */
/*  Period filter                                                       */
/* ------------------------------------------------------------------ */

type PeriodFilter = {
  periodStart: string;
  periodEnd: string;
  hasQuarter: boolean;
  hasMonth: boolean;
};

/**
 * Convert year/quarter/month from structured query into a date range filter.
 * Returns null when no year is provided (falls back to latest).
 */
function computePeriodFilter(params: Record<string, unknown>): PeriodFilter | null {
  const year = params.year as number | undefined;
  if (!year) return null;

  const quarter = params.quarter as number | undefined;
  const month = params.month as number | undefined;

  if (quarter) {
    const startMonth = (quarter - 1) * 3; // 0-indexed for Date constructor
    const start = new Date(Date.UTC(year, startMonth, 1));
    const end = new Date(Date.UTC(year, startMonth + 3, 1));
    return {
      periodStart: start.toISOString().slice(0, 10),
      periodEnd: end.toISOString().slice(0, 10),
      hasQuarter: true,
      hasMonth: false,
    };
  }

  if (month) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    return {
      periodStart: start.toISOString().slice(0, 10),
      periodEnd: end.toISOString().slice(0, 10),
      hasQuarter: false,
      hasMonth: true,
    };
  }

  // Year only
  return {
    periodStart: `${year}-01-01`,
    periodEnd: `${year + 1}-01-01`,
    hasQuarter: false,
    hasMonth: false,
  };
}

/* ------------------------------------------------------------------ */
/*  ILIKE escape helper                                                 */
/* ------------------------------------------------------------------ */

function escapeIlike(value: string): string {
  // Strip special chars first, THEN escape wildcards (order matters — the
  // backslash from escaping %/_ would be stripped if we reversed these).
  const clean = value.replace(/[(),."'\\]/g, "");
  return clean.replace(/[%_]/g, "\\$&");
}

/* ------------------------------------------------------------------ */
/*  NL → Structured Query (AI)                                          */
/* ------------------------------------------------------------------ */

export type ConversationTurn = {
  query: string;
  answer: string;
};

export async function parseNaturalLanguageQuery(
  query: string,
  history?: ConversationTurn[],
): Promise<StructuredQuery> {
  const geminiKey = process.env.GOOGLE_AI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // Build conversation context from recent turns (last 3 max)
  const recentHistory = (history ?? []).slice(-3);

  if (geminiKey) {
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    // Build multi-turn contents for Gemini
    const contents: { role: string; parts: { text: string }[] }[] = [];
    for (const turn of recentHistory) {
      contents.push({ role: "user", parts: [{ text: turn.query }] });
      contents.push({ role: "model", parts: [{ text: turn.answer }] });
    }
    contents.push({ role: "user", parts: [{ text: query }] });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: PORTFOLIO_QUERY_SYSTEM_PROMPT }],
          },
          contents,
          generationConfig: { responseMimeType: "application/json" },
        }),
      },
    );
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No response from AI");
    return parseAndValidateAIResponse(text);
  } else if (openaiKey) {
    const model = process.env.OPENAI_EXTRACTION_MODEL || "gpt-4o-mini";

    // Build message array with conversation history
    const messages: { role: string; content: string }[] = [
      { role: "system", content: PORTFOLIO_QUERY_SYSTEM_PROMPT },
    ];
    for (const turn of recentHistory) {
      messages.push({ role: "user", content: turn.query });
      messages.push({ role: "assistant", content: turn.answer });
    }
    messages.push({ role: "user", content: query });

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          response_format: { type: "json_object" },
        }),
      },
    );
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("No response from AI");
    return parseAndValidateAIResponse(text);
  } else {
    throw new Error("No AI provider configured.");
  }
}

/* ------------------------------------------------------------------ */
/*  DB helpers                                                          */
/* ------------------------------------------------------------------ */

type CompanyRow = {
  id: string;
  name: string;
  industry: string | null;
  stage: string | null;
};

type MetricRow = {
  metric_name: string;
  value: unknown;
  period_type: string;
  period_start: string;
  period_end: string;
};

/* ------------------------------------------------------------------ */
/*  Fuzzy company matching                                              */
/* ------------------------------------------------------------------ */

const CHATBOT_SIMILARITY_THRESHOLD = 0.7;

/**
 * Fetch all portfolio companies for an investor (non-denied).
 */
async function fetchPortfolioCompanies(
  supabase: SupabaseClient,
  investorId: string,
): Promise<CompanyRow[]> {
  const { data } = await supabase
    .from("investor_company_relationships")
    .select("companies(id, name, industry, stage)")
    .eq("investor_id", investorId)
    .not("approval_status", "eq", "denied");

  if (!data) return [];

  const companies: CompanyRow[] = [];
  for (const row of data) {
    const company = unwrapJoin(row.companies) as CompanyRow | null;
    if (company) companies.push(company);
  }
  return companies;
}

/**
 * Find the best fuzzy match for a name among a list of companies.
 */
function findBestMatch(
  name: string,
  companies: CompanyRow[],
): CompanyRow | null {
  let best: CompanyRow | null = null;
  let bestScore = 0;
  for (const c of companies) {
    const score = similarity(name, c.name);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return bestScore >= CHATBOT_SIMILARITY_THRESHOLD ? best : null;
}

/**
 * Find a company in the investor's portfolio by name (fuzzy match).
 */
async function findCompany(
  supabase: SupabaseClient,
  investorId: string,
  companyName: string,
): Promise<CompanyRow | null> {
  const companies = await fetchPortfolioCompanies(supabase, investorId);
  return findBestMatch(companyName, companies);
}

/**
 * Find multiple companies by name, fetching portfolio once.
 */
async function findCompanies(
  supabase: SupabaseClient,
  investorId: string,
  companyNames: string[],
): Promise<Map<string, CompanyRow | null>> {
  const companies = await fetchPortfolioCompanies(supabase, investorId);
  const result = new Map<string, CompanyRow | null>();
  for (const name of companyNames) {
    result.set(name, findBestMatch(name, companies));
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  Merged metric queries (founder + investor data)                     */
/* ------------------------------------------------------------------ */

type RawMetricRow = {
  company_id: string;
  metric_name: string;
  value: unknown;
  period_type: string;
  period_start: string;
  period_end: string;
};

/**
 * Build, execute, and merge metric queries from both company_metric_values
 * and investor_metric_values. Founder data takes priority for the same
 * metric+period_type+period_start key.
 */
async function fetchMergedMetrics(
  supabase: SupabaseClient,
  investorId: string,
  companyFilter: { type: "single"; companyId: string } | { type: "batch"; companyIds: string[] },
  metricName: string | null,
  period: PeriodFilter | null,
): Promise<RawMetricRow[]> {
  const cols = "company_id, metric_name, value, period_type, period_start, period_end";

  let founderQ = supabase
    .from("company_metric_values")
    .select(cols);

  let investorQ = supabase
    .from("investor_metric_values")
    .select(cols)
    .eq("investor_id", investorId);

  if (companyFilter.type === "single") {
    founderQ = founderQ.eq("company_id", companyFilter.companyId);
    investorQ = investorQ.eq("company_id", companyFilter.companyId);
  } else {
    founderQ = founderQ.in("company_id", companyFilter.companyIds);
    investorQ = investorQ.in("company_id", companyFilter.companyIds);
  }

  if (metricName) {
    const escaped = escapeIlike(metricName);
    founderQ = founderQ.ilike("metric_name", escaped);
    investorQ = investorQ.ilike("metric_name", escaped);
  }

  if (period) {
    founderQ = founderQ
      .gte("period_start", period.periodStart)
      .lt("period_start", period.periodEnd);
    investorQ = investorQ
      .gte("period_start", period.periodStart)
      .lt("period_start", period.periodEnd);
  }

  const [{ data: fd }, { data: id }] = await Promise.all([
    founderQ.order("period_end", { ascending: false }),
    investorQ.order("period_end", { ascending: false }),
  ]);

  const seen = new Set<string>();
  const merged: RawMetricRow[] = [];

  for (const row of (fd ?? []) as RawMetricRow[]) {
    const key = `${row.company_id}:${row.metric_name.toLowerCase()}:${row.period_type}:${row.period_start}`;
    seen.add(key);
    merged.push(row);
  }
  for (const row of (id ?? []) as RawMetricRow[]) {
    const key = `${row.company_id}:${row.metric_name.toLowerCase()}:${row.period_type}:${row.period_start}`;
    if (!seen.has(key)) merged.push(row);
  }

  return merged;
}

/**
 * Fetch the latest metric value for a given company and metric name.
 * Merges founder + investor data. Prefers quarterly data when the query
 * specifies a quarter, and monthly data when it specifies a month.
 */
async function getLatestMetricValue(
  supabase: SupabaseClient,
  companyId: string,
  metricName: string,
  investorId: string,
  period?: PeriodFilter | null,
): Promise<MetricRow | null> {
  const merged = await fetchMergedMetrics(
    supabase,
    investorId,
    { type: "single", companyId },
    metricName,
    period ?? null,
  );
  if (merged.length === 0) return null;

  // Sort: prefer matching period_type, then latest period_end
  const preferredType = period?.hasQuarter
    ? "quarterly"
    : period?.hasMonth
      ? "monthly"
      : null;

  merged.sort((a, b) => {
    if (preferredType) {
      const aMatch = a.period_type === preferredType ? 0 : 1;
      const bMatch = b.period_type === preferredType ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
    }
    return b.period_end.localeCompare(a.period_end);
  });

  const m = merged[0];
  return {
    metric_name: m.metric_name,
    value: m.value,
    period_type: m.period_type,
    period_start: m.period_start,
    period_end: m.period_end,
  };
}

/**
 * Aggregate a metric over sub-periods when only a year is specified.
 * Tries: yearly row → quarterly rows → monthly rows.
 * Uses sum for summable metrics, average for rate/margin metrics, latest for others.
 */
async function getAggregatedMetricValue(
  supabase: SupabaseClient,
  companyId: string,
  metricName: string,
  investorId: string,
  period: PeriodFilter,
): Promise<{
  value: number;
  formatted: string;
  aggregation: "sum" | "average" | "latest";
  sourceCount: number;
  totalExpected: number;
  periodType: string;
  note: string;
} | null> {
  const year = parseInt(period.periodStart.slice(0, 4));

  // 1. Check for an annual/yearly row first
  const yearlyRows = await fetchMergedMetrics(
    supabase,
    investorId,
    { type: "single", companyId },
    metricName,
    period,
  );
  const annual = yearlyRows.find((r) => r.period_type === "yearly");
  if (annual) {
    const num = extractNumericValue(annual.value);
    if (num != null) {
      return {
        value: num,
        formatted: formatValue(num, metricName),
        aggregation: "latest",
        sourceCount: 1,
        totalExpected: 1,
        periodType: "yearly",
        note: "",
      };
    }
  }

  // 2. Try quarterly rows
  const quarterlyRows = yearlyRows.filter((r) => r.period_type === "quarterly");
  if (quarterlyRows.length > 0) {
    const values = quarterlyRows
      .map((r) => extractNumericValue(r.value))
      .filter((v): v is number => v != null);
    if (values.length > 0) {
      return buildAggResult(values, metricName, "quarterly", quarterlyRows.length, 4, year);
    }
  }

  // 3. Try monthly rows
  const monthlyRows = yearlyRows.filter((r) => r.period_type === "monthly");
  if (monthlyRows.length > 0) {
    const values = monthlyRows
      .map((r) => extractNumericValue(r.value))
      .filter((v): v is number => v != null);
    if (values.length > 0) {
      return buildAggResult(values, metricName, "monthly", monthlyRows.length, 12, year);
    }
  }

  return null;
}

function buildAggResult(
  values: number[],
  metricName: string,
  periodType: string,
  sourceCount: number,
  totalExpected: number,
  year: number,
): {
  value: number;
  formatted: string;
  aggregation: "sum" | "average" | "latest";
  sourceCount: number;
  totalExpected: number;
  periodType: string;
  note: string;
} {
  const normalized = metricName.toLowerCase().trim();
  let aggregation: "sum" | "average" | "latest";
  let value: number;

  if (TEMPORALLY_SUMMABLE.has(normalized)) {
    aggregation = "sum";
    value = values.reduce((a, b) => a + b, 0);
  } else if (AVERAGE_ONLY_METRICS.has(normalized)) {
    aggregation = "average";
    value = values.reduce((a, b) => a + b, 0) / values.length;
  } else {
    // Point-in-time metrics (ARR, MRR, Headcount, Burn Rate, etc.) — use latest
    aggregation = "latest";
    value = values[0]; // fetchMergedMetrics returns sorted by period_end desc
  }

  const periodLabel = periodType === "quarterly" ? "quarters" : "months";
  const partial = sourceCount < totalExpected;
  const note = aggregation === "latest"
    ? ""
    : partial
      ? `(${aggregation} of ${sourceCount} of ${totalExpected} ${periodLabel} in ${year})`
      : `(${aggregation} of ${periodType === "quarterly" ? "Q1–Q4" : "Jan–Dec"} ${year})`;

  return {
    value,
    formatted: formatValue(value, metricName),
    aggregation,
    sourceCount,
    totalExpected,
    periodType,
    note,
  };
}

/**
 * Fetch a metric's values over multiple periods for trend/time-series display.
 * Returns rows sorted by period_start ascending (oldest first).
 */
async function getMetricTimeSeries(
  supabase: SupabaseClient,
  companyId: string,
  metricName: string,
  investorId: string,
  periodType: "monthly" | "quarterly",
  count: number,
  endPeriod?: PeriodFilter | null,
): Promise<{ rows: MetricRow[]; usedPeriodType: string; fallback: boolean }> {
  // Fetch all merged metrics for this company+metric (no date filter — we filter in memory)
  const allRows = await fetchMergedMetrics(
    supabase,
    investorId,
    { type: "single", companyId },
    metricName,
    null,
  );

  if (allRows.length === 0) {
    return { rows: [], usedPeriodType: periodType, fallback: false };
  }

  // Filter to matching period type
  let matched = allRows.filter((r) => r.period_type === periodType);
  let fallback = false;
  let usedPeriodType: string = periodType;

  // If no rows match requested type, fall back to whatever is available
  if (matched.length === 0) {
    fallback = true;
    // Prefer quarterly over monthly
    const quarterly = allRows.filter((r) => r.period_type === "quarterly");
    if (quarterly.length > 0) {
      matched = quarterly;
      usedPeriodType = "quarterly";
    } else {
      const monthly = allRows.filter((r) => r.period_type === "monthly");
      if (monthly.length > 0) {
        matched = monthly;
        usedPeriodType = "monthly";
      } else {
        matched = allRows;
        usedPeriodType = allRows[0].period_type;
      }
    }
  }

  // Sort ascending by period_start
  matched.sort((a, b) => a.period_start.localeCompare(b.period_start));

  // If endPeriod specified, keep only rows starting before it
  if (endPeriod) {
    matched = matched.filter((r) => r.period_start < endPeriod.periodEnd);
  }

  // Take last N rows
  const sliced = matched.slice(-count);

  const rows: MetricRow[] = sliced.map((r) => ({
    metric_name: r.metric_name,
    value: r.value,
    period_type: r.period_type,
    period_start: r.period_start,
    period_end: r.period_end,
  }));

  return { rows, usedPeriodType, fallback };
}

/**
 * Fetch the latest value of a metric for every company in the investor's portfolio.
 * Merges founder + investor data. Uses batched queries instead of N+1.
 */
async function getMetricAcrossPortfolio(
  supabase: SupabaseClient,
  investorId: string,
  metricName: string,
  filters?: { industry?: string; stage?: string },
  period?: PeriodFilter | null,
): Promise<{ company: CompanyRow; metric: MetricRow }[]> {
  const companies = await fetchPortfolioCompanies(supabase, investorId);
  if (companies.length === 0) return [];

  const filtered = companies.filter((c) => {
    if (
      filters?.industry &&
      c.industry?.toLowerCase() !== filters.industry.toLowerCase()
    )
      return false;
    if (
      filters?.stage &&
      c.stage?.toLowerCase() !== filters.stage.toLowerCase()
    )
      return false;
    return true;
  });
  if (filtered.length === 0) return [];

  const companyIds = filtered.map((c) => c.id);
  const allRows = await fetchMergedMetrics(
    supabase,
    investorId,
    { type: "batch", companyIds },
    metricName,
    period ?? null,
  );
  if (allRows.length === 0) return [];

  // Sort: prefer matching period_type, then latest period_end
  const preferredType = period?.hasQuarter
    ? "quarterly"
    : period?.hasMonth
      ? "monthly"
      : null;

  allRows.sort((a, b) => {
    if (preferredType) {
      const aMatch = a.period_type === preferredType ? 0 : 1;
      const bMatch = b.period_type === preferredType ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
    }
    return b.period_end.localeCompare(a.period_end);
  });

  const latestByCompany = new Map<string, MetricRow>();
  for (const row of allRows) {
    if (!latestByCompany.has(row.company_id)) {
      latestByCompany.set(row.company_id, {
        metric_name: row.metric_name,
        value: row.value,
        period_type: row.period_type,
        period_start: row.period_start,
        period_end: row.period_end,
      });
    }
  }

  const companyMap = new Map(filtered.map((c) => [c.id, c]));
  const results: { company: CompanyRow; metric: MetricRow }[] = [];
  for (const [cid, metric] of latestByCompany) {
    const company = companyMap.get(cid);
    if (company) results.push({ company, metric });
  }

  return results;
}

/* ------------------------------------------------------------------ */
/*  Period formatting helper                                            */
/* ------------------------------------------------------------------ */

function formatPeriodLabel(
  periodStart: string,
  periodEnd: string,
  periodType: string,
): string {
  // Use UTC methods — period_start is a date string like "2023-10-01" which
  // parses as midnight UTC. Using local-time getMonth()/getFullYear() shifts
  // the result in timezones behind UTC (e.g. Oct 1 UTC → Sep 30 PST → Q3).
  const start = new Date(periodStart);
  if (periodType === "quarterly") {
    const quarter = Math.floor(start.getUTCMonth() / 3) + 1;
    return `Q${quarter} ${start.getUTCFullYear()}`;
  }
  if (periodType === "monthly") {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthNames[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
  }
  if (periodType === "yearly") {
    return start.getUTCFullYear().toString();
  }
  return `${periodStart} - ${periodEnd}`;
}

/* ------------------------------------------------------------------ */
/*  Execute structured query                                            */
/* ------------------------------------------------------------------ */

export async function executeStructuredQuery(
  query: StructuredQuery,
  supabase: SupabaseClient,
  investorId: string,
): Promise<QueryResult> {
  switch (query.type) {
    /* -------------------------------------------------------------- */
    /*  metric_lookup                                                   */
    /* -------------------------------------------------------------- */
    case "metric_lookup": {
      const companyName = query.params.companyName as string;
      const metricName = query.params.metricName as string;

      if (!companyName || !metricName) {
        return {
          type: "metric_lookup",
          answer:
            "I need both a company name and a metric name to look that up.",
        };
      }

      const period = computePeriodFilter(query.params);
      const company = await findCompany(supabase, investorId, companyName);
      if (!company) {
        return {
          type: "metric_lookup",
          answer: `I couldn't find "${companyName}" in your portfolio. Please check the company name.`,
        };
      }

      // Year-only query: aggregate from sub-period data
      const isYearOnly = period && !period.hasQuarter && !period.hasMonth;
      if (isYearOnly) {
        const aggResult = await getAggregatedMetricValue(
          supabase,
          company.id,
          metricName,
          investorId,
          period,
        );

        if (!aggResult) {
          return {
            type: "metric_lookup",
            answer: `No data found for "${metricName}" for ${company.name} for the requested period. The company may not have submitted this metric yet.`,
          };
        }

        const year = query.params.year as number;
        const answer = aggResult.note
          ? `${company.name}'s ${year} ${metricName} is ${aggResult.formatted} ${aggResult.note}.`
          : `${company.name}'s ${year} ${metricName} is ${aggResult.formatted}.`;

        return {
          type: "metric_lookup",
          answer,
          data: [
            {
              company: company.name,
              metric: metricName,
              value: aggResult.value,
              period: String(year),
            },
          ],
        };
      }

      const metric = await getLatestMetricValue(
        supabase,
        company.id,
        metricName,
        investorId,
        period,
      );

      if (!metric) {
        const periodHint = period ? " for the requested period" : "";
        return {
          type: "metric_lookup",
          answer: `No data found for "${metricName}" for ${company.name}${periodHint}. The company may not have submitted this metric yet.`,
        };
      }

      const numValue = extractNumericValue(metric.value);
      const formatted =
        numValue != null ? formatValue(numValue, metricName) : String(metric.value);
      const periodLabel = formatPeriodLabel(
        metric.period_start,
        metric.period_end,
        metric.period_type,
      );

      // Period type transparency: note if returned data differs from requested type
      let fallbackNote = "";
      const requestedType = period?.hasMonth ? "monthly" : period?.hasQuarter ? "quarterly" : null;
      if (requestedType && metric.period_type !== requestedType) {
        fallbackNote = `\n(Note: No ${requestedType} data available — showing ${metric.period_type} data.)`;
      }

      return {
        type: "metric_lookup",
        answer: `${company.name}'s ${metric.metric_name} is ${formatted} (as of ${periodLabel}).${fallbackNote}`,
        data: [
          {
            company: company.name,
            metric: metric.metric_name,
            value: numValue ?? metric.value,
            period: periodLabel,
          },
        ],
      };
    }

    /* -------------------------------------------------------------- */
    /*  company_metrics — all metrics for a single company              */
    /* -------------------------------------------------------------- */
    case "company_metrics": {
      const companyName = query.params.companyName as string;

      if (!companyName) {
        return {
          type: "company_metrics",
          answer: "I need a company name to look up metrics.",
        };
      }

      const period = computePeriodFilter(query.params);
      const company = await findCompany(supabase, investorId, companyName);
      if (!company) {
        return {
          type: "company_metrics",
          answer: `I couldn't find "${companyName}" in your portfolio. Please check the company name.`,
        };
      }

      // Fetch all metrics (no metric name filter)
      const allRows = await fetchMergedMetrics(
        supabase,
        investorId,
        { type: "single", companyId: company.id },
        null,
        period ?? null,
      );

      if (allRows.length === 0) {
        const periodHint = period ? " for the requested period" : "";
        return {
          type: "company_metrics",
          answer: `No metrics found for ${company.name}${periodHint}.`,
        };
      }

      const isYearOnly = period && !period.hasQuarter && !period.hasMonth;
      const year = query.params.year as number | undefined;

      // Year-only: aggregate sub-period data per metric
      if (isYearOnly && year) {
        // Group rows by metric name
        const metricGroups = new Map<string, RawMetricRow[]>();
        for (const row of allRows) {
          const key = row.metric_name.toLowerCase();
          const existing = metricGroups.get(key) ?? [];
          existing.push(row);
          metricGroups.set(key, existing);
        }

        const lines: string[] = [];
        const dataEntries: Record<string, unknown>[] = [];

        for (const [, rows] of metricGroups) {
          const metricName = rows[0].metric_name;
          // Check for a yearly row first
          const yearlyRow = rows.find((r) => r.period_type === "yearly");
          if (yearlyRow) {
            const num = extractNumericValue(yearlyRow.value);
            const formatted = num != null ? formatValue(num, metricName) : String(yearlyRow.value);
            lines.push(`- ${metricName}: ${formatted}`);
            dataEntries.push({ company: company.name, metric: metricName, value: num ?? yearlyRow.value, period: String(year) });
            continue;
          }

          // Try quarterly, then monthly
          const subRows = rows.filter((r) => r.period_type === "quarterly").length > 0
            ? rows.filter((r) => r.period_type === "quarterly")
            : rows.filter((r) => r.period_type === "monthly");

          const values = subRows
            .map((r) => extractNumericValue(r.value))
            .filter((v): v is number => v != null);

          if (values.length === 0) {
            const num = extractNumericValue(rows[0].value);
            const formatted = num != null ? formatValue(num, metricName) : String(rows[0].value);
            lines.push(`- ${metricName}: ${formatted}`);
            dataEntries.push({ company: company.name, metric: metricName, value: num ?? rows[0].value, period: String(year) });
            continue;
          }

          const normalized = metricName.toLowerCase().trim();
          let aggValue: number;
          let aggLabel: string;
          if (TEMPORALLY_SUMMABLE.has(normalized)) {
            aggValue = values.reduce((a, b) => a + b, 0);
            aggLabel = "sum";
          } else if (AVERAGE_ONLY_METRICS.has(normalized)) {
            aggValue = values.reduce((a, b) => a + b, 0) / values.length;
            aggLabel = "avg";
          } else {
            aggValue = values[0];
            aggLabel = "";
          }

          const formatted = formatValue(aggValue, metricName);
          const suffix = aggLabel ? ` (${aggLabel} of ${values.length} ${subRows[0].period_type === "quarterly" ? "quarters" : "months"})` : "";
          lines.push(`- ${metricName}: ${formatted}${suffix}`);
          dataEntries.push({ company: company.name, metric: metricName, value: aggValue, period: String(year) });
        }

        return {
          type: "company_metrics",
          answer: `${company.name}'s metrics for ${year}:\n${lines.join("\n")}`,
          data: dataEntries,
        };
      }

      // Prefer matching period_type, then latest period_end
      const preferredType = period?.hasQuarter
        ? "quarterly"
        : period?.hasMonth
          ? "monthly"
          : null;

      allRows.sort((a, b) => {
        if (preferredType) {
          const aMatch = a.period_type === preferredType ? 0 : 1;
          const bMatch = b.period_type === preferredType ? 0 : 1;
          if (aMatch !== bMatch) return aMatch - bMatch;
        }
        return b.period_end.localeCompare(a.period_end);
      });

      // Pick latest value per metric name
      const latestByMetric = new Map<string, RawMetricRow>();
      for (const row of allRows) {
        const key = row.metric_name.toLowerCase();
        if (!latestByMetric.has(key)) {
          latestByMetric.set(key, row);
        }
      }

      const entries = Array.from(latestByMetric.values());

      // Period type transparency
      const requestedType2 = period?.hasMonth ? "monthly" : period?.hasQuarter ? "quarterly" : null;
      const lines = entries.map((m) => {
        const numValue = extractNumericValue(m.value);
        const formatted = numValue != null ? formatValue(numValue, m.metric_name) : String(m.value);
        const pl = formatPeriodLabel(m.period_start, m.period_end, m.period_type);
        let note = "";
        if (requestedType2 && m.period_type !== requestedType2) {
          note = ` [${m.period_type} data]`;
        }
        return `- ${m.metric_name}: ${formatted} (${pl})${note}`;
      });

      const periodDesc = period
        ? ` for ${period.hasQuarter ? `Q${query.params.quarter} ${query.params.year}` : period.hasMonth ? `${query.params.month}/${query.params.year}` : String(query.params.year)}`
        : "";

      return {
        type: "company_metrics",
        answer: `${company.name}'s metrics${periodDesc}:\n${lines.join("\n")}`,
        data: entries.map((m) => ({
          company: company.name,
          metric: m.metric_name,
          value: extractNumericValue(m.value) ?? m.value,
          period: formatPeriodLabel(m.period_start, m.period_end, m.period_type),
        })),
      };
    }

    /* -------------------------------------------------------------- */
    /*  comparison                                                      */
    /* -------------------------------------------------------------- */
    case "comparison": {
      const companyNames = query.params.companyNames as string[];
      const metricName = query.params.metricName as string;

      if (!companyNames || companyNames.length < 2 || !metricName) {
        return {
          type: "comparison",
          answer:
            "I need at least two company names and a metric to compare.",
        };
      }

      const period = computePeriodFilter(query.params);

      // Batch fetch: single portfolio query for all names
      const companyMap = await findCompanies(
        supabase,
        investorId,
        companyNames,
      );

      // Collect found company IDs for batched metric query
      const foundCompanies = new Map<string, { requestedName: string; company: CompanyRow }>();
      for (const name of companyNames) {
        const company = companyMap.get(name);
        if (company) {
          foundCompanies.set(company.id, { requestedName: name, company });
        }
      }

      // Batched metric query — merge founder + investor data
      const metricsByCompanyId = new Map<string, MetricRow>();
      if (foundCompanies.size > 0) {
        const ids = Array.from(foundCompanies.keys());
        const allRows = await fetchMergedMetrics(
          supabase,
          investorId,
          { type: "batch", companyIds: ids },
          metricName,
          period ?? null,
        );

        const preferredType = period?.hasQuarter
          ? "quarterly"
          : period?.hasMonth
            ? "monthly"
            : null;

        allRows.sort((a, b) => {
          if (preferredType) {
            const aMatch = a.period_type === preferredType ? 0 : 1;
            const bMatch = b.period_type === preferredType ? 0 : 1;
            if (aMatch !== bMatch) return aMatch - bMatch;
          }
          return b.period_end.localeCompare(a.period_end);
        });

        for (const row of allRows) {
          if (!metricsByCompanyId.has(row.company_id)) {
            metricsByCompanyId.set(row.company_id, {
              metric_name: row.metric_name,
              value: row.value,
              period_type: row.period_type,
              period_start: row.period_start,
              period_end: row.period_end,
            });
          }
        }
      }

      // Build rows in original order
      const rows: {
        name: string;
        value: number | null;
        period: string;
      }[] = [];

      for (const name of companyNames) {
        const company = companyMap.get(name);
        if (!company) {
          rows.push({ name, value: null, period: "N/A" });
          continue;
        }
        const metric = metricsByCompanyId.get(company.id);
        if (!metric) {
          rows.push({ name: company.name, value: null, period: "N/A" });
          continue;
        }
        const numValue = extractNumericValue(metric.value);
        const periodLabel = formatPeriodLabel(
          metric.period_start,
          metric.period_end,
          metric.period_type,
        );
        rows.push({ name: company.name, value: numValue, period: periodLabel });
      }

      const validRows = rows.filter((r) => r.value != null);
      if (validRows.length === 0) {
        return {
          type: "comparison",
          answer: `No ${metricName} data found for any of the requested companies.`,
        };
      }

      const lines = rows.map((r) => {
        const val =
          r.value != null ? formatValue(r.value, metricName) : "No data";
        return `- ${r.name}: ${val}${r.period !== "N/A" ? ` (${r.period})` : ""}`;
      });

      // Period type transparency
      const requestedType3 = period?.hasMonth ? "monthly" : period?.hasQuarter ? "quarterly" : null;
      let compFallbackNote = "";
      if (requestedType3) {
        const mismatch = Array.from(metricsByCompanyId.values()).some(
          (m) => m.period_type !== requestedType3,
        );
        if (mismatch) {
          compFallbackNote = `\n(Note: Some results use a different period type than requested — ${requestedType3} data was not available for all companies.)`;
        }
      }

      return {
        type: "comparison",
        answer: `${metricName} comparison:\n${lines.join("\n")}${compFallbackNote}`,
        data: rows.map((r) => ({
          company: r.name,
          value: r.value,
          period: r.period,
        })),
        chartData: validRows.map((r) => ({
          label: r.name,
          value: r.value!,
        })),
      };
    }

    /* -------------------------------------------------------------- */
    /*  aggregation                                                     */
    /* -------------------------------------------------------------- */
    case "aggregation": {
      const metricName = query.params.metricName as string;
      const aggregation = (query.params.aggregation as string) || "average";
      const filters = query.params.filters as
        | { industry?: string; stage?: string }
        | undefined;

      if (!metricName) {
        return {
          type: "aggregation",
          answer: "I need a metric name to calculate an aggregate.",
        };
      }

      const period = computePeriodFilter(query.params);
      const entries = await getMetricAcrossPortfolio(
        supabase,
        investorId,
        metricName,
        filters,
        period,
      );

      if (entries.length === 0) {
        return {
          type: "aggregation",
          answer: `No data found for "${metricName}" across your portfolio.`,
        };
      }

      const values = entries
        .map((e) => extractNumericValue(e.metric.value))
        .filter((v): v is number => v != null);

      if (values.length === 0) {
        return {
          type: "aggregation",
          answer: `No numeric values found for "${metricName}" across your portfolio.`,
        };
      }

      const agg = aggregateMetricValues(values);
      let result: number;
      let label: string;

      switch (aggregation) {
        case "sum":
          result = agg.sum ?? 0;
          label = "total";
          break;
        case "median":
          result = agg.median;
          label = "median";
          break;
        case "min":
          result = agg.min;
          label = "minimum";
          break;
        case "max":
          result = agg.max;
          label = "maximum";
          break;
        case "average":
        default:
          result = agg.average;
          label = "average";
          break;
      }

      const formatted = formatValue(result, metricName);
      const filterLabel = filters?.industry
        ? ` (${filters.industry} companies)`
        : filters?.stage
          ? ` (${filters.stage} stage)`
          : "";

      return {
        type: "aggregation",
        answer: `The ${label} ${metricName} across your portfolio${filterLabel} is ${formatted} (based on ${values.length} ${values.length === 1 ? "company" : "companies"}).`,
        data: entries.map((e) => ({
          company: e.company.name,
          value: extractNumericValue(e.metric.value),
        })),
        chartData: entries.map((e) => ({
          label: e.company.name,
          value: extractNumericValue(e.metric.value) ?? 0,
        })),
      };
    }

    /* -------------------------------------------------------------- */
    /*  ranking                                                         */
    /* -------------------------------------------------------------- */
    case "ranking": {
      const metricName = query.params.metricName as string;
      const order = (query.params.order as string) || "top";
      const limit = (query.params.limit as number) || 100;
      const filters = query.params.filters as
        | { industry?: string; stage?: string }
        | undefined;

      if (!metricName) {
        return {
          type: "ranking",
          answer: "I need a metric name to rank companies.",
        };
      }

      const period = computePeriodFilter(query.params);
      const entries = await getMetricAcrossPortfolio(
        supabase,
        investorId,
        metricName,
        filters,
        period,
      );

      if (entries.length === 0) {
        return {
          type: "ranking",
          answer: `No data found for "${metricName}" across your portfolio.`,
        };
      }

      // Build sorted list
      const ranked = entries
        .map((e) => ({
          name: e.company.name,
          value: extractNumericValue(e.metric.value),
          period: formatPeriodLabel(
            e.metric.period_start,
            e.metric.period_end,
            e.metric.period_type,
          ),
        }))
        .filter((r): r is typeof r & { value: number } => r.value != null)
        .sort((a, b) =>
          order === "top" ? b.value - a.value : a.value - b.value,
        )
        .slice(0, limit);

      if (ranked.length === 0) {
        return {
          type: "ranking",
          answer: `No numeric ${metricName} data available for ranking.`,
        };
      }

      const direction = order === "top" ? "Top" : "Bottom";
      const countLabel = ranked.length === entries.length
        ? `All ${ranked.length}`
        : `${direction} ${ranked.length}`;
      const lines = ranked.map(
        (r, i) =>
          `${i + 1}. ${r.name}: ${formatValue(r.value, metricName)} (${r.period})`,
      );

      return {
        type: "ranking",
        answer: `${countLabel} companies by ${metricName}:\n${lines.join("\n")}`,
        data: ranked.map((r) => ({
          company: r.name,
          value: r.value,
          period: r.period,
        })),
        chartData: ranked.map((r) => ({
          label: r.name,
          value: r.value,
        })),
      };
    }

    /* -------------------------------------------------------------- */
    /*  time_series                                                     */
    /* -------------------------------------------------------------- */
    case "time_series": {
      const companyName = query.params.companyName as string;
      const metricName = query.params.metricName as string;
      const periods = (query.params.periods as number) || 4;
      const periodType = (query.params.periodType as "monthly" | "quarterly") || "quarterly";

      if (!companyName || !metricName) {
        return {
          type: "time_series",
          answer: "I need a company name and a metric name to show a trend.",
        };
      }

      const period = computePeriodFilter(query.params);
      const company = await findCompany(supabase, investorId, companyName);
      if (!company) {
        return {
          type: "time_series",
          answer: `I couldn't find "${companyName}" in your portfolio. Please check the company name.`,
        };
      }

      const { rows, usedPeriodType, fallback } = await getMetricTimeSeries(
        supabase,
        company.id,
        metricName,
        investorId,
        periodType,
        periods,
        period,
      );

      if (rows.length === 0) {
        return {
          type: "time_series",
          answer: `No ${metricName} data found for ${company.name}. The company may not have submitted this metric yet.`,
        };
      }

      const trendLines = rows.map((r) => {
        const num = extractNumericValue(r.value);
        const formatted = num != null ? formatValue(num, metricName) : String(r.value);
        const label = formatPeriodLabel(r.period_start, r.period_end, r.period_type);
        return `- ${label}: ${formatted}`;
      });

      let fallbackNote = "";
      if (fallback) {
        fallbackNote = `\n(Note: No ${periodType} data available — showing ${usedPeriodType} data.)`;
      }

      const chartData = rows
        .map((r) => ({
          label: formatPeriodLabel(r.period_start, r.period_end, r.period_type),
          value: extractNumericValue(r.value) ?? 0,
        }))
        .filter((d) => d.value !== 0 || rows.length === 1);

      return {
        type: "time_series",
        answer: `${company.name}'s ${metricName} trend:\n${trendLines.join("\n")}${fallbackNote}`,
        data: rows.map((r) => ({
          company: company.name,
          metric: metricName,
          value: extractNumericValue(r.value) ?? r.value,
          period: formatPeriodLabel(r.period_start, r.period_end, r.period_type),
        })),
        chartData,
        chartType: "line",
      };
    }

    /* -------------------------------------------------------------- */
    /*  unknown                                                         */
    /* -------------------------------------------------------------- */
    case "unknown":
    default: {
      const reason =
        (query.params.reason as string) ||
        "I wasn't able to understand that question.";
      return {
        type: "unknown",
        answer: `${reason} Try asking something like "What is Stripe's MRR?" or "Top 5 companies by revenue".`,
      };
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Format query result as plain text                                   */
/* ------------------------------------------------------------------ */

export function formatQueryResult(result: QueryResult): string {
  return result.answer;
}
