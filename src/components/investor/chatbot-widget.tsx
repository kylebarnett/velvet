"use client";

import * as React from "react";
import {
  Sparkles,
  ArrowUp,
  Loader2,
  AlertCircle,
  Clock,
  X,
  Trash2,
  TrendingUp,
  BarChart3,
  Target,
  Zap,
} from "lucide-react";
import {
  BarChart as RechartsBarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import { formatValue, getChartColor } from "@/components/charts/types";
import { useChartTheme } from "@/hooks/use-chart-theme";

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
  chartType?: "bar" | "line";
  timestamp: number;
};

/* ------------------------------------------------------------------ */
/*  Suggested queries                                                   */
/* ------------------------------------------------------------------ */

const SUGGESTED_QUERIES = [
  { text: "Top performers this quarter", icon: TrendingUp },
  { text: "Revenue trend over last 4 quarters", icon: TrendingUp },
  { text: "Companies with the highest growth", icon: Zap },
  { text: "What is the total ARR across my portfolio?", icon: Target },
  { text: "Top 5 companies by revenue", icon: BarChart3 },
  { text: "Which company has the lowest runway?", icon: AlertCircle },
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
  const chartTheme = useChartTheme();

  return (
    <div className="mt-3 rounded-lg border border-border-default bg-bg-input p-2">
      <ResponsiveContainer
        width="100%"
        height={Math.max(140, chartData.length * 36)}
      >
        <RechartsBarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={chartTheme.grid}
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fill: chartTheme.tick, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatValue(v, metricName)}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: chartTheme.secondaryLine, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: chartTheme.tooltipBg,
              border: `1px solid ${chartTheme.tooltipBorder}`,
              borderRadius: "8px",
              padding: "8px 12px",
              boxShadow: `0 4px 12px ${chartTheme.tooltipShadow}`,
            }}
            itemStyle={{ color: chartTheme.tooltipText, fontSize: 12 }}
            labelStyle={{
              color: chartTheme.tooltipLabel,
              fontSize: 11,
              marginBottom: 4,
            }}
            formatter={(value) => [
              formatValue(value as number, metricName),
              "Value",
            ]}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
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
/*  Inline line chart for time series results                           */
/* ------------------------------------------------------------------ */

