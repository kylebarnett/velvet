import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReportEditor } from "@/components/lp/report-editor";

export const dynamic = "force-dynamic";

export default async function ReportEditorPage({
  params,
}: {
  params: Promise<{ fundId: string; reportId: string }>;
}) {
  const user = await requireRole("investor");
  const supabase = await createSupabaseServerClient();
  const { fundId, reportId } = await params;

  // Fetch fund (verify ownership)
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

  // Fetch report (verify it belongs to this fund)
  const { data: report } = await supabase
    .from("lp_reports")
    .select("*")
    .eq("id", reportId)
    .eq("fund_id", fundId)
    .single();

  if (!report) {
    return (
      <div className="space-y-4">
        <Link
          href={`/lp-reports/${fundId}?tab=reports`}
          className="flex items-center gap-1 text-xs text-white/40 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Fund
        </Link>
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          Report not found.
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
      company_id: inv.company_id as string,
      company_name: company?.name ?? "Unknown",
      invested_amount: Number(inv.invested_amount) || 0,
      current_value: Number(inv.current_value) || 0,
      realized_value: Number(inv.realized_value) || 0,
    };
  });

  return (
    <ReportEditor
      fund={{
        id: fund.id as string,
        name: fund.name as string,
        vintage_year: fund.vintage_year as number,
        fund_size: fund.fund_size ? Number(fund.fund_size) : null,
        currency: (fund.currency as string) ?? "USD",
      }}
      report={{
        id: report.id as string,
        fund_id: report.fund_id as string,
        report_date: report.report_date as string,
        report_type: report.report_type as string,
        title: report.title as string,
        status: report.status as string,
        content: (report.content ?? null) as Record<string, unknown> | null,
      }}
      investments={investments}
    />
  );
}
