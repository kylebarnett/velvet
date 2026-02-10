"use client";

import * as React from "react";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  companyId: z.string().min(1, "Select a company."),
  metricName: z.string().min(2, "Enter a metric name."),
  periodType: z.enum(["monthly", "quarterly", "annual"]),
  periodStart: z.string().min(1, "Select a start date."),
  periodEnd: z.string().min(1, "Select an end date."),
  dueDate: z.string().min(1, "Select a due date."),
});

type FormValues = z.infer<typeof schema>;

type Company = {
  id: string;
  name: string;
};

export function MetricRequestForm() {
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [companies, setCompanies] = React.useState<Company[]>([]);

  React.useEffect(() => {
    async function loadCompanies() {
      try {
        const res = await fetch("/api/investors/companies");
        const json = await res.json().catch(() => null);
        if (json?.companies) {
          setCompanies(json.companies);
        }
      } catch {
        // ignore
      }
    }
    loadCompanies();
  }, []);

  React.useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyId: "",
      metricName: "",
      periodType: "monthly",
      periodStart: "",
      periodEnd: "",
      dueDate: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/metrics/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to create request.");
      }
      setSuccess("Request created.");
      form.reset();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  const FieldError = ({ name }: { name: keyof FormValues }) => {
    const message = form.formState.errors[name]?.message;
    if (!message) return null;
    return <p className="text-xs text-[var(--status-error-text)]">{String(message)}</p>;
  };

  return (
    <form
      className="max-w-2xl rounded-xl border border-border-default card-surface p-5"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm text-text-secondary">
            Portfolio company
          </label>
          <Controller
            name="companyId"
            control={form.control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError name="companyId" />
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-text-secondary" htmlFor="metricName">
            Metric name
          </label>
          <input
            id="metricName"
            className="h-11 rounded-md border border-border-default bg-bg-input px-3 text-sm outline-none placeholder:text-text-faint focus:border-border-default"
            placeholder="Monthly Recurring Revenue"
            {...form.register("metricName")}
          />
          <FieldError name="metricName" />
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-text-secondary">
            Period type
          </label>
          <Controller
            name="periodType"
            control={form.control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <FieldError name="periodType" />
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-text-secondary" htmlFor="dueDate">
            Due date
          </label>
          <input
            id="dueDate"
            type="date"
            className="h-11 rounded-md border border-border-default bg-bg-input px-3 text-sm outline-none focus:border-border-default"
            {...form.register("dueDate")}
          />
          <FieldError name="dueDate" />
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-text-secondary" htmlFor="periodStart">
            Period start
          </label>
          <input
            id="periodStart"
            type="date"
            className="h-11 rounded-md border border-border-default bg-bg-input px-3 text-sm outline-none focus:border-border-default"
            {...form.register("periodStart")}
          />
          <FieldError name="periodStart" />
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-text-secondary" htmlFor="periodEnd">
            Period end
          </label>
          <input
            id="periodEnd"
            type="date"
            className="h-11 rounded-md border border-border-default bg-bg-input px-3 text-sm outline-none focus:border-border-default"
            {...form.register("periodEnd")}
          />
          <FieldError name="periodEnd" />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-md border border-[var(--status-success-bg)] bg-[var(--status-success-bg)] px-3 py-2 text-sm text-[var(--status-success-text)]">
          {success}
        </div>
      )}

      <div className="mt-4 flex items-center justify-end">
        <button
          className="inline-flex h-10 items-center justify-center rounded-md bg-btn-primary-bg px-4 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
          disabled={form.formState.isSubmitting}
          type="submit"
        >
          {form.formState.isSubmitting ? "Creating..." : "Create request"}
        </button>
      </div>
    </form>
  );
}
