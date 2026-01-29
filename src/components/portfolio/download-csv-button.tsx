"use client";

import * as React from "react";
import { Download } from "lucide-react";

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
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-60"
      type="button"
    >
      <Download className="h-4 w-4" />
      {downloading ? "Downloading..." : "Export CSV"}
    </button>
  );
}
