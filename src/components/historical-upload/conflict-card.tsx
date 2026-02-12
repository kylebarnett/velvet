"use client";

import { AlertTriangle } from "lucide-react";

export function ConflictCard({
  newValue,
  existingValue,
  conflictType,
}: {
  newValue: string;
  existingValue: Record<string, unknown> | null;
  conflictType: string | null;
}) {
  if (!existingValue) return null;

  const existingRaw = String(existingValue.raw ?? "—");
  const existingSource = existingValue.source
    ? String(existingValue.source)
    : null;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-[var(--warning-border)] bg-[var(--warning-bg-subtle)] px-3 py-2">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--warning-accent)]" />
      <div className="text-xs">
        {conflictType === "duplicate_in_upload" ? (
          <p className="text-[var(--status-warning-text)]">
            Duplicate value detected in the same upload.
          </p>
        ) : (
          <>
            <p className="text-[var(--status-warning-text)]">
              Existing value: <span className="font-medium">{existingRaw}</span>
              {existingSource && (
                <span className="text-[var(--warning-accent)]"> ({existingSource})</span>
              )}
            </p>
            <p className="mt-0.5 text-text-tertiary">
              New value: <span className="font-medium text-text-secondary">{newValue}</span>
              {" — approving will overwrite the existing value."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
