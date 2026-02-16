"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  ChevronRight,
  FileSpreadsheet,
  LayoutGrid,
  List,
  Trash2,
} from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { SlidingTabs, SlidingIconTabs, TabItem } from "@/components/ui/sliding-tabs";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { TearSheetViewer } from "@/components/investor/tear-sheet-viewer";
import type { TearSheetMetric } from "@/components/investor/tear-sheet-viewer";
import { NewTearSheetModal } from "@/components/investor/new-tear-sheet-modal";
import { logActivity } from "@/lib/activity/log-activity";
import { logger } from "@/lib/logger";

type TearSheet = {
  id: string;
  title: string;
  quarter: string;
  year: number;
  status: string;
  share_enabled: boolean;
  share_token: string | null;
  created_at: string;
  updated_at: string;
  creator_role: string;
  company_id: string;
  companyName: string | null;
  content?: Record<string, unknown>;
};

type Company = {
  id: string;
  name: string;
};

type ViewMode = "grid" | "list";
type SortField = "date" | "company";
type SortDir = "asc" | "desc";
type QuarterFilter = "All" | "Q1" | "Q2" | "Q3" | "Q4";
type SourceFilter = "all" | "founder" | "mine";

const SOURCE_TABS: TabItem<SourceFilter>[] = [
  { value: "all", label: "All" },
  { value: "founder", label: "Founder" },
  { value: "mine", label: "Mine" },
];

const QUARTER_TABS: TabItem<QuarterFilter>[] = [
  { value: "All", label: "All" },
  { value: "Q1", label: "Q1" },
  { value: "Q2", label: "Q2" },
  { value: "Q3", label: "Q3" },
  { value: "Q4", label: "Q4" },
];

const VIEW_MODE_TABS: { value: ViewMode; icon: typeof LayoutGrid; label: string }[] = [
  { value: "grid", icon: LayoutGrid, label: "Grid view" },
  { value: "list", icon: List, label: "List view" },
];

function quarterNum(q: string): number {
  return { Q1: 1, Q2: 2, Q3: 3, Q4: 4 }[q] ?? 0;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-border-default card-surface p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded bg-bg-hover" />
              <div className="h-3 w-24 rounded bg-bg-elevated" />
              <div className="flex gap-2">
                <div className="h-5 w-16 rounded-full bg-bg-hover" />
                <div className="h-5 w-14 rounded bg-bg-elevated" />
                <div className="h-5 w-14 rounded bg-bg-elevated" />
              </div>
            </div>
            <div className="h-5 w-5 rounded bg-bg-elevated" />
          </div>
          <div className="mt-3 h-3 w-28 rounded bg-bg-elevated" />
        </div>
      ))}
    </div>
  );
}

function CreatorBadge({ role }: { role: string }) {
  const isInvestor = role === "investor";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        isInvestor
          ? "bg-[var(--tag-blue-bg)] text-[var(--tag-blue-text)]"
          : "bg-[var(--tag-violet-bg)] text-[var(--tag-violet-text)]"
      }`}
    >
      {isInvestor ? "Mine" : "Founder"}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        status === "published"
          ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]"
          : "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]"
      }`}
    >
      {status === "published" ? "Published" : "Draft"}
    </span>
  );
}

