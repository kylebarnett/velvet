"use client";

import * as React from "react";
import type { Schedule } from "@/components/investor/schedule-card";

type ScheduleAction = "pause" | "resume" | "run-now" | "delete";

export function useScheduleActions(
  onUpdate: React.Dispatch<React.SetStateAction<Schedule[]>>,
) {
  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // Auto-dismiss messages
  React.useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  async function execute(id: string, action: ScheduleAction) {
    setLoadingId(id);
    setError(null);
    try {
      const method = action === "delete" ? "DELETE" : "POST";
      const url =
        action === "delete"
          ? `/api/investors/schedules/${id}`
          : `/api/investors/schedules/${id}/${action}`;

      const res = await fetch(url, { method });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Failed to ${action} schedule`);

      switch (action) {
        case "pause":
          onUpdate((prev) =>
            prev.map((s) =>
              s.id === id ? { ...s, isActive: false, nextRunAt: null } : s,
            ),
          );
          setSuccess("Schedule paused");
          break;
        case "resume":
          onUpdate((prev) =>
            prev.map((s) =>
              s.id === id
                ? { ...s, isActive: true, nextRunAt: json.nextRunAt ?? null }
                : s,
            ),
          );
          setSuccess("Schedule resumed");
          break;
        case "run-now":
          onUpdate((prev) =>
            prev.map((s) =>
              s.id === id ? { ...s, lastRunAt: new Date().toISOString() } : s,
            ),
          );
          setSuccess(
            json.requestsCreated > 0
              ? `Created ${json.requestsCreated} requests, sent ${json.emailsSent} emails`
              : "No new requests created (may already exist)",
          );
          break;
        case "delete":
          onUpdate((prev) => prev.filter((s) => s.id !== id));
          setSuccess("Schedule deleted");
          break;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to ${action} schedule`);
    } finally {
      setLoadingId(null);
    }
  }

  return {
    pause: (id: string) => execute(id, "pause"),
    resume: (id: string) => execute(id, "resume"),
    runNow: (id: string) => execute(id, "run-now"),
    remove: (id: string) => execute(id, "delete"),
    loadingId,
    error,
    success,
    setError,
    setSuccess,
  };
}
