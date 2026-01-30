import Link from "next/link";

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DashboardCompanyList } from "@/components/investor/dashboard-company-list";

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
      logo_url,
      companies (
        id,
        name,
        website,
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
    logoUrl: r.logo_url,
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
          <DashboardCompanyList companies={companies} />
        )}
      </div>
    </div>
  );
}
