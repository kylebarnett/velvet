"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TearSheetEditor } from "@/components/founder/tear-sheet-editor";
import { TearSheetPreview } from "@/components/founder/tear-sheet-preview";
import { SlidingTabs, TabItem } from "@/components/ui/sliding-tabs";

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
};

type TearSheetMetric = {
  metricName: string;
  currentValue: string | null;
  previousValue: string | null;
  trend: "up" | "down" | "flat";
};

export default function EditTearSheetPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [tearSheet, setTearSheet] = React.useState<TearSheet | null>(null);
  const [metrics, setMetrics] = React.useState<TearSheetMetric[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [mobileView, setMobileView] = React.useState<MobileViewMode>("editor");
  const [exportingPdf, setExportingPdf] = React.useState(false);
  const previewRef = React.useRef<HTMLDivElement>(null);

  // Auto-dismiss success
  React.useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  React.useEffect(() => {
    async function load() {
      try {
        const [tsRes, metricsRes] = await Promise.all([
          fetch(`/api/founder/tear-sheets/${id}`),
          fetch(`/api/founder/tear-sheets/${id}/metrics`),
        ]);

        const tsJson = await tsRes.json().catch(() => null);
        const metricsJson = await metricsRes.json().catch(() => null);

        if (!tsRes.ok)
          throw new Error(tsJson?.error ?? "Failed to load tear sheet.");
        setTearSheet(tsJson.tearSheet);

        if (metricsRes.ok) {
          setMetrics(metricsJson.metrics ?? []);
        }
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : "Something went wrong.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleSave(content: Record<string, unknown>) {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/founder/tear-sheets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to save.");
      setTearSheet(json.tearSheet);
      setSuccess("Saved.");
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Something went wrong.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/founder/tear-sheets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to publish.");
      setTearSheet(json.tearSheet);
      setSuccess("Published.");
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Something went wrong.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUnpublish() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/founder/tear-sheets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to unpublish.");
      setTearSheet(json.tearSheet);
      setSuccess("Unpublished. Sharing has been disabled.");
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Something went wrong.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleShare() {
    if (!tearSheet) return;
    setError(null);

    try {
      const res = await fetch(`/api/founder/tear-sheets/${id}/share`, {
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
      setSuccess(json.shareEnabled ? "Sharing enabled." : "Sharing disabled.");
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Something went wrong.";
      setError(message);
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
    } catch (e) {
      console.error("PDF export failed:", e);
      setError("PDF export failed. Please try again.");
    } finally {
      setExportingPdf(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-white/60">Loading tear sheet...</div>;
  }

  if (error && !tearSheet) {
    return (
      <div className="space-y-4">
        <Link
          href="/portal/tear-sheets"
          className="flex items-center gap-1 text-sm text-white/50 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to tear sheets
        </Link>
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
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
            href="/portal/tear-sheets"
            className="flex items-center gap-1 text-sm text-white/50 hover:text-white"
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
                  ? "bg-emerald-500/20 text-emerald-200"
                  : "bg-amber-500/20 text-amber-200"
              }`}
            >
              {tearSheet.status === "published" ? "Published" : "Draft"}
            </span>
            <span className="text-xs text-white/60">
              {tearSheet.quarter} {tearSheet.year}
            </span>
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

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="rounded-md border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-medium text-white/80 hover:border-white/20 disabled:opacity-50"
          >
            {exportingPdf ? "Generating..." : "Download PDF"}
          </button>

          {tearSheet.status === "published" && (
            <>
              <button
                type="button"
                onClick={handleToggleShare}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                  tearSheet.share_enabled
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                    : "border-white/10 bg-black/20 text-white/80 hover:border-white/20"
                }`}
              >
                {tearSheet.share_enabled ? "Sharing On" : "Enable Sharing"}
              </button>
              <button
                type="button"
                onClick={handleUnpublish}
                disabled={saving}
                className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
              >
                Unpublish
              </button>
            </>
          )}
          {tearSheet.status === "draft" && (
            <button
              type="button"
              onClick={handlePublish}
              disabled={saving}
              className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-white/90 disabled:opacity-50"
            >
              {saving ? "Publishing..." : "Publish"}
            </button>
          )}
        </div>
      </div>

      {/* Share URL — copy to clipboard only, no visible link */}
      {tearSheet.share_enabled && shareUrl && (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-200">
              Sharing is on — anyone with the link can view this tear sheet.
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                setSuccess("Link copied to clipboard.");
              }}
              className="shrink-0 rounded-md border border-emerald-500/30 px-2.5 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20"
            >
              Copy Link
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {success}
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
          <TearSheetEditor
            tearSheet={tearSheet}
            metrics={metrics}
            onSave={handleSave}
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
            <TearSheetPreview tearSheet={tearSheet} metrics={metrics} />
          </div>
        </div>
      </div>
    </div>
  );
}
