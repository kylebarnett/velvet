"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CalendarClock,
  Send,
} from "lucide-react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { INDUSTRY_LABELS } from "@/lib/constants/industries";

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

function MetricChip({ name }: { name: string }) {
  const [showTooltip, setShowTooltip] = React.useState(false);
  const metricInfo = getMetricDefinition(name);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      tabIndex={0}
    >
      <span className="rounded-full bg-bg-hover px-2 py-0.5 text-xs text-text-secondary cursor-default">
        {name}
      </span>
      {showTooltip && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-lg border border-border-default bg-bg-secondary p-3 shadow-xl">
          <p className="text-xs font-medium text-text-primary">{name}</p>
          {metricInfo ? (
            <>
              <p className="mt-1 text-xs text-text-tertiary">{metricInfo.description}</p>
              {metricInfo.formula && (
                <div className="mt-2 rounded bg-bg-elevated px-2 py-1.5">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Formula</p>
                  <p className="mt-0.5 text-xs text-[var(--success-accent)]">{metricInfo.formula}</p>
                </div>
              )}
            </>
          ) : (
            <p className="mt-1 text-xs text-text-tertiary">Custom metric</p>
          )}
        </div>
      )}
    </div>
  );
}

type Frequency = "one-time" | "recurring" | null;

