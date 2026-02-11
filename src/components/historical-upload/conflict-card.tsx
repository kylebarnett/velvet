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
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
      <div className="text-xs">
        {conflictType === "duplicate_in_upload" ? (
          <p className="text-amber-200">
            Duplicate value detected in the same upload.
          </p>
        ) : (
          <>
            <p className="text-amber-200">
              Existing value: <span className="font-medium">{existingRaw}</span>
              {existingSource && (
                <span className="text-amber-200/60"> ({existingSource})</span>
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
