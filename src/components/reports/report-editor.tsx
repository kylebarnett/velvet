"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useReportsContext, type SavedReport } from "./reports-context";
import { REPORT_TEMPLATES, getDefaultSections, type ReportType } from "@/lib/reports/templates";
import { ReportToolbar } from "./report-toolbar";
import { ReportFilterBar } from "./report-filter-bar";
import { SectionWrapper } from "./section-wrapper";
import { exportElementAsPdf } from "@/lib/utils/export-pdf";
import { downloadCsv } from "@/lib/utils/csv-export";
import { downloadExcel } from "@/lib/utils/excel-export";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Lazy-loaded section components
import { KPICards } from "./portfolio-summary/kpi-cards";
import { DistributionCharts } from "./portfolio-summary/distribution-charts";
import { TopPerformers } from "./portfolio-summary/top-performers";
import { DataFreshnessCard } from "./portfolio-summary/data-freshness-card";
import { PortfolioTimeSeries } from "./portfolio-summary/portfolio-time-series";
import { ComparisonClient } from "./company-comparison/comparison-client";
import { BenchmarksClient } from "./benchmarks/benchmarks-client";
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
  drilldownData: Record<string, unknown[]>;
  freshness: { recent: number; aging: number; stale: number; noData: number };
  availableMetrics: string[];
};

type ComparisonInitialData = {
  companies: Array<{ id: string; name: string }>;
  availableMetrics: string[];
};

type ReportEditorProps = {
  report: SavedReport;
  summaryData?: SummaryData;
  comparisonData?: ComparisonInitialData;
};

export function ReportEditor({
  report,
  summaryData,
  comparisonData,
}: ReportEditorProps) {
  const router = useRouter();
  const {
    visibleSections,
    setVisibleSections,
    toggleSection,
    isDirty,
    markDirty,
    markClean,
    setActiveReport,
  } = useReportsContext();

  const [name, setName] = React.useState(report.name);
  const [filters, setFilters] = React.useState<Record<string, unknown>>(
    (report.filters as Record<string, unknown>) ?? {}
  );
  const [saving, setSaving] = React.useState(false);
  const [summaryState, setSummaryState] = React.useState<SummaryData | null>(summaryData ?? null);
  const [loadingSummary, setLoadingSummary] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);

  const reportType = report.report_type as ReportType;
  const template = REPORT_TEMPLATES[reportType];

  // Initialize visible sections
  React.useEffect(() => {
    const configSections = (report.config as Record<string, unknown> | undefined)?.visibleSections;
    if (Array.isArray(configSections)) {
      setVisibleSections(configSections as string[]);
    } else {
      setVisibleSections(getDefaultSections(reportType));
    }
    setActiveReport(report.id, report.name);
  }, [report.id, report.name, report.config, reportType, setVisibleSections, setActiveReport]);

  // Fetch summary data when filters change (for summary type)
  React.useEffect(() => {
    if (reportType !== "summary") return;

    const params = new URLSearchParams();
    const industries = filters.industries as string | undefined;
    const stages = filters.stages as string | undefined;
    const timeRange = filters.timeRange as string | undefined;

    if (industries) params.set("industries", industries);
    if (stages) params.set("stages", stages);
    if (timeRange) params.set("timeRange", timeRange);

    // Only re-fetch if we have filters (initial data comes from SSR)
    if (params.toString() === "" && summaryData) {
      setSummaryState(summaryData);
      return;
    }

    let cancelled = false;
    setLoadingSummary(true);

    async function fetchSummary() {
      try {
        const res = await fetch(`/api/investors/portfolio/summary?${params}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setSummaryState(json);
      } catch {
        // Keep existing data on failure
      } finally {
        if (!cancelled) setLoadingSummary(false);
      }
    }

    fetchSummary();
    return () => { cancelled = true; };
  }, [reportType, filters, summaryData]);

  function handleFiltersChange(newFilters: Record<string, unknown>) {
    setFilters(newFilters);
    markDirty();
  }

  async function handleNameChange(newName: string) {
    setName(newName);
    // Save name immediately
    await fetch(`/api/investors/portfolio/reports/${report.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/investors/portfolio/reports/${report.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          filters,
          config: { visibleSections },
        }),
      });
      markClean();
    } finally {
      setSaving(false);
    }
  }

  async function handleExport(format: "csv" | "excel" | "pdf") {
    if (format === "pdf" && contentRef.current) {
      await exportElementAsPdf(contentRef.current, name, { title: name });
    }

    if (reportType === "summary" && summaryState) {
      const headers = ["Metric", "Sum", "Average", "Median", "Count"];
      const rows = Object.entries(summaryState.aggregates).map(([metric, agg]) => [
        metric,
        agg.sum?.toString() ?? "",
        agg.average.toString(),
        agg.median.toString(),
        agg.count.toString(),
      ]);

      if (format === "csv") {
        downloadCsv(`${name}.csv`, headers, rows);
      }
      if (format === "excel") {
        downloadExcel({
          filename: name,
          headers,
          rows: Object.entries(summaryState.aggregates).map(([metric, agg]) => [
            metric,
            agg.sum ?? null,
            agg.average,
            agg.median,
            agg.count,
          ]),
          sheetName: "Portfolio Summary",
        });
      }
    }
  }

  function isSectionVisible(sectionId: string): boolean {
    return visibleSections.includes(sectionId);
  }

  return (
    <div className="space-y-4">
      <ReportToolbar
        reportId={report.id}
        name={name}
        onNameChange={handleNameChange}
        isDirty={isDirty}
        saving={saving}
        onSave={handleSave}
        onExport={handleExport}
      />

      {/* Filters (summary type only has its own filter bar) */}
      <ReportFilterBar
        reportType={reportType}
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Section content */}
      <div ref={contentRef} className="space-y-4">
        {reportType === "summary" && (
          <SummaryEditor
            data={summaryState}
            loading={loadingSummary}
            template={template}
            visibleSections={visibleSections}
            onToggleSection={toggleSection}
            isSectionVisible={isSectionVisible}
            filters={filters}
          />
        )}

        {reportType === "comparison" && comparisonData && (
          <ComparisonEditor
            data={comparisonData}
            template={template}
            visibleSections={visibleSections}
            onToggleSection={toggleSection}
            isSectionVisible={isSectionVisible}
          />
        )}

        {reportType === "benchmarks" && (
          <BenchmarksEditor
            template={template}
            visibleSections={visibleSections}
            onToggleSection={toggleSection}
            isSectionVisible={isSectionVisible}
          />
        )}

        {reportType === "deep_dive" && (
          <DeepDiveEditor
            template={template}
            visibleSections={visibleSections}
            onToggleSection={toggleSection}
            isSectionVisible={isSectionVisible}
            companyId={(report.config as Record<string, unknown> | undefined)?.companyId as string | undefined}
          />
        )}
      </div>
    </div>
  );
}

