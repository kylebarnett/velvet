"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const metricRowSchema = z.object({
  metric_name: z.string().min(1, "Required"),
  value: z.string().min(1, "Required"),
  period_type: z.enum(["monthly", "quarterly", "annual"]),
  period_start: z.string().min(1, "Required"),
});

const formSchema = z.object({
  metrics: z.array(metricRowSchema).min(1).max(5),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  open: boolean;
  onClose: () => void;
  companyId: string;
  companyName: string;
};

function getPeriodStartValue(periodType: string, date: string): string {
  if (!date) return "";
  if (periodType === "annual") {
    // Extract year, return Jan 1
    const year = date.slice(0, 4);
    return `${year}-01-01`;
  }
  if (periodType === "quarterly") {
    // Map selected month to quarter start
    const d = new Date(date + "T00:00:00");
    const month = d.getMonth();
    const quarterStartMonth = Math.floor(month / 3) * 3;
    const year = d.getFullYear();
    return `${year}-${String(quarterStartMonth + 1).padStart(2, "0")}-01`;
  }
  // monthly: first of month
  return date.slice(0, 7) + "-01";
}

function getPeriodLabel(periodType: string): string {
  if (periodType === "monthly") return "Month";
  if (periodType === "quarterly") return "Quarter";
  return "Year";
}

const QUARTERS = ["Q1 (Jan–Mar)", "Q2 (Apr–Jun)", "Q3 (Jul–Sep)", "Q4 (Oct–Dec)"];
const QUARTER_MONTH_MAP: Record<string, string> = {
  "Q1 (Jan–Mar)": "01",
  "Q2 (Apr–Jun)": "04",
  "Q3 (Jul–Sep)": "07",
  "Q4 (Oct–Dec)": "10",
};

export function ManualMetricEntryModal({ open, onClose, companyId, companyName }: Props) {
  const router = useRouter();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      metrics: [{ metric_name: "", value: "", period_type: "quarterly", period_start: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "metrics",
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        metrics: [{ metric_name: "", value: "", period_type: "quarterly", period_start: "" }],
      });
    }
  }, [open, form]);

  React.useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) return;
    function handleFocusTrap(e: KeyboardEvent) {
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleFocusTrap);
    return () => document.removeEventListener("keydown", handleFocusTrap);
  }, [open]);

  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus();
      }, 0);
    }
  }, [open]);

  async function onSubmit(values: FormValues) {
    const metrics = values.metrics.map((m) => ({
      metric_name: m.metric_name.trim(),
      value: m.value.trim(),
      period_type: m.period_type,
      period_start: getPeriodStartValue(m.period_type, m.period_start),
    }));

    try {
      const res = await fetch(`/api/investors/companies/${companyId}/metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metrics }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to save metrics.");
      }

      toast.success(`${json.count} metric${json.count === 1 ? "" : "s"} added.`);
      onClose();
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (!open) return null;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-bg-backdrop backdrop-blur-sm modal-backdrop-enter"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative mx-4 w-full max-w-2xl rounded-xl border border-border-default bg-bg-secondary p-6 shadow-2xl modal-dialog-enter max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-text-primary">Add Metrics</h2>
            <p className="text-sm text-text-tertiary">
              Add metrics for {companyName}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <form className="mt-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="rounded-lg border border-border-default bg-bg-primary p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-text-tertiary">Metric {index + 1}</span>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => remove(index)}
                      aria-label={`Remove metric ${index + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <label className="text-xs text-text-secondary" htmlFor={`metric_name_${index}`}>
                      Metric name
                    </label>
                    <input
                      id={`metric_name_${index}`}
                      className="h-11 rounded-md border border-border-default bg-bg-input px-3 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-[var(--ring-focus)]"
                      placeholder="e.g. MRR, Revenue, Burn Rate"
                      {...form.register(`metrics.${index}.metric_name`)}
                    />
                    {form.formState.errors.metrics?.[index]?.metric_name && (
                      <p className="text-xs text-red-300">{form.formState.errors.metrics[index].metric_name?.message}</p>
                    )}
                  </div>

                  <div className="grid gap-1.5">
                    <label className="text-xs text-text-secondary" htmlFor={`value_${index}`}>
                      Value
                    </label>
                    <input
                      id={`value_${index}`}
                      className="h-11 rounded-md border border-border-default bg-bg-input px-3 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-[var(--ring-focus)]"
                      placeholder="e.g. 150000"
                      {...form.register(`metrics.${index}.value`)}
                    />
                    {form.formState.errors.metrics?.[index]?.value && (
                      <p className="text-xs text-red-300">{form.formState.errors.metrics[index].value?.message}</p>
                    )}
                  </div>

                  <div className="grid gap-1.5">
                    <label className="text-xs text-text-secondary" htmlFor={`period_type_${index}`}>
                      Period type
                    </label>
                    <select
                      id={`period_type_${index}`}
                      className="h-11 rounded-md border border-border-default bg-bg-input px-3 text-sm text-text-primary outline-none focus:border-[var(--ring-focus)]"
                      {...form.register(`metrics.${index}.period_type`)}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>

                  <Controller
                    control={form.control}
                    name={`metrics.${index}.period_start`}
                    render={({ field: periodField }) => {
                      const periodType = form.watch(`metrics.${index}.period_type`);
                      return (
                        <div className="grid gap-1.5">
                          <label className="text-xs text-text-secondary">
                            {getPeriodLabel(periodType)}
                          </label>
                          {periodType === "annual" ? (
                            <select
                              className="h-11 rounded-md border border-border-default bg-bg-input px-3 text-sm text-text-primary outline-none focus:border-[var(--ring-focus)]"
                              value={periodField.value ? periodField.value.slice(0, 4) : ""}
                              onChange={(e) => periodField.onChange(e.target.value ? `${e.target.value}-01-01` : "")}
                            >
                              <option value="">Select year</option>
                              {years.map((y) => (
                                <option key={y} value={y}>{y}</option>
                              ))}
                            </select>
                          ) : periodType === "quarterly" ? (
                            <div className="flex gap-2">
                              <select
                                className="h-11 flex-1 rounded-md border border-border-default bg-bg-input px-3 text-sm text-text-primary outline-none focus:border-[var(--ring-focus)]"
                                value={periodField.value ? periodField.value.slice(0, 4) : ""}
                                onChange={(e) => {
                                  const quarter = periodField.value ? periodField.value.slice(5, 7) : "";
                                  periodField.onChange(e.target.value && quarter ? `${e.target.value}-${quarter}-01` : "");
                                }}
                              >
                                <option value="">Year</option>
                                {years.map((y) => (
                                  <option key={y} value={y}>{y}</option>
                                ))}
                              </select>
                              <select
                                className="h-11 flex-1 rounded-md border border-border-default bg-bg-input px-3 text-sm text-text-primary outline-none focus:border-[var(--ring-focus)]"
                                value={(() => {
                                  if (!periodField.value) return "";
                                  const m = periodField.value.slice(5, 7);
                                  return QUARTERS.find((q) => QUARTER_MONTH_MAP[q] === m) ?? "";
                                })()}
                                onChange={(e) => {
                                  const year = periodField.value ? periodField.value.slice(0, 4) : "";
                                  const month = QUARTER_MONTH_MAP[e.target.value] ?? "";
                                  periodField.onChange(year && month ? `${year}-${month}-01` : "");
                                }}
                              >
                                <option value="">Quarter</option>
                                {QUARTERS.map((q) => (
                                  <option key={q} value={q}>{q}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <input
                              type="month"
                              className="h-11 rounded-md border border-border-default bg-bg-input px-3 text-sm text-text-primary outline-none focus:border-[var(--ring-focus)]"
                              value={periodField.value ? periodField.value.slice(0, 7) : ""}
                              onChange={(e) => periodField.onChange(e.target.value ? `${e.target.value}-01` : "")}
                            />
                          )}
                          {form.formState.errors.metrics?.[index]?.period_start && (
                            <p className="text-xs text-red-300">{form.formState.errors.metrics[index].period_start?.message}</p>
                          )}
                        </div>
                      );
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {fields.length < 5 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => append({ metric_name: "", value: "", period_type: "quarterly", period_start: "" })}
              className="mt-3"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add another metric
            </Button>
          )}

          <div className="mt-5 flex items-center justify-end gap-3">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button loading={form.formState.isSubmitting} type="submit">
              Save Metrics
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
