"use client";

import { useState } from "react";
import { X } from "lucide-react";

type UploadValue = {
  id: string;
  metric_name: string;
  period_type: string;
  period_start: string;
  period_end: string;
  value: { raw: string; unit: string | null };
  user_edited_value: string | null;
  user_edited_metric_name: string | null;
  user_edited_period_start: string | null;
  user_edited_period_end: string | null;
};

type Edits = {
  metricName?: string;
  value?: string;
  periodStart?: string;
  periodEnd?: string;
};

export function ValueEditModal({
  value,
  onSave,
  onClose,
}: {
  value: UploadValue;
  onSave: (edits: Edits) => void;
  onClose: () => void;
}) {
  const [metricName, setMetricName] = useState(
    value.user_edited_metric_name ?? value.metric_name,
  );
  const [rawValue, setRawValue] = useState(
    value.user_edited_value ?? value.value?.raw ?? "",
  );
  const [periodStart, setPeriodStart] = useState(
    value.user_edited_period_start ?? value.period_start,
  );
  const [periodEnd, setPeriodEnd] = useState(
    value.user_edited_period_end ?? value.period_end,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      metricName: metricName !== value.metric_name ? metricName : undefined,
      value: rawValue !== value.value?.raw ? rawValue : undefined,
      periodStart: periodStart !== value.period_start ? periodStart : undefined,
      periodEnd: periodEnd !== value.period_end ? periodEnd : undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-backdrop backdrop-blur-sm modal-backdrop-enter"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Edit metric value"
    >
      <div className="w-full max-w-md rounded-xl border border-border-default bg-bg-secondary p-6 modal-dialog-enter">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-text-primary">Edit Value</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-text-tertiary hover:bg-bg-elevated hover:text-text-secondary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-metric-name" className="mb-1 block text-xs text-text-secondary">
              Metric Name
            </label>
            <input
              id="edit-metric-name"
              type="text"
              value={metricName}
              onChange={(e) => setMetricName(e.target.value)}
              className="h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm text-text-primary transition-colors hover:border-border-default focus:border-border-default focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="edit-metric-value" className="mb-1 block text-xs text-text-secondary">
              Value
            </label>
            <input
              id="edit-metric-value"
              type="text"
              value={rawValue}
              onChange={(e) => setRawValue(e.target.value)}
              className="h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm text-text-primary transition-colors hover:border-border-default focus:border-border-default focus:outline-none"
            />
            {value.value?.unit && (
              <p className="mt-1 text-xs text-text-tertiary">
                Unit: {value.value.unit}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-period-start" className="mb-1 block text-xs text-text-secondary">
                Period Start
              </label>
              <input
                id="edit-period-start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm text-text-primary transition-colors hover:border-border-default focus:border-border-default focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="edit-period-end" className="mb-1 block text-xs text-text-secondary">
                Period End
              </label>
              <input
                id="edit-period-end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm text-text-primary transition-colors hover:border-border-default focus:border-border-default focus:outline-none"
              />
            </div>
          </div>

          <p className="text-xs text-text-tertiary">
            Period type: {value.period_type}
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border-default px-4 py-2 text-sm text-text-secondary hover:bg-bg-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-btn-primary-bg px-4 py-2 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover"
            >
              Save & Approve
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
