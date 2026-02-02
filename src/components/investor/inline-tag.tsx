"use client";

import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";

type TagType = "stage" | "industry" | "businessModel";

type Props = {
  type: TagType;
  value: string | null;
  companyId: string;
  onUpdate: (value: string | null) => void;
};

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

const TAG_LABELS: Record<TagType, string> = {
  stage: "Stage",
  industry: "Industry",
  businessModel: "Model",
};

const TAG_COLORS: Record<TagType, { bg: string; text: string; border: string }> = {
  stage: { bg: "bg-violet-500/15", text: "text-violet-300", border: "border-violet-500/30" },
  industry: { bg: "bg-blue-500/15", text: "text-blue-300", border: "border-blue-500/30" },
  businessModel: { bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/30" },
};

function getDisplayLabel(type: TagType, value: string | null): string {
  if (!value) return `+ ${TAG_LABELS[type]}`;
  const option = TAG_OPTIONS[type].find((o) => o.value === value);
  return option?.label ?? value;
}

export const InlineTag = React.memo(function InlineTag({
  type,
  value,
  companyId,
  onUpdate,
}: Props) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const colors = TAG_COLORS[type];

  // Close on click outside
  React.useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on escape
  React.useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  async function handleSelect(newValue: string | null) {
    if (newValue === value) {
      setIsOpen(false);
      return;
    }

    // Optimistic update
    const previousValue = value;
    onUpdate(newValue);
    setIsOpen(false);
    setSaving(true);

    try {
      const res = await fetch(`/api/investors/companies/${companyId}/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [type === "businessModel" ? "business_model" : type]: newValue,
        }),
      });

      if (!res.ok) {
        // Rollback on error
        onUpdate(previousValue);
      }
    } catch {
      // Rollback on error
      onUpdate(previousValue);
    } finally {
      setSaving(false);
    }
  }

  const displayLabel = getDisplayLabel(type, value);
  const isEmpty = !value;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={saving}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
          isEmpty
            ? "border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/70"
            : `${colors.bg} ${colors.text} ${colors.border} hover:brightness-110`
        } ${saving ? "opacity-60" : ""}`}
      >
        <span>{displayLabel}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[140px] overflow-hidden rounded-lg border border-white/10 bg-zinc-900/95 py-1 shadow-xl backdrop-blur-sm">
          {/* Clear option */}
          {value && (
            <>
              <button
                onClick={() => handleSelect(null)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-white/60 hover:bg-white/5 hover:text-white/80"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
              <div className="mx-2 my-1 border-t border-white/10" />
            </>
          )}

          {/* Options */}
          {TAG_OPTIONS[type].map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-white/5 ${
                option.value === value ? "text-white" : "text-white/70"
              }`}
            >
              <span>{option.label}</span>
              {option.value === value && <Check className="h-3 w-3 text-emerald-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

type InlineTagsProps = {
  companyId: string;
  stage: string | null;
  industry: string | null;
  businessModel: string | null;
};

export function InlineTags({ companyId, stage, industry, businessModel }: InlineTagsProps) {
  const [tags, setTags] = React.useState({
    stage,
    industry,
    businessModel,
  });

  const updateTag = React.useCallback((type: TagType, value: string | null) => {
    setTags((prev) => ({ ...prev, [type]: value }));
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <InlineTag
        type="stage"
        value={tags.stage}
        companyId={companyId}
        onUpdate={(v) => updateTag("stage", v)}
      />
      <InlineTag
        type="industry"
        value={tags.industry}
        companyId={companyId}
        onUpdate={(v) => updateTag("industry", v)}
      />
      <InlineTag
        type="businessModel"
        value={tags.businessModel}
        companyId={companyId}
        onUpdate={(v) => updateTag("businessModel", v)}
      />
    </div>
  );
}
