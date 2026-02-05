"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STAGE_OPTIONS = ["seed", "series_a", "series_b", "series_c", "growth"];
const INDUSTRY_OPTIONS = ["saas", "fintech", "healthcare", "ecommerce", "edtech", "ai_ml", "other"];
const BUSINESS_MODEL_OPTIONS = ["b2b", "b2c", "b2b2c", "marketplace", "other"];

const formatLabel = (s: string) =>
  s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

type SavedTags = {
  stage: string | null;
  industry: string | null;
  businessModel: string | null;
};

export function CompanyTagEditor({
  companyId,
  stage,
  industry,
  businessModel,
  onSaved,
}: {
  companyId: string;
  stage: string | null;
  industry: string | null;
  businessModel: string | null;
  onSaved?: (tags: SavedTags) => void;
}) {
  const [currentStage, setCurrentStage] = React.useState(stage ?? "");
  const [currentIndustry, setCurrentIndustry] = React.useState(industry ?? "");
  const [currentModel, setCurrentModel] = React.useState(businessModel ?? "");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => setSaved(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [saved]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/investors/companies/${companyId}/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: currentStage || null,
          industry: currentIndustry || null,
          business_model: currentModel || null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to save.");
      setSaved(true);
      onSaved?.({
        stage: currentStage || null,
        industry: currentIndustry || null,
        businessModel: currentModel || null,
      });
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="grid gap-1.5">
          <label className="text-xs text-white/60">Stage</label>
          <Select
            value={currentStage || "__none__"}
            onValueChange={(v) => setCurrentStage(v === "__none__" ? "" : v)}
          >
            <SelectTrigger size="sm">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {STAGE_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {formatLabel(o)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <label className="text-xs text-white/60">Industry</label>
          <Select
            value={currentIndustry || "__none__"}
            onValueChange={(v) => setCurrentIndustry(v === "__none__" ? "" : v)}
          >
            <SelectTrigger size="sm">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {INDUSTRY_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {formatLabel(o)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <label className="text-xs text-white/60">Business model</label>
          <Select
            value={currentModel || "__none__"}
            onValueChange={(v) => setCurrentModel(v === "__none__" ? "" : v)}
          >
            <SelectTrigger size="sm">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {BUSINESS_MODEL_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {formatLabel(o)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="inline-flex h-8 items-center justify-center rounded-md bg-white px-3 text-xs font-medium text-black hover:bg-white/90 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/50"
          onClick={handleSave}
          disabled={saving}
          type="button"
        >
          {saving ? "Saving..." : "Save tags"}
        </button>
        {saved && (
          <span className="text-xs text-emerald-200">Saved</span>
        )}
        {error && (
          <span className="text-xs text-red-200">{error}</span>
        )}
      </div>
    </div>
  );
}

export function TagBadge({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <span className="inline-flex rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
      {formatLabel(value)}
    </span>
  );
}