export function UnifiedRequestWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCompanyId = searchParams.get("companyId");
  const [step, setStep] = React.useState<1 | 2 | 3>(1);

  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [hiddenTemplateIds, setHiddenTemplateIds] = React.useState<string[]>([]);
  const [expandedTemplates, setExpandedTemplates] = React.useState<Set<string>>(new Set());

  const availableQuarters = React.useMemo(() => getAvailableQuarters(), []);
  const availableYears = React.useMemo(() => getAvailableYears(), []);

  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(null);
  const [selectedCompanyIds, setSelectedCompanyIds] = React.useState<Set<string>>(new Set());

  const [periodType, setPeriodType] = React.useState<PeriodType>("quarterly");
  const [selectedYear, setSelectedYear] = React.useState<number>(
    availableQuarters[0]?.year ?? new Date().getFullYear()
  );
  const [selectedQuarter, setSelectedQuarter] = React.useState<1 | 2 | 3 | 4>(
    availableQuarters[0]?.quarter ?? 1
  );
  const [dueDate, setDueDate] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });

  const [useCustomMetric, setUseCustomMetric] = React.useState(false);
  const [customMetricName, setCustomMetricName] = React.useState("");
  const [customPeriodType, setCustomPeriodType] = React.useState<PeriodType>("quarterly");

  const [frequency, setFrequency] = React.useState<Frequency>(null);

  const [scheduleName, setScheduleName] = React.useState("");
  const [cadence, setCadence] = React.useState<"quarterly" | "annual">("quarterly");
  const [dayOfMonth, setDayOfMonth] = React.useState(5);
  const [dueDaysOffset, setDueDaysOffset] = React.useState(7);
  const [reminderEnabled, setReminderEnabled] = React.useState(true);
  const [reminderDays, setReminderDays] = React.useState([3, 1]);
  const [allCompanies, setAllCompanies] = React.useState(false);
  const [includeFutureCompanies, setIncludeFutureCompanies] = React.useState(true);

  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<{
    type: "one-time" | "recurring";
    requestsCreated?: number;
    skipped?: number;
    scheduleId?: string;
  } | null>(null);

  const selectedTemplate = React.useMemo(
    () => templates.find((t) => t.id === selectedTemplateId),
    [templates, selectedTemplateId],
  );

  const [lastTemplateId, setLastTemplateId] = React.useState<string | null>(null);

  const systemTemplates = React.useMemo(
    () => templates.filter((t) => t.isSystem && !hiddenTemplateIds.includes(t.id)),
    [templates, hiddenTemplateIds],
  );
  const userTemplates = React.useMemo(
    () => templates.filter((t) => !t.isSystem),
    [templates],
  );
  const recentTemplate = React.useMemo(
    () => (lastTemplateId ? templates.find((t) => t.id === lastTemplateId) : null),
    [templates, lastTemplateId],
  );

  const sortedCompanies = React.useMemo(
    () => [...companies].sort((a, b) => a.name.localeCompare(b.name)),
    [companies]
  );

  const toggleExpanded = React.useCallback((templateId: string) => {
    setExpandedTemplates((prev) => {
      const next = new Set(prev);
      if (next.has(templateId)) next.delete(templateId);
      else next.add(templateId);
      return next;
    });
  }, []);

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
        const loadedCompanies = companiesJson?.companies ?? [];
        setCompanies(loadedCompanies);
        setHiddenTemplateIds(hiddenJson?.hiddenTemplates ?? []);

        // Load last-used template preference
        try {
          const prefRes = await fetch("/api/user/preferences?key=last_template_id");
          const prefJson = await prefRes.json().catch(() => null);
          if (prefJson?.value) setLastTemplateId(prefJson.value);
        } catch {
          // Non-critical, ignore
        }

        // Pre-select company from URL params (e.g., from company dashboard "Request Metrics" button)
        if (preselectedCompanyId) {
          const match = loadedCompanies.find((c: Company) => c.id === preselectedCompanyId);
          if (match) {
            setSelectedCompanyIds(new Set([preselectedCompanyId]));
          }
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load data.";
        toast.error(msg);
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
    // Persist last-used template (fire and forget)
    setLastTemplateId(templateId);
    fetch("/api/user/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "last_template_id", value: templateId }),
    }).catch(() => {});
  }

  function selectCustomMetric() {
    setSelectedTemplateId(null);
    setUseCustomMetric(true);
    setStep(2);
  }

  const toggleCompany = React.useCallback((id: string) => {
    setSelectedCompanyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllCompanies = React.useCallback(() => {
    setSelectedCompanyIds((prev) => {
      if (prev.size === companies.length) {
        return new Set();
      }
      return new Set(companies.map((c) => c.id));
    });
  }, [companies]);

  async function handleSubmitOneTime() {
    if (selectedCompanyIds.size === 0) return;

    setSubmitting(true);
    

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
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitRecurring() {
    if (!selectedTemplateId || !scheduleName.trim()) return;

    setSubmitting(true);
    

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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create schedule");
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
        className="w-full rounded-xl border border-border-default card-surface p-4 text-left transition-colors hover:border-border-default hover:bg-bg-hover"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {isSystem && tmpl.targetIndustry && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--tag-violet-bg)] px-2 py-0.5 text-xs text-[var(--tag-violet-text)]">
                  <Sparkles className="h-3 w-3" />
                  {INDUSTRY_LABELS[tmpl.targetIndustry] ?? tmpl.targetIndustry}
                </span>
              )}
              <span className="text-sm font-medium">{tmpl.name}</span>
            </div>
            {tmpl.description && (
              <p className="mt-1 text-xs text-text-tertiary">{tmpl.description}</p>
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
                className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs text-text-muted hover:text-text-secondary"
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
          <div className="shrink-0 text-text-muted">
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
          <div className="h-6 w-48 animate-pulse rounded bg-bg-hover" />
          <div className="h-4 w-72 animate-pulse rounded bg-bg-elevated" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border-default card-surface p-4"
            >
              <div className="h-4 w-40 animate-pulse rounded bg-bg-hover" />
              <div className="mt-2 flex gap-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-5 w-16 animate-pulse rounded-full bg-bg-hover" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-[var(--status-success-bg)] bg-[var(--status-success-bg)] p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--success-bg-muted)]">
            <Check className="h-6 w-6 text-[var(--success-accent)]" />
          </div>
          {result.type === "one-time" ? (
            <>
              <h2 className="mt-4 text-lg font-semibold">Requests Created</h2>
              <p className="mt-1 text-sm text-text-tertiary">
                Created {result.requestsCreated} request{result.requestsCreated !== 1 ? "s" : ""}.
                {(result.skipped ?? 0) > 0 && ` ${result.skipped} skipped (already exist).`}
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-4 text-lg font-semibold">Schedule Created</h2>
              <p className="mt-1 text-sm text-text-tertiary">
                Your recurring schedule is now active and will automatically create requests.
              </p>
            </>
          )}
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => router.push("/metric-requests")}
              className="inline-flex h-10 items-center justify-center rounded-md bg-btn-primary-bg px-4 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
              type="button"
            >
              View Requests
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
                setCadence("quarterly");
                setDayOfMonth(5);
                setDueDaysOffset(7);
                setReminderEnabled(true);
                setReminderDays([3, 1]);
                setAllCompanies(false);
              }}
              className="inline-flex h-10 items-center justify-center rounded-md border border-border-default bg-bg-elevated px-4 text-sm text-text-primary hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
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
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
        <span className={step === 1 ? "text-text-primary" : "text-text-tertiary"}>
          1. Template
        </span>
        <span className="text-text-faint">/</span>
        <span className={step === 2 ? "text-text-primary" : "text-text-tertiary"}>
          2. Companies
        </span>
        <span className="text-text-faint">/</span>
        <span className={step === 3 ? "text-text-primary" : "text-text-tertiary"}>
          3. Frequency
        </span>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link
              href="/metric-requests"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Select a template
              </h1>
              <p className="text-sm text-text-tertiary">
                Choose a metric template to send to your portfolio companies.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={selectCustomMetric}
            className="w-full rounded-xl border border-dashed border-border-default card-surface p-4 text-left transition-colors hover:border-border-default hover:bg-bg-hover"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Custom metric</span>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  Request a single metric without using a template
                </p>
              </div>
              <ArrowLeft className="h-4 w-4 rotate-180 text-text-muted" />
            </div>
          </button>

          {recentTemplate && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-text-secondary">Recently Used</h2>
              <div className="space-y-2">
                {renderTemplateCard(recentTemplate, recentTemplate.isSystem)}
              </div>
            </div>
          )}

          {userTemplates.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-text-secondary">My Templates</h2>
                <Link
                  href="/metric-requests/templates"
                  className="text-xs text-text-muted hover:text-text-secondary"
                >
                  Manage templates
                </Link>
              </div>
              <div className="space-y-2">
                {userTemplates.map((t) => renderTemplateCard(t, false))}
              </div>
            </div>
          )}

          {systemTemplates.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-text-secondary">Industry Templates</h2>
              <div className="grid gap-2 md:grid-cols-2">
                {systemTemplates.map((t) => renderTemplateCard(t, true))}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setStep(1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Select companies
              </h1>
              <p className="text-sm text-text-tertiary">
                {useCustomMetric
                  ? `Send "${customMetricName || "custom metric"}" request to selected companies.`
                  : `Send "${selectedTemplate?.name}" to selected companies.`}
              </p>
            </div>
          </div>

          {useCustomMetric && (
            <div className="rounded-xl border border-border-default card-surface p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm text-text-secondary" htmlFor="customMetricName">
                    Metric name<span className="text-[var(--error-accent)]"> *</span>
                  </label>
                  <input
                    id="customMetricName"
                    className="h-11 rounded-md border border-border-default bg-bg-input px-3 text-sm outline-none placeholder:text-text-faint focus:border-border-default"
                    placeholder="Monthly Recurring Revenue"
                    value={customMetricName}
                    onChange={(e) => setCustomMetricName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-text-secondary" htmlFor="customPeriodType">
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                {selectedCompanyIds.size} of {companies.length} selected
              </span>
              <button
                type="button"
                onClick={selectAllCompanies}
                className="text-xs text-text-muted hover:text-text-secondary"
              >
                {selectedCompanyIds.size === companies.length ? "Deselect all" : "Select all"}
              </button>
            </div>

            {sortedCompanies.length === 0 ? (
              <div className="py-8">
                <h3 className="text-base font-medium text-text-primary">No companies in your portfolio</h3>
                <p className="mt-1 max-w-lg text-sm text-text-secondary">
                  <Link
                    href="/contacts"
                    className="text-text-primary underline underline-offset-4 hover:text-text-secondary"
                  >
                    Add companies
                  </Link>{" "}
                  to get started.
                </p>
              </div>
            ) : (
              <div className="max-h-80 space-y-1 overflow-y-auto rounded-xl border border-border-default card-surface p-2">
                {sortedCompanies.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-bg-elevated"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCompanyIds.has(c.id)}
                      onChange={() => toggleCompany(c.id)}
                      className="mt-0.5 rounded border-border-default"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{c.name}</span>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {c.stage && (
                          <span className="rounded-full bg-bg-hover px-2 py-0.5 text-xs text-text-tertiary">
                            {c.stage.replace(/_/g, " ")}
                          </span>
                        )}
                        {c.industry && (
                          <span className="rounded-full bg-bg-hover px-2 py-0.5 text-xs text-text-tertiary">
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
              className="inline-flex h-10 items-center justify-center rounded-md bg-btn-primary-bg px-4 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
              type="button"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setStep(2); setFrequency(null); }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {frequency === null
                  ? "Choose frequency"
                  : frequency === "one-time"
                    ? "Set period and due date"
                    : "Configure schedule"}
              </h1>
              <p className="text-sm text-text-tertiary">
                {frequency === null
                  ? `Configure how ${useCustomMetric ? "this metric" : `"${selectedTemplate?.name}"`} will be requested from ${selectedCompanyIds.size} compan${selectedCompanyIds.size === 1 ? "y" : "ies"}.`
                  : frequency === "one-time"
                    ? `Specify the reporting period for ${selectedCompanyIds.size} compan${selectedCompanyIds.size === 1 ? "y" : "ies"}.`
                    : "Set up automated recurring requests."}
              </p>
            </div>
          </div>

          {frequency === null && (
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setFrequency("one-time")}
                className="flex flex-col items-start rounded-xl border border-border-default card-surface p-5 text-left transition-colors hover:border-border-default hover:bg-bg-hover"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--status-info-bg)]">
                  <Send className="h-5 w-5 text-[var(--info-accent)]" />
                </div>
                <h3 className="mt-3 font-medium">One-time request</h3>
                <p className="mt-1 text-sm text-text-tertiary">
                  Request metrics for a specific period. Good for ad-hoc data collection.
                </p>
              </button>

              {!useCustomMetric && (
                <button
                  type="button"
                  onClick={() => {
                    setFrequency("recurring");
                    if (!scheduleName.trim()) {
                      setScheduleName(`${selectedTemplate?.name ?? "Metrics"} - ${cadence}`);
                    }
                  }}
                  className="flex flex-col items-start rounded-xl border border-border-default card-surface p-5 text-left transition-colors hover:border-border-default hover:bg-bg-hover"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--tag-violet-bg)]">
                    <CalendarClock className="h-5 w-5 text-[var(--tag-violet-text)]" />
                  </div>
                  <h3 className="mt-3 font-medium">Recurring schedule</h3>
                  <p className="mt-1 text-sm text-text-tertiary">
                    Automatically request metrics on a regular cadence with email reminders.
                  </p>
                </button>
              )}
            </div>
          )}

          {frequency === "one-time" && (
            <>
              <div className="rounded-xl border border-border-default card-surface p-4 sm:p-5">
                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="grid gap-1.5 sm:gap-2">
                    <label className="text-sm text-text-secondary" htmlFor="periodType">
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
                      <label className="text-sm text-text-secondary">
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
                      <label className="text-sm text-text-secondary">
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
                    <label className="text-sm text-text-secondary" htmlFor="dueDate">
                      Due date (optional)
                    </label>
                    <input
                      id="dueDate"
                      type="date"
                      className="h-11 rounded-md border border-border-default bg-bg-input px-3 text-sm outline-none focus:border-border-default"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-6 rounded-lg border border-border-default bg-bg-input p-4">
                  <h3 className="text-sm font-medium text-text-secondary">Summary</h3>
                  <div className="mt-2 space-y-1 text-sm text-text-tertiary">
                    <p>
                      <span className="text-text-tertiary">Template:</span>{" "}
                      {useCustomMetric ? `Custom: ${customMetricName}` : selectedTemplate?.name}
                    </p>
                    <p>
                      <span className="text-text-tertiary">Companies:</span>{" "}
                      {selectedCompanyIds.size} selected
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {companies
                        .filter((c) => selectedCompanyIds.has(c.id))
                        .map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex rounded-full bg-bg-elevated px-2 py-0.5 text-xs text-text-tertiary"
                          >
                            {c.name}
                          </span>
                        ))}
                    </div>
                    <p>
                      <span className="text-text-tertiary">Period:</span>{" "}
                      {getPeriodLabel(
                        periodType === "quarterly"
                          ? { type: "quarterly", year: selectedYear, quarter: selectedQuarter }
                          : { type: "annual", year: selectedYear }
                      )}
                    </p>
                    {!useCustomMetric && selectedTemplate && (
                      <>
                        <p>
                          <span className="text-text-tertiary">Metrics:</span>{" "}
                          {selectedTemplate.metric_template_items.length} per company
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {selectedTemplate.metric_template_items.map((item, i) => (
                            <span
                              key={i}
                              className="inline-flex rounded-full bg-bg-elevated px-2 py-0.5 text-xs text-text-tertiary"
                            >
                              {item.metric_name}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                    <p>
                      <span className="text-text-tertiary">Total requests:</span>{" "}
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
                  className="inline-flex h-10 items-center justify-center rounded-md border border-border-default bg-bg-elevated px-4 text-sm text-text-primary hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
                  type="button"
                >
                  Back
                </button>
                <Button
                  onClick={handleSubmitOneTime}
                  loading={submitting}
                  type="button"
                >
                  Create Requests
                </Button>
              </div>
            </>
          )}

          {frequency === "recurring" && (
            <>
              <div className="rounded-xl border border-border-default card-surface p-4 sm:p-6 space-y-6">
                <div>
                  <label className="text-sm font-medium text-text-secondary">
                    Schedule Name<span className="text-[var(--error-accent)]"> *</span>
                  </label>
                  <input
                    type="text"
                    value={scheduleName}
                    onChange={(e) => setScheduleName(e.target.value)}
                    placeholder={`${selectedTemplate?.name ?? "Metrics"} - ${cadence}`}
                    className="mt-2 h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm outline-none focus:border-border-default"
                  />
                  <p className="mt-1 text-xs text-text-tertiary">
                    A descriptive name to identify this schedule
                  </p>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-border-default card-surface p-4">
                  <input
                    type="checkbox"
                    id="all-companies-recurring"
                    checked={allCompanies}
                    onChange={(e) => setAllCompanies(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-border-default bg-bg-input"
                  />
                  <div>
                    <label
                      htmlFor="all-companies-recurring"
                      className="font-medium cursor-pointer"
                    >
                      Include all portfolio companies
                    </label>
                    <p className="mt-0.5 text-xs text-text-tertiary">
                      Override company selection and include all companies (current: {selectedCompanyIds.size} selected)
                    </p>
                  </div>
                </div>

                {allCompanies && (
                  <div className="flex items-start gap-3 rounded-xl border border-border-default card-surface p-4">
                    <input
                      type="checkbox"
                      id="include-future"
                      checked={includeFutureCompanies}
                      onChange={(e) => setIncludeFutureCompanies(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-border-default bg-bg-input"
                    />
                    <div>
                      <label
                        htmlFor="include-future"
                        className="font-medium cursor-pointer"
                      >
                        Include future companies
                      </label>
                      <p className="mt-0.5 text-xs text-text-tertiary">
                        Companies added to your portfolio later will automatically be included
                      </p>
                    </div>
                  </div>
                )}

                <CadenceSelector
                  value={cadence}
                  onChange={setCadence}
                  dayOfMonth={dayOfMonth}
                  onDayOfMonthChange={setDayOfMonth}
                />

                <div>
                  <label className="text-sm font-medium text-text-secondary">
                    Days until due date
                  </label>
                  <p className="mt-1 text-xs text-text-tertiary">
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

                <div className="flex items-start gap-3 rounded-xl border border-border-default card-surface p-4">
                  <input
                    type="checkbox"
                    id="reminder-enabled"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-border-default bg-bg-input"
                  />
                  <div>
                    <label
                      htmlFor="reminder-enabled"
                      className="font-medium cursor-pointer"
                    >
                      Send reminder emails
                    </label>
                    <p className="mt-0.5 text-xs text-text-tertiary">
                      Automatically remind founders before the due date
                    </p>
                  </div>
                </div>

                {reminderEnabled && (
                  <div>
                    <label className="text-sm font-medium text-text-secondary">
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
                              ? "bg-bg-hover text-text-primary"
                              : "bg-bg-elevated text-text-muted hover:bg-bg-hover"
                          }`}
                        >
                          {day} day{day !== 1 ? "s" : ""} before
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-text-tertiary">
                      Reminders are automatically cancelled when metrics are submitted
                    </p>
                  </div>
                )}

                <div className="rounded-xl border border-border-default bg-bg-input p-4">
                  <h3 className="text-sm font-medium text-text-secondary">Summary</h3>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Template</span>
                      <span className="text-text-primary">{selectedTemplate?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Companies</span>
                      <span className="text-text-primary">
                        {allCompanies
                          ? `All (${companies.length})`
                          : `${selectedCompanyIds.size} selected`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Frequency</span>
                      <span className="text-text-primary capitalize">
                        {cadence} on day {dayOfMonth}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Due in</span>
                      <span className="text-text-primary">{dueDaysOffset} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Reminders</span>
                      <span className="text-text-primary">
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
                  className="inline-flex h-10 items-center justify-center rounded-md border border-border-default bg-bg-elevated px-4 text-sm text-text-primary hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
                  type="button"
                >
                  Back
                </button>
                <Button
                  onClick={handleSubmitRecurring}
                  disabled={!scheduleName.trim()}
                  loading={submitting}
                  type="button"
                >
                  <Check className="h-4 w-4" />
                  Create Schedule
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
