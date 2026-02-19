import type { Metadata } from "next";
import Link from "next/link";
import nextDynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = { title: "LP Report Editor | Velvet" };

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

const ReportEditor = nextDynamic(
  () =>
    import("@/components/lp/report-editor").then((mod) => ({
      default: mod.ReportEditor,
    })),
  {
    loading: () => (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-48 animate-pulse rounded bg-bg-elevated" />
            <div className="mt-1 h-3 w-24 animate-pulse rounded bg-bg-elevated" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-20 animate-pulse rounded-md bg-bg-elevated" />
            <div className="h-9 w-16 animate-pulse rounded-md bg-bg-elevated" />
            <div className="h-9 w-20 animate-pulse rounded-md bg-bg-elevated" />
          </div>
        </div>
        {/* Two-column skeleton */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="rounded-xl border border-border-default card-surface p-4">
              <div className="h-3 w-24 animate-pulse rounded bg-bg-hover" />
              <div className="mt-4 h-11 w-full animate-pulse rounded-md bg-bg-elevated" />
            </div>
            <div className="rounded-xl border border-border-default card-surface p-4">
              <div className="h-3 w-32 animate-pulse rounded bg-bg-hover" />
              <div className="mt-3 h-24 w-full animate-pulse rounded-md bg-bg-elevated" />
            </div>
          </div>
          <div className="rounded-xl border border-border-default card-surface p-6">
            <div className="h-3 w-20 animate-pulse rounded bg-bg-hover" />
            <div className="mt-2 h-6 w-48 animate-pulse rounded bg-bg-elevated" />
          </div>
        </div>
      </div>
    ),
  }
);

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
          href="/funds"
          className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Funds
        </Link>
        <div className="rounded-xl border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] p-4 text-sm text-[var(--status-error-text)]">
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
          href={`/funds/${fundId}?tab=reports`}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Fund
        </Link>
        <div className="rounded-xl border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] p-4 text-sm text-[var(--status-error-text)]">
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
    <div className="space-y-6">
      <Breadcrumbs icon="landmark" items={[
        { label: "Funds", href: "/funds" },
        { label: fund.name as string, href: `/funds/${fundId}` },
        { label: report.title as string },
      ]} />
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
    </div>
  );
}
