"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const schema = z.object({
  requestId: z.string().min(1),
  value: z.string().min(1, "Enter a value."),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function MetricSubmissionForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      requestId: "demo-request",
      value: "",
      notes: "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch("/api/metrics/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to submit metric.");
      toast.success("Submitted.");
      form.reset({ ...values, value: "", notes: "" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-2">
        <label className="text-sm text-text-secondary" htmlFor="value">
          Value
        </label>
        <input
          id="value"
          className="h-11 rounded-md border border-border-default bg-bg-input px-3 text-sm outline-none placeholder:text-text-faint focus:border-border-default"
          placeholder="e.g. 72500"
          {...form.register("value")}
        />
        {form.formState.errors.value?.message && (
          <p className="text-xs text-[var(--status-error-text)]">
            {String(form.formState.errors.value.message)}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <label className="text-sm text-text-secondary" htmlFor="notes">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          className="min-h-24 rounded-md border border-border-default bg-bg-input px-3 py-2 text-sm outline-none placeholder:text-text-faint focus:border-border-default"
          placeholder="Anything your investor should know…"
          {...form.register("notes")}
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          loading={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Submitting..." : "Submit"}
        </Button>
      </div>
    </form>
  );
}

