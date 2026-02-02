"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, Trash2, RefreshCw } from "lucide-react";

import { ConfirmModal } from "@/components/ui/confirm-modal";
import { calculateNextRunDate } from "@/lib/schedules";

interface ScheduleDetailActionsProps {
  scheduleId: string;
  isActive: boolean;
  cadence: "monthly" | "quarterly" | "annual";
  dayOfMonth: number;
}

export function ScheduleDetailActions({
  scheduleId,
  isActive,
  cadence,
  dayOfMonth,
}: ScheduleDetailActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [active, setActive] = React.useState(isActive);
  const [deleteModal, setDeleteModal] = React.useState(false);

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

  const handlePause = async () => {
    setLoading("pause");
    setError(null);
    try {
      const res = await fetch(`/api/investors/schedules/${scheduleId}/pause`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to pause schedule");
      setActive(false);
      setSuccess("Schedule paused");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pause schedule");
    } finally {
      setLoading(null);
    }
  };

  const handleResume = async () => {
    setLoading("resume");
    setError(null);
    try {
      const res = await fetch(`/api/investors/schedules/${scheduleId}/resume`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to resume schedule");
      setActive(true);
      setSuccess("Schedule resumed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resume schedule");
    } finally {
      setLoading(null);
    }
  };

  const handleRunNow = async () => {
    setLoading("run");
    setError(null);
    try {
      const res = await fetch(`/api/investors/schedules/${scheduleId}/run-now`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to run schedule");

      const message =
        json.requestsCreated > 0
          ? `Created ${json.requestsCreated} requests, sent ${json.emailsSent} emails`
          : "No new requests created (may already exist)";
      setSuccess(message);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run schedule");
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async () => {
    setLoading("delete");
    setError(null);
    try {
      const res = await fetch(`/api/investors/schedules/${scheduleId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete schedule");

      router.push("/requests/schedules");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete schedule");
      setDeleteModal(false);
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      {/* Messages */}
      {(error || success) && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-sm rounded-lg border p-3 text-sm shadow-lg ${
            error
              ? "border-red-500/20 bg-red-500/10 text-red-200"
              : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          {error || success}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleRunNow}
          disabled={loading !== null}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/70 hover:bg-white/10 disabled:opacity-50"
        >
          {loading === "run" ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Run now</span>
        </button>

        {active ? (
          <button
            type="button"
            onClick={handlePause}
            disabled={loading !== null}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/70 hover:bg-white/10 disabled:opacity-50"
          >
            {loading === "pause" ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Pause</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleResume}
            disabled={loading !== null}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-white px-3 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-50"
          >
            {loading === "resume" ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Resume</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setDeleteModal(true)}
          disabled={loading !== null}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Delete confirmation modal */}
      <ConfirmModal
        open={deleteModal}
        onCancel={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Schedule"
        message="Are you sure you want to delete this schedule? This will not delete any existing metric requests created by this schedule."
        confirmLabel={loading === "delete" ? "Deleting..." : "Delete"}
        variant="danger"
      />
    </>
  );
}
