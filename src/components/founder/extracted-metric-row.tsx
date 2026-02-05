"use client";

import * as React from "react";
import { Check, X, ChevronDown, ChevronUp, AlertTriangle, Pencil } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ExtractionMapping = {
  id: string;
  extracted_metric_name: string;
  extracted_value: { raw?: string; unit?: string } | null;
  extracted_period_start: string;
  extracted_period_end: string;
  extracted_period_type: string;
  confidence_score: number | null;
  status: string;
};

type Props = {
  mapping: ExtractionMapping;
  onAccept: (mappingId: string, overrides?: {
    metricName?: string;
    value?: string;
    periodType?: string;
    periodStart?: string;
    periodEnd?: string;
  }) => void;
  onReject: (mappingId: string) => void;
  onUpdate?: (mappingId: string, updates: {
    metricName?: string;
    value?: string;
    periodStart?: string;
    periodEnd?: string;
  }) => void;
  disabled?: boolean;
};

/**
 * Generate period options for the dropdown
 * Returns last 8 quarters + last 12 months + last 3 years
 */
function generatePeriodOptions(periodType: string): Array<{
  label: string;
  periodStart: string;
  periodEnd: string;
}> {
  const options: Array<{ label: string; periodStart: string; periodEnd: string }> = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  if (periodType === "quarterly") {
    // Last 8 quarters
    for (let i = 0; i < 8; i++) {
      const quarterOffset = i;
      const totalMonths = currentMonth - quarterOffset * 3;
      let year = currentYear;
      let quarter = Math.floor(currentMonth / 3) + 1 - quarterOffset;

      while (quarter <= 0) {
        quarter += 4;
        year -= 1;
      }

      const startMonth = (quarter - 1) * 3;
      const endMonth = startMonth + 2;
      const lastDay = new Date(year, endMonth + 1, 0).getDate();

      options.push({
        label: `Q${quarter} ${year}`,
        periodStart: `${year}-${String(startMonth + 1).padStart(2, "0")}-01`,
        periodEnd: `${year}-${String(endMonth + 1).padStart(2, "0")}-${lastDay}`,
      });
    }
  } else if (periodType === "monthly") {
    // Last 12 months
    for (let i = 0; i < 12; i++) {
      let month = currentMonth - i;
      let year = currentYear;
      while (month < 0) {
        month += 12;
        year -= 1;
      }

      const lastDay = new Date(year, month + 1, 0).getDate();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      options.push({
        label: `${monthNames[month]} ${year}`,
        periodStart: `${year}-${String(month + 1).padStart(2, "0")}-01`,
        periodEnd: `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`,
      });
    }
  } else {
    // Annual - last 3 years
    for (let i = 0; i < 3; i++) {
      const year = currentYear - i;
      options.push({
        label: String(year),
        periodStart: `${year}-01-01`,
        periodEnd: `${year}-12-31`,
      });
    }
  }

  return options;
}

function confidenceColor(score: number): string {
  if (score >= 0.8) return "text-emerald-300";
  if (score >= 0.5) return "text-amber-300";
  return "text-red-300";
}

function confidenceLabel(score: number): string {
  if (score >= 0.8) return "High";
  if (score >= 0.5) return "Medium";
  return "Low";
}

