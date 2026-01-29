import Link from "next/link";

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CsvImportForm } from "@/components/portfolio/csv-import-form";
import { DownloadCsvButton } from "@/components/portfolio/download-csv-button";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireRole("investor");
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if user has any existing contacts
  const { count } = await supabase
    .from("portfolio_invitations")
    .select("*", { count: "exact", head: true })
    .eq("investor_id", user?.id);

  const hasExistingContacts = (count ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Import Portfolio Contacts</h1>
          <p className="text-sm text-white/60">
            Upload a CSV file with your portfolio company contacts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasExistingContacts && <DownloadCsvButton />}
          <Link
            href="/portfolio"
            className="text-sm text-white/60 hover:text-white"
          >
            Back to Portfolio
          </Link>
        </div>
      </div>

      <CsvImportForm />

      {/* CSV Format Help */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-sm font-medium">CSV Format</h3>
        <p className="mt-2 text-sm text-white/60">
          Your CSV file should include the following columns. Column names are flexible
          (e.g., &quot;Company Name&quot;, &quot;company_name&quot;, or &quot;companyName&quot; all work).
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="pb-2 pr-6 font-medium text-white/70">Column</th>
                <th className="pb-2 pr-6 font-medium text-white/70">Required</th>
                <th className="pb-2 font-medium text-white/70">Example</th>
              </tr>
            </thead>
            <tbody className="text-white/60">
              <tr className="border-b border-white/5">
                <td className="py-2 pr-6">Company Name</td>
                <td className="py-2 pr-6 text-emerald-400">Yes</td>
                <td className="py-2">Acme Corp</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 pr-6">First Name</td>
                <td className="py-2 pr-6 text-emerald-400">Yes</td>
                <td className="py-2">Jane</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 pr-6">Last Name</td>
                <td className="py-2 pr-6 text-emerald-400">Yes</td>
                <td className="py-2">Doe</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 pr-6">Email</td>
                <td className="py-2 pr-6 text-emerald-400">Yes</td>
                <td className="py-2">jane@acme.com</td>
              </tr>
              <tr>
                <td className="py-2 pr-6">Company Website</td>
                <td className="py-2 pr-6 text-white/40">No</td>
                <td className="py-2">https://acme.com</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
