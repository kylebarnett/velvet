"use client";

import * as React from "react";
import { BarChart3, GitCompareArrows, Trophy, Search } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { REPORT_TEMPLATES, type ReportType } from "@/lib/reports/templates";
import { ReportGallery } from "./report-gallery";
import { ReportPreviewPanel } from "./report-preview-panel";
import type { SavedReport } from "./reports-context";

const ICON_MAP: Record<string, React.ElementType> = {
  "bar-chart-3": BarChart3,
  "git-compare-arrows": GitCompareArrows,
  trophy: Trophy,
  search: Search,
};

const COLOR_CLASSES: Record<string, { bg: string; icon: string }> = {
  blue: {
    bg: "bg-[var(--tag-blue-bg)]",
    icon: "text-[var(--tag-blue-text)]",
  },
  emerald: {
    bg: "bg-[var(--tag-emerald-bg)]",
    icon: "text-[var(--tag-emerald-text)]",
  },
  violet: {
    bg: "bg-[var(--tag-violet-bg)]",
    icon: "text-[var(--tag-violet-text)]",
  },
  amber: {
    bg: "bg-[var(--tag-amber-bg)]",
    icon: "text-[var(--tag-amber-text)]",
  },
};

const TEMPLATE_ORDER: ReportType[] = ["summary", "comparison", "benchmarks", "deep_dive"];

type ReportsPageClientProps = {
  initialReports: SavedReport[];
};

export function ReportsPageClient({ initialReports }: ReportsPageClientProps) {
  const [previewType, setPreviewType] = React.useState<ReportType | null>(null);
  const [reports, setReports] = React.useState(initialReports);
  const triggerRefs = React.useRef<Map<ReportType, HTMLButtonElement>>(new Map());
  const activeTriggerRef = React.useRef<HTMLButtonElement | null>(null);

  function handleTemplateClick(type: ReportType) {
    activeTriggerRef.current = triggerRefs.current.get(type) ?? null;
    setPreviewType(type);
  }

  function handleCreated(reportId: string) {
    // The report will show in the editor page after redirect,
    // but also add to local state in case user navigates back
    const template = REPORT_TEMPLATES[previewType!];
    setReports((prev) => [
      {
        id: reportId,
        name: `Untitled ${template.label}`,
        description: null,
        report_type: previewType!,
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      ...prev,
    ]);
    setPreviewType(null);
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <Breadcrumbs icon="briefcase" items={[{ label: "Dashboard", href: "/" }, { label: "Reports" }]} />
        <h1
          className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-text-primary"
          data-onboarding="reports-title"
        >
          Reports
        </h1>
        <p className="mt-1 text-sm text-text-tertiary">
          Create, customize, and export portfolio reports
        </p>
      </div>

      {/* Template cards */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-text-primary">Create a Report</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {TEMPLATE_ORDER.map((type) => {
            const template = REPORT_TEMPLATES[type];
            const Icon = ICON_MAP[template.icon] ?? BarChart3;
            const colors = COLOR_CLASSES[template.color] ?? COLOR_CLASSES.blue;

            return (
              <button
                key={type}
                ref={(el) => {
                  if (el) triggerRefs.current.set(type, el);
                }}
                type="button"
                onClick={() => handleTemplateClick(type)}
                className="card-hover-lift group flex flex-col items-start rounded-xl card-surface p-6 text-left"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors.bg}`}>
                  <Icon className={`h-5 w-5 ${colors.icon}`} />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-text-primary">
                  {template.label}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-text-muted">
                  {template.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Saved reports */}
      {reports.length > 0 && (
        <section>
          <h2 className="mb-4 text-base font-semibold text-text-primary">Your Reports</h2>
          <ReportGallery initialReports={reports} onReportsChange={setReports} />
        </section>
      )}

      {/* Preview panel */}
      {previewType && (
        <ReportPreviewPanel
          reportType={previewType}
          onClose={() => setPreviewType(null)}
          onCreated={handleCreated}
          triggerRef={activeTriggerRef}
        />
      )}
    </div>
  );
}
