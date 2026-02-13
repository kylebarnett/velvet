"use client";

import * as React from "react";

import { ScheduleCard, type Schedule } from "./schedule-card";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useScheduleActions } from "@/hooks/use-schedule-actions";

interface ScheduleListProps {
  initialSchedules: Schedule[];
}

export function ScheduleList({ initialSchedules }: ScheduleListProps) {
  const [schedules, setSchedules] = React.useState(initialSchedules);
  const [deleteModal, setDeleteModal] = React.useState<{
    open: boolean;
    schedule: Schedule | null;
  }>({ open: false, schedule: null });

  const actions = useScheduleActions(setSchedules);

  const activeSchedules = schedules.filter((s) => s.isActive);
  const pausedSchedules = schedules.filter((s) => !s.isActive);

  return (
    <>
      {/* Messages */}
      {actions.error && (
        <div className="mb-4 rounded-lg border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] p-3 text-sm text-[var(--status-error-text)]" role="alert">
          {actions.error}
        </div>
      )}
      {actions.success && (
        <div className="mb-4 rounded-lg border border-[var(--status-success-bg)] bg-[var(--status-success-bg)] p-3 text-sm text-[var(--status-success-text)]" role="alert">
          {actions.success}
        </div>
      )}

      {schedules.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-text-secondary">
            No schedules yet. Create your first schedule to automate metric requests.
          </p>
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
                    onPause={actions.pause}
                    onResume={actions.resume}
                    onRunNow={actions.runNow}
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
                    onPause={actions.pause}
                    onResume={actions.resume}
                    onRunNow={actions.runNow}
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
            actions.remove(deleteModal.schedule.id);
            setDeleteModal({ open: false, schedule: null });
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
