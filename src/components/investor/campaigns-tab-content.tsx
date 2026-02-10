"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Bell,
  X,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { SlidingTabs, TabItem } from "@/components/ui/sliding-tabs";
import { getCompanyLogoUrl } from "@/lib/utils/logo";
import { formatDate } from "@/lib/utils/format-date";

// ---------- Types ----------

type Campaign = {
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  periodType: string;
  totalRequests: number;
  submittedRequests: number;
  completionPercent: number;
  companyCount: number;
  companiesSubmitted: number;
  companiesPending: number;
  dueDate: string | null;
  isOverdue: boolean;
  scheduleName: string | null;
};

type CampaignCompany = {
  companyId: string;
  companyName: string;
  logoUrl: string | null;
  totalMetrics: number;
  submittedMetrics: number;
  completionPercent: number;
  status: "submitted" | "pending" | "overdue";
  lastSubmittedAt: string | null;
  dueDate: string | null;
  pendingRequestIds: string[];
  metrics: { name: string; status: string }[];
};

type PeriodFilter = "all" | "monthly" | "quarterly" | "annual";

const PERIOD_TABS: TabItem<PeriodFilter>[] = [
  { value: "all", label: "All" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];

const PAGE_SIZE = 20;

// ---------- Helpers ----------

function getProgressColor(percent: number): string {
  if (percent >= 80) return "bg-emerald-500";
  if (percent >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function getProgressTextColor(percent: number): string {
  if (percent >= 80) return "text-emerald-400";
  if (percent >= 40) return "text-amber-400";
  return "text-red-400";
}

function getPeriodBadgeClasses(periodType: string): string {
  switch (periodType) {
    case "quarterly":
      return "bg-[var(--tag-violet-bg)] text-[var(--tag-violet-text)]";
    case "monthly":
      return "bg-[var(--tag-blue-bg)] text-[var(--tag-blue-text)]";
    case "annual":
      return "bg-[var(--tag-amber-bg)] text-[var(--tag-amber-text)]";
    default:
      return "bg-bg-hover text-text-tertiary";
  }
}

function getDueDateContext(dueDate: string | null, isOverdue: boolean): { label: string; className: string } | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();

  if (isOverdue) {
    const daysOverdue = Math.floor(
      (now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24),
    );
    return {
      label: `Overdue ${daysOverdue}d`,
      className: "text-[var(--status-error-text)]",
    };
  }

  const daysUntil = Math.floor(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysUntil <= 7) {
    return {
      label: `Due in ${daysUntil}d`,
      className: "text-[var(--tag-amber-text)]",
    };
  }

  return { label: `Due ${formatDate(dueDate)}`, className: "text-text-muted" };
}

function getCompanyDueDateLabel(dueDate: string | null, status: string): string | null {
  if (status === "submitted") return null;
  if (!dueDate) return null;

  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.floor(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) return `Overdue ${Math.abs(diffDays)}d`;
  if (diffDays === 0) return "Due today";
  return `Due in ${diffDays}d`;
}

// ---------- Company Logo (lightweight inline version) ----------

function CompanyInitial({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  const [imgError, setImgError] = React.useState(false);
  const displayUrl = getCompanyLogoUrl(logoUrl);
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-subtle bg-bg-elevated">
      {displayUrl && !imgError ? (
        <img
          src={displayUrl}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-xs font-medium text-text-tertiary">{initial}</span>
      )}
    </div>
  );
}

// ---------- Campaign Card ----------

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const [expanded, setExpanded] = React.useState(false);
  const [companies, setCompanies] = React.useState<CampaignCompany[] | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [reminding, setReminding] = React.useState<string | null>(null); // companyId or "all"
  const [remindResult, setRemindResult] = React.useState<{
    sent: number;
    failed: number;
    devMode?: boolean;
  } | null>(null);

  // Auto-dismiss remind result
  React.useEffect(() => {
    if (remindResult) {
      const timer = setTimeout(() => setRemindResult(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [remindResult]);

  async function handleToggle() {
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);

    // Load detail data on first expand
    if (nextExpanded && !companies) {
      setDetailLoading(true);
      try {
        const periodKey = `${campaign.periodStart}_${campaign.periodEnd}`;
        const res = await fetch(`/api/investors/campaigns/${periodKey}`);
        if (res.ok) {
          const json = await res.json();
          setCompanies(json.companies ?? []);
        }
      } finally {
        setDetailLoading(false);
      }
    }
  }

  async function handleRemind(requestIds: string[], sourceId: string) {
    if (requestIds.length === 0) return;
    setReminding(sourceId);
    try {
      const res = await fetch("/api/investors/requests/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestIds }),
      });
      const json = await res.json();
      if (res.ok) {
        setRemindResult({
          sent: json.sent ?? 0,
          failed: json.failed ?? 0,
          devMode: json.devMode,
        });
      } else {
        setRemindResult({ sent: 0, failed: requestIds.length });
      }
    } catch {
      setRemindResult({ sent: 0, failed: requestIds.length });
    } finally {
      setReminding(null);
    }
  }

  function handleRemindAll() {
    if (!companies) return;
    const allPendingIds = companies.flatMap((c) => c.pendingRequestIds);
    handleRemind(allPendingIds, "all");
  }

  const dueDateCtx = getDueDateContext(campaign.dueDate, campaign.isOverdue);
  const pendingCompanyCount = campaign.companiesPending;

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-raised transition-colors">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-bg-hover/50 sm:p-5"
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1 space-y-3">
          {/* Top row: period label + type badge + due date */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-text-primary sm:text-lg">
              {campaign.periodLabel}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${getPeriodBadgeClasses(campaign.periodType)}`}
            >
              {campaign.periodType}
            </span>
            {campaign.scheduleName && (
              <span className="text-xs text-text-muted">
                via {campaign.scheduleName}
              </span>
            )}
            {dueDateCtx && (
              <span className={`ml-auto text-xs font-medium ${dueDateCtx.className}`}>
                {dueDateCtx.label}
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="h-1.5 w-full rounded-full bg-bg-hover">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${getProgressColor(campaign.completionPercent)}`}
                style={{ width: `${campaign.completionPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium tabular-nums ${getProgressTextColor(campaign.completionPercent)}`}>
                {campaign.completionPercent}%
              </span>
              <span className="text-xs text-text-muted tabular-nums">
                {campaign.submittedRequests}/{campaign.totalRequests} requests
              </span>
            </div>
          </div>

          {/* Company summary */}
          <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {campaign.companyCount} {campaign.companyCount === 1 ? "company" : "companies"}
            </span>
            <span className="text-text-faint">&middot;</span>
            <span className="text-[var(--status-success-text)]">
              {campaign.companiesSubmitted} submitted
            </span>
            {campaign.companiesPending > 0 && (
              <>
                <span className="text-text-faint">&middot;</span>
                <span className="text-[var(--status-warning-text)]">
                  {campaign.companiesPending} pending
                </span>
              </>
            )}
          </div>
        </div>

        {/* Expand icon */}
        <div className="mt-1 shrink-0 text-text-faint">
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Expanded detail */}
      <div
        className="grid transition-all duration-200"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border-subtle px-4 pb-4 pt-3 sm:px-5">
            {/* Remind result banner */}
            {remindResult && (
              <div
                className={`mb-3 flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                  remindResult.failed > 0 && remindResult.sent === 0
                    ? "border-[var(--status-error-bg)] bg-[var(--status-error-bg)] text-[var(--status-error-text)]"
                    : "border-[var(--status-success-bg)] bg-[var(--status-success-bg)] text-[var(--status-success-text)]"
                }`}
                role="alert"
              >
                <span>
                  {remindResult.devMode
                    ? `Dev mode: Would send ${remindResult.sent} reminder(s)`
                    : remindResult.sent > 0
                      ? `Sent ${remindResult.sent} reminder${remindResult.sent > 1 ? "s" : ""}`
                      : "Failed to send reminders"}
                </span>
                <button
                  type="button"
                  onClick={() => setRemindResult(null)}
                  className="ml-2 rounded p-0.5 hover:bg-bg-hover"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {detailLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
              </div>
            ) : companies && companies.length > 0 ? (
              <>
                <div className="mb-2 text-xs font-medium uppercase tracking-wider text-text-faint">
                  Company breakdown
                </div>

                <div className="flex flex-col gap-1">
                  {companies.map((company) => {
                    const statusBadge = getCompanyStatusBadge(company.status);
                    const dueDateLabel = getCompanyDueDateLabel(
                      company.dueDate,
                      company.status,
                    );

                    return (
                      <div
                        key={company.companyId}
                        className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-bg-hover/50"
                      >
                        <CompanyInitial
                          name={company.companyName}
                          logoUrl={company.logoUrl}
                        />

                        <Link
                          href={`/dashboard/${company.companyId}`}
                          className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary hover:underline"
                        >
                          {company.companyName}
                        </Link>

                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadge.className}`}
                        >
                          {statusBadge.label}
                        </span>

                        <span className="shrink-0 text-xs tabular-nums text-text-muted">
                          {company.submittedMetrics}/{company.totalMetrics}
                        </span>

                        {/* Date context */}
                        <span
                          className={`hidden shrink-0 text-xs sm:block ${
                            company.status === "overdue"
                              ? "text-[var(--status-error-text)]"
                              : company.status === "submitted"
                                ? "text-text-muted"
                                : "text-[var(--tag-amber-text)]"
                          }`}
                        >
                          {company.status === "submitted" && company.lastSubmittedAt
                            ? formatDate(company.lastSubmittedAt)
                            : dueDateLabel ?? ""}
                        </span>

                        {/* Remind button */}
                        {company.status !== "submitted" &&
                          company.pendingRequestIds.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemind(
                                  company.pendingRequestIds,
                                  company.companyId,
                                );
                              }}
                              disabled={reminding !== null}
                              className="shrink-0 rounded-md border border-border-default px-2 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:bg-bg-hover disabled:opacity-60"
                            >
                              {reminding === company.companyId ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Remind"
                              )}
                            </button>
                          )}
                      </div>
                    );
                  })}
                </div>

                {/* Bulk remind all pending */}
                {pendingCompanyCount > 0 && (
                  <div className="mt-3 flex justify-center border-t border-border-subtle pt-3">
                    <button
                      type="button"
                      onClick={handleRemindAll}
                      disabled={reminding !== null}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover disabled:opacity-60"
                    >
                      <Bell className="h-3 w-3" aria-hidden="true" />
                      {reminding === "all"
                        ? "Sending..."
                        : `Remind all pending (${pendingCompanyCount})`}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="py-4 text-center text-sm text-text-muted">
                No company data found for this period.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getCompanyStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "submitted":
      return {
        label: "Submitted",
        className: "bg-[var(--status-success-bg)] text-[var(--status-success-text)]",
      };
    case "overdue":
      return {
        label: "Overdue",
        className: "bg-[var(--status-error-bg)] text-[var(--status-error-text)]",
      };
    default:
      return {
        label: "Pending",
        className: "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]",
      };
  }
}

// ---------- Main Component ----------

export function CampaignsTabContent() {
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [total, setTotal] = React.useState(0);
  const [summary, setSummary] = React.useState({ activeCampaigns: 0, companiesAwaiting: 0 });
  const [loading, setLoading] = React.useState(true);
  const [periodFilter, setPeriodFilter] = React.useState<PeriodFilter>("all");
  const [page, setPage] = React.useState(0);

  const fetchCampaigns = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(page * PAGE_SIZE));
      if (periodFilter !== "all") {
        params.set("periodType", periodFilter);
      }

      const res = await fetch(`/api/investors/campaigns?${params}`);
      if (res.ok) {
        const json = await res.json();
        setCampaigns(json.campaigns ?? []);
        setTotal(json.total ?? 0);
        if (json.summary) setSummary(json.summary);
      }
    } finally {
      setLoading(false);
    }
  }, [page, periodFilter]);

  React.useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Reset page when filter changes
  React.useEffect(() => {
    setPage(0);
  }, [periodFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border-default bg-bg-elevated p-4">
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            Active campaigns
          </div>
          <div className="mt-2 text-2xl font-semibold">{summary.activeCampaigns}</div>
        </div>
        <div className="rounded-xl border border-border-default bg-bg-elevated p-4">
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Companies awaiting
          </div>
          <div className="mt-2 text-2xl font-semibold">{summary.companiesAwaiting}</div>
        </div>
      </div>

      {/* Period filter tabs */}
      <SlidingTabs
        tabs={PERIOD_TABS}
        value={periodFilter}
        onChange={setPeriodFilter}
        size="sm"
        showIcons={false}
      />

      {/* Campaign list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border-subtle bg-bg-raised p-5"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-20 animate-pulse rounded bg-bg-hover" />
                  <div className="h-4 w-16 animate-pulse rounded-full bg-bg-hover" />
                </div>
                <div className="h-1.5 w-full animate-pulse rounded-full bg-bg-hover" />
                <div className="flex items-center gap-2">
                  <div className="h-3.5 w-3.5 animate-pulse rounded bg-bg-hover" />
                  <div className="h-3 w-40 animate-pulse rounded bg-bg-hover" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-xl border border-border-default bg-bg-elevated p-6 text-center">
          <div className="text-sm text-text-tertiary">
            {periodFilter !== "all"
              ? "No campaigns match the selected filter."
              : "No campaigns yet. Create a request or set up a schedule to start tracking."}
          </div>
          {periodFilter === "all" && (
            <div className="mt-2">
              <Link
                href="/campaigns/new"
                className="text-sm text-text-primary underline underline-offset-4 hover:text-text-secondary"
              >
                Create your first request
              </Link>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={`${campaign.periodStart}_${campaign.periodEnd}`}
                campaign={campaign}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-tertiary">
                Showing {page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border-default text-text-tertiary hover:bg-bg-elevated disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 text-sm text-text-tertiary">
                  {page + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border-default text-text-tertiary hover:bg-bg-elevated disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
