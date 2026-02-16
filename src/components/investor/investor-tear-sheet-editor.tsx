"use client";

import * as React from "react";
import { Plus, X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { RichTextEditor } from "@/components/founder/rich-text-editor";
import { formatValue } from "@/components/charts/types";

type TearSheet = {
  id: string;
  title: string;
  quarter: string;
  year: number;
  status: string;
  content: Record<string, unknown>;
  share_enabled: boolean;
  share_token: string | null;
};

type TearSheetMetric = {
  metricName: string;
  currentValue: string | null;
  previousValue: string | null;
  trend: "up" | "down" | "flat";
};

type Milestone = {
  title: string;
  description: string;
};

type MetricSourceMode = "all" | "founder" | "investor";

type InvestorTearSheetContent = {
  highlights: string;
  visibleMetrics: string[];
  milestones: Milestone[];
  challenges: string;
  notes: string;
  outlook: string;
  actionItems: string;
  metricSources: MetricSourceMode;
};

type InvestorTearSheetEditorProps = {
  tearSheet: TearSheet;
  metrics: TearSheetMetric[];
  onSave: (content: InvestorTearSheetContent) => void;
  onMetricSourceChange: (source: MetricSourceMode) => void;
  onContentChange?: (content: InvestorTearSheetContent) => void;
  saving: boolean;
};

function parseContent(content: Record<string, unknown>): InvestorTearSheetContent {
  return {
    highlights: (content.highlights as string) ?? "",
    visibleMetrics: (content.visibleMetrics as string[]) ?? [],
    milestones: (content.milestones as Milestone[]) ?? [],
    challenges: (content.challenges as string) ?? "",
    notes: (content.notes as string) ?? "",
    outlook: (content.outlook as string) ?? "",
    actionItems: (content.actionItems as string) ?? "",
    metricSources: (content.metricSources as MetricSourceMode) ?? "all",
  };
}

function formatMetricValue(value: string | null, metricName: string): string {
  if (!value) return "\u2014";
  const num = Number(value);
  if (isNaN(num)) return value;
  return formatValue(num, metricName);
}

const TrendIcon = ({ trend }: { trend: "up" | "down" | "flat" }) => {
  if (trend === "up")
    return <TrendingUp className="h-3.5 w-3.5 text-[var(--success-accent)]" />;
  if (trend === "down")
    return <TrendingDown className="h-3.5 w-3.5 text-[var(--error-accent)]" />;
  return <Minus className="h-3.5 w-3.5 text-text-muted" />;
};

const METRIC_SOURCE_OPTIONS: { value: MetricSourceMode; label: string }[] = [
  { value: "all", label: "All Sources" },
  { value: "founder", label: "Founder Only" },
  { value: "investor", label: "My Uploads" },
];

export function InvestorTearSheetEditor({
  tearSheet,
  metrics,
  onSave,
  onMetricSourceChange,
  onContentChange,
  saving,
}: InvestorTearSheetEditorProps) {
  const initial = React.useRef(parseContent(tearSheet.content));

  const [highlights, setHighlights] = React.useState(initial.current.highlights);
  const [visibleMetrics, setVisibleMetrics] = React.useState<string[]>(
    initial.current.visibleMetrics.length > 0
      ? initial.current.visibleMetrics
      : metrics.map((m) => m.metricName),
  );
  const [milestones, setMilestones] = React.useState<Milestone[]>(
    initial.current.milestones,
  );
  const [challenges, setChallenges] = React.useState(initial.current.challenges);
  const [notes, setNotes] = React.useState(initial.current.notes);
  const [outlook, setOutlook] = React.useState(initial.current.outlook);
  const [actionItems, setActionItems] = React.useState(initial.current.actionItems);
  const [metricSources, setMetricSources] = React.useState<MetricSourceMode>(
    initial.current.metricSources,
  );

  // Dirty state tracking
  const isDirty = React.useMemo(() => {
    const init = initial.current;
    return (
      highlights !== init.highlights ||
      challenges !== init.challenges ||
      notes !== init.notes ||
      outlook !== init.outlook ||
      actionItems !== init.actionItems ||
      metricSources !== init.metricSources ||
      JSON.stringify(milestones) !== JSON.stringify(init.milestones) ||
      JSON.stringify(visibleMetrics) !== JSON.stringify(
        init.visibleMetrics.length > 0
          ? init.visibleMetrics
          : metrics.map((m) => m.metricName),
      )
    );
  }, [highlights, challenges, notes, outlook, actionItems, metricSources, milestones, visibleMetrics, metrics]);

  // Warn on navigate away when dirty
  React.useEffect(() => {
    if (isDirty) {
      const handler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
      };
      window.addEventListener("beforeunload", handler);
      return () => window.removeEventListener("beforeunload", handler);
    }
  }, [isDirty]);

  function handleSave() {
    const content: InvestorTearSheetContent = {
      highlights,
      visibleMetrics,
      milestones,
      challenges,
      notes,
      outlook,
      actionItems,
      metricSources,
    };
    initial.current = content;
    onSave(content);
  }

  function handleMetricSourceChange(source: MetricSourceMode) {
    setMetricSources(source);
    onMetricSourceChange(source);
  }

  // Sync all editor content to parent for live preview
  React.useEffect(() => {
    onContentChange?.({
      highlights,
      visibleMetrics,
      milestones,
      challenges,
      notes,
      outlook,
      actionItems,
      metricSources,
    });
  }, [highlights, visibleMetrics, milestones, challenges, notes, outlook, actionItems, metricSources]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleMetric(name: string) {
    setVisibleMetrics((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  }

  function addMilestone() {
    setMilestones((prev) => [...prev, { title: "", description: "" }]);
  }

  function updateMilestone(
    index: number,
    field: keyof Milestone,
    value: string,
  ) {
    setMilestones((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    );
  }

  function removeMilestone(index: number) {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <section className="rounded-xl border border-border-default card-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium">Key Metrics</h2>
            <p className="mt-1 text-xs text-text-tertiary">
              Metrics from {tearSheet.quarter} {tearSheet.year}. Toggle which to include.
            </p>
          </div>
        </div>

        {/* Metric source toggle */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {METRIC_SOURCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleMetricSourceChange(opt.value)}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                metricSources === opt.value
                  ? "border-border-default bg-bg-hover text-text-primary"
                  : "border-border-default bg-bg-input text-text-muted hover:text-text-secondary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {metrics.length === 0 ? (
          <div className="mt-4 rounded-md border border-border-default bg-bg-input px-3 py-4 text-center text-sm text-text-muted">
            No metrics available for this period and source.
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map((metric) => {
              const visible = visibleMetrics.includes(metric.metricName);
              return (
                <button
                  key={metric.metricName}
                  type="button"
                  onClick={() => toggleMetric(metric.metricName)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    visible
                      ? "border-border-default bg-bg-hover"
                      : "border-border-subtle bg-bg-input opacity-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-text-secondary">
                      {metric.metricName}
                    </span>
                    <TrendIcon trend={metric.trend} />
                  </div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">
                    {formatMetricValue(metric.currentValue, metric.metricName)}
                  </div>
                  {metric.previousValue && (
                    <div className="mt-0.5 text-xs text-text-muted">
                      prev: {formatMetricValue(metric.previousValue, metric.metricName)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Highlights */}
      <section className="rounded-xl border border-border-default card-surface p-5">
        <label className="text-sm font-medium">
          Highlights
        </label>
        <p className="mt-1 text-xs text-text-tertiary">
          Key wins and accomplishments this quarter.
        </p>
        <div className="mt-3">
          <RichTextEditor
            content={highlights}
            onChange={setHighlights}
            placeholder="What went well this quarter..."
          />
        </div>
      </section>

      {/* Milestones */}
      <section className="rounded-xl border border-border-default card-surface p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium">Milestones</h2>
            <p className="mt-1 text-xs text-text-tertiary">
              Notable achievements and progress markers.
            </p>
          </div>
          <button
            type="button"
            onClick={addMilestone}
            className="flex items-center gap-1 rounded-md border border-border-default bg-bg-input px-2 py-1 text-xs text-text-secondary hover:border-border-default"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>

        {milestones.length === 0 && (
          <div className="mt-4 rounded-md border border-border-default bg-bg-input px-3 py-4 text-center text-sm text-text-muted">
            No milestones added yet.
          </div>
        )}

        <div className="mt-4 space-y-3">
          {milestones.map((milestone, i) => (
            <div
              key={i}
              className="rounded-lg border border-border-default bg-bg-input p-3"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={milestone.title}
                    onChange={(e) => updateMilestone(i, "title", e.target.value)}
                    placeholder="Milestone title"
                    className="h-9 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm outline-none placeholder:text-text-faint focus:border-border-default"
                  />
                  <RichTextEditor
                    content={milestone.description}
                    onChange={(html) => updateMilestone(i, "description", html)}
                    placeholder="Description (optional)"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeMilestone(i)}
                  className="shrink-0 rounded-md p-1 text-text-faint hover:bg-bg-elevated hover:text-[var(--status-error-text)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Challenges */}
      <section className="rounded-xl border border-border-default card-surface p-5">
        <label className="text-sm font-medium">
          Challenges
        </label>
        <p className="mt-1 text-xs text-text-tertiary">
          Issues faced and areas of concern.
        </p>
        <div className="mt-3">
          <RichTextEditor
            content={challenges}
            onChange={setChallenges}
            placeholder="Challenges and risks..."
          />
        </div>
      </section>

      {/* Notes (replaces Team Updates) */}
      <section className="rounded-xl border border-border-default card-surface p-5">
        <label className="text-sm font-medium">
          Notes
        </label>
        <p className="mt-1 text-xs text-text-tertiary">
          Internal observations, context, and commentary.
        </p>
        <div className="mt-3">
          <RichTextEditor
            content={notes}
            onChange={setNotes}
            placeholder="Your observations and notes..."
          />
        </div>
      </section>

      {/* Outlook */}
      <section className="rounded-xl border border-border-default card-surface p-5">
        <label className="text-sm font-medium">
          Outlook
        </label>
        <p className="mt-1 text-xs text-text-tertiary">
          Expectations and projections for next quarter.
        </p>
        <div className="mt-3">
          <RichTextEditor
            content={outlook}
            onChange={setOutlook}
            placeholder="What's ahead..."
          />
        </div>
      </section>

      {/* Action Items (replaces Ask of Investors) */}
      <section className="rounded-xl border border-border-default card-surface p-5">
        <label className="text-sm font-medium">
          Action Items
        </label>
        <p className="mt-1 text-xs text-text-tertiary">
          Follow-up tasks and next steps for this investment.
        </p>
        <div className="mt-3">
          <RichTextEditor
            content={actionItems}
            onChange={setActionItems}
            placeholder="Tasks, follow-ups, decisions needed..."
          />
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center justify-end gap-3">
        {isDirty && (
          <span className="text-xs text-[var(--status-warning-text)]/70">Unsaved changes</span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-btn-primary-bg px-4 py-2 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Draft"}
        </button>
      </div>
    </div>
  );
}
