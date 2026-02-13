"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BarChart3, GitCompareArrows, Trophy, Search, Loader2 } from "lucide-react";
import { REPORT_TEMPLATES, getDefaultSections, type ReportType } from "@/lib/reports/templates";

const ICON_MAP: Record<string, React.ElementType> = {
  "bar-chart-3": BarChart3,
  "git-compare-arrows": GitCompareArrows,
  trophy: Trophy,
  search: Search,
};

const COLOR_CLASSES: Record<string, { border: string; bg: string; icon: string }> = {
  blue: {
    border: "border-[var(--tag-blue-bg)]",
    bg: "bg-[var(--tag-blue-bg)]",
    icon: "text-[var(--tag-blue-text)]",
  },
  emerald: {
    border: "border-[var(--tag-emerald-bg)]",
    bg: "bg-[var(--tag-emerald-bg)]",
    icon: "text-[var(--tag-emerald-text)]",
  },
  violet: {
    border: "border-[var(--tag-violet-bg)]",
    bg: "bg-[var(--tag-violet-bg)]",
    icon: "text-[var(--tag-violet-text)]",
  },
  amber: {
    border: "border-[var(--tag-amber-bg)]",
    bg: "bg-[var(--tag-amber-bg)]",
    icon: "text-[var(--tag-amber-text)]",
  },
};

const TEMPLATE_ORDER: ReportType[] = ["summary", "comparison", "benchmarks", "deep_dive"];

export function TemplatePicker() {
  const router = useRouter();
  const [creating, setCreating] = useState<ReportType | null>(null);

  async function handleCreate(type: ReportType) {
    setCreating(type);
    const template = REPORT_TEMPLATES[type];
    try {
      const res = await fetch("/api/investors/portfolio/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Untitled ${template.label}`,
          reportType: type,
          config: { visibleSections: getDefaultSections(type) },
        }),
      });
      if (res.ok) {
        const json = await res.json();
        router.push(`/reports/${json.id}`);
      }
    } finally {
      setCreating(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Create a Report
        </h1>
        <p className="mt-1 text-sm text-text-tertiary">
          Choose a template to get started. You can customize sections after creation.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {TEMPLATE_ORDER.map((type) => {
          const template = REPORT_TEMPLATES[type];
          const Icon = ICON_MAP[template.icon] ?? BarChart3;
          const colors = COLOR_CLASSES[template.color] ?? COLOR_CLASSES.blue;
          const isCreating = creating === type;

          return (
            <button
              key={type}
              type="button"
              onClick={() => handleCreate(type)}
              disabled={creating !== null}
              className={`group relative flex flex-col items-start rounded-xl border border-border-default bg-bg-primary p-6 text-left transition-all hover:border-border-hover hover:shadow-md disabled:opacity-60`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors.bg}`}
              >
                <Icon className={`h-5 w-5 ${colors.icon}`} />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-text-primary">
                {template.label}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-text-muted">
                {template.description}
              </p>

              <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-text-tertiary">
                {isCreating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    {template.sections.length} sections
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
