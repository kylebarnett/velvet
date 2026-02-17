"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { FileSpreadsheet, PenLine, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  companyName: string;
  onUpload: () => void;
  onManual: () => void;
  onSkip: () => void;
};

export function AddMetricsPromptModal({
  open,
  onClose,
  companyName,
  onUpload,
  onManual,
  onSkip,
}: Props) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) return;
    function handleFocusTrap(e: KeyboardEvent) {
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleFocusTrap);
    return () => document.removeEventListener("keydown", handleFocusTrap);
  }, [open]);

  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        dialogRef.current?.querySelector<HTMLButtonElement>("button[data-autofocus]")?.focus();
      }, 0);
    }
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-bg-backdrop backdrop-blur-sm modal-backdrop-enter"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative mx-4 w-full max-w-md rounded-xl border border-border-default bg-bg-secondary p-6 shadow-2xl modal-dialog-enter"
      >
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-semibold text-text-primary">
            Add metrics for {companyName}?
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <p className="mt-2 text-sm text-text-secondary">
          You can add historical metrics now or do this later from the company page.
        </p>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            data-autofocus
            onClick={onUpload}
            className="flex w-full items-center gap-3 rounded-lg border border-border-default bg-bg-primary p-3 text-left transition-colors hover:bg-bg-elevated"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--tag-blue-bg)]">
              <FileSpreadsheet className="h-4 w-4 text-[var(--tag-blue-text)]" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">Upload a file</p>
              <p className="text-xs text-text-tertiary">Import from Excel or CSV</p>
            </div>
            <ArrowRight className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onManual}
            className="flex w-full items-center gap-3 rounded-lg border border-border-default bg-bg-primary p-3 text-left transition-colors hover:bg-bg-elevated"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--tag-violet-bg)]">
              <PenLine className="h-4 w-4 text-[var(--tag-violet-text)]" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">Enter manually</p>
              <p className="text-xs text-text-tertiary">Type in metrics one by one</p>
            </div>
            <ArrowRight className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
          </button>
        </div>

        <Button
          variant="ghost"
          onClick={onSkip}
          className="mt-4 w-full text-text-tertiary hover:text-text-secondary"
        >
          Skip for now
        </Button>
      </div>
    </div>,
    document.body,
  );
}
