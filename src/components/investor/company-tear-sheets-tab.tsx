"use client";

import * as React from "react";
import { FileSpreadsheet, ChevronRight, Plus } from "lucide-react";
import { TearSheetViewer } from "@/components/investor/tear-sheet-viewer";
import type { TearSheetMetric } from "@/components/investor/tear-sheet-viewer";
import { NewTearSheetModal } from "@/components/investor/new-tear-sheet-modal";
import { SlidingTabs, TabItem } from "@/components/ui/sliding-tabs";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { logActivity } from "@/lib/activity/log-activity";
import { logger } from "@/lib/logger";

type QuarterFilter = "All" | "Q1" | "Q2" | "Q3" | "Q4";
type SourceFilter = "all" | "founder" | "mine";

const QUARTER_TABS: TabItem<QuarterFilter>[] = [
  { value: "All", label: "All" },
  { value: "Q1", label: "Q1" },
  { value: "Q2", label: "Q2" },
  { value: "Q3", label: "Q3" },
  { value: "Q4", label: "Q4" },
];

const SOURCE_TABS: TabItem<SourceFilter>[] = [
  { value: "all", label: "All" },
  { value: "founder", label: "Founder" },
  { value: "mine", label: "Mine" },
];

type TearSheet = {
  id: string;
  title: string;
  quarter: string;
  year: number;
  status: string;
  content: Record<string, unknown>;
  share_enabled: boolean;
  share_token: string | null;
  updated_at: string;
  creator_role?: string;
  companyName?: string;
};

type CompanyTearSheetsTabProps = {
  companyId: string;
  companyName: string;
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TearSheetCard({
  tearSheet,
  onClick,
}: {
  tearSheet: TearSheet;
  onClick: () => void;
}) {
  const isInvestor = tearSheet.creator_role === "investor";

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border-default card-surface p-4 hover:border-border-default hover:bg-bg-hover transition-colors group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-text-primary truncate group-hover:text-text-primary">
            {tearSheet.title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                tearSheet.status === "published"
                  ? "bg-[var(--success-bg-muted)] text-[var(--status-success-text)]"
                  : "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]"
              }`}
            >
              {tearSheet.status === "published" ? "Published" : "Draft"}
            </span>
            <span className="text-xs text-text-tertiary">
              {tearSheet.quarter} {tearSheet.year}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              isInvestor
                ? "bg-[var(--status-info-bg)] text-[var(--status-info-text)]"
                : "bg-[var(--tag-violet-bg)] text-[var(--tag-violet-text)]"
            }`}>
              {isInvestor ? "Mine" : "Founder"}
            </span>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-text-faint group-hover:text-text-muted shrink-0 transition-colors" />
      </div>
      <div className="mt-3 text-xs text-text-muted">
        Updated {formatDate(tearSheet.updated_at)}
      </div>
    </button>
  );
}

