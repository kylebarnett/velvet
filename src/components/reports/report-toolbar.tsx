"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";

type ReportToolbarProps = {
  reportId: string;
  name: string;
  onNameChange: (name: string) => void;
  isDirty: boolean;
  saving: boolean;
  onSave: () => void;
  onExport: (format: "csv" | "excel" | "pdf") => void;
};

export function ReportToolbar({
  reportId,
  name,
  onNameChange,
  isDirty,
  saving,
  onSave,
  onExport,
}: ReportToolbarProps) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(name);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setEditValue(name);
  }, [name]);

  function startEditing() {
    setEditing(true);
    setEditValue(name);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commitEdit() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== name) {
      onNameChange(trimmed);
    }
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border-default bg-bg-primary px-4 py-2.5">
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.push("/reports")}
        className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
        aria-label="Back to reports"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>

      {/* Report name */}
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit();
            if (e.key === "Escape") setEditing(false);
          }}
          className="h-8 min-w-0 flex-1 rounded-md border border-border-default bg-bg-input px-2 text-sm font-medium text-text-primary focus:border-border-default focus:outline-none"
          autoFocus
        />
      ) : (
        <button
          type="button"
          onClick={startEditing}
          className="min-w-0 flex-1 truncate text-left text-sm font-medium text-text-primary hover:text-text-secondary"
          title="Click to rename"
        >
          {name}
        </button>
      )}

      {/* Status indicator */}
      <span className="shrink-0 text-[10px] text-text-muted">
        {saving ? (
          <span className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </span>
        ) : isDirty ? (
          "Unsaved changes"
        ) : (
          <span className="flex items-center gap-1">
            <Check className="h-3 w-3 text-emerald-400" />
            Saved
          </span>
        )}
      </span>

      {/* Save button */}
      <button
        type="button"
        onClick={onSave}
        disabled={!isDirty || saving}
        className="shrink-0 rounded-lg bg-text-primary px-3 py-1.5 text-xs font-medium text-bg-primary transition-colors hover:opacity-90 disabled:opacity-60"
      >
        Save
      </button>

      {/* Export */}
      <ExportButton onExport={onExport} label="Export" />
    </div>
  );
}