export default function InvestorTearSheetsPage() {
  const router = useRouter();

  const [tearSheets, setTearSheets] = React.useState<TearSheet[]>([]);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [filterSource, setFilterSource] = React.useState<SourceFilter>("all");
  const [filterQuarter, setFilterQuarter] = React.useState<QuarterFilter>("All");
  const [filterCompany, setFilterCompany] = React.useState("All");
  const [filterYear, setFilterYear] = React.useState("All");
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid");
  const [sortField, setSortField] = React.useState<SortField>("date");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");

  // Create modal state
  const [showCreateModal, setShowCreateModal] = React.useState(false);

  // Delete state
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  // Viewer state (for founder tear sheets)
  const [viewerTearSheet, setViewerTearSheet] = React.useState<TearSheet | null>(null);
  const [viewerMetrics, setViewerMetrics] = React.useState<TearSheetMetric[]>([]);
  const [viewerLoading, setViewerLoading] = React.useState(false);

  // Load tear sheets and companies
  React.useEffect(() => {
    async function load() {
      try {
        const [tsRes, compRes] = await Promise.all([
          fetch("/api/investors/tear-sheets"),
          fetch("/api/investors/companies?limit=200"),
        ]);
        const tsJson = await tsRes.json().catch(() => null);
        const compJson = await compRes.json().catch(() => null);

        if (!tsRes.ok) throw new Error(tsJson?.error ?? "Failed to load tear sheets.");

        setTearSheets(tsJson.tearSheets ?? []);

        if (compRes.ok && compJson?.companies) {
          const mapped: Company[] = compJson.companies
            .filter(
              (c: Record<string, unknown>) =>
                c.approvalStatus === "approved" || c.approvalStatus === "auto_approved"
            )
            .map((c: Record<string, unknown>) => ({
              id: c.id as string,
              name: (c.name as string) ?? "Unnamed",
            }));
          setCompanies(mapped);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // Handle clicking a tear sheet
  function handleClickTearSheet(ts: TearSheet) {
    if (ts.creator_role === "investor") {
      router.push(`/tear-sheets/${ts.id}`);
      return;
    }

    // Founder tear sheet — open viewer
    setViewerTearSheet(ts);
    setViewerLoading(true);
    setViewerMetrics([]);

    logActivity({
      companyId: ts.company_id,
      action: "view_tear_sheet",
      metadata: { tear_sheet_title: ts.title, quarter: ts.quarter, year: ts.year },
    });

    fetch(`/api/investors/companies/${ts.company_id}/tear-sheets/${ts.id}/metrics`)
      .then((res) => res.json())
      .then((json) => {
        setViewerMetrics(json.metrics ?? []);
        // Update the tear sheet with content from the response
        if (json.tearSheet) {
          setViewerTearSheet((prev) =>
            prev ? { ...prev, content: json.tearSheet.content } : prev
          );
        }
      })
      .catch((e: unknown) => {
        logger.error("Failed to load tear sheet metrics:", e);
      })
      .finally(() => {
        setViewerLoading(false);
      });
  }

  function handleCloseViewer() {
    setViewerTearSheet(null);
    setViewerMetrics([]);
  }

  // Delete handler
  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/investors/tear-sheets/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete.");
      setTearSheets((prev) => prev.filter((t) => t.id !== id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete.");
    } finally {
      setDeleteId(null);
    }
  }

  // Available years from data
  const availableYears = React.useMemo(() => {
    const years = Array.from(new Set(tearSheets.map((t) => t.year)));
    years.sort((a, b) => b - a);
    return years;
  }, [tearSheets]);

  // Companies that have tear sheets (for filter)
  const companiesWithSheets = React.useMemo(() => {
    const ids = new Set(tearSheets.map((t) => t.company_id));
    return companies.filter((c) => ids.has(c.id));
  }, [companies, tearSheets]);

  // Filter + sort
  const displayed = React.useMemo(() => {
    let list = tearSheets;

    if (filterSource === "founder") {
      list = list.filter((t) => t.creator_role === "founder");
    } else if (filterSource === "mine") {
      list = list.filter((t) => t.creator_role === "investor");
    }
    if (filterQuarter !== "All") {
      list = list.filter((t) => t.quarter === filterQuarter);
    }
    if (filterYear !== "All") {
      list = list.filter((t) => t.year === Number(filterYear));
    }
    if (filterCompany !== "All") {
      list = list.filter((t) => t.company_id === filterCompany);
    }

    const sorted = [...list].sort((a, b) => {
      if (sortField === "date") {
        const diff = a.year - b.year || quarterNum(a.quarter) - quarterNum(b.quarter);
        return sortDir === "desc" ? -diff : diff;
      }
      // company name sort
      const nameA = (a.companyName ?? "").toLowerCase();
      const nameB = (b.companyName ?? "").toLowerCase();
      const diff = nameA.localeCompare(nameB);
      return sortDir === "desc" ? -diff : diff;
    });

    return sorted;
  }, [tearSheets, filterSource, filterQuarter, filterYear, filterCompany, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const showFilters = tearSheets.length > 0;

  // Show viewer overlay for founder tear sheets
  if (viewerTearSheet) {
    return (
      <TearSheetViewer
        tearSheet={viewerTearSheet}
        metrics={viewerMetrics}
        companyId={viewerTearSheet.company_id}
        companyName={viewerTearSheet.companyName ?? "Unknown Company"}
        onClose={handleCloseViewer}
        metricsLoading={viewerLoading}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Breadcrumbs items={[{ label: "Companies", href: "/companies" }, { label: "Tear Sheets" }]} />
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">Tear Sheets</h1>
          <p className="mt-1 text-sm text-text-tertiary">
            View founder-published tear sheets and create your own investment memos.
          </p>
        </div>
        {tearSheets.length > 0 && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-md bg-btn-primary-bg px-3 py-1.5 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover"
          >
            New Tear Sheet
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && <LoadingSkeleton />}

      {/* Error */}
      {error && (
        <div className="rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]">
          {error}
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <SlidingTabs
              tabs={SOURCE_TABS}
              value={filterSource}
              onChange={setFilterSource}
              size="sm"
              showIcons={false}
            />

            <SlidingTabs
              tabs={QUARTER_TABS}
              value={filterQuarter}
              onChange={setFilterQuarter}
              size="sm"
              showIcons={false}
            />

            {companiesWithSheets.length > 1 && (
              <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger size="sm" className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All companies</SelectItem>
                  {companiesWithSheets.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {availableYears.length > 1 && (
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger size="sm" className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All years</SelectItem>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleSort("date")}
                className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                  sortField === "date"
                    ? "border-border-default bg-bg-hover text-text-primary"
                    : "border-border-default bg-bg-input text-text-muted hover:text-text-secondary"
                }`}
              >
                Date
                {sortField === "date" && <ArrowUpDown className="h-3 w-3" />}
              </button>
              <button
                type="button"
                onClick={() => toggleSort("company")}
                className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                  sortField === "company"
                    ? "border-border-default bg-bg-hover text-text-primary"
                    : "border-border-default bg-bg-input text-text-muted hover:text-text-secondary"
                }`}
              >
                Company
                {sortField === "company" && <ArrowUpDown className="h-3 w-3" />}
              </button>

              <SlidingIconTabs
                tabs={VIEW_MODE_TABS}
                value={viewMode}
                onChange={setViewMode}
              />
            </div>
          </div>

          {/* Count */}
          <div className="text-sm text-text-tertiary">
            {displayed.length} tear sheet{displayed.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* Empty state — no tear sheets at all */}
      {!loading && !error && tearSheets.length === 0 && (
        <EmptyState
          variant="inline"
          icon={FileSpreadsheet}
          title="No tear sheets yet"
          description="View founder-published tear sheets or create your own investment memos. Tear sheets help you track metrics, notes, and action items for each company."
          action={
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex h-10 items-center justify-center rounded-md bg-btn-primary-bg px-4 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover"
            >
              Create Tear Sheet
            </button>
          }
        />
      )}

      {/* Empty state — filters produce no results */}
      {!loading && displayed.length === 0 && tearSheets.length > 0 && (
        <EmptyState
          variant="no-results"
          title="No tear sheets match the selected filters"
          description="Try adjusting your source, quarter, company, or year filters."
        />
      )}

      {/* Grid View */}
      {displayed.length > 0 && viewMode === "grid" && (
        <div className="grid gap-4 md:grid-cols-2">
          {displayed.map((ts) => {
            const isInvestor = ts.creator_role === "investor";
            return (
              <button
                key={ts.id}
                type="button"
                onClick={() => handleClickTearSheet(ts)}
                className="w-full text-left rounded-xl border border-border-default card-surface p-4 hover:bg-bg-hover transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="font-medium text-text-primary truncate">
                      {ts.title}
                    </h3>
                    {ts.companyName && (
                      <div className="text-xs text-text-muted">{ts.companyName}</div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={ts.status} />
                      <span className="text-xs text-text-tertiary">
                        {ts.quarter} {ts.year}
                      </span>
                      <CreatorBadge role={ts.creator_role} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isInvestor && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(ts.id);
                        }}
                        className="rounded-md p-1.5 text-text-faint hover:bg-bg-elevated hover:text-[var(--status-error-text)] opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Delete tear sheet"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <ChevronRight className="h-5 w-5 text-text-faint group-hover:text-text-muted transition-colors" />
                  </div>
                </div>
                <div className="mt-3 text-xs text-text-muted">
                  Updated {formatDate(ts.updated_at)}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* List View */}
      {displayed.length > 0 && viewMode === "list" && (
        <div className="overflow-hidden rounded-xl border border-border-default">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default bg-bg-raised text-left text-xs font-medium text-text-tertiary">
                <th className="px-4 py-2.5">Title</th>
                <th className="px-4 py-2.5">Company</th>
                <th className="px-4 py-2.5">Source</th>
                <th className="px-4 py-2.5">Period</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Updated</th>
                <th className="w-10 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {displayed.map((ts) => {
                const isInvestor = ts.creator_role === "investor";
                return (
                  <tr
                    key={ts.id}
                    onClick={() => handleClickTearSheet(ts)}
                    className="group cursor-pointer transition-colors hover:bg-bg-raised"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-text-primary group-hover:text-text-secondary">
                        {ts.title}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-tertiary">
                      {ts.companyName ?? "\u2014"}
                    </td>
                    <td className="px-4 py-3">
                      <CreatorBadge role={ts.creator_role} />
                    </td>
                    <td className="px-4 py-3 text-text-tertiary">
                      {ts.quarter} {ts.year}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={ts.status} />
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {formatDate(ts.updated_at)}
                    </td>
                    <td className="px-4 py-3">
                      {isInvestor && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(ts.id);
                          }}
                          className="shrink-0 rounded-md p-1.5 text-text-faint hover:bg-bg-elevated hover:text-[var(--status-error-text)]"
                          aria-label="Delete tear sheet"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={deleteId !== null}
        title="Delete tear sheet?"
        message="This tear sheet will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />

      <NewTearSheetModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        companies={companies}
        loadingCompanies={loading}
      />
    </div>
  );
}
