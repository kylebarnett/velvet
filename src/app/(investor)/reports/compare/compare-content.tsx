"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

import {
  CompanyMultiSelect,
  ComparisonChart,
  ComparisonTable,
  NormalizationToggle,
  SavedReportsDropdown,
  SaveReportModal,
} from "@/components/reports";

type Company = {
  id: string;
  name: string;
  industry: string | null;
  stage: string | null;
};

type CompareContentProps = {
  selectedCompanies?: string;
  periodType?: string;
  startDate?: string;
  endDate?: string;
  normalize?: string;
  selectedMetric?: string;
};

type CompareData = {
  companies: Company[];
  commonMetrics: string[];
  metricsCompared: string[];
  chartDataByMetric: Record<
    string,
    Array<{ period: string; label: string; [key: string]: string | number | null }>
  >;
  tableData: Array<{
    metric: string;
    companies: Array<{
      companyId: string;
      companyName: string;
      value: number | null;
      previousValue: number | null;
      change: number | null;
    }>;
  }>;
  portfolioAverage: Record<string, Array<{ period: string; value: number }>>;
  normalize: string;
};

type SavedReport = {
  id: string;
  name: string;
  description: string | null;
  report_type: string;
  filters: Record<string, unknown>;
  company_ids: string[];
  normalize: string;
  config: Record<string, unknown>;
  is_default: boolean;
  updated_at: string;
};

