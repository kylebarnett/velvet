import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CompanyProfile } from "@/components/founder/company-profile";

export const metadata: Metadata = { title: "Company Profile | Velvet" };
export const dynamic = "force-dynamic";

export default async function FounderCompanyPage() {
  const user = await requireRole("founder");
  const supabase = await createSupabaseServerClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, website, industry, stage, business_model, description, founded_date, hq_location, headcount, total_funding_raised, last_round_amount, last_round_date, logo_url")
    .eq("founder_id", user.id)
    .single();

  if (!company) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-text-secondary">No company found for your account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs icon="layout-dashboard" items={[{ label: "Dashboard", href: "/portal" }, { label: "Company Profile" }]} />
      <CompanyProfile company={company} />
    </div>
  );
}