export function CompanyTearSheetsTab({ companyId, companyName }: CompanyTearSheetsTabProps) {
  const [tearSheets, setTearSheets] = React.useState<TearSheet[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [selectedTearSheet, setSelectedTearSheet] = React.useState<TearSheet | null>(null);
  const [selectedMetrics, setSelectedMetrics] = React.useState<TearSheetMetric[]>([]);
  const [loadingMetrics, setLoadingMetrics] = React.useState(false);

  const [showCreateModal, setShowCreateModal] = React.useState(false);

  const [filterQuarter, setFilterQuarter] = React.useState<QuarterFilter>("All");
  const [filterYear, setFilterYear] = React.useState("All");
  const [filterSource, setFilterSource] = React.useState<SourceFilter>("all");

  React.useEffect(() => {
    async function loadTearSheets() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/investors/companies/${companyId}/tear-sheets`);
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error ?? "Failed to load tear sheets.");
        }

        setTearSheets(json.tearSheets ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    loadTearSheets();
  }, [companyId]);

  async function handleSelectTearSheet(tearSheet: TearSheet) {
    if (tearSheet.creator_role === "investor") {
      window.location.href = `/tear-sheets/${tearSheet.id}`;
      return;
    }

    setSelectedTearSheet(tearSheet);
    setLoadingMetrics(true);
    setSelectedMetrics([]);

    logActivity({
      companyId,
      action: "view_tear_sheet",
      metadata: { tear_sheet_title: tearSheet.title, quarter: tearSheet.quarter, year: tearSheet.year },
    });

    try {
      const res = await fetch(`/api/investors/companies/${companyId}/tear-sheets/${tearSheet.id}/metrics`);
      const json = await res.json().catch(() => null);

      if (res.ok) {
        setSelectedMetrics(json.metrics ?? []);
      }
    } catch (e: unknown) {
      logger.error("Failed to load metrics:", e);
    } finally {
      setLoadingMetrics(false);
    }
  }

  function handleClose() {
    setSelectedTearSheet(null);
    setSelectedMetrics([]);
  }

  const availableYears = React.useMemo(() => {
    const years = Array.from(new Set(tearSheets.map((t) => t.year)));
    years.sort((a, b) => b - a);
    return years;
  }, [tearSheets]);

  const filteredTearSheets = React.useMemo(() => {
    let list = tearSheets;

    if (filterQuarter !== "All") {
      list = list.filter((t) => t.quarter === filterQuarter);
    }
    if (filterYear !== "All") {
      list = list.filter((t) => t.year === Number(filterYear));
    }
    if (filterSource === "founder") {
      list = list.filter((t) => t.creator_role === "founder");
    } else if (filterSource === "mine") {
      list = list.filter((t) => t.creator_role === "investor");
    }

    return [...list].sort((a, b) => {
      const yearDiff = b.year - a.year;
      if (yearDiff !== 0) return yearDiff;
      const qA = parseInt(a.quarter.replace("Q", ""), 10);
      const qB = parseInt(b.quarter.replace("Q", ""), 10);
      return qB - qA;
    });
  }, [tearSheets, filterQuarter, filterYear, filterSource]);

  if (selectedTearSheet) {
    return (
      <TearSheetViewer
        tearSheet={selectedTearSheet}
        metrics={selectedMetrics}
        companyId={companyId}
        companyName={companyName}
        onClose={handleClose}
        metricsLoading={loadingMetrics}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div />
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-btn-primary-bg px-3 py-1.5 text-xs font-medium text-btn-primary-text hover:bg-btn-primary-hover"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Tear Sheet
        </button>
      </div>

      {tearSheets.length > 0 && (
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

          {availableYears.length > 1 && (
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger>
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

          <span className="text-sm text-text-tertiary">
            {filteredTearSheets.length} tear sheet{filteredTearSheets.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]">
          {error}
        </div>
      )}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-border-default card-surface p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded bg-bg-hover" />
                  <div className="flex gap-2">
                    <div className="h-5 w-16 rounded-full bg-bg-hover" />
                    <div className="h-5 w-14 rounded bg-bg-elevated" />
                  </div>
                </div>
                <div className="h-5 w-5 rounded bg-bg-elevated" />
              </div>
              <div className="mt-3 h-3 w-28 rounded bg-bg-elevated" />
            </div>
          ))}
        </div>
      )}

      {!loading && tearSheets.length === 0 && (
        <div className="py-12 text-center">
          <FileSpreadsheet className="mx-auto h-10 w-10 text-text-faint" />
          <p className="mt-3 text-sm text-text-secondary">No tear sheets yet.</p>
          <p className="mt-1 text-xs text-text-muted">
            Create your own or wait for the founder to publish one.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-btn-primary-bg px-3 py-2 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Create Tear Sheet
          </button>
        </div>
      )}

      {!loading && filteredTearSheets.length === 0 && tearSheets.length > 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-text-secondary">
            No tear sheets match the selected filters.
          </p>
        </div>
      )}

      {!loading && filteredTearSheets.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredTearSheets.map((ts) => (
            <TearSheetCard
              key={ts.id}
              tearSheet={ts}
              onClick={() => handleSelectTearSheet(ts)}
            />
          ))}
        </div>
      )}

      <NewTearSheetModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        companies={[{ id: companyId, name: companyName }]}
        loadingCompanies={false}
        preselectedCompanyId={companyId}
      />
    </div>
  );
}
