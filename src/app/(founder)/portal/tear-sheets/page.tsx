"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpDown, LayoutGrid, List } from "lucide-react";
import { TearSheetCard } from "@/components/founder/tear-sheet-card";
import { SlidingTabs, SlidingIconTabs, TabItem } from "@/components/ui/sliding-tabs";

type TearSheet = {
  id: string;
  title: string;
  quarter: string;
  year: number;
  status: string;
  share_enabled: boolean;
  share_token: string | null;
  created_at: string;
  updated_at: string;
};

type ViewMode = "grid" | "list";
type SortField = "date" | "status";
type SortDir = "asc" | "desc";
type QuarterFilter = "All" | "Q1" | "Q2" | "Q3" | "Q4";

const QUARTER_TABS: TabItem<QuarterFilter>[] = [
  { value: "All", label: "All" },
  { value: "Q1", label: "Q1" },
  { value: "Q2", label: "Q2" },
  { value: "Q3", label: "Q3" },
  { value: "Q4", label: "Q4" },
];

const VIEW_MODE_TABS: { value: ViewMode; icon: typeof LayoutGrid; label: string }[] = [
  { value: "grid", icon: LayoutGrid, label: "Grid view" },
  { value: "list", icon: List, label: "List view" },
];

/** Numeric value for sorting quarters chronologically. */
function quarterNum(q: string): number {
  return { Q1: 1, Q2: 2, Q3: 3, Q4: 4 }[q] ?? 0;
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-white/10 bg-white/5 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded bg-white/10" />
              <div className="flex gap-2">
                <div className="h-5 w-16 rounded-full bg-white/10" />
                <div className="h-5 w-14 rounded bg-white/5" />
              </div>
            </div>
            <div className="h-7 w-7 rounded-md bg-white/5" />
          </div>
          <div className="mt-3 h-3 w-28 rounded bg-white/5" />
        </div>
      ))}
    </div>
  );
}

export default function TearSheetsPage() {
  const [tearSheets, setTearSheets] = React.useState<TearSheet[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // View mode
  const [viewMode, setViewMode] = React.useState<ViewMode>("list");

  // Filters
  const [filterQuarter, setFilterQuarter] = React.useState<QuarterFilter>("All");
  const [filterYear, setFilterYear] = React.useState("All");

  // Sort
  const [sortField, setSortField] = React.useState<SortField>("date");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");

  async function loadTearSheets() {
    try {
      const res = await fetch("/api/founder/tear-sheets");
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to load.");
      setTearSheets(json.tearSheets ?? []);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Something went wrong.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadTearSheets();
  }, []);

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/founder/tear-sheets/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete.");
      setTearSheets((prev) => prev.filter((t) => t.id !== id));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to delete.";
      setError(message);
    }
  }

  // Derive available years from data
  const availableYears = React.useMemo(() => {
    const years = Array.from(new Set(tearSheets.map((t) => t.year)));
    years.sort((a, b) => b - a);
    return years;
  }, [tearSheets]);

  // Filter and sort
  const displayed = React.useMemo(() => {
    let list = tearSheets;

    if (filterQuarter !== "All") {
      list = list.filter((t) => t.quarter === filterQuarter);
    }
    if (filterYear !== "All") {
      list = list.filter((t) => t.year === Number(filterYear));
    }

    const sorted = [...list].sort((a, b) => {
      if (sortField === "date") {
        const diff = a.year - b.year || quarterNum(a.quarter) - quarterNum(b.quarter);
        return sortDir === "desc" ? -diff : diff;
      }
      // status: published before draft in desc, reverse in asc
      const statusOrder = { published: 1, draft: 0 };
      const diff =
        (statusOrder[a.status as keyof typeof statusOrder] ?? 0) -
        (statusOrder[b.status as keyof typeof statusOrder] ?? 0);
      return sortDir === "desc" ? -diff : diff;
    });

    return sorted;
  }, [tearSheets, filterQuarter, filterYear, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const showFilters = tearSheets.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Tear Sheets</h1>
          <p className="text-sm text-white/60">
            Create quarterly summaries to share with investors.
          </p>
        </div>
        <Link
          href="/portal/tear-sheets/new"
          className="inline-flex h-9 items-center justify-center rounded-md bg-white px-3 text-sm font-medium text-black hover:bg-white/90"
        >
          New Tear Sheet
        </Link>
      </div>

      {loading && <LoadingSkeleton />}

      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Filters & sort */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Quarter filter */}
          <SlidingTabs
            tabs={QUARTER_TABS}
            value={filterQuarter}
            onChange={setFilterQuarter}
            size="sm"
            showIcons={false}
          />

          {/* Year filter */}
          {availableYears.length > 1 && (
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="h-8 rounded-md border border-white/10 bg-black/20 px-2 text-xs text-white/80 outline-none"
            >
              <option value="All">All years</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}

          {/* Sort buttons + view toggle */}
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => toggleSort("date")}
              className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                sortField === "date"
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-white/10 bg-black/20 text-white/50 hover:text-white/70"
              }`}
            >
              Date
              {sortField === "date" && (
                <ArrowUpDown className="h-3 w-3" />
              )}
            </button>
            <button
              type="button"
              onClick={() => toggleSort("status")}
              className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                sortField === "status"
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-white/10 bg-black/20 text-white/50 hover:text-white/70"
              }`}
            >
              Status
              {sortField === "status" && (
                <ArrowUpDown className="h-3 w-3" />
              )}
            </button>

            <SlidingIconTabs
              tabs={VIEW_MODE_TABS}
              value={viewMode}
              onChange={setViewMode}
            />
          </div>
        </div>
      )}

      {!loading && !error && tearSheets.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-white/60">No tear sheets yet.</p>
          <p className="mt-2 text-sm text-white/40">
            Create your first quarterly summary to share with investors.
          </p>
        </div>
      )}

      {!loading && displayed.length === 0 && tearSheets.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-sm text-white/60">
            No tear sheets match the selected filters.
          </p>
        </div>
      )}

      {displayed.length > 0 && viewMode === "grid" && (
        <div className="grid gap-4 md:grid-cols-2">
          {displayed.map((ts) => (
            <TearSheetCard
              key={ts.id}
              tearSheet={ts}
              onDelete={() => handleDelete(ts.id)}
            />
          ))}
        </div>
      )}

      {displayed.length > 0 && viewMode === "list" && (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs font-medium text-white/60">
                <th className="px-4 py-2.5">Title</th>
                <th className="px-4 py-2.5">Period</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Updated</th>
                <th className="w-10 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {displayed.map((ts) => {
                const updatedAt = new Date(ts.updated_at).toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric", year: "numeric" },
                );
                return (
                  <tr
                    key={ts.id}
                    className="group transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/portal/tear-sheets/${ts.id}`}
                        className="font-medium hover:text-white/80"
                      >
                        {ts.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      {ts.quarter} {ts.year}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            ts.status === "published"
                              ? "bg-emerald-500/20 text-emerald-200"
                              : "bg-amber-500/20 text-amber-200"
                          }`}
                        >
                          {ts.status === "published" ? "Published" : "Draft"}
                        </span>
                        {ts.share_enabled && (
                          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-200">
                            Shared
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/40">{updatedAt}</td>
                    <td className="px-4 py-3">
                      <TearSheetCard
                        tearSheet={ts}
                        onDelete={() => handleDelete(ts.id)}
                        deleteOnly
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
