"use client";

import * as React from "react";
import {
  Sparkles,
  ArrowUp,
  Loader2,
  AlertCircle,
  Clock,
  MessageSquare,
  TrendingUp,
  BarChart3,
  Target,
  Zap,
} from "lucide-react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import { formatValue, getChartColor } from "@/components/charts/types";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type QueryState = "idle" | "loading" | "error";

type ConversationEntry = {
  id: string;
  query: string;
  answer: string;
  queryType: string;
  data?: Record<string, unknown>[];
  chartData?: { label: string; value: number }[];
  timestamp: number;
};

/* ------------------------------------------------------------------ */
/*  Suggested queries                                                   */
/* ------------------------------------------------------------------ */

const SUGGESTED_QUERIES = [
  {
    text: "Top performers this quarter",
    icon: TrendingUp,
  },
  {
    text: "Average burn rate by stage",
    icon: BarChart3,
  },
  {
    text: "Companies with the highest growth",
    icon: Zap,
  },
  {
    text: "What is the total ARR across my portfolio?",
    icon: Target,
  },
  {
    text: "Top 5 companies by revenue",
    icon: BarChart3,
  },
  {
    text: "Which company has the lowest runway?",
    icon: AlertCircle,
  },
];

/* ------------------------------------------------------------------ */
/*  localStorage helpers for recent queries                             */
/* ------------------------------------------------------------------ */

const RECENT_KEY = "velvet:recent-queries";
const MAX_RECENT = 10;

function loadRecentQueries(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as string[];
  } catch {
    return [];
  }
}

function saveRecentQuery(query: string): void {
  try {
    const recent = loadRecentQueries().filter(
      (q) => q.toLowerCase() !== query.toLowerCase(),
    );
    recent.unshift(query);
    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify(recent.slice(0, MAX_RECENT)),
    );
  } catch {
    // localStorage may be unavailable
  }
}

/* ------------------------------------------------------------------ */
/*  Inline bar chart for results                                        */
/* ------------------------------------------------------------------ */

