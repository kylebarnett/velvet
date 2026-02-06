"use client";

import * as React from "react";
import { Download } from "lucide-react";

type ExportButtonProps = {
  companyId: string;
  companyName: string;
  periodType?: "monthly" | "quarterly" | "yearly";
};

export function ExportButton({
  companyId,
  companyName,
  periodType,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = React.useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (periodType) {
        params.set("periodType", periodType);
      }

      const response = await fetch(
        `/api/investors/companies/${companyId}/metrics/export?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Get blob and trigger download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${companyName.replace(/[^a-z0-9]/gi, "_")}_metrics.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isExporting}
      className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/60 hover:border-white/15 hover:text-white/80 transition-colors disabled:opacity-50"
    >
      <Download className="h-3.5 w-3.5" />
      {isExporting ? "Exporting..." : "Export CSV"}
    </button>
  );
}
