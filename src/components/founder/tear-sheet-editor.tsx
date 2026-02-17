"use client";

import * as React from "react";
import { Plus, X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { RichTextEditor } from "@/components/founder/rich-text-editor";
import { Button } from "@/components/ui/button";
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

type TearSheetContent = {
  highlights: string;
  visibleMetrics: string[];
  milestones: Milestone[];
  challenges: string;
  teamUpdates: string;
  outlook: string;
  askOfInvestors: string;
};

type TearSheetEditorProps = {
  tearSheet: TearSheet;
  metrics: TearSheetMetric[];
  onSave: (content: TearSheetContent) => void;
  saving: boolean;
};

function parseContent(content: Record<string, unknown>): TearSheetContent {
  return {
    highlights: (content.highlights as string) ?? "",
    visibleMetrics: (content.visibleMetrics as string[]) ?? [],
    milestones: (content.milestones as Milestone[]) ?? [],
    challenges: (content.challenges as string) ?? "",
    teamUpdates: (content.teamUpdates as string) ?? "",
    outlook: (content.outlook as string) ?? "",
    askOfInvestors: (content.askOfInvestors as string) ?? "",
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

export function TearSheetEditor({
  tearSheet,
  metrics,
  onSave,
  saving,
}: TearSheetEditorProps) {
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
  const [teamUpdates, setTeamUpdates] = React.useState(initial.current.teamUpdates);
  const [outlook, setOutlook] = React.useState(initial.current.outlook);
  const [askOfInvestors, setAskOfInvestors] = React.useState(
    initial.current.askOfInvestors,
  );

  // Dirty state tracking
  const isDirty = React.useMemo(() => {
    const init = initial.current;
    return (
      highlights !== init.highlights ||
      challenges !== init.challenges ||
      teamUpdates !== init.teamUpdates ||
      outlook !== init.outlook ||
      askOfInvestors !== init.askOfInvestors ||
      JSON.stringify(milestones) !== JSON.stringify(init.milestones) ||
      JSON.stringify(visibleMetrics) !== JSON.stringify(
        init.visibleMetrics.length > 0
          ? init.visibleMetrics
          : metrics.map((m) => m.metricName),
      )
    );
  }, [highlights, challenges, teamUpdates, outlook, askOfInvestors, milestones, visibleMetrics, metrics]);

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
    const content: TearSheetContent = {
      highlights,
      visibleMetrics,
      milestones,
      challenges,
      teamUpdates,
      outlook,
      askOfInvestors,
    };
    // Update initial ref after save
    initial.current = content;
    onSave(content);
  }

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
        <h2 className="text-sm font-medium">Key Metrics</h2>
        <p className="mt-1 text-xs text-text-tertiary">
          Auto-populated from your {tearSheet.quarter} {tearSheet.year}{" "}
          submissions. Toggle which metrics to include.
        </p>

        {metrics.length === 0 ? (
          <div className="mt-4 rounded-md border border-border-default bg-bg-input px-3 py-4 text-center text-sm text-text-muted">
            No metrics submitted for this period yet.
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
          <Button
            variant="secondary"
            size="sm"
            onClick={addMilestone}
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
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
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeMilestone(i)}
                  className="shrink-0 text-text-faint hover:text-[var(--status-error-text)]"
                >
                  <X className="h-4 w-4" />
                </Button>
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
          Issues faced and how you&apos;re addressing them.
        </p>
        <div className="mt-3">
          <RichTextEditor
            content={challenges}
            onChange={setChallenges}
            placeholder="Challenges this quarter..."
          />
        </div>
      </section>

      {/* Team Updates */}
      <section className="rounded-xl border border-border-default card-surface p-5">
        <label className="text-sm font-medium">
          Team Updates
        </label>
        <p className="mt-1 text-xs text-text-tertiary">
          Hires, departures, and organizational changes.
        </p>
        <div className="mt-3">
          <RichTextEditor
            content={teamUpdates}
            onChange={setTeamUpdates}
            placeholder="Team changes and updates..."
          />
        </div>
      </section>

      {/* Outlook */}
      <section className="rounded-xl border border-border-default card-surface p-5">
        <label className="text-sm font-medium">
          Outlook
        </label>
        <p className="mt-1 text-xs text-text-tertiary">
          Goals and expectations for next quarter.
        </p>
        <div className="mt-3">
          <RichTextEditor
            content={outlook}
            onChange={setOutlook}
            placeholder="What's ahead..."
          />
        </div>
      </section>

      {/* Ask of Investors */}
      <section className="rounded-xl border border-border-default card-surface p-5">
        <label className="text-sm font-medium">
          Ask of Investors
        </label>
        <p className="mt-1 text-xs text-text-tertiary">
          How can your investors help right now?
        </p>
        <div className="mt-3">
          <RichTextEditor
            content={askOfInvestors}
            onChange={setAskOfInvestors}
            placeholder="Introductions, advice, resources..."
          />
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center justify-end gap-3">
        {isDirty && (
          <span className="text-xs text-[var(--status-warning-text)]/70">Unsaved changes</span>
        )}
        <Button
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Draft"}
        </Button>
      </div>
    </div>
  );
}
