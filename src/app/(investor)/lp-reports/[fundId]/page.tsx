import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FundDetailClient } from "@/components/lp/fund-detail-client";

export const dynamic = "force-dynamic";

export default async function FundDetailPage({
  params,
}: {
  params: Promise<{ fundId: string }>;
}) {
  const user = await requireRole("investor");
  const supabase = await createSupabaseServerClient();
  const { fundId } = await params;

  // Fetch fund
  const { data: fund } = await supabase
    .from("funds")
    .select("*")
    .eq("id", fundId)
    .eq("investor_id", user.id)
    .single();

  if (!fund) {
    return (
      <div className="space-y-4">
        <Link
          href="/lp-reports"
          className="flex items-center gap-1 text-xs text-white/40 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Funds
        </Link>
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          Fund not found.
        </div>
      </div>
    );
  }

  // Fetch investments with company names
  const { data: rawInvestments } = await supabase
    .from("fund_investments")
    .select("*, companies(id, name)")
    .eq("fund_id", fundId)
    .order("investment_date", { ascending: false });

  const investments = (rawInvestments ?? []).map((inv) => {
    const companyRaw = inv.companies;
    const company = Array.isArray(companyRaw)
      ? (companyRaw[0] as { id: string; name: string } | undefined)
      : (companyRaw as { id: string; name: string } | null);
    return {
      id: inv.id as string,
      fund_id: inv.fund_id as string,
      company_id: inv.company_id as string,
      company_name: company?.name ?? "Unknown",
      invested_amount: Number(inv.invested_amount) || 0,
      current_value: Number(inv.current_value) || 0,
      realized_value: Number(inv.realized_value) || 0,
      investment_date: inv.investment_date as string | null,
      notes: inv.notes as string | null,
      updated_at: inv.updated_at as string,
    };
  });

  // Fetch LP reports
  const { data: reports } = await supabase
    .from("lp_reports")
    .select("*")
    .eq("fund_id", fundId)
    .order("report_date", { ascending: false });

  // Fetch portfolio companies for investment dropdown
  const { data: relationships } = await supabase
    .from("investor_company_relationships")
    .select("company_id, companies(id, name)")
    .eq("investor_id", user.id);

  const companies = (relationships ?? [])
    .map((r) => {
      const companyRaw = r.companies;
      const company = Array.isArray(companyRaw)
        ? (companyRaw[0] as { id: string; name: string } | undefined)
        : (companyRaw as { id: string; name: string } | null);
      return company ?? null;
    })
    .filter((c): c is { id: string; name: string } => c !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <Link
        href="/lp-reports"
        className="flex items-center gap-1 text-xs text-white/40 hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Funds
      </Link>

      <FundDetailClient
        fund={{
          id: fund.id as string,
          name: fund.name as string,
          vintage_year: fund.vintage_year as number,
          fund_size: fund.fund_size ? Number(fund.fund_size) : null,
          currency: (fund.currency as string) ?? "USD",
          created_at: fund.created_at as string,
        }}
        investments={investments}
        reports={(reports ?? []).map((r) => ({
          id: r.id as string,
          fund_id: r.fund_id as string,
          report_date: r.report_date as string,
          report_type: r.report_type as string,
          title: r.title as string,
          status: r.status as string,
          created_at: r.created_at as string,
          content: (r.content ?? null) as Record<string, unknown> | null,
        }))}
        companies={companies}
      />
    </div>
  );
}
