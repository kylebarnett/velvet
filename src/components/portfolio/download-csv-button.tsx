"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export function DownloadCsvButton() {
  const [downloading, setDownloading] = React.useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch("/api/investors/portfolio/export");
      if (!res.ok) {
        throw new Error("Failed to download");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `portfolio-contacts-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      logger.error("Download failed:", err);
      toast.error("Download failed");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-border-default bg-bg-input px-3 text-sm text-text-primary hover:border-border-default/150 disabled:opacity-60"
      type="button"
    >
      <Download className="h-4 w-4" />
      {downloading ? "Downloading..." : "Export CSV"}
    </button>
  );
}
