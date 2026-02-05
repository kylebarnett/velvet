import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const createSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET() {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  // Get organizations the user is a member of
  const { data: memberships, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(id, name, org_type, owner_id, created_at)")
    .eq("user_id", user.id);

  const orgs = (memberships ?? []).map((m) => {
    const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
    return {
      id: org?.id,
      name: org?.name,
      orgType: org?.org_type,
      ownerId: org?.owner_id,
      myRole: m.role,
      createdAt: org?.created_at,
    };
  }).filter((o) => o.id);

  return NextResponse.json({ organizations: orgs });
}

export async function POST(req: Request) {
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor" && role !== "founder") {
    return jsonError("Forbidden.", 403);
  }

  // Check if user already owns an org (invited members should still be able to create their own)
  const { data: existing } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1);

  if (existing && existing.length > 0) {
    return jsonError("You already own an organization.", 400);
  }

  const admin = createSupabaseAdminClient();

  // Create organization
  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({
      name: parsed.data.name,
      org_type: role,
      owner_id: user.id,
    })
    .select("id")
    .single();

  if (orgErr) return jsonError(orgErr.message, 400);

  // Add creator as admin member
  await admin.from("organization_members").insert({
    organization_id: org.id,
    user_id: user.id,
    role: "admin",
    invited_by: user.id,
  });

  // Link existing data to org
  if (role === "founder") {
    // Set organization_id on founder's company
    await admin
      .from("companies")
      .update({ organization_id: org.id })
      .eq("founder_id", user.id);
  } else {
    // Set organization_id on investor's existing relationships
    await admin
      .from("investor_company_relationships")
      .update({ organization_id: org.id })
      .eq("investor_id", user.id);
  }

  return NextResponse.json({ id: org.id, ok: true });
}
