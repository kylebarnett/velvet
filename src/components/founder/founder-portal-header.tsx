"use client";

import * as React from "react";
import {
  Globe,
  Check,
  X,
  ExternalLink,
  Pencil,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { FounderCompanyLogo } from "@/components/founder/company-logo";
import { TAG_OPTIONS, TAG_COLORS, getTagLabel, type TagType } from "@/lib/company/constants";

interface FounderPortalHeaderProps {
  companyId: string;
  companyName: string;
  companyIndustry: string | null;
  companyWebsite?: string | null;
  companyStage?: string | null;
  companyBusinessModel?: string | null;
  companyLogoUrl?: string | null;
}

export function FounderPortalHeader({
  companyId,
  companyName,
  companyIndustry,
  companyWebsite,
  companyStage,
  companyBusinessModel,
  companyLogoUrl,
}: FounderPortalHeaderProps) {
  return (
    <div data-onboarding="founder-welcome">
      <CompanyHeader
        companyId={companyId}
        name={companyName}
        website={companyWebsite ?? null}
        stage={companyStage ?? null}
        industry={companyIndustry ?? null}
        businessModel={companyBusinessModel ?? null}
        logoUrl={companyLogoUrl ?? null}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero-style Company Header                                           */
/* ------------------------------------------------------------------ */

const NONE = "__none__";

function CompanyHeader({
  companyId,
  name,
  website: initialWebsite,
  stage: initialStage,
  industry: initialIndustry,
  businessModel: initialBusinessModel,
  logoUrl: initialLogoUrl,
}: {
  companyId: string;
  name: string;
  website: string | null;
  stage: string | null;
  industry: string | null;
  businessModel: string | null;
  logoUrl: string | null;
}) {
  const [website, setWebsite] = React.useState(initialWebsite);
  const [stage, setStage] = React.useState(initialStage);
  const [industry, setIndustry] = React.useState(initialIndustry);
  const [businessModel, setBusinessModel] = React.useState(initialBusinessModel);
  const [logoUrl, setLogoUrl] = React.useState(initialLogoUrl);
  const [editingWebsite, setEditingWebsite] = React.useState(false);
  const [websiteInput, setWebsiteInput] = React.useState(initialWebsite ?? "");
  const [saving, setSaving] = React.useState(false);
  const [toast, setToast] = React.useState<{ type: "success" | "error"; msg: string } | null>(null);

  React.useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function saveField(field: string, value: string | null) {
    setSaving(true);
    try {
      const res = await fetch("/api/founder/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        setToast({ type: "error", msg: "Failed to save" });
        return false;
      }
      setToast({ type: "success", msg: "Saved" });
      return true;
    } catch {
      setToast({ type: "error", msg: "Failed to save" });
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
      setWebsite(url);
      setWebsiteInput(url ?? "");
      setEditingWebsite(false);
    }
  }

  async function handleTagChange(type: TagType, value: string | null) {
    const field = type === "businessModel" ? "business_model" : type;
    const prev = type === "stage" ? stage : type === "industry" ? industry : businessModel;

    // Optimistic update
    if (type === "stage") setStage(value);
    else if (type === "industry") setIndustry(value);
    else setBusinessModel(value);

    const ok = await saveField(field, value);
    if (!ok) {
      if (type === "stage") setStage(prev);
      else if (type === "industry") setIndustry(prev);
      else setBusinessModel(prev);
    }
  }

  // Tags config
  const tags: { type: TagType; value: string | null; label: string }[] = [
    { type: "stage", value: stage, label: "Stage" },
    { type: "industry", value: industry, label: "Industry" },
    { type: "businessModel", value: businessModel, label: "Model" },
  ];

  return (
    <div data-onboarding="company-profile">
      <div className="flex items-start gap-4">
        {/* Logo */}
        <FounderCompanyLogo
          companyId={companyId}
          companyName={name}
          logoUrl={logoUrl}
          editable
          size="xl"
          onLogoChange={setLogoUrl}
        />

        {/* Name + website + tags */}
        <div className="min-w-0 flex-1 space-y-1.5">
          {/* Row 1: Company name + toast */}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary truncate">{name}</h1>
            {toast && (
              <span className={`text-xs font-medium ${toast.type === "success" ? "text-[var(--success-accent)]" : "text-[var(--error-accent)]"}`}>
                {toast.msg}
              </span>
            )}
          </div>

          {/* Row 2: Website + tags (inline) */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {/* Website — click to edit */}
            {editingWebsite ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={websiteInput}
                  onChange={(e) => setWebsiteInput(e.target.value)}
                  placeholder="example.com"
                  className="h-7 w-56 rounded-md border border-border-default bg-bg-input px-2 text-xs focus:border-border-default focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleWebsiteSave();
                    if (e.key === "Escape") {
                      setEditingWebsite(false);
                      setWebsiteInput(website ?? "");
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleWebsiteSave}
                  disabled={saving}
                  className="flex h-7 items-center rounded-md bg-btn-primary-bg px-2 text-xs font-medium text-btn-primary-text hover:bg-btn-primary-hover disabled:opacity-60"
                >
                  <Check className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingWebsite(false);
                    setWebsiteInput(website ?? "");
                  }}
                  className="flex h-7 items-center rounded-md border border-border-default px-2 text-xs text-text-tertiary hover:bg-bg-hover"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : website ? (
              <div className="flex items-center gap-1.5">
                <a
                  href={website.startsWith("http") ? website : `https://${website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-1 text-sm text-text-muted hover:text-text-secondary transition-colors"
                >
                  <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="truncate max-w-[200px]">{website.replace(/^https?:\/\//, "")}</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setWebsiteInput(website ?? "");
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

            {/* Dot separator between website and tags */}
            {(website || editingWebsite) && (
              <span className="h-1 w-1 rounded-full bg-border-default" aria-hidden="true" />
            )}

            {/* Tags — inline editable badges */}
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
  );
}

/* ------------------------------------------------------------------ */
/* Inline Tag Badge — click to open Select, auto-closes on change      */
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
  const [open, setOpen] = React.useState(false);

  return (
    <Select
      value={value ?? NONE}
      onValueChange={(v) => {
        onChange(v === NONE ? null : v);
        setOpen(false);
      }}
      disabled={saving}
      open={open}
      onOpenChange={setOpen}
    >
      <SelectTrigger
        className={cn(
          "h-auto w-auto border-0 bg-transparent p-0 shadow-none [&>svg]:hidden",
          value
            ? `inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-opacity hover:opacity-80 ${TAG_COLORS[type]}`
            : "inline-flex rounded-full border border-dashed border-border-default px-2.5 py-0.5 text-[10px] text-text-faint hover:text-text-tertiary hover:border-border-default transition-colors"
        )}
        title={value ? `Change ${label.toLowerCase()}` : `Set ${label.toLowerCase()}`}
      >
        <span>{value ? getTagLabel(type, value) : `+ ${label}`}</span>
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
