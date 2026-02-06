"use client";

import * as React from "react";

interface SaveReportModalProps {
  open: boolean;
  reportType: string;
  onSave: (data: { name: string; description: string; isDefault: boolean }) => void;
  onCancel: () => void;
  saving?: boolean;
}

export function SaveReportModal({
  open,
  reportType,
  onSave,
  onCancel,
  saving,
}: SaveReportModalProps) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isDefault, setIsDefault] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setIsDefault(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-900 p-6">
        <h3 className="text-lg font-medium">Save Report</h3>
        <p className="mt-1 text-sm text-white/60">
          Save your current {reportType} report configuration.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-white/60">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Report name"
              className="mt-1 h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm placeholder:text-white/40 focus:border-white/20 focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-medium text-white/60">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
              className="mt-1 h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm placeholder:text-white/40 focus:border-white/20 focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-white/20"
            />
            Set as default for {reportType} reports
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave({ name, description, isDefault })}
            disabled={!name.trim() || saving}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
