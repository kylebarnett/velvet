import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";

export const metadata: Metadata = { title: "Company Dashboard | Velvet" };
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CompanySwitcher } from "@/components/investor/company-switcher";
import { InlineTags } from "@/components/investor/inline-tag";
import { InlineWebsite } from "@/components/investor/inline-website";
import { CompanyDashboardTabs } from "@/components/investor/company-dashboard-tabs";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { AddMetricButton } from "@/components/investor/add-metric-button";
import { CompanyCardMenu } from "@/components/investor/company-card-menu";
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
    .select("id, approval_status, logo_url, is_hidden, created_at")
    .eq("investor_id", user.id)
    .eq("company_id", companyId)
    .single();

  if (!relationship) {
    return (
      <div className="rounded-xl border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] p-4 text-sm text-[var(--status-error-text)]">
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
      <div className="rounded-xl border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] p-4 text-sm text-[var(--status-error-text)]">
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
          <Breadcrumbs items={[
            { label: "Companies", href: "/companies" },
            { label: company.name },
          ]} />
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <CompanySwitcher
              currentCompanyId={companyId}
              currentCompanyName={company.name}
              companies={portfolioCompanies}
            />
            {(() => {
              const isDenied = relationship.approval_status === "denied";

              const dotColor = isDenied
                ? "bg-[var(--status-error-text)]"
                : isApproved
                  ? "bg-[var(--status-success-text)]"
                  : "bg-[var(--status-warning-text)]";

              const pillBg = isDenied
                ? "bg-[var(--status-error-bg)]"
                : isApproved
                  ? "bg-[var(--status-success-bg)]"
                  : "bg-[var(--status-warning-bg)]";

              const pillText = isDenied
                ? "text-[var(--status-error-text)]"
                : isApproved
                  ? "text-[var(--status-success-text)]"
                  : "text-[var(--status-warning-text)]";

              const label = isDenied
                ? "Access denied"
                : isApproved
                  ? "Connected"
                  : !company.founder_id
                    ? "Awaiting founder signup"
                    : "Pending approval";

              return (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${pillBg} ${pillText}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                  {label}
                </span>
              );
            })()}
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
        <div className="flex shrink-0 items-center gap-2">
          <AddMetricButton companyId={companyId} companyName={company.name} />
          {isApproved && (
            <CompanyDashboardTabs companyId={companyId} />
          )}
          <CompanyCardMenu
            companyId={companyId}
            companyName={company.name}
            isHidden={relationship.is_hidden ?? false}
          />
        </div>
      </div>

      {!isApproved && (
        <div className="rounded-md border border-[var(--status-warning-bg)] bg-[var(--status-warning-bg)] px-3 py-2 text-sm text-[var(--status-warning-text)]">
          {relationship.approval_status === "denied"
            ? "The founder has denied access to their data. Metric data is not available."
            : !company.founder_id
              ? <>This company&apos;s founder hasn&apos;t joined Velvet yet. You can manage their invitation from your <Link href="/contacts" className="underline underline-offset-2 hover:text-[var(--status-warning-text)]">contacts page</Link>.</>
              : `Pending founder approval${relationship.created_at ? ` since ${new Date(relationship.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}. The founder needs to approve your access before you can view their metrics and documents.`}
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
        <div className="py-12 text-center">
          <p className="text-sm text-text-secondary">
            Founder metrics will appear here once your access is approved.
            You can add your own metrics in the meantime.
          </p>
          <div className="mt-4">
            <AddMetricButton companyId={companyId} companyName={company.name} size="md" />
          </div>
        </div>
      )}
    </div>
  );
}
