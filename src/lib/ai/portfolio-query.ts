import type { SupabaseClient } from "@supabase/supabase-js";
import {
  aggregateMetricValues,
  extractNumericValue,
} from "@/lib/reports/aggregation";
import { formatValue } from "@/components/charts/types";

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
  "type": "metric_lookup" | "comparison" | "aggregation" | "ranking",
  "params": { ... }
}

Query types:
1. metric_lookup: Get a specific metric for a specific company
   params: { companyName: string, metricName: string, periodType?: string }
   Example: "What is Stripe's MRR?" → { "type": "metric_lookup", "params": { "companyName": "Stripe", "metricName": "MRR" } }

2. comparison: Compare a metric across 2+ companies
   params: { companyNames: string[], metricName: string, periodType?: string }
   Example: "Compare revenue of Stripe vs Plaid" → { "type": "comparison", "params": { "companyNames": ["Stripe", "Plaid"], "metricName": "Revenue" } }

3. aggregation: Calculate aggregate stats across portfolio
   params: { metricName: string, aggregation: "average" | "sum" | "median" | "min" | "max", filters?: { industry?: string, stage?: string } }
   Example: "What's the average burn rate?" → { "type": "aggregation", "params": { "metricName": "Burn Rate", "aggregation": "average" } }

4. ranking: Rank companies by a metric
   params: { metricName: string, order: "top" | "bottom", limit: number, filters?: { industry?: string, stage?: string } }
   Example: "Top 5 companies by revenue" → { "type": "ranking", "params": { "metricName": "Revenue", "order": "top", "limit": 5 } }

Rules:
- Map informal language to standard metric names (e.g., "burn" → "Burn Rate", "revenue" → "Revenue")
- Default to latest period unless a specific period is mentioned
- Default limit to 5 for rankings unless specified
- If the question is ambiguous or you can't map it, output: { "type": "unknown", "params": { "reason": "..." } }

