"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/confirm-modal";

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
  const [active, setActive] = React.useState(isActive);
  const [deleteModal, setDeleteModal] = React.useState(false);

  const handlePause = async () => {
    setLoading("pause");
    try {
      const res = await fetch(`/api/investors/schedules/${scheduleId}/pause`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to pause schedule");
      setActive(false);
      toast.success("Schedule paused");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to pause schedule");
    } finally {
      setLoading(null);
    }
  };

  const handleResume = async () => {
    setLoading("resume");
    try {
      const res = await fetch(`/api/investors/schedules/${scheduleId}/resume`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to resume schedule");
      setActive(true);
      toast.success("Schedule resumed");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to resume schedule");
    } finally {
      setLoading(null);
    }
  };

  const handleRunNow = async () => {
    setLoading("run");
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
      toast.success(message);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to run schedule");
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async () => {
    setLoading("delete");
    try {
      const res = await fetch(`/api/investors/schedules/${scheduleId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete schedule");

      router.push("/metric-requests");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete schedule");
      setDeleteModal(false);
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleRunNow}
          disabled={loading !== null}
        >
          {loading === "run" ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Run now</span>
        </Button>

        {active ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handlePause}
            disabled={loading !== null}
          >
            {loading === "pause" ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Pause</span>
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={handleResume}
            disabled={loading !== null}
          >
            {loading === "resume" ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Resume</span>
          </Button>
        )}

        <Button
          type="button"
          variant="danger"
          size="icon-lg"
          onClick={() => setDeleteModal(true)}
          disabled={loading !== null}
          aria-label="Delete schedule"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
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
