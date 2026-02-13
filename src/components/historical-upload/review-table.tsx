"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  X,
  Pencil,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Search,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { ValueEditModal } from "./value-edit-modal";
import { ConflictCard } from "./conflict-card";

type UploadValue = {
  id: string;
  company_id: string | null;
  company_name_detected: string | null;
  metric_name: string;
  period_type: string;
  period_start: string;
  period_end: string;
  value: { raw: string; unit: string | null };
  ai_confidence: number | null;
  sheet_name: string | null;
  cell_reference: string | null;
  status: "pending" | "approved" | "rejected" | "conflict";
  conflict_type: string | null;
  conflict_existing_value: Record<string, unknown> | null;
  user_edited_value: string | null;
  user_edited_metric_name: string | null;
  user_edited_period_start: string | null;
  user_edited_period_end: string | null;
};

type CompletionStats = {
  approved: number;
  rejected: number;
  skipped: number;
};

// Group values by company then by metric
type MetricGroup = {
  metricName: string;
  values: UploadValue[];
  collapsed: boolean;
};

type CompanyGroup = {
  companyName: string;
  companyId: string | null;
  metrics: MetricGroup[];
  collapsed: boolean;
};

export function ReviewTable({
  uploadId,
  role,
  totalValues,
  onComplete,
}: {
  uploadId: string;
  role: "investor" | "founder";
  totalValues: number;
  onComplete: (stats: CompletionStats) => void;
}) {
  const [values, setValues] = useState<UploadValue[]>([]);
  const [groups, setGroups] = useState<CompanyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [total, setTotal] = useState(totalValues);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [editingValue, setEditingValue] = useState<UploadValue | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const lastSelectedRef = useRef<string | null>(null);

  // Stats for the header
  const approvedCount = values.filter((v) => v.status === "approved").length;
  const rejectedCount = values.filter((v) => v.status === "rejected").length;
  const pendingCount = values.filter((v) => v.status === "pending" || v.status === "conflict").length;

  const fetchValues = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: "100",
        offset: String(offset),
      });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/historical-upload/${uploadId}?${params}`);
      if (!res.ok) throw new Error("Failed to load values.");

      const data = await res.json();
      setValues(data.values ?? []);
      setTotal(data.total ?? 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [uploadId, offset, search, statusFilter]);

  useEffect(() => {
    fetchValues();
  }, [fetchValues]);

  // Build grouped structure from flat values
  useEffect(() => {
    const companyMap = new Map<string, CompanyGroup>();

    for (const v of values) {
      const companyKey = v.company_name_detected ?? "Unknown Company";
      let company = companyMap.get(companyKey);
      if (!company) {
        company = {
          companyName: companyKey,
          companyId: v.company_id,
          metrics: [],
          collapsed: false,
        };
        companyMap.set(companyKey, company);
      }

      let metricGroup = company.metrics.find((m) => m.metricName === v.metric_name);
      if (!metricGroup) {
        metricGroup = { metricName: v.metric_name, values: [], collapsed: false };
        company.metrics.push(metricGroup);
      }

      metricGroup.values.push(v);
    }

    setGroups(Array.from(companyMap.values()));
  }, [values]);

  const handleAction = useCallback(
    async (valueIds: string[], action: "approve" | "reject") => {
      setProcessing(true);
      setError(null);

      try {
        const res = await fetch(`/api/historical-upload/${uploadId}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actions: valueIds.map((id) => ({ valueId: id, action })),
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Action failed.");
        }

        // Update local state
        setValues((prev) =>
          prev.map((v) =>
            valueIds.includes(v.id)
              ? { ...v, status: action === "approve" ? "approved" : "rejected" }
              : v,
          ),
        );
        setSelected(new Set());
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Action failed.");
      } finally {
        setProcessing(false);
      }
    },
    [uploadId],
  );

  const handleBulkAction = useCallback(
    async (action: "approve_all" | "reject_all", minConfidence?: number) => {
      setProcessing(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/historical-upload/${uploadId}/bulk-action`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action,
              filter: minConfidence != null ? { minConfidence } : undefined,
            }),
          },
        );

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Bulk action failed.");
        }

        // Refresh data
        await fetchValues();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Bulk action failed.");
      } finally {
        setProcessing(false);
      }
    },
    [uploadId, fetchValues],
  );

  const handleEditSave = useCallback(
    async (
      valueId: string,
      edits: {
        metricName?: string;
        value?: string;
        periodStart?: string;
        periodEnd?: string;
      },
    ) => {
      await handleAction(
        [valueId],
        "approve",
      );
      // The review route supports passing edits in the action
      setProcessing(true);
      try {
        const res = await fetch(`/api/historical-upload/${uploadId}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actions: [
              {
                valueId,
                action: "approve",
                ...edits,
              },
            ],
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Save failed.");
        }
        setValues((prev) =>
          prev.map((v) =>
            v.id === valueId ? { ...v, status: "approved" } : v,
          ),
        );
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Save failed.");
      } finally {
        setProcessing(false);
        setEditingValue(null);
      }
    },
    [uploadId, handleAction],
  );

  const handleSelect = useCallback(
    (valueId: string, shiftKey: boolean) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (shiftKey && lastSelectedRef.current) {
          // Range select
          const allIds = values.map((v) => v.id);
          const lastIdx = allIds.indexOf(lastSelectedRef.current);
          const currIdx = allIds.indexOf(valueId);
          const [start, end] = lastIdx < currIdx ? [lastIdx, currIdx] : [currIdx, lastIdx];
          for (let i = start; i <= end; i++) {
            next.add(allIds[i]);
          }
        } else {
          if (next.has(valueId)) {
            next.delete(valueId);
          } else {
            next.add(valueId);
          }
        }
        lastSelectedRef.current = valueId;
        return next;
      });
    },
    [values],
  );

  const toggleCompany = useCallback((companyName: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.companyName === companyName ? { ...g, collapsed: !g.collapsed } : g,
      ),
    );
  }, []);

  const toggleMetric = useCallback((companyName: string, metricName: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.companyName === companyName
          ? {
              ...g,
              metrics: g.metrics.map((m) =>
                m.metricName === metricName
                  ? { ...m, collapsed: !m.collapsed }
                  : m,
              ),
            }
          : g,
      ),
    );
  }, []);

  const handleFinish = () => {
    const skipped = values.filter(
      (v) => v.status === "pending" || v.status === "conflict",
    ).length;
    onComplete({
      approved: approvedCount,
      rejected: rejectedCount,
      skipped,
    });
  };

  const formatValue = (v: UploadValue) => {
    const raw = v.user_edited_value ?? v.value?.raw ?? "0";
    const num = parseFloat(raw);
    if (isNaN(num)) return raw;
    const unit = v.value?.unit;
    if (unit === "USD") return `$${num.toLocaleString()}`;
    if (unit === "percent") return `${num}%`;
    return num.toLocaleString();
  };

  const formatPeriod = (v: UploadValue) => {
    const start = v.user_edited_period_start ?? v.period_start;
    const type = v.period_type;
    const d = new Date(start + "T00:00:00");
    if (type === "monthly") {
      return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
    if (type === "quarterly") {
      const q = Math.floor(d.getMonth() / 3) + 1;
      return `Q${q} ${d.getFullYear()}`;
    }
    return String(d.getFullYear());
  };

  const confidenceColor = (conf: number | null) => {
    if (conf === null) return "text-text-tertiary";
    if (conf >= 0.9) return "text-[var(--success-accent)]";
    if (conf >= 0.7) return "text-[var(--warning-accent)]";
    return "text-[var(--error-accent)]";
  };

  return (
    <div className="space-y-4">
      {/* Header with search/filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search metrics..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
            }}
            className="h-11 w-full rounded-md border border-border-default bg-bg-input pl-9 pr-8 text-sm text-text-primary transition-colors hover:border-border-default focus:border-border-default focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setOffset(0);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-text-muted hover:text-text-secondary"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setOffset(0);
          }}
          className="h-11 rounded-md border border-border-default bg-bg-input px-3 text-sm text-text-primary transition-colors hover:border-border-default focus:border-border-default focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="conflict">Conflicts</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Bulk actions */}
      <div className="flex flex-wrap items-center gap-2">
        {selected.size > 0 ? (
          <>
            <span className="text-sm text-text-secondary">{selected.size} selected</span>
            <button
              onClick={() => handleAction(Array.from(selected), "approve")}
              disabled={processing}
              className="rounded-md bg-[var(--success-bg-muted)] px-3 py-1.5 text-xs font-medium text-[var(--status-success-text)] hover:bg-[var(--success-bg-muted-hover)] disabled:opacity-60"
            >
              Approve Selected
            </button>
            <button
              onClick={() => handleAction(Array.from(selected), "reject")}
              disabled={processing}
              className="rounded-md bg-[var(--status-error-bg)] px-3 py-1.5 text-xs font-medium text-[var(--status-error-text)] hover:bg-[var(--error-bg-subtle)] disabled:opacity-60"
            >
              Reject Selected
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-text-tertiary hover:text-text-secondary"
            >
              Clear selection
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => handleBulkAction("approve_all", 0.9)}
              disabled={processing || pendingCount === 0}
              className="rounded-md bg-[var(--success-bg-muted)] px-3 py-1.5 text-xs font-medium text-[var(--status-success-text)] hover:bg-[var(--success-bg-muted-hover)] disabled:opacity-60"
            >
              Approve High Confidence (&gt;90%)
            </button>
            <button
              onClick={() => handleBulkAction("approve_all")}
              disabled={processing || pendingCount === 0}
              className="rounded-md border border-border-default px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-secondary disabled:opacity-60"
            >
              Approve All
            </button>
            <button
              onClick={() => handleBulkAction("reject_all")}
              disabled={processing || pendingCount === 0}
              className="rounded-md border border-border-default px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-secondary disabled:opacity-60"
            >
              Reject All
            </button>
          </>
        )}

        {processing && <Loader2 className="ml-2 h-4 w-4 animate-spin text-text-tertiary" />}
      </div>

      {/* Result count when filtering */}
      {(search || statusFilter) && (
        <div className="flex items-center gap-3">
          {values.length > 0 && values.length < totalValues && (
            <p className="text-xs text-text-muted">
              Showing {total} of {totalValues} results
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("");
              setOffset(0);
            }}
            className="text-xs text-text-tertiary hover:text-text-secondary"
          >
            Reset filters
          </button>
        </div>
      )}

      {/* Stats bar */}
      <div className="flex gap-4 text-xs text-text-secondary">
        <span>{total} total</span>
        <span className="text-[var(--warning-accent)]">{pendingCount} pending</span>
        <span className="text-[var(--success-accent)]">{approvedCount} approved</span>
        <span className="text-[var(--error-accent)]">{rejectedCount} rejected</span>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-[var(--error-border)] bg-[var(--error-bg-subtle)] p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--error-accent)]" />
          <p className="text-sm text-[var(--status-error-text)]">{error}</p>
        </div>
      )}

      {/* Grouped values */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          variant="no-results"
          title="No results found"
          description={search ? `No matches for "${search}"` : "No values match the selected filter"}
        />
      ) : (
        <div className="divide-y divide-border-default rounded-xl border border-border-default">
          {groups.map((company) => (
            <div key={company.companyName}>
              {/* Company header */}
              <button
                onClick={() => toggleCompany(company.companyName)}
                className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-bg-secondary"
              >
                {company.collapsed ? (
                  <ChevronRight className="h-4 w-4 text-text-tertiary" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-text-tertiary" />
                )}
                <span className="text-sm font-medium text-text-primary">
                  {company.companyName}
                </span>
                <span className="text-xs text-text-tertiary">
                  ({company.metrics.reduce((s, m) => s + m.values.length, 0)} values)
                </span>
              </button>

              {!company.collapsed && (
                <div className="pl-4">
                  {company.metrics.map((metric) => (
                    <div key={`${company.companyName}-${metric.metricName}`}>
                      {/* Metric header */}
                      <button
                        onClick={() =>
                          toggleMetric(company.companyName, metric.metricName)
                        }
                        className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-bg-secondary"
                      >
                        {metric.collapsed ? (
                          <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" />
                        )}
                        <span className="text-xs font-medium text-text-secondary">
                          {metric.metricName}
                        </span>
                        <span className="text-xs text-text-tertiary">
                          ({metric.values.length})
                        </span>
                      </button>

                      {!metric.collapsed && (
                        <div className="space-y-px pb-2">
                          {metric.values.map((v) => (
                            <div
                              key={v.id}
                              className={cn(
                                "group flex items-center gap-3 px-4 py-2 pl-12",
                                v.status === "approved" && "bg-[var(--success-bg-subtle)]",
                                v.status === "rejected" && "bg-[var(--error-bg-subtle)] opacity-60",
                                v.status === "conflict" && "bg-[var(--warning-bg-subtle)]",
                                selected.has(v.id) && "bg-bg-raised",
                              )}
                            >
                              {/* Checkbox */}
                              {(v.status === "pending" || v.status === "conflict") && (
                                <input
                                  type="checkbox"
                                  checked={selected.has(v.id)}
                                  onChange={(e) =>
                                    handleSelect(v.id, (e.nativeEvent as MouseEvent).shiftKey)
                                  }
                                  className="h-4 w-4 shrink-0 rounded border-border-default bg-transparent"
                                  aria-label={`Select ${v.metric_name} ${formatPeriod(v)}`}
                                />
                              )}
                              {(v.status === "approved" || v.status === "rejected") && (
                                <div className="w-4" />
                              )}

                              {/* Period */}
                              <span className="w-24 shrink-0 text-xs text-text-secondary">
                                {formatPeriod(v)}
                              </span>

                              {/* Value */}
                              <span className="w-32 shrink-0 text-sm font-medium text-text-primary tabular-nums">
                                {formatValue(v)}
                              </span>

                              {/* Confidence */}
                              <span
                                className={cn(
                                  "w-12 shrink-0 text-xs tabular-nums",
                                  confidenceColor(v.ai_confidence),
                                )}
                              >
                                {v.ai_confidence != null
                                  ? `${Math.round(v.ai_confidence * 100)}%`
                                  : "—"}
                              </span>

                              {/* Status badge */}
                              <span
                                className={cn(
                                  "w-20 shrink-0 rounded-full px-2 py-0.5 text-center text-xs",
                                  v.status === "pending" && "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]",
                                  v.status === "conflict" && "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]",
                                  v.status === "approved" && "bg-[var(--success-bg-muted)] text-[var(--status-success-text)]",
                                  v.status === "rejected" && "bg-[var(--status-error-bg)] text-[var(--status-error-text)]",
                                )}
                              >
                                {v.status === "conflict" ? "Conflict" : v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                              </span>

                              {/* Actions */}
                              {(v.status === "pending" || v.status === "conflict") && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                                  <button
                                    onClick={() => handleAction([v.id], "approve")}
                                    disabled={processing}
                                    title="Approve"
                                    className="rounded p-1 text-[var(--success-accent)] hover:bg-[var(--success-bg-muted)] disabled:opacity-60"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleAction([v.id], "reject")}
                                    disabled={processing}
                                    title="Reject"
                                    className="rounded p-1 text-[var(--error-accent)] hover:bg-[var(--status-error-bg)] disabled:opacity-60"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingValue(v)}
                                    title="Edit"
                                    className="rounded p-1 text-text-tertiary hover:bg-bg-elevated hover:text-text-secondary"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}

                              {/* Cell reference */}
                              {v.sheet_name && v.cell_reference && (
                                <span className="ml-auto text-xs text-text-tertiary opacity-0 group-hover:opacity-100">
                                  {v.sheet_name}!{v.cell_reference}
                                </span>
                              )}
                            </div>
                          ))}

                          {/* Show conflict detail inline */}
                          {metric.values
                            .filter((v) => v.status === "conflict" && v.conflict_existing_value)
                            .map((v) => (
                              <div key={`conflict-${v.id}`} className="px-12 pb-2">
                                <ConflictCard
                                  newValue={formatValue(v)}
                                  existingValue={v.conflict_existing_value}
                                  conflictType={v.conflict_type}
                                />
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 100 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-tertiary">
            Showing {offset + 1}–{Math.min(offset + 100, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - 100))}
              disabled={offset === 0}
              className="rounded-md border border-border-default px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-secondary disabled:opacity-60"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + 100)}
              disabled={offset + 100 >= total}
              className="rounded-md border border-border-default px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-secondary disabled:opacity-60"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Finish button */}
      <div className="flex justify-end border-t border-border-default pt-4">
        <button
          onClick={handleFinish}
          className="rounded-md bg-btn-primary-bg px-4 py-2 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover"
        >
          {pendingCount > 0 ? `Finish (${pendingCount} skipped)` : "Finish"}
        </button>
      </div>

      {/* Edit modal */}
      {editingValue && (
        <ValueEditModal
          value={editingValue}
          onSave={(edits) => handleEditSave(editingValue.id, edits)}
          onClose={() => setEditingValue(null)}
        />
      )}
    </div>
  );
}
