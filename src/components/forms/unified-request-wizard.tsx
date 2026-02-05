"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  CalendarClock,
  Send,
} from "lucide-react";

import { getMetricDefinition } from "@/lib/metric-definitions";
import {
  getAvailableQuarters,
  getAvailableYears,
  getPeriodLabel,
  type PeriodType,
} from "@/lib/utils/period";
import { CadenceSelector } from "@/components/investor/cadence-selector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TemplateItem = {
  id: string;
  metric_name: string;
  period_type: string;
  data_type: string;
  sort_order: number;
};

type Template = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  targetIndustry: string | null;
  metric_template_items: TemplateItem[];
};

type Company = {
  id: string;
  name: string;
  stage: string | null;
  industry: string | null;
};

const INDUSTRY_LABELS: Record<string, string> = {
  saas: "SaaS",
  fintech: "Fintech",
  healthcare: "Healthcare",
  ecommerce: "E-commerce",
  edtech: "EdTech",
  ai_ml: "AI/ML",
  other: "General",
};

function MetricChip({ name }: { name: string }) {
  const [showTooltip, setShowTooltip] = React.useState(false);
  const metricInfo = getMetricDefinition(name);

  return (
    <div className="relative inline-block">
      <span
        className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70 cursor-default"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {name}
      </span>
      {showTooltip && metricInfo && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-lg border border-white/10 bg-zinc-900 p-3 shadow-xl">
          <p className="text-xs font-medium text-white">{name}</p>
          <p className="mt-1 text-xs text-white/60">{metricInfo.description}</p>
          {metricInfo.formula && (
            <div className="mt-2 rounded bg-white/5 px-2 py-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/60">Formula</p>
              <p className="mt-0.5 text-xs text-emerald-400">{metricInfo.formula}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type Frequency = "one-time" | "recurring" | null;

export function UnifiedRequestWizard() {
  const router = useRouter();
  const [step, setStep] = React.useState<1 | 2 | 3>(1);

  // Data
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [hiddenTemplateIds, setHiddenTemplateIds] = React.useState<string[]>([]);
  const [expandedTemplates, setExpandedTemplates] = React.useState<Set<string>>(new Set());

  // Period options
  const availableQuarters = React.useMemo(() => getAvailableQuarters(), []);
  const availableYears = React.useMemo(() => getAvailableYears(), []);

  // Selections
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(null);
  const [selectedCompanyIds, setSelectedCompanyIds] = React.useState<Set<string>>(new Set());

  // One-time fields
  const [periodType, setPeriodType] = React.useState<PeriodType>("quarterly");
  const [selectedYear, setSelectedYear] = React.useState<number>(
    availableQuarters[0]?.year ?? new Date().getFullYear()
  );
  const [selectedQuarter, setSelectedQuarter] = React.useState<1 | 2 | 3 | 4>(
    availableQuarters[0]?.quarter ?? 1
  );
  const [dueDate, setDueDate] = React.useState("");

  // Custom metric
  const [useCustomMetric, setUseCustomMetric] = React.useState(false);
  const [customMetricName, setCustomMetricName] = React.useState("");
  const [customPeriodType, setCustomPeriodType] = React.useState<PeriodType>("quarterly");

  // Frequency choice
  const [frequency, setFrequency] = React.useState<Frequency>(null);

  // Recurring schedule fields
  const [scheduleName, setScheduleName] = React.useState("");
  const [cadence, setCadence] = React.useState<"monthly" | "quarterly" | "annual">("monthly");
  const [dayOfMonth, setDayOfMonth] = React.useState(5);
  const [dueDaysOffset, setDueDaysOffset] = React.useState(7);
  const [reminderEnabled, setReminderEnabled] = React.useState(true);
  const [reminderDays, setReminderDays] = React.useState([3, 1]);
  const [allCompanies, setAllCompanies] = React.useState(false);
  const [includeFutureCompanies, setIncludeFutureCompanies] = React.useState(true);

  // UI state
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    type: "one-time" | "recurring";
    requestsCreated?: number;
    skipped?: number;
    scheduleId?: string;
  } | null>(null);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Filter templates
  const systemTemplates = templates.filter((t) => t.isSystem && !hiddenTemplateIds.includes(t.id));
  const userTemplates = templates.filter((t) => !t.isSystem);

  const sortedCompanies = React.useMemo(
    () => [...companies].sort((a, b) => a.name.localeCompare(b.name)),
    [companies]
  );

  function toggleExpanded(templateId: string) {
    setExpandedTemplates((prev) => {
      const next = new Set(prev);
      if (next.has(templateId)) next.delete(templateId);
      else next.add(templateId);
      return next;
    });
  }

  React.useEffect(() => {
    async function loadData() {
      try {
        const [templatesRes, companiesRes, hiddenRes] = await Promise.all([
          fetch("/api/investors/metric-templates"),
          fetch("/api/investors/companies"),
          fetch("/api/user/hidden-templates"),
        ]);

        const templatesJson = await templatesRes.json().catch(() => null);
        const companiesJson = await companiesRes.json().catch(() => null);
        const hiddenJson = await hiddenRes.json().catch(() => null);

        setTemplates(templatesJson?.templates ?? []);
        setCompanies(companiesJson?.companies ?? []);
        setHiddenTemplateIds(hiddenJson?.hiddenTemplates ?? []);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load data.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  function selectTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    setUseCustomMetric(false);
    setStep(2);
  }

  function selectCustomMetric() {
    setSelectedTemplateId(null);
    setUseCustomMetric(true);
    setStep(2);
  }

  function toggleCompany(id: string) {
    const next = new Set(selectedCompanyIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedCompanyIds(next);
  }

  function selectAllCompanies() {
    if (selectedCompanyIds.size === companies.length) {
      setSelectedCompanyIds(new Set());
    } else {
      setSelectedCompanyIds(new Set(companies.map((c) => c.id)));
    }
  }

  async function handleSubmitOneTime() {
    if (selectedCompanyIds.size === 0) return;

    setSubmitting(true);
    setError(null);

    const effectivePeriodType = useCustomMetric ? customPeriodType : periodType;
    const effectiveYear =
      effectivePeriodType === "annual" && availableYears[0]
        ? availableYears[0].year
        : selectedYear;

    try {
      if (useCustomMetric) {
        const promises = Array.from(selectedCompanyIds).map((companyId) =>
          fetch("/api/metrics/request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              companyId,
              metricName: customMetricName,
              periodType: customPeriodType,
              year: customPeriodType === "annual" ? effectiveYear : selectedYear,
              quarter: customPeriodType === "quarterly" ? selectedQuarter : undefined,
              dueDate: dueDate || undefined,
            }),
          })
        );

        const results = await Promise.all(promises);
        const failedCount = results.filter((r) => !r.ok).length;

        if (failedCount > 0) {
          throw new Error(`Failed to create ${failedCount} request(s).`);
        }

        setResult({ type: "one-time", requestsCreated: selectedCompanyIds.size, skipped: 0 });
      } else {
        const res = await fetch("/api/investors/metric-templates/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: selectedTemplateId,
            companyIds: Array.from(selectedCompanyIds),
            periodType,
            year: periodType === "annual" ? effectiveYear : selectedYear,
            quarter: periodType === "quarterly" ? selectedQuarter : undefined,
            dueDate: dueDate || undefined,
          }),
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error ?? "Failed to create requests.");

        setResult({ type: "one-time", requestsCreated: json.requestsCreated, skipped: json.skipped });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitRecurring() {
    if (!selectedTemplateId || !scheduleName.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const companyIds = allCompanies ? null : Array.from(selectedCompanyIds);
      const res = await fetch("/api/investors/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: scheduleName.trim(),
          templateId: selectedTemplateId,
          cadence,
          dayOfMonth,
          companyIds,
          includeFutureCompanies: allCompanies ? includeFutureCompanies : false,
          dueDaysOffset,
          reminderEnabled,
          reminderDaysBeforeDue: reminderEnabled ? reminderDays : [],
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create schedule");

      setResult({ type: "recurring", scheduleId: json.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create schedule");
    } finally {
      setSubmitting(false);
    }
  }

  function renderTemplateCard(tmpl: Template, isSystem: boolean) {
    const isExpanded = expandedTemplates.has(tmpl.id);
    const hasMoreMetrics = tmpl.metric_template_items.length > 6;
    const displayedMetrics = isExpanded
      ? tmpl.metric_template_items
      : tmpl.metric_template_items.slice(0, 6);

    return (
      <button
        key={tmpl.id}
        type="button"
        onClick={() => selectTemplate(tmpl.id)}
        className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:border-white/20 hover:bg-white/10"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {isSystem && tmpl.targetIndustry && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">
                  <Sparkles className="h-3 w-3" />
                  {INDUSTRY_LABELS[tmpl.targetIndustry] ?? tmpl.targetIndustry}
                </span>
              )}
              <span className="text-sm font-medium">{tmpl.name}</span>
            </div>
            {tmpl.description && (
              <p className="mt-1 text-xs text-white/60">{tmpl.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {displayedMetrics.map((item) => (
                <MetricChip key={item.id} name={item.metric_name} />
              ))}
            </div>
            {hasMoreMetrics && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded(tmpl.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleExpanded(tmpl.id);
                  }
                }}
                className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs text-white/50 hover:text-white/70"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Show all {tmpl.metric_template_items.length} metrics
                  </>
                )}
              </span>
            )}
          </div>
          <div className="shrink-0 text-white/40">
            <ArrowLeft className="h-4 w-4 rotate-180" />
          </div>
        </div>
      </button>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="h-6 w-48 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-72 animate-pulse rounded bg-white/5" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
              <div className="mt-2 flex gap-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-5 w-16 animate-pulse rounded-full bg-white/10" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Success state
  if (result) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
            <Check className="h-6 w-6 text-emerald-400" />
          </div>
          {result.type === "one-time" ? (
            <>
              <h2 className="mt-4 text-lg font-semibold">Requests Created</h2>
              <p className="mt-1 text-sm text-white/60">
                Created {result.requestsCreated} request{result.requestsCreated !== 1 ? "s" : ""}.
                {(result.skipped ?? 0) > 0 && ` ${result.skipped} skipped (already exist).`}
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-4 text-lg font-semibold">Schedule Created</h2>
              <p className="mt-1 text-sm text-white/60">
                Your recurring schedule is now active and will automatically create requests.
              </p>
            </>
          )}
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => router.push(result.type === "recurring" ? "/requests?tab=schedules" : "/requests")}
              className="inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50"
              type="button"
            >
              {result.type === "recurring" ? "View Schedules" : "View Requests"}
            </button>
            <button
              onClick={() => {
                setResult(null);
                setStep(1);
                setSelectedTemplateId(null);
                setSelectedCompanyIds(new Set());
                setPeriodType("quarterly");
                setSelectedYear(availableQuarters[0]?.year ?? new Date().getFullYear());
                setSelectedQuarter(availableQuarters[0]?.quarter ?? 1);
                setDueDate("");
                setUseCustomMetric(false);
                setCustomMetricName("");
                setCustomPeriodType("quarterly");
                setFrequency(null);
                setScheduleName("");
                setCadence("monthly");
                setDayOfMonth(5);
                setDueDaysOffset(7);
                setReminderEnabled(true);
                setReminderDays([3, 1]);
                setAllCompanies(false);
              }}
              className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 bg-white/5 px-4 text-sm text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
              type="button"
            >
              Create More
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Progress indicator */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
        <span className={step === 1 ? "text-white" : "text-white/60"}>
          1. Template
        </span>
        <span className="text-white/20">/</span>
        <span className={step === 2 ? "text-white" : "text-white/60"}>
          2. Companies
        </span>
        <span className="text-white/20">/</span>
        <span className={step === 3 ? "text-white" : "text-white/60"}>
          3. Frequency
        </span>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Step 1: Select Template */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link
              href="/requests"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight">
                Select a template
              </h1>
              <p className="text-sm text-white/60">
                Choose a metric template to send to your portfolio companies.
              </p>
            </div>
          </div>

          {/* Custom metric option */}
          <button
            type="button"
            onClick={selectCustomMetric}
            className="w-full rounded-xl border border-dashed border-white/20 bg-white/5 p-4 text-left transition-colors hover:border-white/30 hover:bg-white/10"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Custom metric</span>
                <p className="mt-0.5 text-xs text-white/60">
                  Request a single metric without using a template
                </p>
              </div>
              <ArrowLeft className="h-4 w-4 rotate-180 text-white/40" />
            </div>
          </button>

          {/* User templates */}
          {userTemplates.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-white/80">My Templates</h2>
                <Link
                  href="/requests?tab=templates"
                  className="text-xs text-white/50 hover:text-white/70"
                >
                  Manage templates
                </Link>
              </div>
              <div className="space-y-2">
                {userTemplates.map((t) => renderTemplateCard(t, false))}
              </div>
            </div>
          )}

          {/* System templates */}
          {systemTemplates.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-white/80">Industry Templates</h2>
              <div className="grid gap-2 md:grid-cols-2">
                {systemTemplates.map((t) => renderTemplateCard(t, true))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select Companies */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setStep(1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight">
                Select companies
              </h1>
              <p className="text-sm text-white/60">
                {useCustomMetric
                  ? `Send "${customMetricName || "custom metric"}" request to selected companies.`
                  : `Send "${selectedTemplate?.name}" to selected companies.`}
              </p>
            </div>
          </div>

          {/* Custom metric form */}
          {useCustomMetric && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm text-white/70" htmlFor="customMetricName">
                    Metric name
                  </label>
                  <input
                    id="customMetricName"
                    className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none placeholder:text-white/30 focus:border-white/20"
                    placeholder="Monthly Recurring Revenue"
                    value={customMetricName}
                    onChange={(e) => setCustomMetricName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-white/70" htmlFor="customPeriodType">
                    Period type
                  </label>
                  <Select value={customPeriodType} onValueChange={(v) => setCustomPeriodType(v as PeriodType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Company selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">
                {selectedCompanyIds.size} of {companies.length} selected
              </span>
              <button
                type="button"
                onClick={selectAllCompanies}
                className="text-xs text-white/50 hover:text-white/70"
              >
                {selectedCompanyIds.size === companies.length ? "Deselect all" : "Select all"}
              </button>
            </div>

            {sortedCompanies.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
                <p className="text-sm text-white/60">No companies in your portfolio.</p>
                <Link
                  href="/portfolio"
                  className="mt-2 inline-block text-sm text-white underline underline-offset-4 hover:text-white/80"
                >
                  Add companies
                </Link>
              </div>
            ) : (
              <div className="max-h-80 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-2">
                {sortedCompanies.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCompanyIds.has(c.id)}
                      onChange={() => toggleCompany(c.id)}
                      className="mt-0.5 rounded border-white/20"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{c.name}</span>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {c.stage && (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">
                            {c.stage.replace(/_/g, " ")}
                          </span>
                        )}
                        {c.industry && (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">
                            {INDUSTRY_LABELS[c.industry] ?? c.industry}
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={() => setStep(3)}
              disabled={selectedCompanyIds.size === 0 || (useCustomMetric && !customMetricName.trim())}
              className="inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/50"
              type="button"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Choose Frequency */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setStep(2); setFrequency(null); }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight">
                {frequency === null
                  ? "Choose frequency"
                  : frequency === "one-time"
                    ? "Set period and due date"
                    : "Configure schedule"}
              </h1>
              <p className="text-sm text-white/60">
                {frequency === null
                  ? `Configure how ${useCustomMetric ? "this metric" : `"${selectedTemplate?.name}"`} will be requested from ${selectedCompanyIds.size} compan${selectedCompanyIds.size === 1 ? "y" : "ies"}.`
                  : frequency === "one-time"
                    ? `Specify the reporting period for ${selectedCompanyIds.size} compan${selectedCompanyIds.size === 1 ? "y" : "ies"}.`
                    : "Set up automated recurring requests."}
              </p>
            </div>
          </div>

          {/* Frequency selection cards */}
          {frequency === null && (
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setFrequency("one-time")}
                className="flex flex-col items-start rounded-xl border border-white/10 bg-white/5 p-5 text-left transition-colors hover:border-white/20 hover:bg-white/10"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                  <Send className="h-5 w-5 text-blue-300" />
                </div>
                <h3 className="mt-3 font-medium">One-time request</h3>
                <p className="mt-1 text-sm text-white/60">
                  Request metrics for a specific period. Good for ad-hoc data collection.
                </p>
              </button>

              {!useCustomMetric && (
                <button
                  type="button"
                  onClick={() => setFrequency("recurring")}
                  className="flex flex-col items-start rounded-xl border border-white/10 bg-white/5 p-5 text-left transition-colors hover:border-white/20 hover:bg-white/10"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/20">
                    <CalendarClock className="h-5 w-5 text-violet-300" />
                  </div>
                  <h3 className="mt-3 font-medium">Recurring schedule</h3>
                  <p className="mt-1 text-sm text-white/60">
                    Automatically request metrics on a regular cadence with email reminders.
                  </p>
                </button>
              )}
            </div>
          )}

          {/* One-time: period and due date */}
          {frequency === "one-time" && (
            <>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5">
                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Period type selector */}
                  <div className="grid gap-1.5 sm:gap-2">
                    <label className="text-sm text-white/70" htmlFor="periodType">
                      Period type
                    </label>
                    <Select
                      value={periodType}
                      onValueChange={(v) => {
                        const newType = v as PeriodType;
                        setPeriodType(newType);
                        if (newType === "annual" && availableYears[0]) {
                          setSelectedYear(availableYears[0].year);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {periodType === "quarterly" ? (
                    <div className="grid gap-1.5 sm:gap-2">
                      <label className="text-sm text-white/70">
                        Quarter
                      </label>
                      <Select
                        value={`${selectedYear}-${selectedQuarter}`}
                        onValueChange={(v) => {
                          const [year, quarter] = v.split("-").map(Number);
                          setSelectedYear(year);
                          setSelectedQuarter(quarter as 1 | 2 | 3 | 4);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableQuarters.map((q) => (
                            <SelectItem key={`${q.year}-${q.quarter}`} value={`${q.year}-${q.quarter}`}>
                              {q.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="grid gap-1.5 sm:gap-2">
                      <label className="text-sm text-white/70">
                        Year
                      </label>
                      <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableYears.map((y) => (
                            <SelectItem key={y.year} value={String(y.year)}>
                              {y.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid gap-1.5 sm:gap-2">
                    <label className="text-sm text-white/70" htmlFor="dueDate">
                      Due date (optional)
                    </label>
                    <input
                      id="dueDate"
                      type="date"
                      className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-white/20"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="mt-6 rounded-lg border border-white/10 bg-black/20 p-4">
                  <h3 className="text-sm font-medium text-white/80">Summary</h3>
                  <div className="mt-2 space-y-1 text-sm text-white/60">
                    <p>
                      <span className="text-white/60">Template:</span>{" "}
                      {useCustomMetric ? `Custom: ${customMetricName}` : selectedTemplate?.name}
                    </p>
                    <p>
                      <span className="text-white/60">Companies:</span>{" "}
                      {selectedCompanyIds.size} selected
                    </p>
                    <p>
                      <span className="text-white/60">Period:</span>{" "}
                      {getPeriodLabel(
                        periodType === "quarterly"
                          ? { type: "quarterly", year: selectedYear, quarter: selectedQuarter }
                          : { type: "annual", year: selectedYear }
                      )}
                    </p>
                    {!useCustomMetric && selectedTemplate && (
                      <p>
                        <span className="text-white/60">Metrics:</span>{" "}
                        {selectedTemplate.metric_template_items.length} per company
                      </p>
                    )}
                    <p>
                      <span className="text-white/60">Total requests:</span>{" "}
                      {useCustomMetric
                        ? selectedCompanyIds.size
                        : selectedCompanyIds.size * (selectedTemplate?.metric_template_items.length ?? 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setFrequency(null)}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 bg-white/5 px-4 text-sm text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                  type="button"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmitOneTime}
                  disabled={submitting}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/50"
                  type="button"
                >
                  {submitting ? "Creating..." : "Create Requests"}
                </button>
              </div>
            </>
          )}

          {/* Recurring: schedule configuration */}
          {frequency === "recurring" && (
            <>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-6 space-y-6">
                {/* Schedule name */}
                <div>
                  <label className="text-sm font-medium text-white/70">
                    Schedule Name
                  </label>
                  <input
                    type="text"
                    value={scheduleName}
                    onChange={(e) => setScheduleName(e.target.value)}
                    placeholder={`${selectedTemplate?.name ?? "Metrics"} - ${cadence}`}
                    className="mt-2 h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-white/20"
                  />
                  <p className="mt-1 text-xs text-white/60">
                    A descriptive name to identify this schedule
                  </p>
                </div>

                {/* All companies toggle */}
                <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                  <input
                    type="checkbox"
                    id="all-companies-recurring"
                    checked={allCompanies}
                    onChange={(e) => setAllCompanies(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30"
                  />
                  <div>
                    <label
                      htmlFor="all-companies-recurring"
                      className="font-medium cursor-pointer"
                    >
                      Include all portfolio companies
                    </label>
                    <p className="mt-0.5 text-xs text-white/60">
                      Override company selection and include all companies (current: {selectedCompanyIds.size} selected)
                    </p>
                  </div>
                </div>

                {allCompanies && (
                  <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                    <input
                      type="checkbox"
                      id="include-future"
                      checked={includeFutureCompanies}
                      onChange={(e) => setIncludeFutureCompanies(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30"
                    />
                    <div>
                      <label
                        htmlFor="include-future"
                        className="font-medium cursor-pointer"
                      >
                        Include future companies
                      </label>
                      <p className="mt-0.5 text-xs text-white/60">
                        Companies added to your portfolio later will automatically be included
                      </p>
                    </div>
                  </div>
                )}

                {/* Cadence */}
                <CadenceSelector
                  value={cadence}
                  onChange={setCadence}
                  dayOfMonth={dayOfMonth}
                  onDayOfMonthChange={setDayOfMonth}
                />

                {/* Due date offset */}
                <div>
                  <label className="text-sm font-medium text-white/70">
                    Days until due date
                  </label>
                  <p className="mt-1 text-xs text-white/60">
                    How many days founders have to submit after the request is created
                  </p>
                  <Select value={String(dueDaysOffset)} onValueChange={(v) => setDueDaysOffset(Number(v))}>
                    <SelectTrigger className="mt-3 max-w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="5">5 days</SelectItem>
                      <SelectItem value="7">7 days (recommended)</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="21">21 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Reminders */}
                <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                  <input
                    type="checkbox"
                    id="reminder-enabled"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30"
                  />
                  <div>
                    <label
                      htmlFor="reminder-enabled"
                      className="font-medium cursor-pointer"
                    >
                      Send reminder emails
                    </label>
                    <p className="mt-0.5 text-xs text-white/60">
                      Automatically remind founders before the due date
                    </p>
                  </div>
                </div>

                {reminderEnabled && (
                  <div>
                    <label className="text-sm font-medium text-white/70">
                      Remind founders
                    </label>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[7, 5, 3, 2, 1].map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setReminderDays((prev) =>
                              prev.includes(day)
                                ? prev.filter((d) => d !== day)
                                : [...prev, day].sort((a, b) => b - a)
                            );
                          }}
                          className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                            reminderDays.includes(day)
                              ? "bg-white/20 text-white"
                              : "bg-white/5 text-white/50 hover:bg-white/10"
                          }`}
                        >
                          {day} day{day !== 1 ? "s" : ""} before
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-white/60">
                      Reminders are automatically cancelled when metrics are submitted
                    </p>
                  </div>
                )}

                {/* Summary */}
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <h3 className="text-sm font-medium text-white/70">Summary</h3>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/60">Template</span>
                      <span className="text-white">{selectedTemplate?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Companies</span>
                      <span className="text-white">
                        {allCompanies
                          ? `All (${companies.length})`
                          : `${selectedCompanyIds.size} selected`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Frequency</span>
                      <span className="text-white capitalize">
                        {cadence} on day {dayOfMonth}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Due in</span>
                      <span className="text-white">{dueDaysOffset} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Reminders</span>
                      <span className="text-white">
                        {reminderEnabled
                          ? reminderDays.map((d) => `${d}d`).join(", ")
                          : "Disabled"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setFrequency(null)}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 bg-white/5 px-4 text-sm text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                  type="button"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmitRecurring}
                  disabled={submitting || !scheduleName.trim()}
                  className="flex h-10 items-center gap-2 rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white/50"
                  type="button"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Create Schedule
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
