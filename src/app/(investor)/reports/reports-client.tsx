"use client";

import * as React from "react";
import {
  KPICards,
  DistributionCharts,
  TopPerformers,
} from "@/components/reports";
import { MetricDrilldownPanel, type CompanyMetricBreakdown } from "@/components/reports/metric-drilldown-panel";

// Labels for display
const METRIC_LABELS: Record<string, string> = {
  revenue: "Total Revenue",
  mrr: "Total MRR",
  arr: "Total ARR",
  "burn rate": "Avg Burn Rate",
  headcount: "Total Headcount",
  "gross margin": "Avg Gross Margin",
};

type DrilldownData = Record<string, CompanyMetricBreakdown[]>;

type Props = {
  aggregates: Record<
    string,
    {
      sum: number | null;
      average: number;
      median: number;
      count: number;
      canSum: boolean;
    }
  >;
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
  drilldownData: DrilldownData;
};

export function ReportsClient({
  aggregates,
  totalCompanies,
  companiesWithData,
  byIndustry,
  byStage,
  byCompany,
  drilldownData,
}: Props) {
  const [selectedMetric, setSelectedMetric] = React.useState<string | null>(null);

  function handleMetricClick(metricName: string) {
    setSelectedMetric(metricName);
  }

  function handleClosePanel() {
    setSelectedMetric(null);
  }

  // Get total value for the selected metric
  const selectedTotal = React.useMemo(() => {
    if (!selectedMetric || !aggregates[selectedMetric]) return 0;
    const agg = aggregates[selectedMetric];
    return agg.canSum && agg.sum !== null ? agg.sum : agg.average;
  }, [selectedMetric, aggregates]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <KPICards
        aggregates={aggregates}
        totalCompanies={totalCompanies}
        companiesWithData={companiesWithData}
        onMetricClick={handleMetricClick}
      />

      {/* Distribution Charts */}
      <DistributionCharts
        byIndustry={byIndustry}
        byStage={byStage}
      />

      {/* Top Performers */}
      <TopPerformers companies={byCompany} />

      {/* Drilldown Panel */}
      {selectedMetric && drilldownData[selectedMetric] && (
        <MetricDrilldownPanel
          metricName={selectedMetric}
          metricLabel={METRIC_LABELS[selectedMetric] ?? selectedMetric}
          total={selectedTotal}
          companies={drilldownData[selectedMetric]}
          onClose={handleClosePanel}
        />
      )}
    </div>
  );
}
