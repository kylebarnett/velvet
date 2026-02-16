import Link from "next/link";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { requireRole } from "@/lib/auth/require-role";
import { unwrapJoin } from "@/lib/api/utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ContactsTable } from "@/components/portfolio/contacts-table";
import { AddContactButton } from "@/components/portfolio/add-contact-button";

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

  // Fetch all contacts — referencedTable ordering only sorts embedded rows,
  // NOT parent rows by the joined column, so we must sort in JS.
  const { data: allContacts } = await supabase
    .from("portfolio_invitations")
    .select(`
      id,
      email,
      first_name,
      last_name,
      position,
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

  // Sort A→Z by company name, then last name
  const sorted = (allContacts ?? []).sort((a, b) => {
    const companyA = (unwrapJoin(a.companies) as { name: string } | null)?.name ?? "";
    const companyB = (unwrapJoin(b.companies) as { name: string } | null)?.name ?? "";
    const cmp = companyA.localeCompare(companyB, undefined, { sensitivity: "base" });
    if (cmp !== 0) return cmp;
    return (a.last_name ?? "").localeCompare(b.last_name ?? "", undefined, { sensitivity: "base" });
  });

  const contacts = sorted.slice(0, PAGE_LIMIT);

  // Count accepted invitations
  const { count: acceptedCount } = await supabase
    .from("portfolio_invitations")
    .select("id", { count: "exact", head: true })
    .eq("investor_id", user.id)
    .eq("status", "accepted");

  // Count awaiting response (pending + sent)
  const { count: awaitingCount } = await supabase
    .from("portfolio_invitations")
    .select("id", { count: "exact", head: true })
    .eq("investor_id", user.id)
    .in("status", ["pending", "sent"]);

  const initialPagination = {
    page: 1,
    limit: PAGE_LIMIT,
    total,
    totalPages: Math.ceil(total / PAGE_LIMIT),
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Breadcrumbs items={[{ label: "Portfolio" }]} />
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight" data-onboarding="portfolio-title">Contacts</h1>
        </div>
        <div className="flex items-center gap-2">
          <AddContactButton />
          <Link
            href="/contacts/import"
            className="inline-flex items-center gap-2 rounded-md bg-btn-primary-bg px-3 py-1.5 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover"
            data-onboarding="import-csv"
          >
            Import CSV
          </Link>
        </div>
      </div>

      <ContactsTable
        initialContacts={contacts ?? []}
        initialPagination={initialPagination}
        initialStats={{
          accepted: acceptedCount ?? 0,
          awaiting: awaitingCount ?? 0,
        }}
      />
    </div>
  );
}
