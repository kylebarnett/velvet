"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-backdrop backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border-default bg-bg-secondary p-6">
        <h3 className="text-lg font-medium">Save Report</h3>
        <p className="mt-1 text-sm text-text-tertiary">
          Save your current {reportType} report configuration.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-text-tertiary">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Report name"
              className="mt-1 h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm placeholder:text-text-faint focus:border-border-default focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-tertiary">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
              className="mt-1 h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm placeholder:text-text-faint focus:border-border-default focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-border-default"
            />
            Set as default for {reportType} reports
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            onClick={() => onSave({ name, description, isDefault })}
            disabled={!name.trim() || saving}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
