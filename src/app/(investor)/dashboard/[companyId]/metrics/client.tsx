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
  const [selectedMetric, setSelectedMetric] = React.useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          {companyName} &mdash; Metrics
        </h1>
        <p className="text-sm text-white/60">
          All submitted metric values for this company. Click a metric name for details.
        </p>
      </div>

      {!isApproved && (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Approval required. The founder needs to approve your access to view metric data.
        </div>
      )}

      {isApproved && metricValues.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-white/60">No metric data submitted yet.</div>
        </div>
      )}

      {isApproved && metricValues.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 font-medium text-white/70">Metric</th>
                <th className="px-4 py-3 font-medium text-white/70">Period</th>
                <th className="px-4 py-3 font-medium text-white/70">Value</th>
                <th className="px-4 py-3 font-medium text-white/70">Source</th>
                <th className="px-4 py-3 font-medium text-white/70">Notes</th>
                <th className="px-4 py-3 font-medium text-white/70">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {metricValues.map((mv) => (
                <tr key={mv.id} className="border-b border-white/5">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setSelectedMetric(mv.metric_name)}
                      className="text-left hover:underline underline-offset-2"
                    >
                      <div className="font-medium">{mv.metric_name}</div>
                      <div className="text-xs text-white/60">{mv.period_type}</div>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-white/70">
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
                  <td className="px-4 py-3 text-white/60">
                    {mv.notes ?? "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    {new Date(mv.submitted_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Metric Detail Panel */}
      {selectedMetric && (
        <MetricDetailPanel
          companyId={companyId}
          metricName={selectedMetric}
          onClose={() => setSelectedMetric(null)}
          editable={false}
        />
      )}
    </div>
  );
}
