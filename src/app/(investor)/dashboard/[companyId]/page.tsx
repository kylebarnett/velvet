import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CompanySwitcher } from "@/components/investor/company-switcher";
import { InlineTags } from "@/components/investor/inline-tag";
import { InlineWebsite } from "@/components/investor/inline-website";
import { CompanyDashboardTabs } from "@/components/investor/company-dashboard-tabs";
import type { MetricValue } from "@/components/dashboard";
import { CompanyDashboardClient } from "./company-dashboard-client";

export const dynamic = "force-dynamic";

export default async function CompanyDashboardPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const user = await requireRole("investor");
  const supabase = await createSupabaseServerClient();

  const { companyId } = await params;

  // Verify relationship
  const { data: relationship } = await supabase
    .from("investor_company_relationships")
    .select("id, approval_status, logo_url")
    .eq("investor_id", user.id)
    .eq("company_id", companyId)
    .single();

  if (!relationship) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
        Company not in your portfolio.
      </div>
    );
  }

  // Get company info
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, website, stage, industry, business_model, founder_id")
    .eq("id", companyId)
    .single();

  if (!company) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
        Company not found.
      </div>
    );
  }

  const isApproved =
    relationship.approval_status === "auto_approved" ||
    relationship.approval_status === "approved";

  // Get metric values if approved
  let metricValues: MetricValue[] = [];
  if (isApproved) {
    const { data } = await supabase
      .from("company_metric_values")
      .select("id, metric_name, period_type, period_start, period_end, value, notes, submitted_at, updated_at")
      .eq("company_id", companyId)
      .order("period_start", { ascending: false });
    metricValues = (data ?? []) as MetricValue[];
  }

  // Get dashboard views for this company
  const { data: views } = await supabase
    .from("dashboard_views")
    .select("id, name, is_default, layout")
    .eq("investor_id", user.id)
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  // Get dashboard templates
  const { data: templates } = await supabase
    .from("dashboard_templates")
    .select("id, name, description, target_industry, layout, is_system")
    .order("name", { ascending: true });

  // Get all portfolio companies for the switcher
  const { data: allRelationships } = await supabase
    .from("investor_company_relationships")
    .select(`
      id,
      logo_url,
      companies (
        id,
        name,
        industry,
        stage
      )
    `)
    .eq("investor_id", user.id)
    .in("approval_status", ["auto_approved", "approved"]);

  const portfolioCompanies = (allRelationships ?? [])
    .map((r) => {
      const companyRaw = r.companies;
      const companyData = Array.isArray(companyRaw)
        ? (companyRaw[0] as { id: string; name: string; industry: string | null; stage: string | null } | undefined)
        : (companyRaw as { id: string; name: string; industry: string | null; stage: string | null } | null);
      if (!companyData) return null;
      return {
        id: companyData.id,
        name: companyData.name,
        logoUrl: r.logo_url,
        industry: companyData.industry,
        stage: companyData.stage,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1 text-xs text-white/40 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">All Companies</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <CompanySwitcher
              currentCompanyId={companyId}
              currentCompanyName={company.name}
              companies={portfolioCompanies}
            />
            {company.founder_id ? (
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">
                Founder joined
              </span>
            ) : (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200">
                Pending signup
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <InlineTags
              companyId={company.id}
              stage={company.stage}
              industry={company.industry}
              businessModel={company.business_model}
            />
            <InlineWebsite companyId={company.id} website={company.website} />
          </div>
        </div>
        {isApproved && (
          <div className="shrink-0">
            <CompanyDashboardTabs companyId={companyId} />
          </div>
        )}
      </div>

      {!isApproved && (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Your access is {relationship.approval_status}. The founder needs to approve your access before you can see metric data.
        </div>
      )}

      {isApproved && (
        <CompanyDashboardClient
          companyId={companyId}
          companyName={company.name}
          companyIndustry={company.industry}
          metrics={metricValues}
          views={views ?? []}
          templates={templates ?? []}
        />
      )}

      {!isApproved && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-white/60">Metrics will appear here once your access is approved.</p>
        </div>
      )}
    </div>
  );
}
