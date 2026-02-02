import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ScheduleWizard } from "@/components/investor/schedule-wizard";

export default async function NewSchedulePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.user_metadata?.role !== "investor") redirect("/portal");

  // Fetch templates (system + user)
  const { data: templates, error: templatesError } = await supabase
    .from("metric_templates")
    .select(`
      id,
      name,
      description,
      is_system,
      target_industry,
      metric_template_items (
        id,
        metric_name,
        period_type,
        data_type,
        sort_order
      )
    `)
    .or(`is_system.eq.true,investor_id.eq.${user.id}`)
    .order("is_system", { ascending: false })
    .order("name");

  if (templatesError) {
    console.error("Failed to fetch templates:", templatesError);
  }

  // Fetch portfolio companies
  const { data: relationships, error: relError } = await supabase
    .from("investor_company_relationships")
    .select(`
      company_id,
      companies (
        id,
        name,
        industry,
        stage
      )
    `)
    .eq("investor_id", user.id);

  if (relError) {
    console.error("Failed to fetch companies:", relError);
  }

  // Format templates
  const formattedTemplates = (templates ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    isSystem: t.is_system,
    targetIndustry: t.target_industry,
    metric_template_items: (t.metric_template_items ?? []).sort(
      (a: { sort_order: number }, b: { sort_order: number }) =>
        a.sort_order - b.sort_order
    ),
  }));

  // Format companies
  const companies = (relationships ?? [])
    .map((r) => {
      const company = Array.isArray(r.companies) ? r.companies[0] : r.companies;
      if (!company) return null;
      return {
        id: company.id,
        name: company.name,
        industry: company.industry,
        stage: company.stage,
      };
    })
    .filter(Boolean) as { id: string; name: string; industry: string | null; stage: string | null }[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/requests/schedules"
          className="mt-1 flex h-8 w-8 items-center justify-center rounded-md border border-white/10 hover:bg-white/5"
        >
          <ArrowLeft className="h-4 w-4 text-white/50" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">New Schedule</h1>
          <p className="mt-1 text-sm text-white/60">
            Set up automated recurring metric requests.
          </p>
        </div>
      </div>

      {/* Wizard */}
      <ScheduleWizard templates={formattedTemplates} companies={companies} />
    </div>
  );
}
