"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="mx-auto w-full max-w-[440px] rounded-2xl border border-border-default bg-bg-elevated p-6 sm:p-8 shadow-sm">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-sm text-text-tertiary">
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
            <label className="text-sm text-text-secondary" htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              className="h-11 rounded-lg border border-border-default bg-bg-input px-3 text-sm outline-none ring-0 placeholder:text-text-faint focus:border-[var(--ring-focus)]"
              placeholder="Jane Doe"
              {...form.register("fullName")}
            />
            {form.formState.errors.fullName?.message && (
              <p className="text-xs text-[var(--status-error-text)]">
                {String(form.formState.errors.fullName.message)}
              </p>
            )}
          </div>
        )}

        <div className="grid gap-2">
          <label className="text-sm text-text-secondary" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className={`h-11 rounded-lg border border-border-default px-3 text-sm outline-none ring-0 placeholder:text-text-faint focus:border-[var(--ring-focus)] ${
              inviteEmail ? "bg-bg-raised text-text-secondary cursor-not-allowed" : "bg-bg-input"
            }`}
            placeholder="you@company.com"
            type="email"
            autoComplete="email"
            readOnly={!!inviteEmail}
            {...form.register("email")}
          />
          {inviteEmail && (
            <p className="text-xs text-text-tertiary">
              Email is pre-filled from your invitation link.
            </p>
          )}
          {form.formState.errors.email?.message && (
            <p className="text-xs text-[var(--status-error-text)]">
              {String(form.formState.errors.email.message)}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-text-secondary" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="h-11 rounded-lg border border-border-default bg-bg-input px-3 text-sm outline-none ring-0 placeholder:text-text-faint focus:border-[var(--ring-focus)]"
            placeholder="••••••••"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            {...form.register("password")}
          />
          {form.formState.errors.password?.message && (
            <p className="text-xs text-[var(--status-error-text)]">
              {String(form.formState.errors.password.message)}
            </p>
          )}
          {mode === "login" && (
            <Link className="text-xs text-text-tertiary hover:text-text-primary" href="/forgot-password">
              Forgot password?
            </Link>
          )}
        </div>

        {mode === "signup" && inviteToken && companyName && (
          <>
            <div className="grid gap-2">
              <label className="text-sm text-text-secondary">
                Company
              </label>
              <div className="flex h-11 items-center rounded-lg border border-border-default bg-bg-raised px-3 text-sm text-text-secondary">
                {companyName}
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm text-text-secondary" htmlFor="companyWebsite">
                Company website <span className="text-text-muted">(optional)</span>
              </label>
              <input
                id="companyWebsite"
                className="h-11 rounded-lg border border-border-default bg-bg-input px-3 text-sm outline-none ring-0 placeholder:text-text-faint focus:border-[var(--ring-focus)]"
                placeholder="acme.com"
                {...form.register("companyWebsite")}
              />
            </div>
          </>
        )}

        {mode === "signup" && !inviteToken && (
          <div className="grid gap-2">
            <label className="text-sm text-text-secondary" htmlFor="role">
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
              <p className="text-xs text-[var(--status-error-text)]">
                {String(form.formState.errors.role.message)}
              </p>
            )}
          </div>
        )}

        {mode === "signup" && !inviteToken && watchedRole === "founder" && (
          <>
            <div className="grid gap-2">
              <label className="text-sm text-text-secondary" htmlFor="companyName">
                Company name
              </label>
              <input
                id="companyName"
                className="h-11 rounded-lg border border-border-default bg-bg-input px-3 text-sm outline-none ring-0 placeholder:text-text-faint focus:border-[var(--ring-focus)]"
                placeholder="Acme Inc."
                {...form.register("companyName")}
              />
              {form.formState.errors.companyName?.message && (
                <p className="text-xs text-[var(--status-error-text)]">
                  {String(form.formState.errors.companyName.message)}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <label className="text-sm text-text-secondary" htmlFor="companyWebsite">
                Company website{" "}
                <span className="text-text-muted">(recommended)</span>
              </label>
              <input
                id="companyWebsite"
                className="h-11 rounded-lg border border-border-default bg-bg-input px-3 text-sm outline-none ring-0 placeholder:text-text-faint focus:border-[var(--ring-focus)]"
                placeholder="acme.com"
                {...form.register("companyWebsite")}
              />
              {form.formState.errors.companyWebsite?.message && (
                <p className="text-xs text-[var(--status-error-text)]">
                  {String(form.formState.errors.companyWebsite.message)}
                </p>
              )}
            </div>
          </>
        )}

        {error && (
          <div className="rounded-lg border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]">
            {error}
          </div>
        )}

        <Button
          size="lg"
          className="w-full rounded-lg font-semibold"
          loading={isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? "Please wait\u2026"
            : mode === "login"
              ? "Login"
              : "Create account"}
        </Button>

        <p className="text-center text-sm text-text-tertiary">
          {mode === "login" ? (
            <>
              New here?{" "}
              <Link className="text-text-primary hover:underline" href="/signup">
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link className="text-text-primary hover:underline" href="/login">
                Log in
              </Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}

