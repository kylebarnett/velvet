import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";

// POST - Export all user data (GDPR data portability)
export async function POST() {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  const userId = user.id;

  const exportData: Record<string, unknown> = {
    user: {
      id: userId,
      email: user.email,
      role,
      full_name: user.user_metadata?.full_name ?? null,
      created_at: user.created_at,
    },
  };

  if (role === "investor") {
    // Portfolio relationships
    const { data: relationships } = await supabase
      .from("investor_company_relationships")
      .select("id, company_id, approval_status, is_inviting_investor, created_at")
      .eq("investor_id", userId);
    exportData.relationships = relationships ?? [];

    // Portfolio invitations
    const { data: invitations } = await supabase
      .from("portfolio_invitations")
      .select("id, email, first_name, last_name, company_name, status, created_at")
      .eq("investor_id", userId);
    exportData.invitations = invitations ?? [];

    // Metric definitions
    const { data: definitions } = await supabase
      .from("metric_definitions")
      .select("id, name, period_type, data_type, created_at")
      .eq("investor_id", userId);
    exportData.metric_definitions = definitions ?? [];

    // Metric requests
    const { data: requests } = await supabase
      .from("metric_requests")
      .select("id, company_id, metric_definition_id, period_start, period_end, due_date, status, created_at")
      .eq("investor_id", userId);
    exportData.metric_requests = requests ?? [];

    // Metric templates
    const { data: templates } = await supabase
      .from("metric_templates")
      .select("id, name, description, created_at, metric_template_items(id, metric_name, period_type, data_type, sort_order)")
      .eq("investor_id", userId);
    exportData.metric_templates = templates ?? [];

    // Dashboard views
    const { data: views } = await supabase
      .from("dashboard_views")
      .select("id, company_id, name, is_default, layout, created_at")
      .eq("investor_id", userId);
    exportData.dashboard_views = views ?? [];

    // Portfolio reports
    const { data: reports } = await supabase
      .from("portfolio_reports")
      .select("id, name, report_type, filters, company_ids, config, created_at")
      .eq("investor_id", userId);
    exportData.portfolio_reports = reports ?? [];

    // Schedules
    const { data: schedules } = await supabase
      .from("metric_request_schedules")
      .select("id, name, cadence, day_of_month, company_ids, is_active, created_at")
      .eq("investor_id", userId);
    exportData.schedules = schedules ?? [];
  } else if (role === "founder") {
    // Company data
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name, website, founder_email, stage, industry, business_model, created_at")
      .eq("founder_id", userId);
    exportData.companies = companies ?? [];

    const companyIds = (companies ?? []).map((c) => c.id);

    if (companyIds.length > 0) {
      // Metric values
      const { data: metricValues } = await supabase
        .from("company_metric_values")
        .select("id, company_id, metric_name, period_type, period_start, period_end, value, created_at")
        .in("company_id", companyIds);
      exportData.metric_values = metricValues ?? [];

      // Documents (metadata only, not file content)
      const { data: documents } = await supabase
        .from("documents")
        .select("id, company_id, file_name, file_type, file_size, document_type, description, uploaded_at")
        .in("company_id", companyIds);
      exportData.documents = documents ?? [];
    }
  }

  return NextResponse.json({
    exported_at: new Date().toISOString(),
    data: exportData,
  });
}
