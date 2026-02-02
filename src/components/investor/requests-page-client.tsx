"use client";

import * as React from "react";
import Link from "next/link";
import { Settings2, Plus, CalendarClock } from "lucide-react";

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

export function RequestsPageClient({
  requests,
  companies,
}: {
  requests: Request[];
  companies: Company[];
}) {
  const [statusFilter, setStatusFilter] = React.useState("");
  const [companyFilter, setCompanyFilter] = React.useState("");

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    if (statusFilter && req.status !== statusFilter) return false;
    if (companyFilter && req.company_id !== companyFilter) return false;
    return true;
  });

  // Calculate counts from ALL requests (not filtered)
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const submittedCount = requests.filter((r) => r.status === "submitted").length;

  const statusStyles: Record<string, string> = {
    pending: "bg-amber-500/20 text-amber-200",
    submitted: "bg-emerald-500/20 text-emerald-200",
    overdue: "bg-red-500/20 text-red-200",
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1" data-onboarding="requests-title">
          <h1 className="text-xl font-semibold tracking-tight">Requests</h1>
          <p className="text-sm text-white/60">
            Create and track metric requests across your portfolio.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/70 hover:bg-white/10 hover:text-white"
            href="/requests/schedules"
          >
            <CalendarClock className="h-4 w-4" />
            Schedules
          </Link>
          <Link
            className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/70 hover:bg-white/10 hover:text-white"
            href="/templates"
          >
            <Settings2 className="h-4 w-4" />
            Templates
          </Link>
          <Link
            className="inline-flex h-9 flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-md bg-white px-3 text-sm font-medium text-black hover:bg-white/90"
            href="/requests/new"
            data-onboarding="new-request"
          >
            <Plus className="h-4 w-4 sm:hidden" />
            <span className="sm:hidden">New</span>
            <span className="hidden sm:inline">New request</span>
          </Link>
        </div>
      </div>

      {/* Mobile-only links */}
      <div className="flex sm:hidden gap-2">
        <Link
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/5 py-2.5 text-sm text-white/70"
          href="/requests/schedules"
        >
          <CalendarClock className="h-4 w-4" />
          Schedules
        </Link>
        <Link
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/5 py-2.5 text-sm text-white/70"
          href="/templates"
        >
          <Settings2 className="h-4 w-4" />
          Templates
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <button
          onClick={() => setStatusFilter("")}
          className={`rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4 text-left hover:bg-white/10 transition-colors ${
            statusFilter === "" ? "ring-1 ring-white/20" : ""
          }`}
          type="button"
        >
          <div className="text-xs sm:text-sm text-white/60">Total</div>
          <div className="mt-1 sm:mt-2 text-xl sm:text-2xl font-semibold">{requests.length}</div>
        </button>
        <button
          onClick={() => setStatusFilter("pending")}
          className={`rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4 text-left hover:bg-white/10 transition-colors ${
            statusFilter === "pending" ? "ring-1 ring-amber-500/50" : ""
          }`}
          type="button"
        >
          <div className="text-xs sm:text-sm text-white/60">Pending</div>
          <div className="mt-1 sm:mt-2 text-xl sm:text-2xl font-semibold">{pendingCount}</div>
        </button>
        <button
          onClick={() => setStatusFilter("submitted")}
          className={`rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4 text-left hover:bg-white/10 transition-colors ${
            statusFilter === "submitted" ? "ring-1 ring-emerald-500/50" : ""
          }`}
          type="button"
        >
          <div className="text-xs sm:text-sm text-white/60">Submitted</div>
          <div className="mt-1 sm:mt-2 text-xl sm:text-2xl font-semibold">{submittedCount}</div>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 flex-1 sm:flex-none rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-white/20"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="overdue">Overdue</option>
          </select>

          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="h-10 flex-1 sm:flex-none rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-white/20"
          >
            <option value="">All companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between sm:justify-start gap-3">
          {(statusFilter || companyFilter) && (
            <button
              onClick={() => {
                setStatusFilter("");
                setCompanyFilter("");
              }}
              className="h-10 rounded-md border border-white/10 px-3 text-sm text-white/60 hover:bg-white/5"
              type="button"
            >
              Clear filters
            </button>
          )}

          <span className="text-sm text-white/50">
            {filteredRequests.length} of {requests.length}
          </span>
        </div>
      </div>

      {/* Empty state */}
      {requests.length === 0 ? (
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
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <div className="text-sm text-white/60">No requests match the selected filters.</div>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="space-y-3 sm:hidden">
            {filteredRequests.map((req) => {
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
                      <div className="mt-0.5 text-xs text-white/50">{def?.period_type}</div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${statusStyle}`}>
                      {req.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-white/40">Company</div>
                      {company ? (
                        <Link
                          href={`/dashboard/${company.id}`}
                          className="text-white/70 hover:text-white hover:underline"
                        >
                          {company.name}
                        </Link>
                      ) : (
                        <span className="text-white/50">—</span>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-white/40">Due date</div>
                      <div className="text-white/70">{req.due_date ?? "—"}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-white/40">
                    Period: {req.period_start} to {req.period_end}
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
                    <th className="px-4 py-3 font-medium text-white/70">Metric</th>
                    <th className="px-4 py-3 font-medium text-white/70">Company</th>
                    <th className="px-4 py-3 font-medium text-white/70">Period</th>
                    <th className="px-4 py-3 font-medium text-white/70">Due date</th>
                    <th className="px-4 py-3 font-medium text-white/70">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => {
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
                          <div className="text-xs text-white/50">{def?.period_type}</div>
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
                            <span className="text-white/50">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-white/70 whitespace-nowrap">
                          {req.period_start} to {req.period_end}
                        </td>
                        <td className="px-4 py-3 text-white/50">{req.due_date ?? "—"}</td>
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
        </>
      )}
    </div>
  );
}
