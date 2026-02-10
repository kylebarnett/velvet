"use client";

import * as React from "react";
import { MetricDetailPanel } from "@/components/metrics/metric-detail-panel";
import { SourceBadge } from "@/components/metrics/source-badge";

type MetricValue = {
  id: string;
  metric_name: string;
  period_type: string;
  period_start: string;
  period_end: string;
  value: { raw?: string } | null;
  notes: string | null;
  source: string;
  ai_confidence: number | null;
  submitted_at: string;
};

type Props = {
  companyId: string;
  companyName: string;
  isApproved: boolean;
  metricValues: MetricValue[];
};

export function CompanyMetricsClient({
  companyId,
  companyName,
  isApproved,
  metricValues,
}: Props) {
  const [metricSelection, setMetricSelection] = React.useState<{
    metricName: string;
    periodStart?: string;
  } | null>(null);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          {companyName} &mdash; Metrics
        </h1>
        <p className="text-sm text-text-tertiary">
          All submitted metric values for this company. Click a metric name for details.
        </p>
      </div>

      {!isApproved && (
        <div className="rounded-md border border-[var(--status-warning-bg)] bg-[var(--status-warning-bg)] px-3 py-2 text-sm text-[var(--status-warning-text)]">
          Approval required. The founder needs to approve your access to view metric data.
        </div>
      )}

      {isApproved && metricValues.length === 0 && (
        <div className="rounded-xl border border-border-default bg-bg-elevated p-4">
          <div className="text-sm text-text-tertiary">No metric data submitted yet.</div>
        </div>
      )}

      {isApproved && metricValues.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border-default">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-default bg-bg-elevated">
                <th className="px-4 py-3 font-medium text-text-secondary">Metric</th>
                <th className="px-4 py-3 font-medium text-text-secondary">Period</th>
                <th className="px-4 py-3 font-medium text-text-secondary">Value</th>
                <th className="px-4 py-3 font-medium text-text-secondary">Source</th>
                <th className="px-4 py-3 font-medium text-text-secondary">Notes</th>
                <th className="px-4 py-3 font-medium text-text-secondary">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {metricValues.map((mv) => (
                <tr key={mv.id} className="border-b border-border-subtle">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() =>
                        setMetricSelection({
                          metricName: mv.metric_name,
                          periodStart: mv.period_start,
                        })
                      }
                      className="text-left hover:underline underline-offset-2"
                    >
                      <div className="font-medium">{mv.metric_name}</div>
                      <div className="text-xs text-text-tertiary">{mv.period_type}</div>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {mv.period_start} to {mv.period_end}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {mv.value?.raw ?? "\u2014"}
                  </td>
                  <td className="px-4 py-3">
                    <SourceBadge
                      source={mv.source}
                      confidence={mv.ai_confidence}
                    />
                  </td>
                  <td className="px-4 py-3 text-text-tertiary">
                    {mv.notes ?? "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-text-tertiary">
                    {new Date(mv.submitted_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Metric Detail Panel */}
      {metricSelection && (
        <MetricDetailPanel
          companyId={companyId}
          metricName={metricSelection.metricName}
          initialPeriod={metricSelection.periodStart}
          onClose={() => setMetricSelection(null)}
          editable={false}
        />
      )}
    </div>
  );
}
