"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

import { getMetricDefinition } from "@/lib/metric-definitions";
import {
  getAvailableQuarters,
  getAvailableYears,
  getPeriodLabel,
  type PeriodType,
} from "@/lib/utils/period";

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

// Metric chip with tooltip
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
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/40">Formula</p>
              <p className="mt-0.5 text-xs text-emerald-400">{metricInfo.formula}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function NewRequestWizard() {
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
  const [periodType, setPeriodType] = React.useState<PeriodType>("quarterly");
  const [selectedYear, setSelectedYear] = React.useState<number>(
    availableQuarters[0]?.year ?? new Date().getFullYear()
  );
  const [selectedQuarter, setSelectedQuarter] = React.useState<1 | 2 | 3 | 4>(
    availableQuarters[0]?.quarter ?? 1
  );
  const [dueDate, setDueDate] = React.useState("");

  // Custom metric (when not using template)
  const [useCustomMetric, setUseCustomMetric] = React.useState(false);
  const [customMetricName, setCustomMetricName] = React.useState("");
  const [customPeriodType, setCustomPeriodType] = React.useState<PeriodType>("quarterly");

  // UI state
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ requestsCreated: number; skipped: number } | null>(null);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Filter templates
  const systemTemplates = templates.filter((t) => t.isSystem && !hiddenTemplateIds.includes(t.id));
  const userTemplates = templates.filter((t) => !t.isSystem);

  // Sort companies alphabetically
  const sortedCompanies = React.useMemo(
    () => [...companies].sort((a, b) => a.name.localeCompare(b.name)),
    [companies]
  );

  function toggleExpanded(templateId: string) {
    setExpandedTemplates((prev) => {
      const next = new Set(prev);
      if (next.has(templateId)) {
        next.delete(templateId);
      } else {
        next.add(templateId);
      }
      return next;
    });
  }

  // Load data on mount
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

  async function handleSubmit() {
    if (selectedCompanyIds.size === 0) return;

    setSubmitting(true);
    setError(null);

    // Determine which period type to use (custom metric may have different type)
    const effectivePeriodType = useCustomMetric ? customPeriodType : periodType;
    const effectiveYear =
      effectivePeriodType === "annual" && availableYears[0]
        ? availableYears[0].year
        : selectedYear;

    try {
      if (useCustomMetric) {
        // Create single metric requests for each company
        const promises = Array.from(selectedCompanyIds).map((companyId) =>
          fetch("/api/metrics/request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              companyId,
              metricName: customMetricName,
              periodType: customPeriodType,
              year: customPeriodType === "annual" ? effectiveYear : selectedYear,
              quarter:
                customPeriodType === "quarterly" ? selectedQuarter : undefined,
              dueDate: dueDate || undefined,
            }),
          })
        );

        const results = await Promise.all(promises);
        const failedCount = results.filter((r) => !r.ok).length;

        if (failedCount > 0) {
          throw new Error(`Failed to create ${failedCount} request(s).`);
        }

        setResult({ requestsCreated: selectedCompanyIds.size, skipped: 0 });
      } else {
        // Use template assign API
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

        setResult({ requestsCreated: json.requestsCreated, skipped: json.skipped });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
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
              <p className="mt-1 text-xs text-white/50">{tmpl.description}</p>
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
          <h2 className="mt-4 text-lg font-semibold">Requests Created</h2>
          <p className="mt-1 text-sm text-white/60">
            Created {result.requestsCreated} request{result.requestsCreated !== 1 ? "s" : ""}.
            {result.skipped > 0 && ` ${result.skipped} skipped (already exist).`}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => router.push("/requests")}
              className="inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90"
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
              }}
              className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 bg-white/5 px-4 text-sm text-white hover:bg-white/10"
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
        <span className={step === 1 ? "text-white" : "text-white/40"}>
          1. Template
        </span>
        <span className="text-white/20">/</span>
        <span className={step === 2 ? "text-white" : "text-white/40"}>
          2. Companies
        </span>
        <span className="text-white/20">/</span>
        <span className={step === 3 ? "text-white" : "text-white/40"}>
          3. Period
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
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10"
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
                <p className="mt-0.5 text-xs text-white/50">
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
                  href="/templates"
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
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10"
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
                  <select
                    id="customPeriodType"
                    className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-white/20"
                    value={customPeriodType}
                    onChange={(e) => setCustomPeriodType(e.target.value as PeriodType)}
                  >
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </select>
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
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50">
                            {c.stage.replace(/_/g, " ")}
                          </span>
                        )}
                        {c.industry && (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50">
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
              className="inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60"
              type="button"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Set Period */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setStep(2)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10"
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight">
                Set period and due date
              </h1>
              <p className="text-sm text-white/60">
                Specify the reporting period for {selectedCompanyIds.size} compan{selectedCompanyIds.size === 1 ? "y" : "ies"}.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5">
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Period type selector */}
              <div className="grid gap-1.5 sm:gap-2">
                <label className="text-sm text-white/70" htmlFor="periodType">
                  Period type
                </label>
                <select
                  id="periodType"
                  className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-white/20"
                  value={periodType}
                  onChange={(e) => {
                    const newType = e.target.value as PeriodType;
                    setPeriodType(newType);
                    // Reset year when switching to annual (use first available year)
                    if (newType === "annual" && availableYears[0]) {
                      setSelectedYear(availableYears[0].year);
                    }
                  }}
                >
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>

              {/* Period selector - shows different UI based on period type */}
              {periodType === "quarterly" ? (
                <div className="grid gap-1.5 sm:gap-2">
                  <label className="text-sm text-white/70" htmlFor="quarter">
                    Quarter
                  </label>
                  <select
                    id="quarter"
                    className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-white/20"
                    value={`${selectedYear}-${selectedQuarter}`}
                    onChange={(e) => {
                      const [year, quarter] = e.target.value.split("-").map(Number);
                      setSelectedYear(year);
                      setSelectedQuarter(quarter as 1 | 2 | 3 | 4);
                    }}
                  >
                    {availableQuarters.map((q) => (
                      <option key={`${q.year}-${q.quarter}`} value={`${q.year}-${q.quarter}`}>
                        {q.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid gap-1.5 sm:gap-2">
                  <label className="text-sm text-white/70" htmlFor="year">
                    Year
                  </label>
                  <select
                    id="year"
                    className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-white/20"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                  >
                    {availableYears.map((y) => (
                      <option key={y.year} value={y.year}>
                        {y.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Due date */}
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
                  <span className="text-white/40">Template:</span>{" "}
                  {useCustomMetric ? `Custom: ${customMetricName}` : selectedTemplate?.name}
                </p>
                <p>
                  <span className="text-white/40">Companies:</span>{" "}
                  {selectedCompanyIds.size} selected
                </p>
                <p>
                  <span className="text-white/40">Period:</span>{" "}
                  {getPeriodLabel(
                    periodType === "quarterly"
                      ? { type: "quarterly", year: selectedYear, quarter: selectedQuarter }
                      : { type: "annual", year: selectedYear }
                  )}
                </p>
                {!useCustomMetric && selectedTemplate && (
                  <p>
                    <span className="text-white/40">Metrics:</span>{" "}
                    {selectedTemplate.metric_template_items.length} per company
                  </p>
                )}
                <p>
                  <span className="text-white/40">Total requests:</span>{" "}
                  {useCustomMetric
                    ? selectedCompanyIds.size
                    : selectedCompanyIds.size * (selectedTemplate?.metric_template_items.length ?? 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setStep(2)}
              className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 bg-white/5 px-4 text-sm text-white hover:bg-white/10"
              type="button"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60"
              type="button"
            >
              {submitting ? "Creating..." : "Create Requests"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
