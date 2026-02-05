"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  requestId: z.string().min(1),
  value: z.string().min(1, "Enter a value."),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function MetricSubmissionForm() {
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      requestId: "demo-request",
      value: "",
      notes: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/metrics/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to submit metric.");
      setSuccess("Submitted.");
      form.reset({ ...values, value: "", notes: "" });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-2">
        <label className="text-sm text-white/70" htmlFor="value">
          Value
        </label>
        <input
          id="value"
          className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none placeholder:text-white/30 focus:border-white/20"
          placeholder="e.g. 72500"
          {...form.register("value")}
        />
        {form.formState.errors.value?.message && (
          <p className="text-xs text-red-300">
            {String(form.formState.errors.value.message)}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <label className="text-sm text-white/70" htmlFor="notes">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          className="min-h-24 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-white/20"
          placeholder="Anything your investor should know…"
          {...form.register("notes")}
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          {success}
        </div>
      )}

      <div className="flex justify-end">
        <button
          className="inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/50"
          disabled={form.formState.isSubmitting}
          type="submit"
        >
          {form.formState.isSubmitting ? "Submitting…" : "Submit"}
        </button>
      </div>
    </form>
  );
}

