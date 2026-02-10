"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

import { CadenceSelector } from "./cadence-selector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Template = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  targetIndustry: string | null;
  metric_template_items: {
    id: string;
    metric_name: string;
    period_type: string;
  }[];
};

type Company = {
  id: string;
  name: string;
  industry: string | null;
  stage: string | null;
};

interface ScheduleWizardProps {
  templates: Template[];
  companies: Company[];
}

const STEPS = [
  { id: "template", label: "Select Template" },
  { id: "companies", label: "Select Companies" },
  { id: "cadence", label: "Configure Cadence" },
  { id: "reminders", label: "Set Reminders" },
];

const INDUSTRY_LABELS: Record<string, string> = {
  saas: "SaaS",
  fintech: "Fintech",
  healthcare: "Healthcare",
  ecommerce: "E-commerce",
  edtech: "EdTech",
  ai_ml: "AI/ML",
  other: "General",
};

export function ScheduleWizard({ templates, companies }: ScheduleWizardProps) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Form state
  const [scheduleName, setScheduleName] = React.useState("");
  const [selectedTemplate, setSelectedTemplate] = React.useState<Template | null>(null);
  const [selectedCompanies, setSelectedCompanies] = React.useState<string[]>([]);
  const [allCompanies, setAllCompanies] = React.useState(true);
  const [includeFutureCompanies, setIncludeFutureCompanies] = React.useState(true);
  const [cadence, setCadence] = React.useState<"monthly" | "quarterly" | "annual">("monthly");
  const [dayOfMonth, setDayOfMonth] = React.useState(5);
  const [dueDaysOffset, setDueDaysOffset] = React.useState(7);
  const [reminderEnabled, setReminderEnabled] = React.useState(true);
  const [reminderDays, setReminderDays] = React.useState([3, 1]);

  // Filter templates
  const systemTemplates = templates.filter((t) => t.isSystem);
  const userTemplates = templates.filter((t) => !t.isSystem);

  // Group system templates by industry
  const templatesByIndustry = systemTemplates.reduce(
    (acc, t) => {
      const industry = t.targetIndustry ?? "other";
      if (!acc[industry]) acc[industry] = [];
      acc[industry].push(t);
      return acc;
    },
    {} as Record<string, Template[]>
  );

  const canProceed = () => {
    switch (step) {
      case 0:
        return selectedTemplate !== null;
      case 1:
        return allCompanies || selectedCompanies.length > 0;
      case 2:
        return true;
      case 3:
        return scheduleName.trim().length > 0;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      setError(null);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTemplate || !scheduleName.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/investors/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: scheduleName.trim(),
          templateId: selectedTemplate.id,
          cadence,
          dayOfMonth,
          companyIds: allCompanies ? null : selectedCompanies,
          includeFutureCompanies: allCompanies ? includeFutureCompanies : false,
          dueDaysOffset,
          reminderEnabled,
          reminderDaysBeforeDue: reminderEnabled ? reminderDays : [],
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create schedule");

      router.push("/campaigns?tab=schedules");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create schedule");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCompany = (id: string) => {
    setSelectedCompanies((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const selectAllCompanies = () => {
    setSelectedCompanies(companies.map((c) => c.id));
  };

  const deselectAllCompanies = () => {
    setSelectedCompanies([]);
  };

  return (
    <div className="space-y-6">
      {/* Progress steps */}
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <div
              className={`flex items-center gap-2 ${
                i <= step ? "text-text-primary" : "text-text-tertiary"
              }`}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  i < step
                    ? "bg-emerald-500/20 text-[var(--status-success-text)]"
                    : i === step
                      ? "bg-bg-hover text-text-primary"
                      : "bg-bg-elevated text-text-tertiary"
                }`}
              >
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className="hidden text-sm sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-8 sm:w-12 ${
                  i < step ? "bg-emerald-500/30" : "bg-bg-hover"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] p-3 text-sm text-[var(--status-error-text)]">
          {error}
        </div>
      )}

      {/* Step content */}
      <div className="rounded-xl border border-border-default bg-bg-elevated p-4 sm:p-6">
        {/* Step 1: Select Template */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium">Select a Template</h2>
              <p className="mt-1 text-sm text-text-tertiary">
                Choose which metrics to request from your portfolio companies.
              </p>
            </div>

            {/* User templates */}
            {userTemplates.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-medium text-text-secondary">
                  My Templates
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {userTemplates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTemplate(t)}
                      className={`flex flex-col items-start rounded-xl border p-4 text-left transition-colors ${
                        selectedTemplate?.id === t.id
                          ? "border-border-default bg-bg-hover"
                          : "border-border-default bg-bg-elevated hover:border-border-default"
                      }`}
                    >
                      <span className="font-medium">{t.name}</span>
                      {t.description && (
                        <span className="mt-1 text-xs text-text-tertiary line-clamp-2">
                          {t.description}
                        </span>
                      )}
                      <span className="mt-2 text-xs text-text-tertiary">
                        {t.metric_template_items.length} metrics
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* System templates by industry */}
            {Object.entries(templatesByIndustry).map(([industry, templates]) => (
              <div key={industry}>
                <h3 className="mb-3 text-sm font-medium text-text-secondary">
                  {INDUSTRY_LABELS[industry] ?? industry}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTemplate(t)}
                      className={`flex flex-col items-start rounded-xl border p-4 text-left transition-colors ${
                        selectedTemplate?.id === t.id
                          ? "border-border-default bg-bg-hover"
                          : "border-border-default bg-bg-elevated hover:border-border-default"
                      }`}
                    >
                      <span className="font-medium">{t.name}</span>
                      {t.description && (
                        <span className="mt-1 text-xs text-text-tertiary line-clamp-2">
                          {t.description}
                        </span>
                      )}
                      <span className="mt-2 text-xs text-text-tertiary">
                        {t.metric_template_items.length} metrics
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 2: Select Companies */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium">Select Companies</h2>
              <p className="mt-1 text-sm text-text-tertiary">
                Choose which companies should receive these metric requests.
              </p>
            </div>

            {/* All companies toggle */}
            <div className="flex items-start gap-3 rounded-xl border border-border-default bg-bg-elevated p-4">
              <input
                type="checkbox"
                id="all-companies"
                checked={allCompanies}
                onChange={(e) => setAllCompanies(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border-default bg-bg-input"
              />
              <div>
                <label
                  htmlFor="all-companies"
                  className="font-medium cursor-pointer"
                >
                  All portfolio companies
                </label>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  Automatically include all companies in your portfolio
                </p>
              </div>
            </div>

            {allCompanies && (
              <div className="flex items-start gap-3 rounded-xl border border-border-default bg-bg-elevated p-4">
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
                    Companies added to your portfolio later will automatically
                    be included
                  </p>
                </div>
              </div>
            )}

            {/* Company selection */}
            {!allCompanies && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-text-tertiary">
                    {selectedCompanies.length} of {companies.length} selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllCompanies}
                      className="text-xs text-text-muted hover:text-text-primary"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllCompanies}
                      className="text-xs text-text-muted hover:text-text-primary"
                    >
                      Deselect all
                    </button>
                  </div>
                </div>

                <div className="max-h-[300px] space-y-2 overflow-y-auto rounded-xl border border-border-default bg-bg-input p-3">
                  {companies.map((company) => (
                    <label
                      key={company.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                        selectedCompanies.includes(company.id)
                          ? "border-border-default bg-bg-hover"
                          : "border-transparent hover:bg-bg-elevated"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCompanies.includes(company.id)}
                        onChange={() => toggleCompany(company.id)}
                        className="h-4 w-4 rounded border-border-default bg-bg-input"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{company.name}</div>
                        <div className="flex gap-2 text-xs text-text-tertiary">
                          {company.industry && (
                            <span>
                              {INDUSTRY_LABELS[company.industry] ?? company.industry}
                            </span>
                          )}
                          {company.stage && <span>{company.stage}</span>}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Configure Cadence */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium">Configure Schedule</h2>
              <p className="mt-1 text-sm text-text-tertiary">
                Set how often metric requests should be created.
              </p>
            </div>

            <CadenceSelector
              value={cadence}
              onChange={setCadence}
              dayOfMonth={dayOfMonth}
              onDayOfMonthChange={setDayOfMonth}
            />

            {/* Due date offset */}
            <div>
              <label className="text-sm font-medium text-text-secondary">
                Days until due date
              </label>
              <p className="mt-1 text-xs text-text-tertiary">
                How many days founders have to submit their metrics after the
                request is created
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
          </div>
        )}

        {/* Step 4: Set Reminders */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium">Set Reminders</h2>
              <p className="mt-1 text-sm text-text-tertiary">
                Configure email reminders for founders before the due date.
              </p>
            </div>

            {/* Schedule name */}
            <div>
              <label className="text-sm font-medium text-text-secondary">
                Schedule Name
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

            {/* Reminder toggle */}
            <div className="flex items-start gap-3 rounded-xl border border-border-default bg-bg-elevated p-4">
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

            {/* Reminder days */}
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
                  Select when to send reminder emails (reminders are
                  automatically cancelled when metrics are submitted)
                </p>
              </div>
            )}

            {/* Summary */}
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
                      : `${selectedCompanies.length} selected`}
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
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 0}
          className="flex h-10 items-center gap-2 rounded-md border border-border-default px-4 text-sm text-text-secondary hover:bg-bg-elevated disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex h-10 items-center gap-2 rounded-md bg-btn-primary-bg px-4 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canProceed() || submitting}
            className="flex h-10 items-center gap-2 rounded-md bg-btn-primary-bg px-4 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
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
        )}
      </div>
    </div>
  );
}
