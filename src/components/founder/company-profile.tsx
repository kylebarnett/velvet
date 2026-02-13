"use client";

import * as React from "react";
import { Globe, Check, X, Pencil, MapPin, Users, Calendar, DollarSign, FileText, ExternalLink } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { FounderCompanyLogo } from "@/components/founder/company-logo";
import { useToast } from "@/hooks/use-toast";
import { TAG_OPTIONS, TAG_COLORS, getTagLabel, type TagType } from "@/lib/company/constants";

type CompanyData = {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  stage: string | null;
  business_model: string | null;
  description?: string | null;
  founded_date?: string | null;
  hq_location?: string | null;
  headcount?: number | null;
  total_funding_raised?: number | null;
  last_round_amount?: number | null;
  last_round_date?: string | null;
  logo_url?: string | null;
};

const NONE = "__none__";

export function CompanyProfile({ company }: { company: CompanyData }) {
  const [data, setData] = React.useState(company);
  const [editingWebsite, setEditingWebsite] = React.useState(false);
  const [websiteInput, setWebsiteInput] = React.useState(data.website ?? "");
  const [saving, setSaving] = React.useState(false);
  const { success, error, setSuccess, setError } = useToast();

  async function saveField(field: string, value: string | number | null) {
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
    setData((d) => ({ ...d, [field]: value }));
    const ok = await saveField(field, value);
    if (!ok) {
      setData((d) => ({ ...d, [field]: prev }));
    }
  }

  const tags: { type: TagType; value: string | null; label: string }[] = [
    { type: "stage", value: data.stage, label: "Stage" },
    { type: "industry", value: data.industry, label: "Industry" },
    { type: "businessModel", value: data.business_model, label: "Model" },
  ];

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

      {/* Hero section — Logo + Name + Website + Tags */}
      <div className="rounded-xl border border-border-default card-surface px-6 py-5">
        <div className="flex items-start gap-5">
          <FounderCompanyLogo
            companyId={data.id}
            companyName={data.name}
            logoUrl={data.logo_url ?? null}
            editable
            size="xl"
            onLogoChange={(url) => setData((d) => ({ ...d, logo_url: url }))}
          />

          <div className="min-w-0 flex-1">
            {/* Name (locked) */}
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight truncate">{data.name}</h2>
              <span className="rounded-full bg-bg-elevated px-2 py-0.5 text-[10px] font-medium text-text-muted">
                Locked
              </span>
            </div>

            {/* Website — click to edit */}
            <div className="mt-1">
              {editingWebsite ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={websiteInput}
                    onChange={(e) => setWebsiteInput(e.target.value)}
                    placeholder="example.com"
                    className="h-8 w-64 rounded-md border border-border-default bg-bg-input px-2.5 text-sm focus:border-border-default focus:outline-none"
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
                    className="flex h-8 items-center gap-1.5 rounded-md bg-btn-primary-bg px-3 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover disabled:opacity-60"
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
                    className="flex h-8 items-center rounded-md border border-border-default px-3 text-sm text-text-tertiary hover:bg-bg-hover"
                  >
                    Cancel
                  </button>
                </div>
              ) : data.website ? (
                <div className="flex items-center gap-1.5">
                  <a
                    href={data.website.startsWith("http") ? data.website : `https://${data.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-1 text-sm text-text-muted hover:text-text-secondary transition-colors"
                  >
                    <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="truncate max-w-[240px]">{data.website.replace(/^https?:\/\//, "")}</span>
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setWebsiteInput(data.website ?? "");
                      setEditingWebsite(true);
                    }}
                    className="rounded-md p-1 text-text-muted hover:text-text-secondary hover:bg-bg-elevated transition-colors"
                    title="Edit website"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingWebsite(true)}
                  className="text-sm text-text-faint hover:text-text-tertiary transition-colors italic"
                >
                  + Add website
                </button>
              )}
            </div>

            {/* Tags — inline editable badges */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <InlineTagBadge
                  key={tag.type}
                  type={tag.type}
                  value={tag.value}
                  label={tag.label}
                  saving={saving}
                  onChange={(v) => handleTagChange(tag.type, v)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Details — two-column grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Company Details */}
        <div className="space-y-1">
          <h2 className="text-base font-medium">Company Details</h2>
          <div className="rounded-xl border border-border-default card-surface divide-y divide-border-subtle">
            <EditableTextField
              label="Description"
              icon={FileText}
              value={data.description ?? ""}
              placeholder="Brief description of your company..."
              multiline
              saving={saving}
              onSave={async (v) => {
                const ok = await saveField("description", v || null);
                if (ok) setData((d) => ({ ...d, description: v || null }));
                return ok;
              }}
            />
            <EditableTextField
              label="HQ Location"
              icon={MapPin}
              value={data.hq_location ?? ""}
              placeholder="e.g. San Francisco, CA"
              saving={saving}
              onSave={async (v) => {
                const ok = await saveField("hq_location", v || null);
                if (ok) setData((d) => ({ ...d, hq_location: v || null }));
                return ok;
              }}
            />
            <EditableTextField
              label="Founded"
              icon={Calendar}
              value={data.founded_date ?? ""}
              placeholder="YYYY-MM-DD"
              inputType="date"
              saving={saving}
              onSave={async (v) => {
                const ok = await saveField("founded_date", v || null);
                if (ok) setData((d) => ({ ...d, founded_date: v || null }));
                return ok;
              }}
            />
            <EditableTextField
              label="Headcount"
              icon={Users}
              value={data.headcount != null ? String(data.headcount) : ""}
              placeholder="e.g. 25"
              inputType="number"
              saving={saving}
              onSave={async (v) => {
                const num = v ? parseInt(v, 10) : null;
                const ok = await saveField("headcount", num);
                if (ok) setData((d) => ({ ...d, headcount: num }));
                return ok;
              }}
            />
          </div>
        </div>

        {/* Right: Funding */}
        <div className="space-y-1">
          <h2 className="text-base font-medium">Funding</h2>
          <div className="rounded-xl border border-border-default card-surface divide-y divide-border-subtle">
            <EditableTextField
              label="Total Funding Raised"
              icon={DollarSign}
              value={data.total_funding_raised != null ? String(data.total_funding_raised) : ""}
              placeholder="e.g. 5000000"
              inputType="number"
              saving={saving}
              formatDisplay={(v) => {
                const num = parseInt(v, 10);
                if (isNaN(num)) return v;
                if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
                if (num >= 1_000) return `$${Math.round(num / 1_000)}K`;
                return `$${num}`;
              }}
              onSave={async (v) => {
                const num = v ? parseInt(v, 10) : null;
                const ok = await saveField("total_funding_raised", num);
                if (ok) setData((d) => ({ ...d, total_funding_raised: num }));
                return ok;
              }}
            />
            <EditableTextField
              label="Last Round Amount"
              icon={DollarSign}
              value={data.last_round_amount != null ? String(data.last_round_amount) : ""}
              placeholder="e.g. 2000000"
              inputType="number"
              saving={saving}
              formatDisplay={(v) => {
                const num = parseInt(v, 10);
                if (isNaN(num)) return v;
                if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
                if (num >= 1_000) return `$${Math.round(num / 1_000)}K`;
                return `$${num}`;
              }}
              onSave={async (v) => {
                const num = v ? parseInt(v, 10) : null;
                const ok = await saveField("last_round_amount", num);
                if (ok) setData((d) => ({ ...d, last_round_amount: num }));
                return ok;
              }}
            />
            <EditableTextField
              label="Last Round Date"
              icon={Calendar}
              value={data.last_round_date ?? ""}
              placeholder="YYYY-MM-DD"
              inputType="date"
              saving={saving}
              onSave={async (v) => {
                const ok = await saveField("last_round_date", v || null);
                if (ok) setData((d) => ({ ...d, last_round_date: v || null }));
                return ok;
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* EditableTextField — cleaner label-above, value-below layout          */
/* ------------------------------------------------------------------ */

function EditableTextField({
  label,
  icon: Icon,
  value,
  placeholder,
  inputType = "text",
  multiline = false,
  saving,
  formatDisplay,
  onSave,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  placeholder: string;
  inputType?: string;
  multiline?: boolean;
  saving: boolean;
  formatDisplay?: (value: string) => string;
  onSave: (value: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = React.useState(false);
  const [input, setInput] = React.useState(value);

  async function handleSave() {
    const ok = await onSave(input.trim());
    if (ok) setEditing(false);
  }

  const displayValue = value
    ? formatDisplay
      ? formatDisplay(value)
      : value
    : null;

  return (
    <div className="group relative px-4 py-3.5">
      <div className="flex items-start gap-3 min-w-0">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-text-muted">{label}</div>
          {editing ? (
            <div className="mt-1.5 flex items-center gap-2">
              {multiline ? (
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={placeholder}
                  rows={3}
                  className="flex-1 resize-none rounded-md border border-border-default bg-bg-input px-3 py-2 text-sm focus:border-border-default focus:outline-none"
                  autoFocus
                />
              ) : (
                <input
                  type={inputType}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={placeholder}
                  className="h-8 flex-1 rounded-md border border-border-default bg-bg-input px-3 text-sm focus:border-border-default focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                    if (e.key === "Escape") {
                      setEditing(false);
                      setInput(value);
                    }
                  }}
                />
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex h-8 items-center gap-1 rounded-md bg-btn-primary-bg px-2.5 text-xs font-medium text-btn-primary-text hover:bg-btn-primary-hover disabled:opacity-60"
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setInput(value);
                }}
                className="flex h-8 items-center rounded-md border border-border-default px-2.5 text-xs text-text-tertiary hover:bg-bg-hover"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="mt-0.5 text-sm text-text-secondary">
              {displayValue ?? <span className="text-text-muted italic">Not set</span>}
            </div>
          )}
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setInput(value);
              setEditing(true);
            }}
            className="shrink-0 rounded-md p-1.5 text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-text-secondary hover:bg-bg-elevated"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inline Tag Badge — same pattern as portal tabs                      */
/* ------------------------------------------------------------------ */

function InlineTagBadge({
  type,
  value,
  label,
  saving,
  onChange,
}: {
  type: TagType;
  value: string | null;
  label: string;
  saving: boolean;
  onChange: (value: string | null) => void;
}) {
  const [editing, setEditing] = React.useState(false);

  if (editing) {
    return (
      <Select
        value={value ?? NONE}
        onValueChange={(v) => {
          onChange(v === NONE ? null : v);
          setEditing(false);
        }}
        disabled={saving}
        open
        onOpenChange={(open) => {
          if (!open) setEditing(false);
        }}
      >
        <SelectTrigger size="sm" className="h-7 min-w-[100px] text-xs">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>None</SelectItem>
          {TAG_OPTIONS[type].map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (value) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 ${TAG_COLORS[type]}`}
        title={`Change ${label.toLowerCase()}`}
      >
        {getTagLabel(type, value)}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="inline-flex rounded-full border border-dashed border-border-default px-2.5 py-0.5 text-xs text-text-faint hover:text-text-tertiary hover:border-border-default transition-colors"
      title={`Set ${label.toLowerCase()}`}
    >
      + {label}
    </button>
  );
}
