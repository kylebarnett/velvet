"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { TearSheetPreview } from "@/components/founder/tear-sheet-preview";

type TearSheet = {
  id: string;
  title: string;
  quarter: string;
  year: number;
  status: string;
  content: Record<string, unknown>;
  share_enabled: boolean;
  companyName: string | null;
};

type TearSheetMetric = {
  metricName: string;
  currentValue: string | null;
  previousValue: string | null;
  trend: "up" | "down" | "flat";
};

export default function PublicTearSheetPage() {
  const params = useParams();
  const token = params.token as string;

  const [tearSheet, setTearSheet] = React.useState<TearSheet | null>(null);
  const [metrics, setMetrics] = React.useState<TearSheetMetric[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = React.useState(false);
  const previewRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/public/tear-sheets/${token}`);
        const json = await res.json().catch(() => null);
        if (!res.ok)
          throw new Error(json?.error ?? "Tear sheet not found.");
        setTearSheet(json.tearSheet);
        setMetrics(
          (json.metrics ?? []).map((m: Record<string, unknown>) => ({
            metricName: m.metricName as string,
            currentValue: m.currentValue != null ? String(m.currentValue) : null,
            previousValue: m.previousValue != null ? String(m.previousValue) : null,
            trend: (m.trend as "up" | "down" | "flat") ?? "flat",
          })),
        );
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : "Something went wrong.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  async function handleExportPdf() {
    if (!previewRef.current) return;
    setExportingPdf(true);

    try {
      const { exportElementAsPdf } = await import("@/lib/utils/export-pdf");
      await exportElementAsPdf(
        previewRef.current,
        `${tearSheet?.title ?? "tear-sheet"}.pdf`,
      );
    } catch (e) {
      console.error("PDF export failed:", e);
    } finally {
      setExportingPdf(false);
    }
  }

  if (loading) {
    return <div className="text-center text-sm text-white/60">Loading...</div>;
  }

  if (error || !tearSheet) {
    return (
      <div className="text-center">
        <h1 className="text-lg font-semibold">Not Found</h1>
        <p className="mt-2 text-sm text-white/60">
          {error ?? "This tear sheet is not available."}
        </p>
      </div>
    );
  }

  const previewTearSheet = {
    ...tearSheet,
    share_token: null,
    companyName: tearSheet.companyName ?? undefined,
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end" data-no-print>
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={exportingPdf}
          className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-white/90 disabled:opacity-50"
        >
          {exportingPdf ? "Generating..." : "Download PDF"}
        </button>
      </div>
      <div ref={previewRef}>
        <TearSheetPreview tearSheet={previewTearSheet} metrics={metrics} />
      </div>
    </div>
  );
}
