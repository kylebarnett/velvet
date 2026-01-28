import Link from "next/link";

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function InvestorDashboardPage() {
  const user = await requireRole("investor");
  const supabase = await createSupabaseServerClient();

  // Get portfolio companies
  const { data: relationships } = await supabase
    .from("investor_company_relationships")
    .select(`
      id,
      approval_status,
      companies (
        id,
        name,
        founder_id,
        stage,
        industry
      )
    `)
    .eq("investor_id", user.id)
    .order("created_at", { ascending: false });

  const companies = (relationships ?? []).map((r) => ({
    ...(r.companies as any),
    approvalStatus: r.approval_status,
  }));

  // Count pending requests
  const { count: pendingRequests } = await supabase
    .from("metric_requests")
    .select("id", { count: "exact", head: true })
    .eq("investor_id", user.id)
    .eq("status", "pending");

  // Count recent submissions (this week)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { count: recentSubmissions } = await supabase
    .from("metric_requests")
    .select("id", { count: "exact", head: true })
    .eq("investor_id", user.id)
    .eq("status", "submitted")
    .gte("updated_at", weekAgo.toISOString());

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-white/60">
          Portfolio overview and recent metric activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Portfolio companies", value: String(companies.length) },
          { label: "Pending requests", value: String(pendingRequests ?? 0) },
          { label: "Submitted this week", value: String(recentSubmissions ?? 0) },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="text-sm text-white/60">{card.label}</div>
            <div className="mt-2 text-2xl font-semibold">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-medium">Portfolio companies</div>
        {companies.length === 0 ? (
          <div className="mt-3 text-sm text-white/60">
            No companies in your portfolio yet.{" "}
            <Link href="/portfolio/import" className="underline underline-offset-4 hover:text-white">
              Import contacts
            </Link>{" "}
            to get started.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {companies.map((company: any) => (
              <Link
                key={company.id}
                href={`/dashboard/${company.id}`}
                className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2 hover:bg-white/5"
              >
                <div>
                  <span className="text-sm font-medium">{company.name}</span>
                  {company.stage && (
                    <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50">
                      {company.stage.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {company.founder_id ? (
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200">
                      Pending
                    </span>
                  )}
                  <span className="text-xs text-white/40">
                    {company.approvalStatus === "auto_approved" || company.approvalStatus === "approved"
                      ? "Approved"
                      : company.approvalStatus === "denied"
                        ? "Denied"
                        : "Awaiting approval"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
