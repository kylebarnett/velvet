import Link from "next/link";

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ContactsTable } from "@/components/portfolio/contacts-table";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const user = await requireRole("investor");
  const supabase = await createSupabaseServerClient();

  const { data: contacts } = await supabase
    .from("portfolio_invitations")
    .select(`
      id,
      email,
      first_name,
      last_name,
      status,
      invite_token,
      sent_at,
      accepted_at,
      created_at,
      company_id,
      companies (
        id,
        name,
        founder_id
      )
    `)
    .eq("investor_id", user.id)
    .order("created_at", { ascending: false });

  // Count pending invitations (not yet accepted)
  const pendingInvitations = (contacts ?? []).filter(
    (c) => c.status === "pending" || c.status === "sent"
  ).length;

  // Count pending requests
  const { count: pendingRequests } = await supabase
    .from("metric_requests")
    .select("id", { count: "exact", head: true })
    .eq("investor_id", user.id)
    .eq("status", "pending");

  // Count new documents this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { count: newDocuments } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .gte("created_at", weekAgo.toISOString());

  // Get companies needing attention (pending approval or no founder signup)
  const { data: relationships } = await supabase
    .from("investor_company_relationships")
    .select("approval_status, companies (founder_id)")
    .eq("investor_id", user.id);

  const needsAttention = (relationships ?? []).filter((r) => {
    const companyRaw = r.companies;
    const company = (Array.isArray(companyRaw) ? companyRaw[0] : companyRaw) as { founder_id: string | null } | null;
    return (
      r.approval_status === "pending" ||
      r.approval_status === "denied" ||
      !company?.founder_id
    );
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div data-onboarding="portfolio-title">
          <h1 className="text-2xl font-semibold">Portfolio</h1>
          <p className="text-sm text-white/60">
            Manage your portfolio companies and founder contacts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/portfolio/add"
            className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 bg-white/5 px-4 text-sm font-medium text-white hover:bg-white/10"
            data-onboarding="add-contact"
          >
            Add Contact
          </Link>
          <Link
            href="/portfolio/import"
            className="inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90"
            data-onboarding="import-csv"
          >
            Import CSV
          </Link>
        </div>
      </div>

      {/* Portfolio Insights */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-white/60">Pending Invitations</div>
          <div className="mt-1 text-2xl font-semibold">{pendingInvitations}</div>
        </div>
        <Link
          href="/requests"
          className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
        >
          <div className="text-sm text-white/60">Pending Requests</div>
          <div className="mt-1 text-2xl font-semibold">{pendingRequests ?? 0}</div>
        </Link>
        <Link
          href="/documents"
          className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
        >
          <div className="text-sm text-white/60">New Documents (7d)</div>
          <div className="mt-1 text-2xl font-semibold">{newDocuments ?? 0}</div>
        </Link>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-white/60">Needs Attention</div>
          <div className="mt-1 text-2xl font-semibold">{needsAttention}</div>
        </div>
      </div>

      <ContactsTable contacts={contacts ?? []} />
    </div>
  );
}
