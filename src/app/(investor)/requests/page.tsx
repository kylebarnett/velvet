import Link from "next/link";

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const user = await requireRole("investor");
  const supabase = await createSupabaseServerClient();

  // Fetch all metric requests with company and definition info
  const { data: requests } = await supabase
    .from("metric_requests")
    .select(`
      id,
      period_start,
      period_end,
      status,
      due_date,
      created_at,
      company_id,
      companies (
        id,
        name
      ),
      metric_definitions (
        name,
        period_type
      )
    `)
    .eq("investor_id", user.id)
    .order("created_at", { ascending: false });

  const allRequests = requests ?? [];
  const pendingCount = allRequests.filter((r) => r.status === "pending").length;
  const submittedCount = allRequests.filter((r) => r.status === "submitted").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Requests</h1>
          <p className="text-sm text-white/60">
            Create and track metric requests across your portfolio.
          </p>
        </div>
        <Link
          className="inline-flex h-9 items-center justify-center rounded-md bg-white px-3 text-sm font-medium text-black hover:bg-white/90"
          href="/requests/new"
        >
          New request
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-white/60">Total requests</div>
          <div className="mt-2 text-2xl font-semibold">{allRequests.length}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-white/60">Pending</div>
          <div className="mt-2 text-2xl font-semibold">{pendingCount}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-white/60">Submitted</div>
          <div className="mt-2 text-2xl font-semibold">{submittedCount}</div>
        </div>
      </div>

      {allRequests.length === 0 ? (
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
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
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
              {allRequests.map((req) => {
                const defRaw = req.metric_definitions;
                const def = (Array.isArray(defRaw) ? defRaw[0] : defRaw) as { name: string; period_type: string } | null;
                const companyRaw = req.companies;
                const company = (Array.isArray(companyRaw) ? companyRaw[0] : companyRaw) as { id: string; name: string } | null;
                const statusStyles: Record<string, string> = {
                  pending: "bg-amber-500/20 text-amber-200",
                  submitted: "bg-emerald-500/20 text-emerald-200",
                  overdue: "bg-red-500/20 text-red-200",
                };
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
                    <td className="px-4 py-3 text-white/70">
                      {req.period_start} to {req.period_end}
                    </td>
                    <td className="px-4 py-3 text-white/50">
                      {req.due_date ?? "—"}
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
      )}
    </div>
  );
}
