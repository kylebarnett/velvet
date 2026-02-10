"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BarChart3,
  FileText,
  FileSpreadsheet,
  Building2,
  Globe,
  Pencil,
  Check,
  X,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { FounderDashboardClient } from "@/components/founder/founder-dashboard-client";
import { DocumentsTab } from "@/components/founder/documents-tab";
import { TearSheetsTab } from "@/components/founder/tear-sheets-tab";
import { MetricValue } from "@/components/dashboard";
import { SlidingTabs, TabItem } from "@/components/ui/sliding-tabs";

type Tab = "metrics" | "documents" | "tear-sheets";

type DashboardView = {
  id: string;
  name: string;
  is_default: boolean;
  layout: unknown;
};

type DashboardTemplate = {
  id: string;
  name: string;
  description: string | null;
  target_industry: string | null;
  layout: unknown;
  is_system: boolean;
};

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
  if (!value) return "";
  const opt = TAG_OPTIONS[type].find((o) => o.value === value);
  return opt?.label ?? value;
}

interface FounderPortalTabsProps {
  companyId: string;
  companyName: string;
  companyIndustry: string | null;
  companyWebsite?: string | null;
  companyStage?: string | null;
  companyBusinessModel?: string | null;
  metrics: MetricValue[];
  views: DashboardView[];
  templates: DashboardTemplate[];
  documentCount?: number;
  tearSheetCount?: number;
}

