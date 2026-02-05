"use client";

import * as React from "react";
import { FileSpreadsheet, ChevronRight, Download, X, ArrowLeft } from "lucide-react";
import { TearSheetPreview } from "@/components/founder/tear-sheet-preview";
import { SlidingTabs, TabItem } from "@/components/ui/sliding-tabs";

type QuarterFilter = "All" | "Q1" | "Q2" | "Q3" | "Q4";

const QUARTER_TABS: TabItem<QuarterFilter>[] = [
  { value: "All", label: "All" },
  { value: "Q1", label: "Q1" },
  { value: "Q2", label: "Q2" },
  { value: "Q3", label: "Q3" },
  { value: "Q4", label: "Q4" },
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
  companyName?: string;
};

type TearSheetMetric = {
  metricName: string;
  currentValue: string | null;
  previousValue: string | null;
  trend: "up" | "down" | "flat";
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
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border border-white/10 bg-white/5 p-4 hover:border-white/20 hover:bg-white/[0.07] transition-colors group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-white truncate group-hover:text-white/90">
            {tearSheet.title}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">
              Published
            </span>
            <span className="text-xs text-white/50">
              {tearSheet.quarter} {tearSheet.year}
            </span>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-white/30 group-hover:text-white/50 shrink-0 transition-colors" />
      </div>
      <div className="mt-3 text-xs text-white/40">
        Updated {formatDate(tearSheet.updated_at)}
      </div>
    </button>
  );
}

function TearSheetViewer({
  tearSheet,
  metrics,
  companyName,
  onClose,
}: {
  tearSheet: TearSheet;
  metrics: TearSheetMetric[];
  companyName: string;
  onClose: () => void;
}) {
  const previewRef = React.useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = React.useState(false);

  async function handleExportPdf() {
    if (!previewRef.current) return;
    setExporting(true);

    try {
      const { exportElementAsPdf } = await import("@/lib/utils/export-pdf");
      await exportElementAsPdf(
        previewRef.current,
        `${tearSheet.title}.pdf`
      );
    } catch (e) {
      console.error("PDF export failed:", e);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to tear sheets</span>
          <span className="sm:hidden">Back</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-medium text-white/80 hover:border-white/20 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? "Generating..." : "Download PDF"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-white/40 hover:bg-white/10 hover:text-white sm:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div ref={previewRef}>
          <TearSheetPreview
            tearSheet={{ ...tearSheet, companyName }}
            metrics={metrics}
          />
        </div>
      </div>
    </div>
  );
}

export function CompanyTearSheetsTab({ companyId, companyName }: CompanyTearSheetsTabProps) {
  const [tearSheets, setTearSheets] = React.useState<TearSheet[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Viewing state
  const [selectedTearSheet, setSelectedTearSheet] = React.useState<TearSheet | null>(null);
  const [selectedMetrics, setSelectedMetrics] = React.useState<TearSheetMetric[]>([]);
  const [loadingMetrics, setLoadingMetrics] = React.useState(false);

  // Filters
  const [filterQuarter, setFilterQuarter] = React.useState<QuarterFilter>("All");
  const [filterYear, setFilterYear] = React.useState("All");

  // Fetch tear sheets for this company
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
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    loadTearSheets();
  }, [companyId]);

  // Fetch metrics when a tear sheet is selected
  async function handleSelectTearSheet(tearSheet: TearSheet) {
    setSelectedTearSheet(tearSheet);
    setLoadingMetrics(true);
    setSelectedMetrics([]);

    try {
      const res = await fetch(`/api/investors/companies/${companyId}/tear-sheets/${tearSheet.id}/metrics`);
      const json = await res.json().catch(() => null);

      if (res.ok) {
        setSelectedMetrics(json.metrics ?? []);
      }
    } catch (e) {
      console.error("Failed to load metrics:", e);
    } finally {
      setLoadingMetrics(false);
    }
  }

  function handleClose() {
    setSelectedTearSheet(null);
    setSelectedMetrics([]);
  }

  // Available years from data
  const availableYears = React.useMemo(() => {
    const years = Array.from(new Set(tearSheets.map((t) => t.year)));
    years.sort((a, b) => b - a);
    return years;
  }, [tearSheets]);

  // Filter tear sheets
  const filteredTearSheets = React.useMemo(() => {
    let list = tearSheets;

    if (filterQuarter !== "All") {
      list = list.filter((t) => t.quarter === filterQuarter);
    }
    if (filterYear !== "All") {
      list = list.filter((t) => t.year === Number(filterYear));
    }

    // Sort by year and quarter descending
    return [...list].sort((a, b) => {
      const yearDiff = b.year - a.year;
      if (yearDiff !== 0) return yearDiff;
      const qA = parseInt(a.quarter.replace("Q", ""), 10);
      const qB = parseInt(b.quarter.replace("Q", ""), 10);
      return qB - qA;
    });
  }, [tearSheets, filterQuarter, filterYear]);

  // Show viewer when a tear sheet is selected
  if (selectedTearSheet) {
    return (
      <TearSheetViewer
        tearSheet={selectedTearSheet}
        metrics={loadingMetrics ? [] : selectedMetrics}
        companyName={companyName}
        onClose={handleClose}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {tearSheets.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <SlidingTabs
            tabs={QUARTER_TABS}
            value={filterQuarter}
            onChange={setFilterQuarter}
            size="sm"
            showIcons={false}
          />

          {availableYears.length > 1 && (
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="h-8 rounded-md border border-white/10 bg-black/20 px-2 text-xs text-white/80 outline-none"
            >
              <option value="All">All years</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}

          <span className="text-sm text-white/50">
            {filteredTearSheets.length} tear sheet{filteredTearSheets.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded bg-white/10" />
                  <div className="flex gap-2">
                    <div className="h-5 w-16 rounded-full bg-white/10" />
                    <div className="h-5 w-14 rounded bg-white/5" />
                  </div>
                </div>
                <div className="h-5 w-5 rounded bg-white/5" />
              </div>
              <div className="mt-3 h-3 w-28 rounded bg-white/5" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && tearSheets.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <FileSpreadsheet className="mx-auto h-8 w-8 text-white/30" />
          <p className="mt-2 text-sm text-white/60">No tear sheets available.</p>
          <p className="mt-1 text-xs text-white/40">
            Published tear sheets from the founder will appear here.
          </p>
        </div>
      )}

      {/* No results after filter */}
      {!loading && filteredTearSheets.length === 0 && tearSheets.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-sm text-white/50">
            No tear sheets match the selected filters.
          </p>
        </div>
      )}

      {/* Tear sheets grid */}
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
    </div>
  );
}
