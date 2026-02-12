"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BarChart3,
  FileText,
  FileSpreadsheet,
  Globe,
  Check,
  X,
  ExternalLink,
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
import { FounderCompanyLogo } from "@/components/founder/company-logo";
import { MetricValue } from "@/components/dashboard";
import { SlidingTabs, TabItem } from "@/components/ui/sliding-tabs";
import { TAG_OPTIONS, TAG_COLORS, getTagLabel, type TagType } from "@/lib/company/constants";

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

interface FounderPortalTabsProps {
  companyId: string;
  companyName: string;
  companyIndustry: string | null;
  companyWebsite?: string | null;
  companyStage?: string | null;
  companyBusinessModel?: string | null;
  companyLogoUrl?: string | null;
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
  companyLogoUrl,
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
          companyId={companyId}
          name={companyName}
          website={companyWebsite ?? null}
          stage={companyStage ?? null}
          industry={companyIndustry ?? null}
          businessModel={companyBusinessModel ?? null}
          logoUrl={companyLogoUrl ?? null}
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
    <div className="rounded-xl border border-border-subtle bg-bg-raised px-5 py-4" data-onboarding="company-profile">
      <div className="flex items-start gap-4">
        {/* Logo */}
        <FounderCompanyLogo
          companyId={companyId}
          companyName={name}
          logoUrl={logoUrl}
          editable
          size="lg"
          onLogoChange={setLogoUrl}
        />

        {/* Name + website + tags */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight truncate">{name}</h1>
            {/* Toast */}
            {toast && (
              <span className={`text-xs font-medium ${toast.type === "success" ? "text-[var(--success-accent)]" : "text-[var(--error-accent)]"}`}>
                {toast.msg}
              </span>
            )}
          </div>

          {/* Website — click to edit */}
          <div className="mt-0.5">
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
              <button
                type="button"
                onClick={() => {
                  setWebsiteInput(website ?? "");
                  setEditingWebsite(true);
                }}
                className="group flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                <Globe className="h-3 w-3" aria-hidden="true" />
                <span className="truncate max-w-[200px]">{website.replace(/^https?:\/\//, "")}</span>
                <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEditingWebsite(true)}
                className="text-xs text-text-faint hover:text-text-tertiary transition-colors italic"
              >
                + Add website
              </button>
            )}
          </div>

          {/* Tags — inline editable badges */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
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
        <SelectTrigger size="sm" className="h-6 w-auto min-w-[100px] text-[11px]">
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
        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-opacity hover:opacity-80 ${TAG_COLORS[type]}`}
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
      className="inline-flex rounded-full border border-dashed border-border-default px-2.5 py-0.5 text-[10px] text-text-faint hover:text-text-tertiary hover:border-border-default transition-colors"
      title={`Set ${label.toLowerCase()}`}
    >
      + {label}
    </button>
  );
}
