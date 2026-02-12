export type TagType = "stage" | "industry" | "businessModel";

export const TAG_OPTIONS: Record<TagType, { value: string; label: string }[]> = {
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

export const TAG_COLORS: Record<TagType, string> = {
  stage: "bg-[var(--tag-violet-bg)] text-[var(--tag-violet-text)] border-[var(--tag-violet-bg)]",
  industry: "bg-[var(--tag-blue-bg)] text-[var(--tag-blue-text)] border-[var(--tag-blue-bg)]",
  businessModel: "bg-[var(--tag-emerald-bg)] text-[var(--tag-emerald-text)] border-[var(--tag-emerald-bg)]",
};

export function getTagLabel(type: TagType, value: string | null): string {
  if (!value) return "";
  const opt = TAG_OPTIONS[type].find((o) => o.value === value);
  return opt?.label ?? value;
}
