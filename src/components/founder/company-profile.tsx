"use client";

import * as React from "react";
import { Building2, Globe, Check, X, Pencil } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

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
  stage: "bg-[var(--tag-violet-bg)] text-[var(--tag-violet-text)] border-[var(--tag-violet-bg)]",
  industry: "bg-[var(--tag-blue-bg)] text-[var(--tag-blue-text)] border-[var(--tag-blue-bg)]",
  businessModel: "bg-[var(--tag-emerald-bg)] text-[var(--tag-emerald-text)] border-[var(--tag-emerald-bg)]",
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
  const { success, error, setSuccess, setError } = useToast();

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
    let url = websiteInput.trim() || null;
    if (url && !/^https?:\/\//.test(url)) {
      url = `https://${url}`;
    }
    const ok = await saveField("website", url);
    if (ok) {
      setData((prev) => ({ ...prev, website: url }));
      setWebsiteInput(url ?? "");
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
        <p className="text-sm text-text-tertiary">
          View and update your company information.
        </p>
      </div>

      {/* Status messages */}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--status-success-bg)] bg-[var(--status-success-bg)] px-4 py-2.5 text-sm text-[var(--status-success-text)]" role="alert">
          <Check className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-4 py-2.5 text-sm text-[var(--status-error-text)]" role="alert">
          <X className="h-4 w-4 shrink-0" />
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-auto rounded p-0.5 hover:bg-bg-hover">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="rounded-xl border border-border-default card-surface divide-y divide-border-subtle">
        {/* Company Name (read-only) */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-hover">
              <Building2 className="h-5 w-5 text-text-tertiary" />
            </div>
            <div>
              <div className="text-xs text-text-tertiary">Company Name</div>
              <div className="font-medium">{data.name}</div>
            </div>
          </div>
          <span className="rounded-full bg-bg-elevated px-2.5 py-1 text-xs text-text-muted">
            Locked
          </span>
        </div>

        {/* Website (editable) */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bg-hover">
              <Globe className="h-5 w-5 text-text-tertiary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-text-tertiary">Website</div>
              {editingWebsite ? (
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={websiteInput}
                    onChange={(e) => setWebsiteInput(e.target.value)}
                    placeholder="example.com"
                    className="h-9 flex-1 rounded-md border border-border-default bg-bg-input px-3 text-sm focus:border-border-default focus:outline-none"
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
                    className="flex h-9 items-center gap-1.5 rounded-md bg-btn-primary-bg px-3 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover disabled:opacity-60"
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
                    className="flex h-9 items-center rounded-md border border-border-default px-3 text-sm text-text-tertiary hover:bg-bg-hover"
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
                      className="text-sm text-text-secondary hover:text-text-primary hover:underline truncate"
                    >
                      {data.website}
                    </a>
                  ) : (
                    <span className="text-sm text-text-muted">Not set</span>
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
              className="shrink-0 rounded-md p-2 text-text-muted hover:text-text-secondary hover:bg-bg-elevated transition-colors"
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

const NONE = "__none__";

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
        <div className="text-xs text-text-tertiary">{label}</div>
        <div className="mt-1">
          {value ? (
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${TAG_COLORS[type]}`}>
              {getTagLabel(type, value)}
            </span>
          ) : (
            <span className="text-sm text-text-muted">Not set</span>
          )}
        </div>
      </div>
      <Select
        value={value ?? NONE}
        onValueChange={(v) => onChange(v === NONE ? null : v)}
        disabled={saving}
      >
        <SelectTrigger>
          <SelectValue placeholder="Not set" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Not set</SelectItem>
          {TAG_OPTIONS[type].map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
