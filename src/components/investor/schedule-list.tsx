"use client";

import * as React from "react";

import { ScheduleCard, type Schedule } from "./schedule-card";
import { ConfirmModal } from "@/components/ui/confirm-modal";

interface ScheduleListProps {
  initialSchedules: Schedule[];
}

export function ScheduleList({ initialSchedules }: ScheduleListProps) {
  const [schedules, setSchedules] = React.useState(initialSchedules);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [deleteModal, setDeleteModal] = React.useState<{
    open: boolean;
    schedule: Schedule | null;
  }>({ open: false, schedule: null });

  // Auto-dismiss messages
  React.useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const handlePause = async (id: string) => {
    try {
      const res = await fetch(`/api/investors/schedules/${id}/pause`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to pause schedule");

      setSchedules((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, isActive: false, nextRunAt: null } : s
        )
      );
      setSuccess("Schedule paused");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to pause schedule");
    }
  };

  const handleResume = async (id: string) => {
    try {
      const res = await fetch(`/api/investors/schedules/${id}/resume`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to resume schedule");

      setSchedules((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, isActive: true, nextRunAt: json.nextRunAt ?? null }
            : s
        )
      );
      setSuccess("Schedule resumed");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resume schedule");
    }
  };

  const handleRunNow = async (id: string) => {
    try {
      const res = await fetch(`/api/investors/schedules/${id}/run-now`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to run schedule");

      // Update last_run_at in local state
      setSchedules((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, lastRunAt: new Date().toISOString() } : s
        )
      );

      const message =
        json.requestsCreated > 0
          ? `Created ${json.requestsCreated} requests, sent ${json.emailsSent} emails`
          : "No new requests created (may already exist)";
      setSuccess(message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to run schedule");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/investors/schedules/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete schedule");

      setSchedules((prev) => prev.filter((s) => s.id !== id));
      setDeleteModal({ open: false, schedule: null });
      setSuccess("Schedule deleted");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete schedule");
    }
  };

  const activeSchedules = schedules.filter((s) => s.isActive);
  const pausedSchedules = schedules.filter((s) => !s.isActive);

  return (
    <>
      {/* Messages */}
      {error && (
        <div className="mb-4 rounded-lg border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] p-3 text-sm text-[var(--status-error-text)]">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-[var(--status-success-bg)] bg-[var(--status-success-bg)] p-3 text-sm text-[var(--status-success-text)]">
          {success}
        </div>
      )}

      {schedules.length === 0 ? (
        <div className="rounded-xl border border-border-default bg-bg-elevated p-8 text-center">
          <div className="text-sm text-text-tertiary">
            No schedules yet. Create your first schedule to automate metric
            requests.
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active schedules */}
          {activeSchedules.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-medium text-text-secondary">
                Active Schedules ({activeSchedules.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {activeSchedules.map((schedule) => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    onPause={handlePause}
                    onResume={handleResume}
                    onRunNow={handleRunNow}
                    onDelete={async (id) => {
                      const s = schedules.find((x) => x.id === id);
                      if (s) setDeleteModal({ open: true, schedule: s });
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Paused schedules */}
          {pausedSchedules.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-medium text-text-muted">
                Paused Schedules ({pausedSchedules.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {pausedSchedules.map((schedule) => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    onPause={handlePause}
                    onResume={handleResume}
                    onRunNow={handleRunNow}
                    onDelete={async (id) => {
                      const s = schedules.find((x) => x.id === id);
                      if (s) setDeleteModal({ open: true, schedule: s });
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation modal */}
      <ConfirmModal
        open={deleteModal.open}
        onCancel={() => setDeleteModal({ open: false, schedule: null })}
        onConfirm={() => {
          if (deleteModal.schedule) {
            handleDelete(deleteModal.schedule.id);
          }
        }}
        title="Delete Schedule"
        message={`Are you sure you want to delete "${deleteModal.schedule?.name}"? This will not delete any existing metric requests created by this schedule.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </>
  );
}
