"use client";

import * as React from "react";
import Link from "next/link";
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

type MetricDetail = {
  id: string;
  metricName: string;
  status: string;
  dueDate: string | null;
  periodStart: string;
  periodEnd: string;
};

type CompanyCompletion = {
  id: string;
  name: string;
  total: number;
  submitted: number;
  metrics: MetricDetail[];
};

type PortfolioCompletionCardProps = {
  companies: CompanyCompletion[];
  totalRequests: number;
  submittedRequests: number;
  quarterLabel: string;
};

function getProgressColor(percent: number): string {
  if (percent >= 80) return "bg-emerald-500";
  if (percent >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function getTextColor(percent: number): string {
  if (percent >= 80) return "text-emerald-400";
  if (percent >= 40) return "text-amber-400";
  return "text-red-400";
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function countOverdue(companies: CompanyCompletion[]): number {
  return companies.reduce(
    (acc, c) =>
      acc +
      c.metrics.filter((m) => m.status !== "submitted" && isOverdue(m.dueDate))
        .length,
    0
  );
}

export function PortfolioCompletionCard({
  companies,
  totalRequests,
  submittedRequests,
  quarterLabel,
}: PortfolioCompletionCardProps) {
  const [expanded, setExpanded] = React.useState(false);

  const completionPercent =
    totalRequests > 0
      ? Math.round((submittedRequests / totalRequests) * 100)
      : 0;

  const overdueCount = countOverdue(companies);

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-raised">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between p-4 text-left transition-colors hover:bg-bg-raised"
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-text-muted">
            <BarChart3 className="h-3.5 w-3.5" />
            Portfolio Completion
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span
              className={`text-2xl font-semibold tracking-tight ${getTextColor(completionPercent)}`}
            >
              {completionPercent}%
            </span>
            {overdueCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-[var(--status-error-text)]">
                <AlertTriangle className="h-3 w-3" />
                {overdueCount} overdue
              </span>
            )}
          </div>
          <div className="mt-2">
            <div className="h-1.5 w-full rounded-full bg-bg-hover">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${getProgressColor(completionPercent)}`}
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-text-muted">
              {submittedRequests} of {totalRequests} requests fulfilled &middot;{" "}
              {quarterLabel}
            </div>
          </div>
        </div>
        <div className="ml-3 mt-1 shrink-0 text-text-faint">
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <div
        className="grid transition-all duration-200"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          {companies.length > 0 && (
            <div className="border-t border-border-subtle px-4 pb-4 pt-3">
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-text-faint">
                Per company
              </div>
              <div className="flex flex-col gap-1.5">
                {companies.map((company) => {
                  const pct =
                    company.total > 0
                      ? Math.round(
                          (company.submitted / company.total) * 100
                        )
                      : 0;
                  const companyOverdue = company.metrics.filter(
                    (m) =>
                      m.status !== "submitted" && isOverdue(m.dueDate)
                  ).length;

                  return (
                    <Link
                      key={company.id}
                      href={`/dashboard/${company.id}`}
                      className="group flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-bg-raised"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="truncate text-sm font-medium text-text-primary group-hover:text-text-primary">
                              {company.name}
                            </span>
                            {companyOverdue > 0 && (
                              <span className="inline-flex items-center gap-0.5 shrink-0 text-[11px] text-red-400">
                                <AlertTriangle className="h-3 w-3" />
                                {companyOverdue}
                              </span>
                            )}
                          </div>
                          <span className="ml-2 shrink-0 text-xs tabular-nums text-text-muted">
                            {company.submitted}/{company.total}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1 flex-1 rounded-full bg-bg-hover">
                            <div
                              className={`h-1 rounded-full transition-all ${getProgressColor(pct)}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span
                            className={`shrink-0 text-[11px] tabular-nums font-medium ${getTextColor(pct)}`}
                          >
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-faint transition-colors group-hover:text-text-muted" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
