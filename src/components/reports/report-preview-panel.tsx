"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";
import { REPORT_TEMPLATES, getDefaultSections, type ReportType } from "@/lib/reports/templates";

import { KPICards } from "./portfolio-summary/kpi-cards";
import { DistributionCharts } from "./portfolio-summary/distribution-charts";
import { TopPerformers } from "./portfolio-summary/top-performers";
import { DataFreshnessCard } from "./portfolio-summary/data-freshness-card";
import { PortfolioTimeSeries } from "./portfolio-summary/portfolio-time-series";
import { ComparisonChart } from "./company-comparison/comparison-chart";
import { ComparisonTable } from "./company-comparison/comparison-table";
import { BenchmarkChart } from "./benchmarks/benchmark-chart";
import { BenchmarkTable } from "./benchmarks/benchmark-table";
import { BenchmarkPortfolioSummary } from "./benchmarks/benchmark-portfolio-summary";
import { CompanyHeader } from "./deep-dive/company-header";
import { CompanyMetricKPIs } from "./deep-dive/company-metric-kpis";
import { CompanyMetricTrends } from "./deep-dive/company-metric-trends";
import { CompanyBenchmarkPosition } from "./deep-dive/company-benchmark-position";

type SummaryData = {
  aggregates: Record<string, { sum: number | null; average: number; median: number; count: number; canSum: boolean }>;
  totalCompanies: number;
  companiesWithData: number;
  byIndustry: Array<{ name: string; value: number; key: string }>;
  byStage: Array<{ name: string; value: number; key: string }>;
  byCompany: Array<{
    companyId: string;
    companyName: string;
    industry: string | null;
    stage: string | null;
    revenueMetric: string | null;
    revenueGrowth: number | null;
  }>;
  freshness: { recent: number; aging: number; stale: number; noData: number };
  availableMetrics: string[];
};

type ReportPreviewPanelProps = {
  reportType: ReportType;
  onClose: () => void;
  onCreated: (reportId: string) => void;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
};

