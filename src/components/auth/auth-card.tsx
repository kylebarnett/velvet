"use client";

import * as React from "react";
import Link from "next/link";
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

// Simplified schema for invite signups (company already exists)
const inviteSignupSchema = loginSchema.extend({
  fullName: z.string().min(2),
  companyWebsite: z.string().optional(),
});

type Mode = "login" | "signup";

type Props = {
  mode: Mode;
  inviteToken?: string;
  companyName?: string;
  companyId?: string;
  inviteEmail?: string;
};

export function AuthCard({ mode, inviteToken, companyName, companyId, inviteEmail }: Props) {
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const schema = mode === "login"
    ? loginSchema
    : inviteToken
      ? inviteSignupSchema
      : signupSchema;

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues:
      mode === "login"
        ? { email: "", password: "" }
        : inviteToken
          ? { email: inviteEmail ?? "", password: "", fullName: "", companyWebsite: "" }
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

  async function onSubmit(values: Record<string, string | undefined>) {
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
          role: inviteToken ? "founder" : values.role,
          fullName: values.fullName,
          companyName: inviteToken ? undefined : values.companyName,
          companyWebsite: values.companyWebsite || undefined,
          companyId: inviteToken ? companyId : undefined,
          inviteToken: inviteToken || undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Signup failed.");
      window.location.href = "/app";
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 shadow-sm">
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
            className={`h-11 rounded-md border border-white/10 px-3 text-sm outline-none ring-0 placeholder:text-white/30 focus:border-white/20 ${
              inviteEmail ? "bg-black/20 text-white/80 cursor-not-allowed" : "bg-black/30"
            }`}
            placeholder="you@company.com"
            type="email"
            autoComplete="email"
            readOnly={!!inviteEmail}
            {...form.register("email")}
          />
          {inviteEmail && (
            <p className="text-xs text-white/60">
              Email is pre-filled from your invitation link.
            </p>
          )}
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

        {mode === "signup" && inviteToken && companyName && (
          <>
            <div className="grid gap-2">
              <label className="text-sm text-white/70">
                Company
              </label>
              <div className="flex h-11 items-center rounded-md border border-white/10 bg-black/20 px-3 text-sm text-white/80">
                {companyName}
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm text-white/70" htmlFor="companyWebsite">
                Company website <span className="text-white/40">(optional)</span>
              </label>
              <input
                id="companyWebsite"
                className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none ring-0 placeholder:text-white/30 focus:border-white/20"
                placeholder="acme.com"
                {...form.register("companyWebsite")}
              />
            </div>
          </>
        )}

        {mode === "signup" && !inviteToken && (
          <div className="grid gap-2">
            <label className="text-sm text-white/70" htmlFor="role">
              I am a
            </label>
            <Controller
              name="role"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="founder">Founder</SelectItem>
                    <SelectItem value="investor">Investor</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
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
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/50"
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

