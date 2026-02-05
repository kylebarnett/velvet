"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  company_name: z.string().min(1, "Company name is required."),
  company_website: z.string().optional(),
  first_name: z.string().min(1, "First name is required."),
  last_name: z.string().min(1, "Last name is required."),
  email: z.string().email("Valid email is required."),
});

type FormValues = z.infer<typeof schema>;

export function AddContactForm() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      company_name: "",
      company_website: "",
      first_name: "",
      last_name: "",
      email: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/investors/portfolio/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: [values] }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to add contact.");
      }

      if (json.errors && json.errors.length > 0) {
        throw new Error(json.errors[0].message);
      }

      setSuccess("Contact added successfully.");
      form.reset();

      setTimeout(() => {
        router.push("/portfolio");
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const FieldError = ({ name }: { name: keyof FormValues }) => {
    const message = form.formState.errors[name]?.message;
    if (!message) return null;
    return <p className="text-xs text-red-300">{String(message)}</p>;
  };

  return (
    <form
      className="max-w-xl rounded-xl border border-white/10 bg-white/5 p-5"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm text-white/70" htmlFor="company_name">
            Company name
          </label>
          <input
            id="company_name"
            className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none placeholder:text-white/30 focus:border-white/20"
            placeholder="Acme Inc."
            {...form.register("company_name")}
          />
          <FieldError name="company_name" />
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-white/70" htmlFor="company_website">
            Company website <span className="text-white/40">(optional)</span>
          </label>
          <input
            id="company_website"
            className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none placeholder:text-white/30 focus:border-white/20"
            placeholder="acme.com"
            {...form.register("company_website")}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <label className="text-sm text-white/70" htmlFor="first_name">
              First name
            </label>
            <input
              id="first_name"
              className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none placeholder:text-white/30 focus:border-white/20"
              placeholder="John"
              {...form.register("first_name")}
            />
            <FieldError name="first_name" />
          </div>

          <div className="grid gap-2">
            <label className="text-sm text-white/70" htmlFor="last_name">
              Last name
            </label>
            <input
              id="last_name"
              className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none placeholder:text-white/30 focus:border-white/20"
              placeholder="Doe"
              {...form.register("last_name")}
            />
            <FieldError name="last_name" />
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-white/70" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none placeholder:text-white/30 focus:border-white/20"
            placeholder="john@acme.com"
            {...form.register("email")}
          />
          <FieldError name="email" />
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
          className="inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/50"
          disabled={form.formState.isSubmitting}
          type="submit"
        >
          {form.formState.isSubmitting ? "Adding..." : "Add Contact"}
        </button>
      </div>
    </form>
  );
}
