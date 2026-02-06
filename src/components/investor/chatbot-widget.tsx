"use client";

import * as React from "react";
import {
  Sparkles,
  ArrowUp,
  Loader2,
  AlertCircle,
  Clock,
  X,
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
  { text: "Top performers this quarter", icon: TrendingUp },
  { text: "Average burn rate by stage", icon: BarChart3 },
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
  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-2">
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
            stroke="rgba(255,255,255,0.06)"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatValue(v, metricName)}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={80}
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
/*  Inline data table for results                                       */
/* ------------------------------------------------------------------ */

function ResultTable({ data }: { data: Record<string, unknown>[] }) {
  if (data.length === 0) return null;
  const columns = Object.keys(data[0]);

  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.03]">
            {columns.map((col) => (
              <th
                key={col}
                className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-white/50"
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
                <td key={col} className="px-2 py-1.5 text-white/80">
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
          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white/40"
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
          className="fixed bottom-5 right-5 z-[45] flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-950 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
          aria-label="Open Ask AI chat"
          type="button"
        >
          <Sparkles className="h-5 w-5" />
        </button>
      )}

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[49] bg-black/40 backdrop-blur-sm sm:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed bottom-0 right-0 z-[50] flex h-[600px] w-full flex-col rounded-t-2xl border border-white/10 bg-zinc-950 shadow-2xl sm:bottom-5 sm:right-5 sm:max-h-[70vh] sm:w-[420px] sm:rounded-2xl"
          role="dialog"
          aria-label="Ask AI chat"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/20">
                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              </div>
              <span className="text-sm font-medium">Ask AI</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
              aria-label="Close chat"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                    <Sparkles className="h-5 w-5 text-violet-400/70" />
                  </div>
                  <p className="mt-3 text-sm text-white/50">
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
                        className="flex w-full items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-left text-xs text-white/70 transition-colors hover:border-white/10 hover:bg-white/5 hover:text-white/90"
                        type="button"
                      >
                        <Icon className="mt-0.5 h-3 w-3 shrink-0 text-white/30" />
                        <span>{suggestion.text}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Recent queries */}
                {recentQueries.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-white/30">
                      Recent
                    </h3>
                    <div className="space-y-1">
                      {recentQueries.slice(0, 5).map((q, i) => (
                        <button
                          key={`${q}-${i}`}
                          onClick={() => handleSuggestionClick(q)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-white/50 transition-colors hover:bg-white/5 hover:text-white/70"
                          type="button"
                        >
                          <Clock className="h-3 w-3 shrink-0 text-white/20" />
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
                      <div className="max-w-[85%] rounded-xl bg-white/10 px-3 py-2 text-xs">
                        {entry.query}
                      </div>
                    </div>

                    {/* AI response */}
                    <div className="flex gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/20">
                        <Sparkles className="h-3 w-3 text-violet-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="rounded-xl bg-white/5 px-3 py-2 text-xs leading-relaxed text-white/90">
                          {entry.answer.split("\n").map((line, i) => (
                            <React.Fragment key={i}>
                              {line}
                              {i < entry.answer.split("\n").length - 1 && <br />}
                            </React.Fragment>
                          ))}

                          {entry.chartData && entry.chartData.length > 0 && (
                            <ResultBarChart
                              chartData={entry.chartData}
                              metricName={
                                entry.data?.[0]?.metric as string | undefined
                              }
                            />
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
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/20">
                  <Sparkles className="h-3 w-3 text-violet-400" />
                </div>
                <div className="rounded-xl bg-white/5 px-3 py-2">
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
                className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200"
              >
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Input bar */}
          <div className="border-t border-white/10 bg-zinc-900 px-3 py-3 sm:rounded-b-2xl">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your portfolio..."
                className="h-10 w-full rounded-lg border border-white/10 bg-white/5 pl-3 pr-10 text-xs text-zinc-50 placeholder:text-white/30 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10"
                disabled={state === "loading"}
              />
              <button
                onClick={() => handleSubmit()}
                disabled={!input.trim() || state === "loading"}
                className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md bg-white text-black transition-colors hover:bg-white/90 disabled:opacity-40 disabled:hover:bg-white"
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
