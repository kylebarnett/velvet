"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  companyId: z.string().min(1, "Select a company."),
  metricName: z.string().min(2, "Enter a metric name."),
  periodType: z.enum(["monthly", "quarterly", "annual"]),
  periodStart: z.string().min(1, "Select a start date."),
  periodEnd: z.string().min(1, "Select an end date."),
  dueDate: z.string().min(1, "Select a due date."),
});

type FormValues = z.infer<typeof schema>;

export function MetricRequestForm() {
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

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
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    }
  }

  const FieldError = ({ name }: { name: keyof FormValues }) => {
    const message = form.formState.errors[name]?.message;
    if (!message) return null;
    return <p className="text-xs text-red-300">{String(message)}</p>;
  };

  return (
    <form
      className="max-w-2xl rounded-xl border border-white/10 bg-white/5 p-5"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm text-white/70" htmlFor="companyId">
            Portfolio company
          </label>
          <select
            id="companyId"
            className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-white/20"
            {...form.register("companyId")}
          >
            <option value="">Select…</option>
            <option value="demo-company">Demo company (placeholder)</option>
          </select>
          <FieldError name="companyId" />
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-white/70" htmlFor="metricName">
            Metric name
          </label>
          <input
            id="metricName"
            className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none placeholder:text-white/30 focus:border-white/20"
            placeholder="Monthly Recurring Revenue"
            {...form.register("metricName")}
          />
          <FieldError name="metricName" />
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-white/70" htmlFor="periodType">
            Period type
          </label>
          <select
            id="periodType"
            className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-white/20"
            {...form.register("periodType")}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>
          <FieldError name="periodType" />
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-white/70" htmlFor="dueDate">
            Due date
          </label>
          <input
            id="dueDate"
            type="date"
            className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-white/20"
            {...form.register("dueDate")}
          />
          <FieldError name="dueDate" />
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-white/70" htmlFor="periodStart">
            Period start
          </label>
          <input
            id="periodStart"
            type="date"
            className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-white/20"
            {...form.register("periodStart")}
          />
          <FieldError name="periodStart" />
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-white/70" htmlFor="periodEnd">
            Period end
          </label>
          <input
            id="periodEnd"
            type="date"
            className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-white/20"
            {...form.register("periodEnd")}
          />
          <FieldError name="periodEnd" />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          {success}
        </div>
      )}

      <div className="mt-4 flex items-center justify-end">
        <button
          className="inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60"
          disabled={form.formState.isSubmitting}
          type="submit"
        >
          {form.formState.isSubmitting ? "Creating…" : "Create request"}
        </button>
      </div>
    </form>
  );
}