Respond with valid JSON only.`;

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type StructuredQueryType =
  | "metric_lookup"
  | "comparison"
  | "aggregation"
  | "ranking"
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
};

/* ------------------------------------------------------------------ */
/*  NL → Structured Query (AI)                                          */
/* ------------------------------------------------------------------ */

export async function parseNaturalLanguageQuery(
  query: string,
): Promise<StructuredQuery> {
  const geminiKey = process.env.GOOGLE_AI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey) {
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: PORTFOLIO_QUERY_SYSTEM_PROMPT }],
          },
          contents: [{ parts: [{ text: query }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      },
    );
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as StructuredQuery;
  } else if (openaiKey) {
    const model = process.env.OPENAI_EXTRACTION_MODEL || "gpt-4o-mini";
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
          messages: [
            { role: "system", content: PORTFOLIO_QUERY_SYSTEM_PROMPT },
            { role: "user", content: query },
          ],
          response_format: { type: "json_object" },
        }),
      },
    );
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as StructuredQuery;
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

/**
 * Find a company in the investor's portfolio by name (case-insensitive).
 */
async function findCompany(
  supabase: SupabaseClient,
  investorId: string,
  companyName: string,
): Promise<CompanyRow | null> {
  const { data } = await supabase
    .from("investor_company_relationships")
    .select("companies(id, name, industry, stage)")
    .eq("investor_id", investorId)
    .not("approval_status", "eq", "denied");

  if (!data) return null;

  const lowerName = companyName.toLowerCase();
  for (const row of data) {
    const raw = row.companies;
    const company = (Array.isArray(raw) ? raw[0] : raw) as CompanyRow | null;
    if (company && company.name.toLowerCase() === lowerName) {
      return company;
    }
  }
  return null;
}

/**
 * Fetch the latest metric value for a given company and metric name.
 */
async function getLatestMetricValue(
  supabase: SupabaseClient,
  companyId: string,
  metricName: string,
): Promise<MetricRow | null> {
  const { data } = await supabase
    .from("company_metric_values")
    .select("metric_name, value, period_type, period_start, period_end")
    .eq("company_id", companyId)
    .ilike("metric_name", metricName)
    .order("period_end", { ascending: false })
    .limit(1);

  return data && data.length > 0 ? (data[0] as MetricRow) : null;
}

/**
 * Fetch the latest value of a metric for every company in the investor's portfolio.
 */
async function getMetricAcrossPortfolio(
  supabase: SupabaseClient,
  investorId: string,
  metricName: string,
  filters?: { industry?: string; stage?: string },
): Promise<{ company: CompanyRow; metric: MetricRow }[]> {
  // Get all portfolio companies
  const { data: relData } = await supabase
    .from("investor_company_relationships")
    .select("companies(id, name, industry, stage)")
    .eq("investor_id", investorId)
    .not("approval_status", "eq", "denied");
  if (!relData) return [];

  const companies: CompanyRow[] = [];
  for (const row of relData) {
    const raw = row.companies;
    const company = (Array.isArray(raw) ? raw[0] : raw) as CompanyRow | null;
    if (!company) continue;

    // Apply optional filters
    if (filters?.industry && company.industry?.toLowerCase() !== filters.industry.toLowerCase()) {
      continue;
    }
    if (filters?.stage && company.stage?.toLowerCase() !== filters.stage.toLowerCase()) {
      continue;
    }
    companies.push(company);
  }

  // Fetch latest metric for each company
  const results: { company: CompanyRow; metric: MetricRow }[] = [];
  for (const company of companies) {
    const metric = await getLatestMetricValue(supabase, company.id, metricName);
    if (metric) {
      results.push({ company, metric });
    }
  }

  return results;
}

/* ------------------------------------------------------------------ */
/*  Period formatting helper                                            */
/* ------------------------------------------------------------------ */

function formatPeriodLabel(periodStart: string, periodEnd: string, periodType: string): string {
  const start = new Date(periodStart);
  if (periodType === "quarterly") {
    const quarter = Math.floor(start.getMonth() / 3) + 1;
    return `Q${quarter} ${start.getFullYear()}`;
  }
  if (periodType === "monthly") {
    return start.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  if (periodType === "yearly") {
    return start.getFullYear().toString();
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

      const company = await findCompany(supabase, investorId, companyName);
      if (!company) {
        return {
          type: "metric_lookup",
          answer: `I couldn't find "${companyName}" in your portfolio. Please check the company name.`,
        };
      }

      const metric = await getLatestMetricValue(
        supabase,
        company.id,
        metricName,
      );
      if (!metric) {
        return {
          type: "metric_lookup",
          answer: `No data found for "${metricName}" for ${company.name}. The company may not have submitted this metric yet.`,
        };
      }

      const numValue = extractNumericValue(metric.value);
      const formatted = numValue != null ? formatValue(numValue, metricName) : String(metric.value);
      const period = formatPeriodLabel(metric.period_start, metric.period_end, metric.period_type);

      return {
        type: "metric_lookup",
        answer: `${company.name}'s ${metric.metric_name} is ${formatted} (as of ${period}).`,
        data: [
          {
            company: company.name,
            metric: metric.metric_name,
            value: numValue ?? metric.value,
            period,
          },
        ],
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

      const rows: {
        name: string;
        value: number | null;
        period: string;
      }[] = [];

      for (const name of companyNames) {
        const company = await findCompany(supabase, investorId, name);
        if (!company) {
          rows.push({ name, value: null, period: "N/A" });
          continue;
        }
        const metric = await getLatestMetricValue(
          supabase,
          company.id,
          metricName,
        );
        if (!metric) {
          rows.push({ name: company.name, value: null, period: "N/A" });
          continue;
        }
        const numValue = extractNumericValue(metric.value);
        const period = formatPeriodLabel(metric.period_start, metric.period_end, metric.period_type);
        rows.push({ name: company.name, value: numValue, period });
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

      return {
        type: "comparison",
        answer: `${metricName} comparison:\n${lines.join("\n")}`,
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

      const entries = await getMetricAcrossPortfolio(
        supabase,
        investorId,
        metricName,
        filters,
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
      const limit = (query.params.limit as number) || 5;
      const filters = query.params.filters as
        | { industry?: string; stage?: string }
        | undefined;

      if (!metricName) {
        return {
          type: "ranking",
          answer: "I need a metric name to rank companies.",
        };
      }

      const entries = await getMetricAcrossPortfolio(
        supabase,
        investorId,
        metricName,
        filters,
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
      const lines = ranked.map(
        (r, i) =>
          `${i + 1}. ${r.name}: ${formatValue(r.value, metricName)} (${r.period})`,
      );

      return {
        type: "ranking",
        answer: `${direction} ${ranked.length} companies by ${metricName}:\n${lines.join("\n")}`,
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
