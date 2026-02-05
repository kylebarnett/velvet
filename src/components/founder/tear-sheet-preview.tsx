"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { RichTextDisplay } from "@/components/founder/rich-text-display";
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
  companyName?: string;
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

type TearSheetPreviewProps = {
  tearSheet: TearSheet;
  metrics: TearSheetMetric[];
};

function formatMetricValue(value: string | null, metricName: string): string {
  if (!value) return "\u2014";
  const num = Number(value);
  if (isNaN(num)) return value;
  return formatValue(num, metricName);
}

const TrendIcon = ({ trend }: { trend: "up" | "down" | "flat" }) => {
  if (trend === "up")
    return <TrendingUp className="h-4 w-4 text-emerald-400 print:text-emerald-600" />;
  if (trend === "down")
    return <TrendingDown className="h-4 w-4 text-red-400 print:text-red-600" />;
  return <Minus className="h-4 w-4 text-white/40 print:text-gray-400" />;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-white/60 print:text-gray-500">
        {title}
      </h3>
      <div className="text-sm leading-relaxed text-white/80 print:text-gray-700">
        {children}
      </div>
    </div>
  );
}

export function TearSheetPreview({ tearSheet, metrics }: TearSheetPreviewProps) {
  const content = tearSheet.content ?? {};
  const highlights = (content.highlights as string) ?? "";
  const visibleMetrics = (content.visibleMetrics as string[]) ?? [];
  const milestones = (content.milestones as Milestone[]) ?? [];
  const challenges = (content.challenges as string) ?? "";
  const teamUpdates = (content.teamUpdates as string) ?? "";
  const outlook = (content.outlook as string) ?? "";
  const askOfInvestors = (content.askOfInvestors as string) ?? "";

  const filteredMetrics =
    visibleMetrics.length > 0
      ? metrics.filter((m) => visibleMetrics.includes(m.metricName))
      : metrics;

  const hasContent =
    highlights ||
    filteredMetrics.length > 0 ||
    milestones.length > 0 ||
    challenges ||
    teamUpdates ||
    outlook ||
    askOfInvestors;

  return (
    <>
      {/* Print styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          nav,
          aside,
          [data-sidebar],
          [data-no-print] {
            display: none !important;
          }
          .tear-sheet-preview {
            max-width: 100% !important;
            border: none !important;
            background: white !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
        }
      `,
        }}
      />

      <div className="tear-sheet-preview mx-auto max-w-2xl rounded-xl border border-white/10 bg-white/5 p-6 print:border-none print:bg-white print:p-0 sm:p-8">
        {/* Header */}
        <div className="border-b border-white/10 pb-5 print:border-gray-200">
          {tearSheet.companyName && (
            <div className="text-xs font-medium uppercase tracking-wider text-white/40 print:text-gray-400">
              {tearSheet.companyName}
            </div>
          )}
          <h1 className="mt-1 text-xl font-semibold tracking-tight print:text-gray-900">
            {tearSheet.title}
          </h1>
          <div className="mt-1 text-sm text-white/60 print:text-gray-500">
            {tearSheet.quarter} {tearSheet.year}
          </div>
        </div>

        {!hasContent && (
          <div className="py-12 text-center text-sm text-white/40">
            No content yet. Start editing to build your tear sheet.
          </div>
        )}

        <div className="mt-6 space-y-8 print:space-y-6">
          {/* Key Metrics */}
          {filteredMetrics.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white/60 print:text-gray-500">
                Key Metrics
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMetrics.map((metric) => (
                  <div
                    key={metric.metricName}
                    className="rounded-lg border border-white/10 bg-black/20 p-3 print:border-gray-200 print:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white/60 print:text-gray-500">
                        {metric.metricName}
                      </span>
                      <TrendIcon trend={metric.trend} />
                    </div>
                    <div className="mt-1 text-lg font-semibold tabular-nums print:text-gray-900">
                      {formatMetricValue(metric.currentValue, metric.metricName)}
                    </div>
                    {metric.previousValue && (
                      <div className="mt-0.5 text-xs text-white/40 print:text-gray-400">
                        prev: {formatMetricValue(metric.previousValue, metric.metricName)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Highlights */}
          {highlights && (
            <Section title="Highlights">
              <RichTextDisplay html={highlights} />
            </Section>
          )}

          {/* Milestones */}
          {milestones.length > 0 && (
            <Section title="Milestones">
              <ul className="space-y-2">
                {milestones.map((m, i) => (
                  <li key={i}>
                    <span className="font-medium">{m.title}</span>
                    {m.description && (
                      <div className="mt-0.5 text-white/60 print:text-gray-500">
                        <RichTextDisplay html={m.description} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Challenges */}
          {challenges && (
            <Section title="Challenges">
              <RichTextDisplay html={challenges} />
            </Section>
          )}

          {/* Team Updates */}
          {teamUpdates && (
            <Section title="Team Updates">
              <RichTextDisplay html={teamUpdates} />
            </Section>
          )}

          {/* Outlook */}
          {outlook && (
            <Section title="Outlook">
              <RichTextDisplay html={outlook} />
            </Section>
          )}

          {/* Ask of Investors */}
          {askOfInvestors && (
            <Section title="Ask of Investors">
              <RichTextDisplay html={askOfInvestors} />
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
