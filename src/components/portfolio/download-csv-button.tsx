"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";

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
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleDownload}
      loading={downloading}
    >
      <Download className="h-4 w-4" />
      {downloading ? "Downloading..." : "Export CSV"}
    </Button>
  );
}
