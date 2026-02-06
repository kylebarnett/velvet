"use client";

import * as React from "react";
import { ChevronDown, Trash2 } from "lucide-react";

type SavedReport = {
  id: string;
  name: string;
  description: string | null;
  report_type: string;
  is_default: boolean;
};

interface SavedReportsDropdownProps {
  reportType: string;
  onLoad: (report: SavedReport) => void;
  onDelete: (id: string) => void;
}

export function SavedReportsDropdown({
  reportType,
  onLoad,
  onDelete,
}: SavedReportsDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const [reports, setReports] = React.useState<SavedReport[]>([]);
  const [loading, setLoading] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  async function loadReports() {
    setLoading(true);
    try {
      const res = await fetch(`/api/investors/portfolio/reports?reportType=${reportType}`);
      const json = await res.json();
      if (res.ok) setReports(json.reports ?? []);
    } finally {
      setLoading(false);
    }
  }

  function handleToggle() {
    if (!open) loadReports();
    setOpen(!open);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-medium text-white/80 hover:border-white/20"
      >
        Saved Reports
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[220px] max-h-[300px] overflow-y-auto rounded-lg border border-white/10 bg-zinc-900 shadow-xl">
          {loading ? (
            <div className="px-3 py-4 text-center text-xs text-white/40">Loading...</div>
          ) : reports.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-white/40">No saved reports</div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-white/5"
              >
                <button
                  type="button"
                  onClick={() => {
                    onLoad(report);
                    setOpen(false);
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="truncate text-xs font-medium text-white/80">
                    {report.name}
                    {report.is_default && (
                      <span className="ml-1.5 rounded bg-white/10 px-1 py-0.5 text-[10px] text-white/50">
                        Default
                      </span>
                    )}
                  </div>
                  {report.description && (
                    <div className="mt-0.5 truncate text-[10px] text-white/40">
                      {report.description}
                    </div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(report.id);
                    setReports((prev) => prev.filter((r) => r.id !== report.id));
                  }}
                  className="shrink-0 rounded p-1 text-white/30 hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