export function FounderPortalTabs({
  companyId,
  companyName,
  companyIndustry,
  companyWebsite,
  companyStage,
  companyBusinessModel,
  metrics,
  views,
  templates,
  documentCount,
  tearSheetCount,
}: FounderPortalTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: Tab = (
    tabParam === "documents" || tabParam === "tear-sheets" ? tabParam : "metrics"
  ) as Tab;

  // Compute unique metrics count
  const uniqueMetricNames = React.useMemo(() => {
    const names = new Set<string>();
    metrics.forEach((m) => names.add(m.metric_name));
    return names.size;
  }, [metrics]);

  const tabs: TabItem<Tab>[] = [
    { value: "metrics", label: "Metrics", icon: BarChart3, badge: uniqueMetricNames || undefined, dataOnboarding: "metrics-tab" },
    { value: "documents", label: "Documents", icon: FileText, badge: documentCount, dataOnboarding: "documents-tab" },
    { value: "tear-sheets", label: "Tear Sheets", icon: FileSpreadsheet, badge: tearSheetCount, dataOnboarding: "tear-sheets-tab" },
  ];

  function handleTabChange(tab: Tab) {
    if (tab === "metrics") {
      router.push("/portal");
    } else {
      router.push(`/portal?tab=${tab}`);
    }
  }

  return (
    <div className="space-y-6" data-onboarding="founder-welcome">
      {/* Company header + Dashboard title */}
      <div className="space-y-4">
        <CompanyHeader
          name={companyName}
          website={companyWebsite ?? null}
          stage={companyStage ?? null}
          industry={companyIndustry ?? null}
          businessModel={companyBusinessModel ?? null}
        />

        {/* Tab navigation */}
        <SlidingTabs
          tabs={tabs}
          value={activeTab}
          onChange={handleTabChange}
          variant="underline"
        />
      </div>

      {/* Tab content with fade-in animation */}
      <div
        key={activeTab}
        className="animate-fade-in"
      >
        {activeTab === "metrics" && (
          <FounderDashboardClient
            companyId={companyId}
            companyName={companyName}
            companyIndustry={companyIndustry}
            metrics={metrics}
            views={views}
            templates={templates}
          />
        )}

        {activeTab === "documents" && <DocumentsTab companyId={companyId} />}

        {activeTab === "tear-sheets" && <TearSheetsTab />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Compact Company Header                                              */
/* ------------------------------------------------------------------ */

function CompanyHeader({
  name,
  website: initialWebsite,
  stage: initialStage,
  industry: initialIndustry,
  businessModel: initialBusinessModel,
}: {
  name: string;
  website: string | null;
  stage: string | null;
  industry: string | null;
  businessModel: string | null;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [website, setWebsite] = React.useState(initialWebsite);
  const [stage, setStage] = React.useState(initialStage);
  const [industry, setIndustry] = React.useState(initialIndustry);
  const [businessModel, setBusinessModel] = React.useState(initialBusinessModel);
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

  // Tags to display inline
  const tags: { type: TagType; value: string | null }[] = [
    { type: "stage", value: stage },
    { type: "industry", value: industry },
    { type: "businessModel", value: businessModel },
  ];
  const activeTags = tags.filter((t) => t.value);

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-raised" data-onboarding="company-profile">
      {/* Collapsed row — always visible */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-elevated">
          <Building2 className="h-4.5 w-4.5 text-text-muted" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold tracking-tight truncate">{name}</h1>
            <button
              type="button"
              onClick={() => setExpanded((p) => !p)}
              className="shrink-0 rounded-md p-1 text-text-faint hover:text-text-tertiary hover:bg-bg-elevated transition-colors"
              aria-label="Edit company details"
              title="Edit company details"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {website && !expanded && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1 text-xs text-text-muted hover:text-text-tertiary transition-colors"
              >
                <Globe className="h-3 w-3" />
                <span className="truncate max-w-[160px]">{website.replace(/^https?:\/\//, "")}</span>
              </a>
            )}
          </div>

          {/* Inline tag badges */}
          {activeTags.length > 0 && !expanded && (
            <div className="mt-0.5 flex items-center gap-1.5">
              {activeTags.map((t) => (
                <span
                  key={t.type}
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${TAG_COLORS[t.type]}`}
                >
                  {getTagLabel(t.type, t.value)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <span className={`text-xs font-medium ${toast.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
            {toast.msg}
          </span>
        )}
      </div>

      {/* Expanded edit section */}
      {expanded && (
        <div className="border-t border-border-subtle px-4 py-3 space-y-3 animate-fade-in">
          {/* Website row */}
          <div className="flex items-center gap-3">
            <label className="w-24 shrink-0 text-xs text-text-muted">Website</label>
            {editingWebsite ? (
              <div className="flex flex-1 items-center gap-2">
                <input
                  type="text"
                  value={websiteInput}
                  onChange={(e) => setWebsiteInput(e.target.value)}
                  placeholder="example.com"
                  className="h-8 flex-1 rounded-md border border-border-default bg-bg-input px-2.5 text-sm focus:border-border-default focus:outline-none"
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
                  className="flex h-8 items-center rounded-md bg-btn-primary-bg px-2.5 text-xs font-medium text-btn-primary-text hover:bg-btn-primary-hover disabled:opacity-60"
                >
                  <Check className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingWebsite(false);
                    setWebsiteInput(website ?? "");
                  }}
                  className="flex h-8 items-center rounded-md border border-border-default px-2.5 text-xs text-text-tertiary hover:bg-bg-hover"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex flex-1 items-center gap-2">
                <span className="text-sm text-text-secondary truncate">
                  {website || <span className="text-text-faint italic">Not set</span>}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setWebsiteInput(website ?? "");
                    setEditingWebsite(true);
                  }}
                  className="shrink-0 rounded p-1 text-text-faint hover:text-text-tertiary hover:bg-bg-elevated transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* Tag rows */}
          <InlineTagRow
            label="Stage"
            type="stage"
            value={stage}
            onChange={(v) => handleTagChange("stage", v)}
            saving={saving}
          />
          <InlineTagRow
            label="Industry"
            type="industry"
            value={industry}
            onChange={(v) => handleTagChange("industry", v)}
            saving={saving}
          />
          <InlineTagRow
            label="Model"
            type="businessModel"
            value={businessModel}
            onChange={(v) => handleTagChange("businessModel", v)}
            saving={saving}
          />
        </div>
      )}
    </div>
  );
}

const NONE = "__none__";

function InlineTagRow({
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
    <div className="flex items-center gap-3">
      <label className="w-24 shrink-0 text-xs text-text-muted">{label}</label>
      <Select
        value={value ?? NONE}
        onValueChange={(v) => onChange(v === NONE ? null : v)}
        disabled={saving}
      >
        <SelectTrigger size="sm">
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
      {value && (
        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${TAG_COLORS[type]}`}>
          {getTagLabel(type, value)}
        </span>
      )}
    </div>
  );
}