export function ReportPreviewPanel({ reportType, onClose, onCreated, triggerRef }: ReportPreviewPanelProps) {
  const router = useRouter();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const titleId = React.useId();
  const [creating, setCreating] = React.useState(false);
  const [visible, setVisible] = React.useState(false);

  const template = REPORT_TEMPLATES[reportType];

  // Animate in
  React.useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Lock body scroll
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Focus close button on mount
  React.useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Close on Escape
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Focus trap
  React.useEffect(() => {
    function handleFocusTrap(e: KeyboardEvent) {
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleFocusTrap);
    return () => document.removeEventListener("keydown", handleFocusTrap);
  }, []);

  // Return focus on close
  React.useEffect(() => {
    return () => { triggerRef?.current?.focus(); };
  }, [triggerRef]);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 200);
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/investors/portfolio/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Untitled ${template.label}`,
          reportType,
          config: { visibleSections: getDefaultSections(reportType) },
        }),
      });
      if (res.ok) {
        const json = await res.json();
        onCreated(json.id);
        router.push(`/reports/${json.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-40">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-bg-backdrop backdrop-blur-sm transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-border-default bg-bg-primary shadow-2xl transition-transform duration-200 sm:w-[640px] lg:w-[800px] ${visible ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-border-subtle bg-bg-secondary px-6 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-text-primary">
              {template.label}
            </h2>
            <p className="mt-0.5 text-sm text-text-tertiary">{template.description}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={handleClose}
            className="ml-4 mt-0.5 rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sample data banner */}
        {reportType !== "summary" && (
          <div className="shrink-0 border-b border-border-subtle bg-[var(--tag-blue-bg)] px-6 py-2">
            <p className="text-xs font-medium text-[var(--tag-blue-text)]">
              Showing sample data. Your actual portfolio data will appear after creating the report.
            </p>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <PreviewContent reportType={reportType} />
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-border-subtle bg-bg-secondary px-6 py-4">
          <p className="text-xs text-text-muted">Preview only. Create to save and customize.</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-border-default px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-elevated"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-lg bg-text-primary px-4 py-2 text-sm font-medium text-bg-primary transition-colors hover:opacity-90 disabled:opacity-60"
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Report
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Preview Content Router ──────────────────────────────────────

function PreviewContent({ reportType }: { reportType: ReportType }) {
  switch (reportType) {
    case "summary":
      return <SummaryPreview />;
    case "comparison":
      return <ComparisonPreview />;
    case "benchmarks":
      return <BenchmarksPreview />;
    case "deep_dive":
      return <DeepDivePreview />;
  }
}

// ── Summary Preview (fetches real data) ─────────────────────────

function SummaryPreview() {
  const [data, setData] = React.useState<SummaryData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const res = await fetch("/api/investors/portfolio/summary", { signal: controller.signal });
        if (res.ok) setData(await res.json());
      } catch {
        // AbortError or network error
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, []);

  if (loading) return <PreviewSkeleton label="Loading portfolio data..." />;
  if (!data) return <PreviewEmpty label="No portfolio data available." />;

  return (
    <div className="space-y-6">
      <KPICards
        aggregates={data.aggregates}
        totalCompanies={data.totalCompanies}
        companiesWithData={data.companiesWithData}
      />
      <PortfolioTimeSeries availableMetrics={data.availableMetrics ?? Object.keys(data.aggregates)} />
      <DistributionCharts byIndustry={data.byIndustry} byStage={data.byStage} />
      <TopPerformers companies={data.byCompany} />
      <DataFreshnessCard freshness={data.freshness} />
    </div>
  );
}

// ── Comparison Preview (sample data) ────────────────────────────

const SAMPLE_COMPARISON_COMPANIES = ["Acme Corp", "Nova Labs", "Zenith AI"];

const SAMPLE_COMPARISON_PERIODS = [
  "2025-01-01", "2025-04-01", "2025-07-01", "2025-10-01", "2026-01-01",
];

function makeSampleComparisonData(metricName: string) {
  const baseValues: Record<string, number[]> = {
    "Acme Corp":  [1200000, 1450000, 1780000, 2100000, 2450000],
    "Nova Labs":  [800000, 920000, 1100000, 1350000, 1600000],
    "Zenith AI":  [2000000, 2200000, 2150000, 2500000, 2900000],
  };
  const periods = ["Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025", "Q1 2026"];

  return periods.map((period, i) => {
    const row: Record<string, string | number | null> = {
      period,
      periodStart: SAMPLE_COMPARISON_PERIODS[i],
    };
    for (const company of SAMPLE_COMPARISON_COMPANIES) {
      row[company] = baseValues[company][i];
    }
    return row;
  });
}

function ComparisonPreview() {
  const revenueData = React.useMemo(() => makeSampleComparisonData("Revenue"), []);
  const burnData = React.useMemo(() => makeSampleComparisonData("Burn Rate"), []);

  // Scale burn rate data down
  const scaledBurnData = React.useMemo(
    () =>
      burnData.map((row) => {
        const scaled: Record<string, string | number | null> = { period: row.period, periodStart: row.periodStart };
        for (const company of SAMPLE_COMPARISON_COMPANIES) {
          const val = row[company];
          scaled[company] = typeof val === "number" ? Math.round(val * 0.35) : val;
        }
        return scaled;
      }),
    [burnData],
  );

  return (
    <div className="space-y-6">
      <SectionLabel title="Revenue" subtitle="Quarterly revenue comparison across 3 companies" />
      <ComparisonChart
        data={revenueData}
        companies={SAMPLE_COMPARISON_COMPANIES}
        metricName="Revenue"
        periodType="quarterly"
        normalization="absolute"
        height={280}
      />
      <ComparisonTable
        data={revenueData}
        companies={SAMPLE_COMPARISON_COMPANIES}
        metricName="Revenue"
        normalization="absolute"
      />

      <SectionLabel title="Burn Rate" subtitle="Quarterly burn rate comparison" />
      <ComparisonChart
        data={scaledBurnData}
        companies={SAMPLE_COMPARISON_COMPANIES}
        metricName="Burn Rate"
        periodType="quarterly"
        normalization="absolute"
        height={280}
      />
    </div>
  );
}

// ── Benchmarks Preview (sample data) ────────────────────────────

const SAMPLE_BENCHMARK = {
  p25: 850000,
  p50: 1500000,
  p75: 2800000,
  p90: 4200000,
  sample_size: 142,
  calculated_at: "2026-02-01T00:00:00Z",
};

const SAMPLE_BENCHMARK_COMPANIES = [
  { id: "1", name: "Zenith AI", value: 2900000, formattedValue: "$2.9M", percentile: 78, industry: "ai_ml", stage: "series_a" },
  { id: "2", name: "Acme Corp", value: 2450000, formattedValue: "$2.5M", percentile: 68, industry: "saas", stage: "series_b" },
  { id: "3", name: "Nova Labs", value: 1600000, formattedValue: "$1.6M", percentile: 52, industry: "fintech", stage: "series_a" },
  { id: "4", name: "Beacon Health", value: 1200000, formattedValue: "$1.2M", percentile: 38, industry: "healthcare", stage: "seed" },
  { id: "5", name: "EduSpark", value: 680000, formattedValue: "$680K", percentile: 18, industry: "edtech", stage: "seed" },
];

function BenchmarksPreview() {
  return (
    <div className="space-y-6">
      {/* Percentile band cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        {([
          { label: "25th", key: "p25" as const },
          { label: "50th (Median)", key: "p50" as const },
          { label: "75th", key: "p75" as const },
          { label: "90th", key: "p90" as const },
        ]).map(({ label, key }) => (
          <div key={key} className="rounded-xl border border-border-default card-surface p-4">
            <div className="text-xs font-medium text-text-muted">{label}</div>
            <div className="mt-1 text-lg font-semibold tabular-nums text-text-primary">
              ${(SAMPLE_BENCHMARK[key] / 1000000).toFixed(1)}M
            </div>
            <div className="mt-0.5 text-[10px] text-text-faint">
              {SAMPLE_BENCHMARK.sample_size} companies
            </div>
          </div>
        ))}
      </div>

      <SectionLabel title="Portfolio Distribution" subtitle="How your companies rank across percentile bands" />
      <BenchmarkPortfolioSummary
        companies={SAMPLE_BENCHMARK_COMPANIES}
        benchmark={SAMPLE_BENCHMARK}
      />

      <SectionLabel title="Revenue Benchmark" subtitle="Company values vs industry percentile bands" />
      <BenchmarkChart
        companies={SAMPLE_BENCHMARK_COMPANIES}
        benchmark={SAMPLE_BENCHMARK}
        metricName="Revenue"
        height={300}
      />

      <SectionLabel title="Rankings" subtitle="Detailed company rankings with percentile scores" />
      <BenchmarkTable
        companies={SAMPLE_BENCHMARK_COMPANIES}
        medianValue={SAMPLE_BENCHMARK.p50}
        metricName="Revenue"
      />
    </div>
  );
}

// ── Deep Dive Preview (sample data) ─────────────────────────────

const SAMPLE_COMPANY = {
  name: "Acme Corp",
  industry: "saas",
  stage: "series_b",
  website: "acmecorp.io",
  logoUrl: null,
  lastSubmission: "2026-01-15T00:00:00Z",
};

const SAMPLE_METRICS = [
  { name: "Revenue", value: 2450000, formattedValue: "$2.5M", periodStart: "2026-01-01", periodType: "quarterly" },
  { name: "Burn Rate", value: 420000, formattedValue: "$420K", periodStart: "2026-01-01", periodType: "quarterly" },
  { name: "Headcount", value: 48, formattedValue: "48", periodStart: "2026-01-01", periodType: "quarterly" },
  { name: "MRR", value: 205000, formattedValue: "$205K", periodStart: "2026-01-01", periodType: "quarterly" },
  { name: "Runway", value: 18, formattedValue: "18 months", periodStart: "2026-01-01", periodType: "quarterly" },
  { name: "Churn Rate", value: 3.2, formattedValue: "3.2%", periodStart: "2026-01-01", periodType: "quarterly" },
];

const SAMPLE_TIME_SERIES: Record<string, Array<{ periodStart: string; periodEnd: string; value: number }>> = {
  Revenue: [
    { periodStart: "2025-01-01", periodEnd: "2025-03-31", value: 1200000 },
    { periodStart: "2025-04-01", periodEnd: "2025-06-30", value: 1450000 },
    { periodStart: "2025-07-01", periodEnd: "2025-09-30", value: 1780000 },
    { periodStart: "2025-10-01", periodEnd: "2025-12-31", value: 2100000 },
    { periodStart: "2026-01-01", periodEnd: "2026-03-31", value: 2450000 },
  ],
  "Burn Rate": [
    { periodStart: "2025-01-01", periodEnd: "2025-03-31", value: 380000 },
    { periodStart: "2025-04-01", periodEnd: "2025-06-30", value: 395000 },
    { periodStart: "2025-07-01", periodEnd: "2025-09-30", value: 410000 },
    { periodStart: "2025-10-01", periodEnd: "2025-12-31", value: 405000 },
    { periodStart: "2026-01-01", periodEnd: "2026-03-31", value: 420000 },
  ],
  MRR: [
    { periodStart: "2025-01-01", periodEnd: "2025-03-31", value: 100000 },
    { periodStart: "2025-04-01", periodEnd: "2025-06-30", value: 125000 },
    { periodStart: "2025-07-01", periodEnd: "2025-09-30", value: 155000 },
    { periodStart: "2025-10-01", periodEnd: "2025-12-31", value: 180000 },
    { periodStart: "2026-01-01", periodEnd: "2026-03-31", value: 205000 },
  ],
  Headcount: [
    { periodStart: "2025-01-01", periodEnd: "2025-03-31", value: 28 },
    { periodStart: "2025-04-01", periodEnd: "2025-06-30", value: 33 },
    { periodStart: "2025-07-01", periodEnd: "2025-09-30", value: 38 },
    { periodStart: "2025-10-01", periodEnd: "2025-12-31", value: 44 },
    { periodStart: "2026-01-01", periodEnd: "2026-03-31", value: 48 },
  ],
};

const SAMPLE_BENCHMARK_POSITIONS = [
  { metricName: "Revenue", value: 2450000, p25: 850000, p50: 1500000, p75: 2800000, p90: 4200000, percentile: 68 },
  { metricName: "MRR", value: 205000, p25: 80000, p50: 150000, p75: 250000, p90: 380000, percentile: 62 },
  { metricName: "Burn Rate", value: 420000, p25: 200000, p50: 350000, p75: 500000, p90: 750000, percentile: 58 },
  { metricName: "Headcount", value: 48, p25: 15, p50: 30, p75: 55, p90: 80, percentile: 65 },
];

function DeepDivePreview() {
  return (
    <div className="space-y-6">
      <CompanyHeader company={SAMPLE_COMPANY} />

      <SectionLabel title="Key Metrics" subtitle="Latest quarterly metric values" />
      <CompanyMetricKPIs metrics={SAMPLE_METRICS} />

      <SectionLabel title="Metric Trends" subtitle="Performance over the last 5 quarters" />
      <CompanyMetricTrends timeSeries={SAMPLE_TIME_SERIES} periodType="quarterly" />

      <SectionLabel title="Benchmark Position" subtitle="How this company ranks against portfolio benchmarks" />
      <CompanyBenchmarkPosition
        positions={SAMPLE_BENCHMARK_POSITIONS}
        companyName="Acme Corp"
      />
    </div>
  );
}

// ── Shared helpers ──────────────────────────────────────────────

function SectionLabel({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-t border-border-subtle pt-4">
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>
    </div>
  );
}

function PreviewSkeleton({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-text-muted">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function PreviewEmpty({ label }: { label: string }) {
  return (
    <div className="py-16 text-center text-sm text-text-muted">{label}</div>
  );
}
