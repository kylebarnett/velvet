"use client";

import * as React from "react";
import { Building2, Globe, Check, X, Pencil } from "lucide-react";

type TagType = "stage" | "industry" | "businessModel";

const TAG_OPTIONS: Record<TagType, { value: string; label: string }[]> = {
  stage: [
    { value: "seed", label: "Seed" },
    { value: "series_a", label: "Series A" },
    { value: "series_b", label: "Series B" },
    { value: "series_c", label: "Series C" },
    { value: "growth", label: "Growth" },
  ],
  industry: [
    { value: "saas", label: "SaaS" },
    { value: "fintech", label: "Fintech" },
    { value: "healthcare", label: "Healthcare" },
    { value: "ecommerce", label: "E-commerce" },
    { value: "edtech", label: "EdTech" },
    { value: "ai_ml", label: "AI/ML" },
    { value: "other", label: "Other" },
  ],
  businessModel: [
    { value: "b2b", label: "B2B" },
    { value: "b2c", label: "B2C" },
    { value: "b2b2c", label: "B2B2C" },
    { value: "marketplace", label: "Marketplace" },
    { value: "other", label: "Other" },
  ],
};

const TAG_COLORS: Record<TagType, string> = {
  stage: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  industry: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  businessModel: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

function getTagLabel(type: TagType, value: string | null): string {
  if (!value) return "Not set";
  const opt = TAG_OPTIONS[type].find((o) => o.value === value);
  return opt?.label ?? value;
}

type CompanyData = {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  stage: string | null;
  business_model: string | null;
};

export function CompanyProfile({ company }: { company: CompanyData }) {
  const [data, setData] = React.useState(company);
  const [editingWebsite, setEditingWebsite] = React.useState(false);
  const [websiteInput, setWebsiteInput] = React.useState(data.website ?? "");
  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  async function saveField(field: string, value: string | null) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/founder/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        setError("Failed to save changes.");
        return false;
      }
      setSuccess("Changes saved");
      return true;
    } catch {
      setError("Failed to save changes.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleWebsiteSave() {
    const url = websiteInput.trim() || null;
    if (url && !/^https?:\/\//.test(url)) {
      setError("Website must start with http:// or https://");
      return;
    }
    const ok = await saveField("website", url);
    if (ok) {
      setData((prev) => ({ ...prev, website: url }));
      setEditingWebsite(false);
    }
  }

  async function handleTagChange(type: TagType, value: string | null) {
    const field = type === "businessModel" ? "business_model" : type;
    const prev = type === "businessModel" ? data.business_model : data[type as keyof CompanyData] as string | null;
    // Optimistic update
    setData((d) => ({
      ...d,
      [field]: value,
    }));
    const ok = await saveField(field, value);
    if (!ok) {
      setData((d) => ({ ...d, [field]: prev }));
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Company Profile</h1>
        <p className="text-sm text-white/60">
          View and update your company information.
        </p>
      </div>

      {/* Status messages */}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-200" role="alert">
          <Check className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-200" role="alert">
          <X className="h-4 w-4 shrink-0" />
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-auto rounded p-0.5 hover:bg-white/10">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/[0.06]">
        {/* Company Name (read-only) */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
              <Building2 className="h-5 w-5 text-white/60" />
            </div>
            <div>
              <div className="text-xs text-white/60">Company Name</div>
              <div className="font-medium">{data.name}</div>
            </div>
          </div>
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/40">
            Locked
          </span>
        </div>

        {/* Website (editable) */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <Globe className="h-5 w-5 text-white/60" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-white/60">Website</div>
              {editingWebsite ? (
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="url"
                    value={websiteInput}
                    onChange={(e) => setWebsiteInput(e.target.value)}
                    placeholder="https://example.com"
                    className="h-9 flex-1 rounded-md border border-white/10 bg-black/30 px-3 text-sm focus:border-white/20 focus:outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleWebsiteSave();
                      if (e.key === "Escape") {
                        setEditingWebsite(false);
                        setWebsiteInput(data.website ?? "");
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleWebsiteSave}
                    disabled={saving}
                    className="flex h-9 items-center gap-1.5 rounded-md bg-white px-3 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingWebsite(false);
                      setWebsiteInput(data.website ?? "");
                    }}
                    className="flex h-9 items-center rounded-md border border-white/10 px-3 text-sm text-white/60 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {data.website ? (
                    <a
                      href={data.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-white/70 hover:text-white hover:underline truncate"
                    >
                      {data.website}
                    </a>
                  ) : (
                    <span className="text-sm text-white/40">Not set</span>
                  )}
                </div>
              )}
            </div>
          </div>
          {!editingWebsite && (
            <button
              type="button"
              onClick={() => {
                setWebsiteInput(data.website ?? "");
                setEditingWebsite(true);
              }}
              className="shrink-0 rounded-md p-2 text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Tags Section */}
        <TagRow
          label="Stage"
          type="stage"
          value={data.stage}
          onChange={(v) => handleTagChange("stage", v)}
          saving={saving}
        />
        <TagRow
          label="Industry"
          type="industry"
          value={data.industry}
          onChange={(v) => handleTagChange("industry", v)}
          saving={saving}
        />
        <TagRow
          label="Business Model"
          type="businessModel"
          value={data.business_model}
          onChange={(v) => handleTagChange("businessModel", v)}
          saving={saving}
        />
      </div>
    </div>
  );
}

function TagRow({
  label,
  type,
  value,
  onChange,
  saving,
}: {
  label: string;
  type: TagType;
  value: string | null;
  onChange: (value: string | null) => void;
  saving: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div>
        <div className="text-xs text-white/60">{label}</div>
        <div className="mt-1">
          {value ? (
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${TAG_COLORS[type]}`}>
              {getTagLabel(type, value)}
            </span>
          ) : (
            <span className="text-sm text-white/40">Not set</span>
          )}
        </div>
      </div>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={saving}
        className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white transition-colors hover:border-white/15 focus:border-white/20 focus:outline-none disabled:opacity-60"
      >
        <option value="">Not set</option>
        {TAG_OPTIONS[type].map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
