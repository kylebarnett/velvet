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
  onSave: (content: Record<string, unknown>) => void;
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
    return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
  if (trend === "down")
    return <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
  return <Minus className="h-3.5 w-3.5 text-white/40" />;
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
    onSave(content as unknown as Record<string, unknown>);
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
      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-sm font-medium">Key Metrics</h2>
        <p className="mt-1 text-xs text-white/50">
          Auto-populated from your {tearSheet.quarter} {tearSheet.year}{" "}
          submissions. Toggle which metrics to include.
        </p>

        {metrics.length === 0 ? (
          <div className="mt-4 rounded-md border border-white/10 bg-black/20 px-3 py-4 text-center text-sm text-white/50">
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
                      ? "border-white/15 bg-white/[0.08]"
                      : "border-white/5 bg-black/20 opacity-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white/70">
                      {metric.metricName}
                    </span>
                    <TrendIcon trend={metric.trend} />
                  </div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">
                    {formatMetricValue(metric.currentValue, metric.metricName)}
                  </div>
                  {metric.previousValue && (
                    <div className="mt-0.5 text-xs text-white/40">
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
      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <label className="text-sm font-medium">
          Highlights
        </label>
        <p className="mt-1 text-xs text-white/50">
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
      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium">Milestones</h2>
            <p className="mt-1 text-xs text-white/50">
              Notable achievements and progress markers.
            </p>
          </div>
          <button
            type="button"
            onClick={addMilestone}
            className="flex items-center gap-1 rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-white/70 hover:border-white/20"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>

        {milestones.length === 0 && (
          <div className="mt-4 rounded-md border border-white/10 bg-black/20 px-3 py-4 text-center text-sm text-white/50">
            No milestones added yet.
          </div>
        )}

        <div className="mt-4 space-y-3">
          {milestones.map((milestone, i) => (
            <div
              key={i}
              className="rounded-lg border border-white/10 bg-black/20 p-3"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={milestone.title}
                    onChange={(e) => updateMilestone(i, "title", e.target.value)}
                    placeholder="Milestone title"
                    className="h-9 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none placeholder:text-white/40 focus:border-white/20"
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
                  className="shrink-0 rounded-md p-1 text-white/30 hover:bg-white/5 hover:text-red-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Challenges */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <label className="text-sm font-medium">
          Challenges
        </label>
        <p className="mt-1 text-xs text-white/50">
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
      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <label className="text-sm font-medium">
          Team Updates
        </label>
        <p className="mt-1 text-xs text-white/50">
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
      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <label className="text-sm font-medium">
          Outlook
        </label>
        <p className="mt-1 text-xs text-white/50">
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
      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <label className="text-sm font-medium">
          Ask of Investors
        </label>
        <p className="mt-1 text-xs text-white/50">
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
          <span className="text-xs text-amber-200/70">Unsaved changes</span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Draft"}
        </button>
      </div>
    </div>
  );
}
