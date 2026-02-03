"use client";

import * as React from "react";
import { X } from "lucide-react";

import { TemplateForm } from "@/components/investor/template-form";

type TemplateItem = {
  metric_name: string;
  period_type: "monthly" | "quarterly" | "annual";
  data_type: string;
  sort_order: number;
};

type Props = {
  open: boolean;
  mode: "create" | "edit";
  templateId?: string;
  initialName?: string;
  initialDescription?: string;
  initialItems?: TemplateItem[];
  onClose: () => void;
  onSaved: () => void;
};

export function TemplateFormModal({
  open,
  mode,
  templateId,
  initialName,
  initialDescription,
  initialItems,
  onClose,
  onSaved,
}: Props) {
  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {mode === "create" ? "New template" : "Edit template"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10"
          >
            <X className="h-4 w-4 text-white/50" />
          </button>
        </div>

        <TemplateForm
          mode={mode}
          templateId={templateId}
          initialName={initialName}
          initialDescription={initialDescription}
          initialItems={initialItems}
          onSaved={onSaved}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
