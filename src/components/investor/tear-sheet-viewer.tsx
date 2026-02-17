"use client";

import * as React from "react";
import { Download, X, ArrowLeft } from "lucide-react";
import { TearSheetPreview } from "@/components/founder/tear-sheet-preview";
import { Button } from "@/components/ui/button";
import { logActivity } from "@/lib/activity/log-activity";
import { logger } from "@/lib/logger";

export type TearSheetMetric = {
  metricName: string;
  currentValue: string | null;
  previousValue: string | null;
  trend: "up" | "down" | "flat";
};

type TearSheet = {
  id: string;
  title: string;
  quarter: string;
  year: number;
  status: string;
  content?: Record<string, unknown>;
  share_enabled: boolean;
  share_token: string | null;
  updated_at: string;
  creator_role?: string;
};

type TearSheetViewerProps = {
  tearSheet: TearSheet;
  metrics: TearSheetMetric[];
  companyId: string;
  companyName: string;
  onClose: () => void;
  metricsLoading?: boolean;
};

function MetricsLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-pulse">
      <div className="h-8 w-64 rounded bg-bg-hover" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-border-default p-4">
            <div className="h-4 w-24 rounded bg-bg-hover" />
            <div className="mt-2 h-8 w-16 rounded bg-bg-elevated" />
          </div>
        ))}
      </div>
      <div className="h-32 rounded-xl border border-border-default bg-bg-hover" />
    </div>
  );
}

export function TearSheetViewer({
  tearSheet,
  metrics,
  companyId,
  companyName,
  onClose,
  metricsLoading,
}: TearSheetViewerProps) {
  const previewRef = React.useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = React.useState(false);
  const variant = tearSheet.creator_role === "investor" ? "investor" : "founder";

  async function handleExportPdf() {
    if (!previewRef.current) return;
    setExporting(true);

    try {
      const { exportElementAsPdf } = await import("@/lib/utils/export-pdf");
      await exportElementAsPdf(
        previewRef.current,
        `${tearSheet.title}.pdf`
      );

      logActivity({
        companyId,
        action: "view_tear_sheet",
        metadata: { tear_sheet_title: tearSheet.title, format: "pdf" },
      });
    } catch (e: unknown) {
      logger.error("PDF export failed:", e);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-default px-4 py-3 sm:px-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-text-tertiary"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to tear sheets</span>
          <span className="sm:hidden">Back</span>
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportPdf}
            disabled={exporting || metricsLoading}
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? "Generating..." : "Download PDF"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="sm:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {metricsLoading ? (
          <MetricsLoadingSkeleton />
        ) : (
          <div ref={previewRef}>
            <TearSheetPreview
              tearSheet={{ ...tearSheet, content: tearSheet.content ?? {}, companyName }}
              metrics={metrics}
              variant={variant}
            />
          </div>
        )}
      </div>
    </div>
  );
}