// ── Summary Editor ──────────────────────────────────────────────

function SummaryEditor({
  data,
  loading,
  template,
  visibleSections,
  onToggleSection,
  isSectionVisible,
  filters,
}: {
  data: SummaryData | null;
  loading: boolean;
  template: (typeof REPORT_TEMPLATES)["summary"];
  visibleSections: string[];
  onToggleSection: (id: string) => void;
  isSectionVisible: (id: string) => boolean;
  filters: Record<string, unknown>;
}) {
  if (loading || !data) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading portfolio data...</span>
      </div>
    );
  }

  return (
    <>
      {template.sections.map((section) => (
        <SectionWrapper
          key={section.id}
          id={section.id}
          title={section.label}
          description={section.description}
          visible={isSectionVisible(section.id)}
          onToggle={() => onToggleSection(section.id)}
          exportable={section.exportable}
        >
          {section.id === "kpis" && (
            <KPICards
              aggregates={data.aggregates}
              totalCompanies={data.totalCompanies}
              companiesWithData={data.companiesWithData}
            />
          )}
          {section.id === "time_series" && (
            <PortfolioTimeSeries
              availableMetrics={data.availableMetrics ?? Object.keys(data.aggregates)}
              industries={filters.industries as string | undefined}
              stages={filters.stages as string | undefined}
            />
          )}
          {section.id === "distribution" && (
            <DistributionCharts
              byIndustry={data.byIndustry}
              byStage={data.byStage}
            />
          )}
          {section.id === "top_performers" && (
            <TopPerformers companies={data.byCompany} />
          )}
          {section.id === "data_freshness" && (
            <DataFreshnessCard freshness={data.freshness} />
          )}
        </SectionWrapper>
      ))}
    </>
  );
}

// ── Comparison Editor ───────────────────────────────────────────

function ComparisonEditor({
  data,
  template,
  visibleSections,
  onToggleSection,
  isSectionVisible,
}: {
  data: ComparisonInitialData;
  template: (typeof REPORT_TEMPLATES)["comparison"];
  visibleSections: string[];
  onToggleSection: (id: string) => void;
  isSectionVisible: (id: string) => boolean;
}) {
  return (
    <>
      {template.sections.map((section) => (
        <SectionWrapper
          key={section.id}
          id={section.id}
          title={section.label}
          description={section.description}
          visible={isSectionVisible(section.id)}
          onToggle={() => onToggleSection(section.id)}
          exportable={section.exportable}
        >
          {section.id === "comparison_charts" && (
            <ComparisonClient
              companies={data.companies}
              availableMetrics={data.availableMetrics}
            />
          )}
        </SectionWrapper>
      ))}
    </>
  );
}

// ── Benchmarks Editor ───────────────────────────────────────────

