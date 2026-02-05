"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export function RequestsTabContent({
  requests,
  companies,
}: {
  requests: Request[];
  companies: Company[];
}) {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") ?? "";
  const [statusFilter, setStatusFilter] = React.useState(initialStatus);
  const [companyFilter, setCompanyFilter] = React.useState("");

  const filteredRequests = requests.filter((req) => {
    if (statusFilter && req.status !== statusFilter) return false;
    if (companyFilter && req.company_id !== companyFilter) return false;
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const submittedCount = requests.filter((r) => r.status === "submitted").length;

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
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-white/50">Metric</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-white/50">Company</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-white/50">Period</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-white/50">Due date</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-white/50">Status</th>
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
