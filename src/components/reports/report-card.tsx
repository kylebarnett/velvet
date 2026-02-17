"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Copy, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SavedReport } from "./reports-context";
import { REPORT_TYPE_LABELS, REPORT_TYPE_COLORS, type ReportType } from "@/lib/reports/templates";

const COLOR_CLASSES: Record<string, string> = {
  blue: "bg-[var(--tag-blue-bg)] text-[var(--tag-blue-text)]",
  emerald: "bg-[var(--tag-emerald-bg)] text-[var(--tag-emerald-text)]",
  violet: "bg-[var(--tag-violet-bg)] text-[var(--tag-violet-text)]",
  amber: "bg-[var(--tag-amber-bg)] text-[var(--tag-amber-text)]",
};

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

type ReportCardProps = {
  report: SavedReport;
  onDuplicate: (report: SavedReport) => void;
  onRename: (report: SavedReport) => void;
  onDelete: (report: SavedReport) => void;
};

export function ReportCard({ report, onDuplicate, onRename, onDelete }: ReportCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const color = REPORT_TYPE_COLORS[report.report_type as ReportType] ?? "blue";
  const typeLabel = REPORT_TYPE_LABELS[report.report_type as ReportType] ?? report.report_type;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/reports/${report.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/reports/${report.id}`);
        }
      }}
      className="group relative flex cursor-pointer flex-col rounded-xl border border-border-default bg-bg-primary p-4 transition-all hover:border-border-hover hover:shadow-md"
    >
      {/* Type badge */}
      <span
        className={`inline-flex w-fit rounded-md px-2 py-0.5 text-[10px] font-medium ${COLOR_CLASSES[color] ?? COLOR_CLASSES.blue}`}
      >
        {typeLabel}
      </span>

      {/* Name */}
      <h3 className="mt-2 line-clamp-2 text-sm font-medium text-text-primary">
        {report.name}
      </h3>

      {/* Description */}
      {report.description && (
        <p className="mt-1 line-clamp-1 text-xs text-text-muted">
          {report.description}
        </p>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between pt-3">
        <span className="text-[10px] text-text-muted">
          {report.updated_at ? `Updated ${timeAgo(report.updated_at)}` : report.created_at ? `Created ${timeAgo(report.created_at)}` : ""}
        </span>
        {report.is_default && (
          <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] text-text-muted">
            Default
          </span>
        )}
      </div>

      {/* Action menu */}
      <div
        ref={menuRef}
        className="absolute right-2 top-2"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-text-faint opacity-0 group-hover:opacity-100"
          aria-label="Report actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>

        {menuOpen && (
          <div
            className="absolute right-0 z-50 mt-1 w-40 overflow-hidden rounded-lg border border-border-default bg-bg-secondary py-1 shadow-xl backdrop-blur-sm"
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onDuplicate(report);
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
            >
              <Copy className="h-3.5 w-3.5" />
              Duplicate
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onRename(report);
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
            >
              <Pencil className="h-3.5 w-3.5" />
              Rename
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onDelete(report);
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--error-accent)] transition-colors hover:bg-[var(--error-bg-subtle)]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
