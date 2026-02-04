import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  confirmation: z.literal("DELETE MY ACCOUNT"),
});

// POST - Delete user account and cascade data (GDPR right to erasure)
export async function POST(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(
      'Please send { "confirmation": "DELETE MY ACCOUNT" } to confirm.',
      400,
    );
  }

  const adminClient = createSupabaseAdminClient();
  const userId = user.id;
  const role = user.user_metadata?.role;

  // Cascade delete user-owned data before removing auth user
  if (role === "investor") {
    // Delete in dependency order (children first)
    await adminClient
      .from("metric_request_reminders")
      .delete()
      .in(
        "schedule_id",
        (await adminClient
          .from("metric_request_schedules")
          .select("id")
          .eq("investor_id", userId)
        ).data?.map((s) => s.id) ?? [],
      );

    await adminClient
      .from("scheduled_request_runs")
      .delete()
      .in(
        "schedule_id",
        (await adminClient
          .from("metric_request_schedules")
          .select("id")
          .eq("investor_id", userId)
        ).data?.map((s) => s.id) ?? [],
      );

    await adminClient
      .from("metric_request_schedules")
      .delete()
      .eq("investor_id", userId);

    await adminClient
      .from("portfolio_reports")
      .delete()
      .eq("investor_id", userId);

    await adminClient
      .from("dashboard_views")
      .delete()
      .eq("investor_id", userId);

    await adminClient
      .from("metric_requests")
      .delete()
      .eq("investor_id", userId);

    await adminClient
      .from("metric_definitions")
      .delete()
      .eq("investor_id", userId);

    // Delete user's own templates (not system templates)
    const { data: userTemplates } = await adminClient
      .from("metric_templates")
      .select("id")
      .eq("investor_id", userId);

    if (userTemplates && userTemplates.length > 0) {
      const templateIds = userTemplates.map((t) => t.id);
      await adminClient
        .from("metric_template_items")
        .delete()
        .in("template_id", templateIds);
      await adminClient
        .from("metric_templates")
        .delete()
        .eq("investor_id", userId);
    }

    await adminClient
      .from("portfolio_invitations")
      .delete()
      .eq("investor_id", userId);

    await adminClient
      .from("investor_company_relationships")
      .delete()
      .eq("investor_id", userId);
  } else if (role === "founder") {
    // Get founder's companies
    const { data: companies } = await adminClient
      .from("companies")
      .select("id")
      .eq("founder_id", userId);

    const companyIds = (companies ?? []).map((c) => c.id);

    if (companyIds.length > 0) {
      // Delete company-owned data
      await adminClient
        .from("documents")
        .delete()
        .in("company_id", companyIds);

      await adminClient
        .from("company_metric_values")
        .delete()
        .in("company_id", companyIds);

      // Nullify founder_id so companies persist for other investors
      await adminClient
        .from("companies")
        .update({ founder_id: null })
        .eq("founder_id", userId);
    }
  }

  // Delete the public.users row (triggers should handle this, but explicit)
  await adminClient.from("users").delete().eq("id", userId);

  // Delete auth user
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteError) {
    return jsonError("Failed to delete account. Please contact support.", 500);
  }

  return NextResponse.json({ ok: true, message: "Account deleted." });
}