function BenchmarksEditor({
  template,
  visibleSections,
  onToggleSection,
  isSectionVisible,
}: {
  template: (typeof REPORT_TEMPLATES)["benchmarks"];
  visibleSections: string[];
  onToggleSection: (id: string) => void;
  isSectionVisible: (id: string) => boolean;
}) {
  return (
    <>
      {template.sections.map((section) => (
        <SectionWrapper
          key={section.id}
          id={section.id}
          title={section.label}
          description={section.description}
          visible={isSectionVisible(section.id)}
          onToggle={() => onToggleSection(section.id)}
          exportable={section.exportable}
        >
          {section.id === "benchmark_chart" && <BenchmarksClient />}
        </SectionWrapper>
      ))}
    </>
  );
}

// ── Deep Dive Editor ────────────────────────────────────────────

type DeepDiveResponse = {
  company: {
    id: string;
    name: string;
    industry: string | null;
    stage: string | null;
    website: string | null;
    logoUrl: string | null;
    lastSubmission: string | null;
  };
  periodType: string;
  latestMetrics: Array<{
    name: string;
    value: number | null;
    formattedValue: string;
    periodStart: string;
    periodType: string;
  }>;
  timeSeries: Record<string, Array<{ periodStart: string; periodEnd: string; value: number }>>;
  benchmarkPositions: Array<{
    metricName: string;
    value: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    percentile: number | null;
  }>;
};

type DeepDivePeriodType = "monthly" | "quarterly" | "yearly";

const PERIOD_OPTIONS: { value: DeepDivePeriodType; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Annual" },
];

function DeepDiveEditor({
  template,
  visibleSections,
  onToggleSection,
  isSectionVisible,
  companyId,
}: {
  template: (typeof REPORT_TEMPLATES)["deep_dive"];
  visibleSections: string[];
  onToggleSection: (id: string) => void;
  isSectionVisible: (id: string) => boolean;
  companyId?: string;
}) {
  const [companies, setCompanies] = React.useState<Array<{ id: string; name: string }>>([]);
  const [selectedCompany, setSelectedCompany] = React.useState(companyId ?? "");
  const [periodType, setPeriodType] = React.useState<DeepDivePeriodType>("quarterly");
  const [deepDiveData, setDeepDiveData] = React.useState<DeepDiveResponse | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Fetch available companies + auto-select first if none pre-selected
  React.useEffect(() => {
    async function loadCompanies() {
      try {
        const res = await fetch("/api/investors/companies");
        if (res.ok) {
          const json = await res.json();
          const list: Array<{ id: string; name: string }> = json.companies ?? [];
          setCompanies(list);
          if (list.length > 0) {
            setSelectedCompany((prev) => prev || list[0].id);
          }
        }
      } catch {
        // Silently fail
      }
    }
    loadCompanies();
  }, []);

  // Fetch deep dive data
  React.useEffect(() => {
    if (!selectedCompany) return;
    let cancelled = false;
    setLoading(true);

    async function fetchDeepDive() {
      try {
        const params = new URLSearchParams({ periodType });
        const res = await fetch(`/api/investors/companies/${selectedCompany}/deep-dive?${params}`);
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) setDeepDiveData(json);
        }
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDeepDive();
    return () => { cancelled = true; };
  }, [selectedCompany, periodType]);

  return (
    <>
      {/* Company & period selectors */}
      <div className="card-surface rounded-xl border border-border-subtle p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
              Company
            </label>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger>
                <SelectValue placeholder="Select a company..." />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
              Period
            </label>
            <Select value={periodType} onValueChange={(v) => setPeriodType(v as DeepDivePeriodType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading company data...</span>
        </div>
      )}

      {!loading && selectedCompany && !deepDiveData && (
        <div className="py-12 text-center text-sm text-text-muted">
          No data available for this company.
        </div>
      )}

      {!loading && deepDiveData && (
        <>
          {template.sections.map((section) => (
            <SectionWrapper
              key={section.id}
              id={section.id}
              title={section.label}
              description={section.description}
              visible={isSectionVisible(section.id)}
              onToggle={() => onToggleSection(section.id)}
              exportable={section.exportable}
            >
              {section.id === "company_overview" && (
                <CompanyHeader company={deepDiveData.company} />
              )}
              {section.id === "company_kpis" && (
                <CompanyMetricKPIs metrics={deepDiveData.latestMetrics} />
              )}
              {section.id === "company_trends" && (
                <CompanyMetricTrends timeSeries={deepDiveData.timeSeries} periodType={periodType} />
              )}
              {section.id === "company_benchmarks" && (
                <CompanyBenchmarkPosition
                  positions={deepDiveData.benchmarkPositions}
                  companyName={deepDiveData.company.name}
                />
              )}
            </SectionWrapper>
          ))}
        </>
      )}

      {!selectedCompany && companies.length === 0 && (
        <div className="py-12 text-center text-sm text-text-muted">
          No portfolio companies available.
        </div>
      )}
    </>
  );
}
