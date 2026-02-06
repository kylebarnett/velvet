"use client";

import * as React from "react";
import Link from "next/link";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPeriodRange, formatDate } from "@/lib/utils/format-date";
import { useDebounce } from "@/hooks/use-debounce";

type Request = {
  id: string;
  period_start: string;
  period_end: string;
  status: string;
  due_date: string | null;
  created_at: string;
  company_id: string;
  companies: { id: string; name: string } | { id: string; name: string }[] | null;
  metric_definitions: { name: string; period_type: string } | { name: string; period_type: string }[] | null;
};

type Company = {
  id: string;
  name: string;
};

type StatusCounts = {
  total: number;
  pending: number;
  submitted: number;
};

const PAGE_SIZE = 50;

export function RequestsTabContent({
  companies,
}: {
  requests?: Request[];
  companies: Company[];
}) {
  const [requests, setRequests] = React.useState<Request[]>([]);
  const [statusCounts, setStatusCounts] = React.useState<StatusCounts>({
    total: 0,
    pending: 0,
    submitted: 0,
  });
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState("");
  const [companyFilter, setCompanyFilter] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");
  const debouncedSearch = useDebounce(searchInput, 300);

  const fetchRequests = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(page * PAGE_SIZE));
      if (statusFilter) params.set("status", statusFilter);
      if (companyFilter) params.set("companyId", companyFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/investors/requests?${params}`);
      const json = await res.json();
      if (res.ok) {
        setRequests(json.requests ?? []);
        setTotal(json.total ?? 0);
        if (json.statusCounts) setStatusCounts(json.statusCounts);
      }
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, companyFilter, debouncedSearch]);

  React.useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Reset to page 0 when filters change
  React.useEffect(() => {
    setPage(0);
  }, [statusFilter, companyFilter, debouncedSearch]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const showingStart = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const showingEnd = Math.min((page + 1) * PAGE_SIZE, total);

  const statusStyles: Record<string, string> = {
    pending: "bg-amber-500/20 text-amber-200",
    submitted: "bg-emerald-500/20 text-emerald-200",
    overdue: "bg-red-500/20 text-red-200",
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
        <button
          onClick={() => setStatusFilter("")}
          className={`rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4 text-left hover:bg-white/10 transition-colors ${
            statusFilter === "" ? "ring-1 ring-white/20" : ""
          }`}
          type="button"
        >
          <div className="text-xs sm:text-sm text-white/60">Total</div>
          <div className="mt-1 sm:mt-2 text-xl sm:text-2xl font-semibold">{statusCounts.total}</div>
        </button>
        <button
          onClick={() => setStatusFilter("pending")}
          className={`rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4 text-left hover:bg-white/10 transition-colors ${
            statusFilter === "pending" ? "ring-1 ring-amber-500/50" : ""
          }`}
          type="button"
        >
          <div className="text-xs sm:text-sm text-white/60">Pending</div>
          <div className="mt-1 sm:mt-2 text-xl sm:text-2xl font-semibold">{statusCounts.pending}</div>
        </button>
        <button
          onClick={() => setStatusFilter("submitted")}
          className={`rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4 text-left hover:bg-white/10 transition-colors ${
            statusFilter === "submitted" ? "ring-1 ring-emerald-500/50" : ""
          }`}
          type="button"
        >
          <div className="text-xs sm:text-sm text-white/60">Submitted</div>
          <div className="mt-1 sm:mt-2 text-xl sm:text-2xl font-semibold">{statusCounts.submitted}</div>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
        {/* Search input */}
        <div className="relative flex-1 sm:flex-none sm:min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search metrics..."
            className="h-10 w-full rounded-md border border-white/10 bg-black/30 pl-9 pr-8 text-sm placeholder:text-white/40 focus:border-white/20 focus:outline-none"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-white/40 hover:text-white/70"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <Select value={statusFilter || "__all__"} onValueChange={(v) => setStatusFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger size="sm" className="w-auto min-w-[130px] flex-1 sm:flex-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>

          <Select value={companyFilter || "__all__"} onValueChange={(v) => setCompanyFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger size="sm" className="w-auto min-w-[130px] flex-1 sm:flex-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All companies</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between sm:justify-start gap-3">
          {(statusFilter || companyFilter || searchInput) && (
            <button
              onClick={() => {
                setStatusFilter("");
                setCompanyFilter("");
                setSearchInput("");
              }}
              className="h-10 rounded-md border border-white/10 px-3 text-sm text-white/60 hover:bg-white/5"
              type="button"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      ) : requests.length === 0 && !statusFilter && !companyFilter && !debouncedSearch ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <div className="text-sm text-white/60">No requests yet.</div>
          <div className="mt-2">
            <Link
              href="/requests/new"
              className="text-sm text-white underline underline-offset-4 hover:text-white/80"
            >
              Create your first request
            </Link>
          </div>
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <div className="text-sm text-white/60">No requests match the selected filters.</div>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="space-y-3 sm:hidden">
            {requests.map((req) => {
              const defRaw = req.metric_definitions;
              const def = (Array.isArray(defRaw) ? defRaw[0] : defRaw) as {
                name: string;
                period_type: string;
              } | null;
              const companyRaw = req.companies;
              const company = (Array.isArray(companyRaw) ? companyRaw[0] : companyRaw) as {
                id: string;
                name: string;
              } | null;
              const statusStyle = statusStyles[req.status] ?? "bg-white/10 text-white/60";

              return (
                <div
                  key={req.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{def?.name ?? "Unknown"}</div>
                      <div className="mt-0.5 text-xs text-white/60">{def?.period_type}</div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${statusStyle}`}>
                      {req.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-white/60">Company</div>
                      {company ? (
                        <Link
                          href={`/dashboard/${company.id}`}
                          className="text-white/70 hover:text-white hover:underline"
                        >
                          {company.name}
                        </Link>
                      ) : (
                        <span className="text-white/60">—</span>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-white/60">Due date</div>
                      <div className="text-white/70">
                        {req.due_date ? formatDate(req.due_date) : "—"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-white/60">
                    {formatPeriodRange(req.period_start, req.period_end, def?.period_type)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-hidden rounded-xl border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-white/60">Metric</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-white/60">Company</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-white/60">Period</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-white/60">Due date</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-white/60">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => {
                    const defRaw = req.metric_definitions;
                    const def = (Array.isArray(defRaw) ? defRaw[0] : defRaw) as {
                      name: string;
                      period_type: string;
                    } | null;
                    const companyRaw = req.companies;
                    const company = (Array.isArray(companyRaw) ? companyRaw[0] : companyRaw) as {
                      id: string;
                      name: string;
                    } | null;
                    const statusStyle = statusStyles[req.status] ?? "bg-white/10 text-white/60";

                    return (
                      <tr key={req.id} className="border-b border-white/5">
                        <td className="px-4 py-3">
                          <div className="font-medium">{def?.name ?? "Unknown"}</div>
                          <div className="text-xs text-white/60">{def?.period_type}</div>
                        </td>
                        <td className="px-4 py-3">
                          {company ? (
                            <Link
                              href={`/dashboard/${company.id}`}
                              className="text-white/70 hover:text-white hover:underline"
                            >
                              {company.name}
                            </Link>
                          ) : (
                            <span className="text-white/60">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-white/70 whitespace-nowrap">
                          {formatPeriodRange(req.period_start, req.period_end, def?.period_type)}
                        </td>
                        <td className="px-4 py-3 text-white/60">
                          {req.due_date ? formatDate(req.due_date) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs ${statusStyle}`}>
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">
                Showing {showingStart}–{showingEnd} of {total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-white/60 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 text-sm text-white/60">
                  {page + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-white/60 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
