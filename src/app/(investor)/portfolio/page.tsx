import Link from "next/link";

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ContactsTable } from "@/components/portfolio/contacts-table";

export const dynamic = "force-dynamic";

const PAGE_LIMIT = 50;

export default async function PortfolioPage() {
  const user = await requireRole("investor");
  const supabase = await createSupabaseServerClient();

  // Get total count
  const { count: totalCount } = await supabase
    .from("portfolio_invitations")
    .select("id", { count: "exact", head: true })
    .eq("investor_id", user.id);

  const total = totalCount ?? 0;

  // Get first page of contacts
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
    .order("created_at", { ascending: false })
    .range(0, PAGE_LIMIT - 1);

  // Count companies
  const { count: companyCount } = await supabase
    .from("investor_company_relationships")
    .select("id", { count: "exact", head: true })
    .eq("investor_id", user.id);

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
    .gte("uploaded_at", weekAgo.toISOString());

  const initialPagination = {
    page: 1,
    limit: PAGE_LIMIT,
    total,
    totalPages: Math.ceil(total / PAGE_LIMIT),
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div data-onboarding="portfolio-title">
          <h1 className="text-xl sm:text-2xl font-semibold">Portfolio</h1>
          <p className="text-sm text-white/60">
            Manage your portfolio companies and founder contacts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/portfolio/add"
            className="inline-flex h-10 flex-1 sm:flex-none items-center justify-center rounded-md border border-white/10 bg-white/5 px-4 text-sm font-medium text-white hover:bg-white/10"
            data-onboarding="add-contact"
          >
            Add Contact
          </Link>
          <Link
            href="/portfolio/import"
            className="inline-flex h-10 flex-1 sm:flex-none items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90"
            data-onboarding="import-csv"
          >
            Import CSV
          </Link>
        </div>
      </div>

      {/* Portfolio Insights */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Link
          href="/dashboard"
          className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4 hover:bg-white/10 transition-colors"
        >
          <div className="text-xs sm:text-sm text-white/60">Companies</div>
          <div className="mt-1 text-lg sm:text-2xl font-semibold">{companyCount ?? 0}</div>
        </Link>
        <Link
          href="/requests"
          className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4 hover:bg-white/10 transition-colors"
        >
          <div className="text-xs sm:text-sm text-white/60">Pending</div>
          <div className="mt-1 text-lg sm:text-2xl font-semibold">{pendingRequests ?? 0}</div>
        </Link>
        <Link
          href="/documents"
          className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4 hover:bg-white/10 transition-colors"
        >
          <div className="text-xs sm:text-sm text-white/60">New Docs</div>
          <div className="mt-1 text-lg sm:text-2xl font-semibold">{newDocuments ?? 0}</div>
        </Link>
      </div>

      <ContactsTable
        initialContacts={contacts ?? []}
        initialPagination={initialPagination}
      />
    </div>
  );
}
