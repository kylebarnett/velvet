import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ComparisonClient } from "@/components/reports/company-comparison/comparison-client";

export const dynamic = "force-dynamic";

type CompanyOption = {
  id: string;
  name: string;
};

export default async function ComparePage() {
  const user = await requireRole("investor");
  const supabase = await createSupabaseServerClient();

  // Fetch the investor's approved companies
  const { data: relationships, error: relError } = await supabase
    .from("investor_company_relationships")
    .select(`
      company_id,
      companies (
        id,
        name
      )
    `)
    .eq("investor_id", user.id)
    .in("approval_status", ["auto_approved", "approved"]);

  const companies: CompanyOption[] = [];

  if (!relError && relationships) {
    for (const rel of relationships) {
      const companyRaw = rel.companies;
      const company = Array.isArray(companyRaw)
        ? (companyRaw[0] as { id: string; name: string } | undefined)
        : (companyRaw as { id: string; name: string } | null);
      if (company) {
        companies.push({ id: company.id, name: company.name });
      }
    }
  }

  // Sort companies alphabetically
  companies.sort((a, b) => a.name.localeCompare(b.name));

  // Fetch distinct metric names from company_metric_values for approved companies
  const companyIds = companies.map((c) => c.id);
  let availableMetrics: string[] = [];

  if (companyIds.length > 0) {
    const { data: metricRows } = await supabase
      .from("company_metric_values")
      .select("metric_name")
      .in("company_id", companyIds);

    if (metricRows) {
      // Deduplicate metric names (case-insensitive, keep first casing)
      const seen = new Map<string, string>();
      for (const row of metricRows) {
        const lower = row.metric_name.toLowerCase().trim();
        if (!seen.has(lower)) {
          seen.set(lower, row.metric_name);
        }
      }
      availableMetrics = Array.from(seen.values()).sort((a, b) =>
        a.toLowerCase().localeCompare(b.toLowerCase())
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-50">Company Comparison</h1>
        <p className="mt-1 text-sm text-white/60">
          Compare metrics across portfolio companies side by side.
        </p>
      </div>

      {companies.length < 2 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-white/60">
            You need at least 2 approved portfolio companies to use comparison.
          </p>
          <a
            href="/portfolio/import"
            className="mt-2 inline-block text-sm underline underline-offset-4 hover:text-white"
          >
            Import contacts to get started
          </a>
        </div>
      ) : (
        <ComparisonClient
          companies={companies}
          availableMetrics={availableMetrics}
        />
      )}
    </div>
  );
}
