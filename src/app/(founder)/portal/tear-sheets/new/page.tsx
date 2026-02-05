"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

function getDefaultQuarter(): { quarter: string; year: number } {
  const now = new Date();
  const currentQ = Math.floor(now.getMonth() / 3) + 1;
  // Default to the most recently completed quarter
  if (currentQ === 1) {
    return { quarter: "Q4", year: now.getFullYear() - 1 };
  }
  return { quarter: `Q${currentQ - 1}`, year: now.getFullYear() };
}

export default function NewTearSheetPage() {
  const router = useRouter();
  const defaults = getDefaultQuarter();
  const [quarter, setQuarter] = React.useState(defaults.quarter);
  const [year, setYear] = React.useState(defaults.year);
  const [title, setTitle] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const defaultTitle = `${quarter} ${year} Update`;

  async function handleCreate() {
    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/founder/tear-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || defaultTitle,
          quarter,
          year,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to create.");
      router.push(`/portal/tear-sheets/${json.tearSheet.id}`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Something went wrong.";
      setError(message);
    } finally {
      setCreating(false);
    }
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/portal/tear-sheets"
          className="flex items-center gap-1 text-sm text-white/50 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to tear sheets
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">
          New Tear Sheet
        </h1>
      </div>

      <div className="max-w-md rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="space-y-4">
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
                      ? "border-white/20 bg-white/10 text-white"
                      : "border-white/10 bg-black/20 text-white/60 hover:border-white/15"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

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
                      ? "border-white/20 bg-white/10 text-white"
                      : "border-white/10 bg-black/20 text-white/60 hover:border-white/15"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="ts-title">
              Title{" "}
              <span className="font-normal text-white/60">(optional)</span>
            </label>
            <input
              id="ts-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={defaultTitle}
              className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none placeholder:text-white/40 focus:border-white/20"
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="w-full rounded-md bg-white py-2.5 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60"
          >
            {creating ? "Creating..." : "Create Tear Sheet"}
          </button>
        </div>
      </div>
    </div>
  );
}
