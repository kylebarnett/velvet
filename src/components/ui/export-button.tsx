"use client";

import * as React from "react";
import { Download, ChevronDown, FileSpreadsheet, FileText, FileDown } from "lucide-react";

type ExportFormat = "csv" | "excel" | "pdf";

type ExportOption = {
  format: ExportFormat;
  label: string;
  icon: React.ElementType;
};

const EXPORT_OPTIONS: ExportOption[] = [
  { format: "csv", label: "CSV", icon: FileDown },
  { format: "excel", label: "Excel (.xlsx)", icon: FileSpreadsheet },
  { format: "pdf", label: "PDF", icon: FileText },
];

type ExportButtonProps = {
  /** Simple mode: single CSV export */
  onClick?: () => void;
  label?: string;
  /** Multi-format mode: called with format when user picks */
  onExport?: (format: ExportFormat) => void;
  /** Which formats to show (defaults to all) */
  formats?: ExportFormat[];
};

export function ExportButton({ onClick, label, onExport, formats }: ExportButtonProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on escape
  React.useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // Simple mode: just a button (backwards compatible)
  if (!onExport) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-bg-input px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-bg-hover"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        {label ?? "Export CSV"}
      </button>
    );
  }

  // Multi-format mode: dropdown
  const availableOptions = formats
    ? EXPORT_OPTIONS.filter((o) => formats.includes(o.format))
    : EXPORT_OPTIONS;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-bg-input px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-bg-hover"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        {label ?? "Export"}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          className="absolute right-0 z-30 mt-1 w-44 rounded-lg border border-border-default bg-bg-raised shadow-lg"
          role="menu"
        >
          <div className="py-1">
            {availableOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.format}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onExport(option.format);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
                >
                  <Icon className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