function ResultBarChart({
  chartData,
  metricName,
}: {
  chartData: { label: string; value: number }[];
  metricName?: string;
}) {
  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3">
      <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 40)}>
        <RechartsBarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.06)"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatValue(v, metricName)}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={100}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(9, 9, 11, 0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              padding: "8px 12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            }}
            itemStyle={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}
            labelStyle={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 11,
              marginBottom: 4,
            }}
            formatter={(value) => [
              formatValue(value as number, metricName),
              "Value",
            ]}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
            {chartData.map((_, index) => (
              <Cell key={index} fill={getChartColor(index)} />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline data table for results                                       */
/* ------------------------------------------------------------------ */

function ResultTable({ data }: { data: Record<string, unknown>[] }) {
  if (data.length === 0) return null;
  const columns = Object.keys(data[0]);

  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.03]">
            {columns.map((col) => (
              <th
                key={col}
                className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-white/50"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className="border-b border-white/[0.06] last:border-b-0"
            >
              {columns.map((col) => (
                <td key={col} className="px-3 py-2 text-white/80">
                  {row[col] == null ? "-" : String(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Three-dot loading animation                                         */
/* ------------------------------------------------------------------ */

function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-2 w-2 animate-pulse rounded-full bg-white/40"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  QueryClient                                                         */
/* ------------------------------------------------------------------ */

export function QueryClient() {
  const [input, setInput] = React.useState("");
  const [state, setState] = React.useState<QueryState>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [conversation, setConversation] = React.useState<ConversationEntry[]>(
    [],
  );
  const [recentQueries, setRecentQueries] = React.useState<string[]>([]);
  const resultsEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Load recent queries on mount
  React.useEffect(() => {
    setRecentQueries(loadRecentQueries());
  }, []);

  // Auto-scroll to latest result
  React.useEffect(() => {
    if (conversation.length > 0) {
      resultsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation]);

  async function handleSubmit(queryText?: string) {
    const q = (queryText ?? input).trim();
    if (!q || state === "loading") return;

    setInput("");
    setState("loading");
    setError(null);

    try {
      const res = await fetch("/api/investors/portfolio/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      const entry: ConversationEntry = {
        id: crypto.randomUUID(),
        query: q,
        answer: data.answer,
        queryType: data.queryType,
        data: data.data,
        chartData: data.chartData,
        timestamp: Date.now(),
      };

      setConversation((prev) => [...prev, entry]);
      saveRecentQuery(q);
      setRecentQueries(loadRecentQueries());
      setState("idle");
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "An unexpected error occurred.";
      setError(msg);
      setState("error");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleSuggestionClick(text: string) {
    setInput(text);
    handleSubmit(text);
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-6 w-6 text-violet-400" />
          <h1 className="text-2xl font-semibold">Ask AI</h1>
        </div>
        <p className="mt-1 text-sm text-white/60">
          Ask questions about your portfolio in plain English
        </p>
      </div>

      {/* Layout: main + sidebar */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Left column: input + conversation */}
        <div className="min-w-0 space-y-4">
          {/* Query input */}
          <div className="relative">
            <Sparkles className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your portfolio..."
              className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-12 text-sm text-zinc-50 placeholder:text-white/30 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10"
              disabled={state === "loading"}
            />
            <button
              onClick={() => handleSubmit()}
              disabled={!input.trim() || state === "loading"}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-white text-black transition-colors hover:bg-white/90 disabled:opacity-40 disabled:hover:bg-white"
              type="button"
              aria-label="Send query"
            >
              {state === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Conversation history */}
          {conversation.length > 0 && (
            <div className="space-y-4">
              {conversation.map((entry) => (
                <div key={entry.id} className="space-y-3">
                  {/* User message */}
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-xl bg-white/10 px-4 py-3 text-sm">
                      {entry.query}
                    </div>
                  </div>

                  {/* AI response */}
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/20">
                      <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="rounded-xl bg-white/5 px-4 py-3 text-sm leading-relaxed text-white/90">
                        {/* Render answer with line breaks */}
                        {entry.answer.split("\n").map((line, i) => (
                          <React.Fragment key={i}>
                            {line}
                            {i < entry.answer.split("\n").length - 1 && <br />}
                          </React.Fragment>
                        ))}

                        {/* Chart data visualization */}
                        {entry.chartData && entry.chartData.length > 0 && (
                          <ResultBarChart
                            chartData={entry.chartData}
                            metricName={
                              entry.data?.[0]?.metric as string | undefined
                            }
                          />
                        )}

                        {/* Data table (only when no chart data) */}
                        {entry.data &&
                          entry.data.length > 0 &&
                          !entry.chartData && <ResultTable data={entry.data} />}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={resultsEndRef} />
            </div>
          )}

          {/* Loading indicator */}
          {state === "loading" && (
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/20">
                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              </div>
              <div className="rounded-xl bg-white/5 px-4 py-3">
                <LoadingDots />
              </div>
            </div>
          )}

          {/* Empty state */}
          {conversation.length === 0 && state === "idle" && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10">
                <MessageSquare className="h-7 w-7 text-violet-400/70" />
              </div>
              <p className="mt-4 text-sm text-white/50">
                Ask a question to get started
              </p>
              <p className="mt-1 text-xs text-white/30">
                Try clicking one of the suggested questions
              </p>
            </div>
          )}
        </div>

        {/* Right sidebar: suggestions + recent */}
        <div className="space-y-6">
          {/* Suggested questions */}
          <div>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
              Suggested Questions
            </h2>
            <div className="space-y-2">
              {SUGGESTED_QUERIES.map((suggestion) => {
                const Icon = suggestion.icon;
                return (
                  <button
                    key={suggestion.text}
                    onClick={() => handleSuggestionClick(suggestion.text)}
                    disabled={state === "loading"}
                    className="flex w-full items-start gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left text-sm text-white/70 transition-colors hover:border-white/10 hover:bg-white/5 hover:text-white/90 disabled:opacity-50"
                    type="button"
                  >
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/30" />
                    <span>{suggestion.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent queries */}
          {recentQueries.length > 0 && (
            <div>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
                Recent Queries
              </h2>
              <div className="space-y-1.5">
                {recentQueries.map((q, i) => (
                  <button
                    key={`${q}-${i}`}
                    onClick={() => handleSuggestionClick(q)}
                    disabled={state === "loading"}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-white/50 transition-colors hover:bg-white/5 hover:text-white/70 disabled:opacity-50"
                    type="button"
                  >
                    <Clock className="h-3.5 w-3.5 shrink-0 text-white/20" />
                    <span className="truncate">{q}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
