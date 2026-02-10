import Link from "next/link";

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ContactsTable } from "@/components/portfolio/contacts-table";
import { DownloadCsvButton } from "@/components/portfolio/download-csv-button";

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

  // Get all contacts for proper alphabetical sorting by company name
  const { data: allContacts } = await supabase
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
    .eq("investor_id", user.id);

  // Sort A-Z by company name, then last name
  const sorted = (allContacts ?? []).sort((a, b) => {
    const aCompanies = a.companies as { name: string } | { name: string }[] | null;
    const bCompanies = b.companies as { name: string } | { name: string }[] | null;
    const companyA = (Array.isArray(aCompanies) ? aCompanies[0]?.name : aCompanies?.name) ?? "";
    const companyB = (Array.isArray(bCompanies) ? bCompanies[0]?.name : bCompanies?.name) ?? "";
    const cmp = companyA.localeCompare(companyB, undefined, { sensitivity: "base" });
    if (cmp !== 0) return cmp;
    return (a.last_name ?? "").localeCompare(b.last_name ?? "", undefined, { sensitivity: "base" });
  });

  const contacts = sorted.slice(0, PAGE_LIMIT);

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
          <p className="text-sm text-text-tertiary">
            Manage your portfolio companies and founder contacts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DownloadCsvButton />
          <Link
            href="/portfolio/add"
            className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-elevated px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            data-onboarding="add-contact"
          >
            Add Contact
          </Link>
          <Link
            href="/portfolio/import"
            className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-elevated px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            data-onboarding="import-csv"
          >
            Import CSV
          </Link>
        </div>
      </div>

      {/* Portfolio Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
        <Link
          href="/dashboard"
          className="rounded-xl border border-border-default bg-bg-elevated p-3 sm:p-4 hover:bg-bg-hover transition-colors"
        >
          <div className="text-xs sm:text-sm text-text-tertiary">Companies</div>
          <div className="mt-1 text-lg sm:text-2xl font-semibold">{companyCount ?? 0}</div>
        </Link>
        <Link
          href="/campaigns"
          className="rounded-xl border border-border-default bg-bg-elevated p-3 sm:p-4 hover:bg-bg-hover transition-colors"
        >
          <div className="text-xs sm:text-sm text-text-tertiary">Pending</div>
          <div className="mt-1 text-lg sm:text-2xl font-semibold">{pendingRequests ?? 0}</div>
        </Link>
        <Link
          href="/documents"
          className="rounded-xl border border-border-default bg-bg-elevated p-3 sm:p-4 hover:bg-bg-hover transition-colors"
        >
          <div className="text-xs sm:text-sm text-text-tertiary">New Docs</div>
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
