import Link from "next/link";

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ContactsTable } from "@/components/portfolio/contacts-table";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  await requireRole("investor");
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    .eq("investor_id", user?.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Portfolio</h1>
          <p className="text-sm text-white/60">
            Manage your portfolio companies and founder contacts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/portfolio/add"
            className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 bg-white/5 px-4 text-sm font-medium text-white hover:bg-white/10"
          >
            Add Contact
          </Link>
          <Link
            href="/portfolio/import"
            className="inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90"
          >
            Import CSV
          </Link>
        </div>
      </div>

      <ContactsTable contacts={contacts ?? []} />
    </div>
  );
}
