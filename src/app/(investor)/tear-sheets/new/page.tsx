"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getDefaultQuarter } from "@/lib/tear-sheets/quarter-utils";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

type Company = {
  id: string;
  name: string;
};

export default function NewInvestorTearSheetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCompanyId = searchParams.get("companyId");

  const defaults = getDefaultQuarter();
  const [quarter, setQuarter] = React.useState(defaults.quarter);
  const [year, setYear] = React.useState(defaults.year);
  const [title, setTitle] = React.useState("");
  const [companyId, setCompanyId] = React.useState(preselectedCompanyId ?? "");
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Load portfolio companies
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/investors/companies?limit=200");
        const json = await res.json().catch(() => null);
        if (res.ok) {
          const list = (json.companies ?? [])
            .filter((c: Record<string, unknown>) =>
              c.approvalStatus === "approved" || c.approvalStatus === "auto_approved"
            )
            .map((c: Record<string, unknown>) => ({
              id: c.id as string,
              name: (c.name as string) ?? "Unnamed",
            }));
          setCompanies(list);
          // If preselected, verify it's in the list
          if (preselectedCompanyId && !list.find((c: Company) => c.id === preselectedCompanyId)) {
            setCompanyId("");
          }
        }
      } catch {
        // Non-critical — user can still type
      } finally {
        setLoadingCompanies(false);
      }
    }
    load();
  }, [preselectedCompanyId]);

  const defaultTitle = `${quarter} ${year} Update`;

  async function handleCreate() {
    if (!companyId) {
      setError("Please select a company.");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/investors/tear-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          title: title.trim() || defaultTitle,
          quarter,
          year,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to create.");
      router.push(`/tear-sheets/${json.tearSheet.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setCreating(false);
    }
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Portfolio", href: "/contacts" }, { label: "Tear Sheets", href: "/tear-sheets" }, { label: "New Tear Sheet" }]} />
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">
          New Tear Sheet
        </h1>
        <p className="text-sm text-text-tertiary">
          Create an internal investment memo for a portfolio company. These are private to you and not visible to founders.
        </p>
      </div>

      <div className="max-w-md rounded-xl border border-border-default card-surface p-5">
        <div className="space-y-4">
          {/* Company selector */}
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="ts-company">
              Company
            </label>
            {loadingCompanies ? (
              <div className="h-11 animate-pulse rounded-md bg-bg-hover" />
            ) : (
              <select
                id="ts-company"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-[var(--ring-focus)]"
              >
                <option value="">Select a company...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Quarter */}
          <div className="grid gap-2">
            <label className="text-sm font-medium">Quarter</label>
            <div className="flex gap-2">
              {QUARTERS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuarter(q)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    quarter === q
                      ? "border-border-default bg-bg-hover text-text-primary"
                      : "border-border-default bg-bg-input text-text-tertiary hover:border-border-default"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Year */}
          <div className="grid gap-2">
            <label className="text-sm font-medium">Year</label>
            <div className="flex flex-wrap gap-2">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYear(y)}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    year === y
                      ? "border-border-default bg-bg-hover text-text-primary"
                      : "border-border-default bg-bg-input text-text-tertiary hover:border-border-default"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="ts-title">
              Title{" "}
              <span className="font-normal text-text-tertiary">(optional)</span>
            </label>
            <input
              id="ts-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={defaultTitle}
              className="h-11 rounded-md border border-border-default bg-bg-input px-3 text-sm outline-none placeholder:text-text-faint focus:border-border-default"
            />
          </div>

          {error && (
            <div className="rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !companyId}
            className="w-full rounded-md bg-btn-primary-bg py-2.5 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover disabled:opacity-60"
          >
            {creating ? "Creating..." : "Create Tear Sheet"}
          </button>
        </div>
      </div>
    </div>
  );
}