function ResultLineChart({
  chartData,
  metricName,
}: {
  chartData: { label: string; value: number }[];
  metricName?: string;
}) {
  const chartTheme = useChartTheme();

  return (
    <div className="mt-3 rounded-lg border border-border-default bg-bg-input p-2">
      <ResponsiveContainer width="100%" height={180}>
        <RechartsLineChart
          data={chartData}
          margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={chartTheme.grid}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: chartTheme.tick, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: chartTheme.tick, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatValue(v, metricName)}
            width={60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: chartTheme.tooltipBg,
              border: `1px solid ${chartTheme.tooltipBorder}`,
              borderRadius: "8px",
              padding: "8px 12px",
              boxShadow: `0 4px 12px ${chartTheme.tooltipShadow}`,
            }}
            itemStyle={{ color: chartTheme.tooltipText, fontSize: 12 }}
            labelStyle={{
              color: chartTheme.tooltipLabel,
              fontSize: 11,
              marginBottom: 4,
            }}
            formatter={(value) => [
              formatValue(value as number, metricName),
              metricName ?? "Value",
            ]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={getChartColor(0)}
            strokeWidth={2}
            dot={{ r: 3, fill: getChartColor(0), strokeWidth: 0 }}
            activeDot={{ r: 5, fill: getChartColor(0), strokeWidth: 0 }}
          />
        </RechartsLineChart>
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
    <div className="mt-3 overflow-x-auto rounded-lg border border-border-default">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-border-default bg-bg-raised">
            {columns.map((col) => (
              <th
                key={col}
                className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-text-muted"
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
              className="border-b border-border-subtle last:border-b-0"
            >
              {columns.map((col) => (
                <td key={col} className="px-2 py-1.5 text-text-primary">
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
          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-text-muted"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ChatbotWidget                                                       */
/* ------------------------------------------------------------------ */

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [state, setState] = React.useState<QueryState>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [conversation, setConversation] = React.useState<ConversationEntry[]>(
    [],
  );
  const [recentQueries, setRecentQueries] = React.useState<string[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Load recent queries on mount
  React.useEffect(() => {
    setRecentQueries(loadRecentQueries());
  }, []);

  // Auto-scroll to latest result
  React.useEffect(() => {
    if (scrollRef.current && conversation.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation, state]);

  // Focus input when panel opens
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  // Close on Escape
  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  async function handleSubmit(queryText?: string) {
    const q = (queryText ?? input).trim();
    if (!q || state === "loading") return;

    setInput("");
    setState("loading");
    setError(null);

    try {
      // Send last 3 conversation turns for context
      const history = conversation.slice(-3).map((entry) => ({
        query: entry.query,
        answer: entry.answer.slice(0, 2000),
      }));

      const res = await fetch("/api/investors/portfolio/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, history: history.length > 0 ? history : undefined }),
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
        chartType: data.chartType,
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

  const hasConversation = conversation.length > 0;
  const showEmpty = !hasConversation && state !== "loading";

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <>
      {/* Floating button (visible when panel is closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-[45] flex h-12 w-12 items-center justify-center rounded-full bg-btn-primary-bg text-btn-primary-text shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
          aria-label="Open Ask AI chat"
          type="button"
        >
          <Sparkles className="h-5 w-5" />
        </button>
      )}

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[49] bg-bg-sidebar backdrop-blur-sm sm:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed bottom-0 right-0 z-[50] flex h-[600px] w-full flex-col rounded-t-2xl border border-border-default bg-bg-primary shadow-2xl sm:bottom-5 sm:right-5 sm:max-h-[70vh] sm:w-[420px] sm:rounded-2xl"
          role="dialog"
          aria-label="Ask AI chat"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--violet-bg-muted)]">
                <Sparkles className="h-3.5 w-3.5 text-[var(--violet-accent)]" />
              </div>
              <span className="text-sm font-medium">Ask AI</span>
            </div>
            <div className="flex items-center gap-1">
              {conversation.length > 0 && (
                <button
                  onClick={() => {
                    setConversation([]);
                    setError(null);
                    setState("idle");
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-hover hover:text-text-secondary"
                  aria-label="Clear chat"
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-hover hover:text-text-secondary"
                aria-label="Close chat"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Scrollable conversation area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-3"
          >
            {/* Empty state: suggested queries */}
            {showEmpty && (
              <div className="space-y-4">
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--tag-violet-bg)]">
                    <Sparkles className="h-5 w-5 text-[var(--violet-accent)]/70" />
                  </div>
                  <p className="mt-3 text-sm text-text-muted">
                    Ask about your portfolio
                  </p>
                </div>

                {/* Suggestion chips */}
                <div className="space-y-1.5">
                  {SUGGESTED_QUERIES.map((suggestion) => {
                    const Icon = suggestion.icon;
                    return (
                      <button
                        key={suggestion.text}
                        onClick={() => handleSuggestionClick(suggestion.text)}
                        className="flex w-full items-start gap-2 rounded-lg border border-border-subtle bg-bg-raised px-3 py-2 text-left text-xs text-text-secondary transition-colors hover:border-border-default hover:bg-bg-hover hover:text-text-primary"
                        type="button"
                      >
                        <Icon className="mt-0.5 h-3 w-3 shrink-0 text-text-faint" />
                        <span>{suggestion.text}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Recent queries */}
                {recentQueries.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wide text-text-faint">
                      Recent
                    </h3>
                    <div className="space-y-1">
                      {recentQueries.slice(0, 5).map((q, i) => (
                        <button
                          key={`${q}-${i}`}
                          onClick={() => handleSuggestionClick(q)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-secondary"
                          type="button"
                        >
                          <Clock className="h-3 w-3 shrink-0 text-text-faint" />
                          <span className="truncate">{q}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Conversation messages */}
            {hasConversation && (
              <div className="space-y-3">
                {conversation.map((entry) => (
                  <div key={entry.id} className="space-y-2">
                    {/* User message */}
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-xl bg-bg-hover px-3 py-2 text-xs">
                        {entry.query}
                      </div>
                    </div>

                    {/* AI response */}
                    <div className="flex gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--violet-bg-muted)]">
                        <Sparkles className="h-3 w-3 text-[var(--violet-accent)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="rounded-xl bg-bg-elevated px-3 py-2 text-xs leading-relaxed text-text-primary">
                          {entry.answer.split("\n").map((line, i) => (
                            <React.Fragment key={i}>
                              {line}
                              {i < entry.answer.split("\n").length - 1 && <br />}
                            </React.Fragment>
                          ))}

                          {entry.chartData && entry.chartData.length > 0 && (
                            entry.chartType === "line" ? (
                              <ResultLineChart
                                chartData={entry.chartData}
                                metricName={
                                  entry.data?.[0]?.metric as string | undefined
                                }
                              />
                            ) : (
                              <ResultBarChart
                                chartData={entry.chartData}
                                metricName={
                                  entry.data?.[0]?.metric as string | undefined
                                }
                              />
                            )
                          )}

                          {entry.data &&
                            entry.data.length > 0 &&
                            !entry.chartData && (
                              <ResultTable data={entry.data} />
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Loading indicator */}
            {state === "loading" && (
              <div className="mt-3 flex gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--violet-bg-muted)]">
                  <Sparkles className="h-3 w-3 text-[var(--violet-accent)]" />
                </div>
                <div className="rounded-xl bg-bg-elevated px-3 py-2">
                  <LoadingDots />
                </div>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="mx-4 mb-2">
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-xs text-[var(--status-error-text)]"
              >
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Input bar */}
          <div className="border-t border-border-default bg-bg-secondary px-3 py-3 sm:rounded-b-2xl">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your portfolio..."
                className="h-10 w-full rounded-lg border border-border-default bg-bg-elevated pl-3 pr-10 text-xs text-text-primary placeholder:text-text-faint focus:border-border-default focus:outline-none focus:ring-1 focus:ring-ring-focus"
                disabled={state === "loading"}
              />
              <button
                onClick={() => handleSubmit()}
                disabled={!input.trim() || state === "loading"}
                className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md bg-btn-primary-bg text-btn-primary-text transition-colors hover:bg-btn-primary-hover disabled:opacity-40 disabled:hover:bg-btn-primary-bg"
                type="button"
                aria-label="Send query"
              >
                {state === "loading" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowUp className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