export function CompareContent({
  selectedCompanies,
  periodType = "monthly",
  startDate,
  endDate,
  normalize = "absolute",
  selectedMetric,
}: CompareContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    selectedCompanies?.split(",").filter(Boolean) ?? []
  );
  const [compareData, setCompareData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMetric, setCurrentMetric] = useState<string>(selectedMetric ?? "");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [currentReport, setCurrentReport] = useState<SavedReport | null>(null);

  // Fetch list of available companies
  useEffect(() => {
    async function fetchCompanies() {
      try {
        const res = await fetch("/api/investors/companies");
        if (!res.ok) throw new Error("Failed to fetch companies");
        const data = await res.json();
        // Filter to only approved companies
        const approved = data.companies.filter((c: { approvalStatus: string }) =>
          ["auto_approved", "approved"].includes(c.approvalStatus)
        );
        setCompanies(approved);
      } catch (err) {
        setError("Failed to load companies");
      }
    }
    fetchCompanies();
  }, []);

  // Update URL when selection changes
  const updateUrlParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Fetch comparison data when we have enough companies
  useEffect(() => {
    if (selectedIds.length < 2) {
      setCompareData(null);
      return;
    }

    async function fetchComparison() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("companyIds", selectedIds.join(","));
        params.set("periodType", periodType);
        params.set("normalize", normalize);
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);

        const res = await fetch(`/api/investors/portfolio/compare?${params.toString()}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch comparison");
        }

        const data = await res.json();
        setCompareData(data);

        // Set default metric if not selected
        if (!currentMetric && data.metricsCompared.length > 0) {
          setCurrentMetric(data.metricsCompared[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load comparison");
      } finally {
        setLoading(false);
      }
    }

    fetchComparison();
  }, [selectedIds, periodType, normalize, startDate, endDate]);

  const handleSelectionChange = (ids: string[]) => {
    setSelectedIds(ids);
    updateUrlParams({ companies: ids.length > 0 ? ids.join(",") : null });
  };

  const handleNormalizationChange = (value: string) => {
    updateUrlParams({ normalize: value !== "absolute" ? value : null });
  };

  const handleMetricChange = (metric: string) => {
    setCurrentMetric(metric);
    updateUrlParams({ metric: metric || null });
  };

  const handleLoadReport = useCallback(
    (report: SavedReport) => {
      setCurrentReport(report);

      // Build URL params from saved report
      const params = new URLSearchParams();

      if (report.company_ids?.length > 0) {
        params.set("companies", report.company_ids.join(","));
        setSelectedIds(report.company_ids);
      }

      if (report.normalize && report.normalize !== "absolute") {
        params.set("normalize", report.normalize);
      }

      const filters = report.filters as Record<string, string>;
      if (filters?.periodType) params.set("periodType", filters.periodType);
      if (filters?.startDate) params.set("startDate", filters.startDate);
      if (filters?.endDate) params.set("endDate", filters.endDate);

      const config = report.config as Record<string, string>;
      if (config?.metric) {
        params.set("metric", config.metric);
        setCurrentMetric(config.metric);
      }

      router.push(`?${params.toString()}`);
    },
    [router]
  );

  const handleSaveReport = (saved: { id: string; name: string }) => {
    setCurrentReport((prev) =>
      prev ? { ...prev, id: saved.id, name: saved.name } : null
    );
  };

  if (error && !companies.length) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
        <p className="text-red-200">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Save/Load Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SavedReportsDropdown
            reportType="comparison"
            onLoad={handleLoadReport}
          />

          {currentReport && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white/50">Viewing:</span>
              <span className="font-medium">{currentReport.name}</span>
              <button
                onClick={() => setCurrentReport(null)}
                className="text-white/40 hover:text-white"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowSaveModal(true)}
          className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
            />
          </svg>
          {currentReport ? "Update Report" : "Save Report"}
        </button>
      </div>

      {/* Company Selection */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="mb-3 text-sm font-medium text-white/80">Select Companies</h3>
        <CompanyMultiSelect
          companies={companies}
          selectedIds={selectedIds}
          onChange={handleSelectionChange}
          maxSelection={8}
          minSelection={2}
        />
      </div>

      {/* Controls */}
      {selectedIds.length >= 2 && (
        <div className="flex flex-wrap items-center gap-4">
          <NormalizationToggle
            value={normalize}
            onChange={handleNormalizationChange}
          />

          {compareData && compareData.metricsCompared.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/60">Metric:</span>
              <select
                value={currentMetric}
                onChange={(e) => handleMetricChange(e.target.value)}
                className="h-9 rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white"
              >
                {compareData.metricsCompared.map((metric) => (
                  <option key={metric} value={metric}>
                    {metric.charAt(0).toUpperCase() + metric.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-sm text-white/60">Period:</span>
            <select
              value={periodType}
              onChange={(e) => updateUrlParams({ periodType: e.target.value })}
              className="h-9 rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          <div className="h-80 animate-pulse rounded-xl bg-white/5" />
          <div className="h-48 animate-pulse rounded-xl bg-white/5" />
        </div>
      )}

      {/* Comparison Results */}
      {!loading && compareData && selectedIds.length >= 2 && (
        <div className="space-y-6">
          {/* No Common Metrics Warning */}
          {compareData.metricsCompared.length === 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-amber-200">
                The selected companies don't share any common metrics.
              </p>
              <p className="mt-1 text-sm text-amber-200/60">
                Try selecting companies in the same industry or with similar metrics.
              </p>
            </div>
          )}

          {/* Chart */}
          {currentMetric && compareData.chartDataByMetric[currentMetric] && (
            <ComparisonChart
              data={compareData.chartDataByMetric[currentMetric]}
              companies={compareData.companies}
              metric={currentMetric}
              portfolioAverage={compareData.portfolioAverage[currentMetric]}
              showBenchmark={true}
            />
          )}

          {/* Table */}
          {compareData.tableData.length > 0 && (
            <ComparisonTable
              data={compareData.tableData}
              companies={compareData.companies}
            />
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && selectedIds.length < 2 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-white/60">
            Select at least 2 companies to compare.
          </p>
        </div>
      )}

      {/* Save Report Modal */}
      <SaveReportModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveReport}
        reportType="comparison"
        filters={{ periodType, startDate, endDate }}
        companyIds={selectedIds}
        normalize={normalize}
        config={{ metric: currentMetric }}
        existingReportId={currentReport?.id}
        existingReportName={currentReport?.name}
      />
    </div>
  );
}
