"use client";

import * as React from "react";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const signupSchema = loginSchema
  .extend({
    role: z.enum(["investor", "founder"]),
    fullName: z.string().min(2),
    companyName: z.string().optional(),
    companyWebsite: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.role === "founder") {
        return data.companyName && data.companyName.length >= 2;
      }
      return true;
    },
    {
      message: "Company name is required for founders",
      path: ["companyName"],
    },
  );

type Mode = "login" | "signup";

type Props = {
  mode: Mode;
  inviteToken?: string;
  companyName?: string;
};

export function AuthCard({ mode, inviteToken, companyName }: Props) {
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const schema = mode === "login" ? loginSchema : signupSchema;
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues:
      mode === "login"
        ? { email: "", password: "" }
        : {
            email: "",
            password: "",
            role: "founder" as const,
            fullName: "",
            companyName: "",
            companyWebsite: "",
          },
  });

  const watchedRole = form.watch("role");

  async function onSubmit(values: any) {
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === "login") {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: values.email,
            password: values.password,
          }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error ?? "Login failed.");
        window.location.href = "/app";
        return;
      }

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          role: values.role,
          fullName: values.fullName,
          companyName: values.companyName,
          companyWebsite: values.companyWebsite,
          inviteToken: inviteToken || undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Signup failed.");
      window.location.href = "/app";
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
      <div className="space-y-2">
        <h1 className="text-lg font-semibold tracking-tight">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-sm text-white/60">
          {mode === "login"
            ? "Log in to access your dashboard."
            : inviteToken && companyName
              ? `Join ${companyName} on Velvet.`
              : "Sign up to start collecting metrics."}
        </p>
      </div>

      <form
        className="mt-6 space-y-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        {mode === "signup" && (
          <div className="grid gap-2">
            <label className="text-sm text-white/70" htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none ring-0 placeholder:text-white/30 focus:border-white/20"
              placeholder="Jane Doe"
              {...form.register("fullName")}
            />
            {form.formState.errors.fullName?.message && (
              <p className="text-xs text-red-300">
                {String(form.formState.errors.fullName.message)}
              </p>
            )}
          </div>
        )}

        <div className="grid gap-2">
          <label className="text-sm text-white/70" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none ring-0 placeholder:text-white/30 focus:border-white/20"
            placeholder="you@company.com"
            type="email"
            autoComplete="email"
            {...form.register("email")}
          />
          {form.formState.errors.email?.message && (
            <p className="text-xs text-red-300">
              {String(form.formState.errors.email.message)}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-white/70" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none ring-0 placeholder:text-white/30 focus:border-white/20"
            placeholder="••••••••"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            {...form.register("password")}
          />
          {form.formState.errors.password?.message && (
            <p className="text-xs text-red-300">
              {String(form.formState.errors.password.message)}
            </p>
          )}
        </div>

        {mode === "signup" && !inviteToken && (
          <div className="grid gap-2">
            <label className="text-sm text-white/70" htmlFor="role">
              I am a
            </label>
            <select
              id="role"
              className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none ring-0 focus:border-white/20"
              {...form.register("role")}
            >
              <option value="founder">Founder</option>
              <option value="investor">Investor</option>
            </select>
            {form.formState.errors.role?.message && (
              <p className="text-xs text-red-300">
                {String(form.formState.errors.role.message)}
              </p>
            )}
          </div>
        )}

        {mode === "signup" && !inviteToken && watchedRole === "founder" && (
          <>
            <div className="grid gap-2">
              <label className="text-sm text-white/70" htmlFor="companyName">
                Company name
              </label>
              <input
                id="companyName"
                className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none ring-0 placeholder:text-white/30 focus:border-white/20"
                placeholder="Acme Inc."
                {...form.register("companyName")}
              />
              {form.formState.errors.companyName?.message && (
                <p className="text-xs text-red-300">
                  {String(form.formState.errors.companyName.message)}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <label className="text-sm text-white/70" htmlFor="companyWebsite">
                Company website{" "}
                <span className="text-white/40">(recommended)</span>
              </label>
              <input
                id="companyWebsite"
                className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none ring-0 placeholder:text-white/30 focus:border-white/20"
                placeholder="acme.com"
                {...form.register("companyWebsite")}
              />
              {form.formState.errors.companyWebsite?.message && (
                <p className="text-xs text-red-300">
                  {String(form.formState.errors.companyWebsite.message)}
                </p>
              )}
            </div>
          </>
        )}

        {error && (
          <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <button
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? "Please wait…"
            : mode === "login"
              ? "Login"
              : "Create account"}
        </button>

        <p className="text-center text-sm text-white/60">
          {mode === "login" ? (
            <>
              New here?{" "}
              <Link className="text-white hover:underline" href="/signup">
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link className="text-white hover:underline" href="/login">
                Log in
              </Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}

