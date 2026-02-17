"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvestorTearSheetEditor } from "@/components/investor/investor-tear-sheet-editor";
import { TearSheetPreview } from "@/components/founder/tear-sheet-preview";
import { SlidingTabs, TabItem } from "@/components/ui/sliding-tabs";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

type MobileViewMode = "editor" | "preview";

const MOBILE_VIEW_TABS: TabItem<MobileViewMode>[] = [
  { value: "editor", label: "Edit" },
  { value: "preview", label: "Preview" },
];

type TearSheet = {
  id: string;
  title: string;
  quarter: string;
  year: number;
  status: string;
  content: Record<string, unknown>;
  share_enabled: boolean;
  share_token: string | null;
  companyName?: string;
};

type TearSheetMetric = {
  metricName: string;
  currentValue: string | null;
  previousValue: string | null;
  trend: "up" | "down" | "flat";
};

export default function EditInvestorTearSheetPage() {
  const params = useParams();
  const id = params.id as string;

  const [tearSheet, setTearSheet] = React.useState<TearSheet | null>(null);
  const [metrics, setMetrics] = React.useState<TearSheetMetric[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [mobileView, setMobileView] = React.useState<MobileViewMode>("editor");
  const [exportingPdf, setExportingPdf] = React.useState(false);
  const [liveContent, setLiveContent] = React.useState<Record<string, unknown> | null>(null);
  const previewRef = React.useRef<HTMLDivElement>(null);

  // Load tear sheet and metrics
  const loadMetrics = React.useCallback(async (source?: string) => {
    const sourceParam = source ? `?source=${source}` : "";
    try {
      const res = await fetch(`/api/investors/tear-sheets/${id}/metrics${sourceParam}`);
      const json = await res.json().catch(() => null);
      if (res.ok) {
        setMetrics(json.metrics ?? []);
      }
    } catch (e: unknown) {
      logger.error("Failed to load metrics:", e);
    }
  }, [id]);

  React.useEffect(() => {
    async function load() {
      try {
        const tsRes = await fetch(`/api/investors/tear-sheets/${id}`);
        const tsJson = await tsRes.json().catch(() => null);

        if (!tsRes.ok)
          throw new Error(tsJson?.error ?? "Failed to load tear sheet.");
        setTearSheet(tsJson.tearSheet);

        // Load metrics with the saved source preference
        const savedSource = (tsJson.tearSheet?.content?.metricSources as string) ?? "all";
        await loadMetrics(savedSource);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, loadMetrics]);

  async function handleSave(content: Record<string, unknown> | object) {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/investors/tear-sheets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to save.");
      setTearSheet(json.tearSheet);
      toast.success("Saved.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMetricSourceChange(source: string) {
    await loadMetrics(source);
  }

  async function handlePublish() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/investors/tear-sheets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to publish.");
      setTearSheet(json.tearSheet);
      toast.success("Published.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUnpublish() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/investors/tear-sheets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to unpublish.");
      setTearSheet(json.tearSheet);
      toast.success("Unpublished. Sharing has been disabled.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleShare() {
    if (!tearSheet) return;
    setError(null);

    try {
      const res = await fetch(`/api/investors/tear-sheets/${id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !tearSheet.share_enabled }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to update sharing.");
      setTearSheet({
        ...tearSheet,
        share_enabled: json.shareEnabled,
        share_token: json.shareToken,
      });
      toast.success(json.shareEnabled ? "Sharing enabled." : "Sharing disabled.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  async function handleExportPdf() {
    if (!previewRef.current) return;
    setExportingPdf(true);

    try {
      const { exportElementAsPdf } = await import("@/lib/utils/export-pdf");
      await exportElementAsPdf(
        previewRef.current,
        `${tearSheet?.title ?? "tear-sheet"}.pdf`,
      );
    } catch (e: unknown) {
      logger.error("PDF export failed:", e);
      setError("PDF export failed. Please try again.");
    } finally {
      setExportingPdf(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-text-tertiary">Loading tear sheet...</div>;
  }

  if (error && !tearSheet) {
    return (
      <div className="space-y-4">
        <Link
          href="/tear-sheets"
          className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to tear sheets
        </Link>
        <div className="rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]">
          {error}
        </div>
      </div>
    );
  }

  if (!tearSheet) return null;

  const shareUrl = tearSheet.share_token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/tear-sheet/${tearSheet.share_token}`
    : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/tear-sheets"
            className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to tear sheets
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">
            {tearSheet.title}
          </h1>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                tearSheet.status === "published"
                  ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]"
                  : "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]"
              }`}
            >
              {tearSheet.status === "published" ? "Published" : "Draft"}
            </span>
            <span className="text-xs text-text-tertiary">
              {tearSheet.quarter} {tearSheet.year}
            </span>
            {tearSheet.companyName && (
              <span className="text-xs text-text-muted">
                {tearSheet.companyName}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mobile toggle */}
          <div className="md:hidden">
            <SlidingTabs
              tabs={MOBILE_VIEW_TABS}
              value={mobileView}
              onChange={setMobileView}
              size="sm"
              showIcons={false}
            />
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExportPdf}
            disabled={exportingPdf}
          >
            {exportingPdf ? "Generating..." : "Download PDF"}
          </Button>

          {tearSheet.status === "published" && (
            <>
              <button
                type="button"
                onClick={handleToggleShare}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                  tearSheet.share_enabled
                    ? "border-[var(--status-success-bg)] bg-[var(--status-success-bg)] text-[var(--status-success-text)] hover:bg-[var(--success-bg-muted)]"
                    : "border-border-default bg-bg-input text-text-primary hover:border-border-default"
                }`}
              >
                {tearSheet.share_enabled ? "Sharing On" : "Enable Sharing"}
              </button>
              <Button
                type="button"
                variant="warning"
                size="sm"
                onClick={handleUnpublish}
                disabled={saving}
              >
                Unpublish
              </Button>
            </>
          )}
          {tearSheet.status === "draft" && (
            <Button
              type="button"
              size="sm"
              onClick={handlePublish}
              disabled={saving}
            >
              {saving ? "Publishing..." : "Publish"}
            </Button>
          )}
        </div>
      </div>

      {/* Share URL */}
      {tearSheet.share_enabled && shareUrl && (
        <div className="rounded-md border border-[var(--status-success-bg)] bg-[var(--status-success-bg)] px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--status-success-text)]">
              Sharing is on — anyone with the link can view this tear sheet.
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                toast.success("Link copied to clipboard.");
              }}
              className="shrink-0 rounded-md border border-[var(--success-border)] px-2.5 py-1 text-xs font-medium text-[var(--status-success-text)] hover:bg-[var(--success-bg-muted)]"
            >
              Copy Link
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]">
          {error}
        </div>
      )}

      {/* Side-by-side layout on desktop, toggled on mobile */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Editor */}
        <div
          className={`max-h-[calc(100vh-8rem)] overflow-y-auto ${
            mobileView !== "editor" ? "hidden md:block" : ""
          }`}
        >
          <InvestorTearSheetEditor
            tearSheet={tearSheet}
            metrics={metrics}
            onSave={handleSave}
            onMetricSourceChange={handleMetricSourceChange}
            onContentChange={setLiveContent}
            saving={saving}
          />
        </div>

        {/* Preview */}
        <div
          className={`max-h-[calc(100vh-8rem)] overflow-y-auto ${
            mobileView !== "preview" ? "hidden md:block" : ""
          }`}
        >
          <div ref={previewRef}>
            <TearSheetPreview
              tearSheet={liveContent ? {
                ...tearSheet,
                content: { ...tearSheet.content, ...liveContent },
              } : tearSheet}
              metrics={metrics}
              variant="investor"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