function formatPeriodLabel(start: string, end: string, type: string): string {
  if (!start) return "Unknown period";
  const d = new Date(start + "T00:00:00");
  if (type === "quarterly") {
    const q = Math.floor(d.getMonth() / 3) + 1;
    return `Q${q} ${d.getFullYear()}`;
  }
  if (type === "annual") {
    return String(d.getFullYear());
  }
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function ExtractedMetricRow({ mapping, onAccept, onReject, onUpdate, disabled }: Props) {
  const [expanded, setExpanded] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const [editName, setEditName] = React.useState(mapping.extracted_metric_name);
  const [editValue, setEditValue] = React.useState(mapping.extracted_value?.raw ?? "");
  const [editPeriodStart, setEditPeriodStart] = React.useState(mapping.extracted_period_start);
  const [editPeriodEnd, setEditPeriodEnd] = React.useState(mapping.extracted_period_end);

  const confidence = mapping.confidence_score ?? 0;
  const isReviewed = mapping.status !== "pending";
  const isAccepted = mapping.status === "accepted";

  // Check if period was changed
  const periodChanged = editPeriodStart !== mapping.extracted_period_start;

  // Generate period options for the dropdown
  const periodOptions = React.useMemo(() => {
    const options = generatePeriodOptions(mapping.extracted_period_type);

    // Ensure the extracted period is in the list (in case AI extracted an older period)
    const extractedExists = options.some(
      (o) => o.periodStart === mapping.extracted_period_start,
    );

    if (!extractedExists && mapping.extracted_period_start) {
      const extractedLabel = formatPeriodLabel(
        mapping.extracted_period_start,
        mapping.extracted_period_end,
        mapping.extracted_period_type,
      );
      options.push({
        label: extractedLabel,
        periodStart: mapping.extracted_period_start,
        periodEnd: mapping.extracted_period_end,
      });
    }

    return options;
  }, [
    mapping.extracted_period_type,
    mapping.extracted_period_start,
    mapping.extracted_period_end,
  ]);

  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        isReviewed
          ? mapping.status === "accepted"
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "border-red-500/20 bg-red-500/5 opacity-60"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {mapping.extracted_metric_name}
            </span>
            <span className={`text-[10px] font-medium ${confidenceColor(confidence)}`}>
              {confidenceLabel(confidence)} ({(confidence * 100).toFixed(0)}%)
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-white/50">
            <span className="font-mono">{mapping.extracted_value?.raw ?? "—"}</span>
            {mapping.extracted_value?.unit && (
              <span>{mapping.extracted_value.unit}</span>
            )}
            <span>·</span>
            <span className={periodChanged ? "line-through text-white/30" : ""}>
              {formatPeriodLabel(
                mapping.extracted_period_start,
                mapping.extracted_period_end,
                mapping.extracted_period_type,
              )}
            </span>
            {periodChanged && (
              <>
                <span className="text-amber-400">→</span>
                <span className="text-amber-300 font-medium">
                  {formatPeriodLabel(
                    editPeriodStart,
                    editPeriodEnd,
                    mapping.extracted_period_type,
                  )}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Status or actions */}
        {isReviewed && !editMode ? (
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-medium ${
                mapping.status === "accepted" ? "text-emerald-300" : "text-red-300"
              }`}
            >
              {mapping.status === "accepted" ? "Accepted" : "Rejected"}
            </span>
            {isAccepted && onUpdate && (
              <button
                type="button"
                onClick={() => setEditMode(true)}
                disabled={disabled}
                className="h-6 w-6 inline-flex items-center justify-center rounded-md text-white/40 hover:bg-white/10 hover:text-white/60 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-white/20"
                title="Edit metric"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </div>
        ) : editMode ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setEditMode(false);
                // Reset to original values
                setEditName(mapping.extracted_metric_name);
                setEditValue(mapping.extracted_value?.raw ?? "");
                setEditPeriodStart(mapping.extracted_period_start);
                setEditPeriodEnd(mapping.extracted_period_end);
              }}
              disabled={disabled}
              className="h-7 px-2 inline-flex items-center gap-1 rounded-md border border-white/10 text-white/60 text-xs hover:bg-white/10 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdate?.(mapping.id, {
                  metricName: editName,
                  value: editValue,
                  periodStart: editPeriodStart,
                  periodEnd: editPeriodEnd,
                });
                setEditMode(false);
              }}
              disabled={disabled}
              className="h-7 px-2 inline-flex items-center gap-1 rounded-md bg-violet-500/20 text-violet-200 text-xs font-medium hover:bg-violet-500/30 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <Check className="h-3.5 w-3.5" />
              Save
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {/* Expand/edit toggle */}
            <button
              type="button"
              onClick={() => setExpanded((p) => !p)}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-white/40 hover:bg-white/10 hover:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/20"
              title="Edit before accepting"
            >
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onReject(mapping.id)}
              disabled={disabled}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-red-400/60 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              title="Reject"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                onAccept(
                  mapping.id,
                  expanded || periodChanged
                    ? {
                        metricName: editName,
                        value: editValue,
                        periodStart: editPeriodStart,
                        periodEnd: editPeriodEnd,
                      }
                    : undefined,
                )
              }
              disabled={disabled}
              className="h-7 px-2 inline-flex items-center gap-1 rounded-md bg-emerald-500/20 text-emerald-200 text-xs font-medium hover:bg-emerald-500/30 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              title="Accept"
            >
              <Check className="h-3.5 w-3.5" />
              Accept
            </button>
          </div>
        )}
      </div>

      {/* Expanded edit form */}
      {((expanded && !isReviewed) || editMode) && (
        <div className="mt-3 space-y-3 border-t border-white/5 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider">
                Metric Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1 h-8 w-full rounded-md border border-white/10 bg-black/30 px-2 text-sm outline-none focus:border-white/20"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider">
                Value
              </label>
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="mt-1 h-8 w-full rounded-md border border-white/10 bg-black/30 px-2 text-sm font-mono outline-none focus:border-white/20"
              />
            </div>
          </div>

          {/* Period selector */}
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1.5">
              Period
              {periodChanged && (
                <span className="text-amber-400 normal-case flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Changed from AI extraction
                </span>
              )}
            </label>
            <Select
              value={editPeriodStart}
              onValueChange={(value) => {
                const selected = periodOptions.find((p) => p.periodStart === value);
                if (selected) {
                  setEditPeriodStart(selected.periodStart);
                  setEditPeriodEnd(selected.periodEnd);
                }
              }}
            >
              <SelectTrigger size="sm" className="mt-1">
                <SelectValue>
                  {periodOptions.find((p) => p.periodStart === editPeriodStart)?.label ?? "Select period"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((opt) => (
                  <SelectItem key={opt.periodStart} value={opt.periodStart}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-[10px] text-white/30">
              Select the correct period if AI extracted the wrong one
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
