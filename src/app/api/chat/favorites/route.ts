import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";

// ---------------------------------------------------------------------------
// GET /api/chat/favorites — List user's favorite people
// ---------------------------------------------------------------------------

export async function GET() {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { data: favorites, error: favError } = await supabase
    .from("user_favorites")
    .select(
      "id, favorite_user_id, created_at, users!user_favorites_favorite_user_id_fkey(id, full_name, email, avatar_url)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (favError) return jsonError("Failed to load favorites.", 500);

  const result = (favorites ?? []).map((f) => {
    const u = Array.isArray(f.users) ? f.users[0] : f.users;
    return {
      id: f.id,
      userId: f.favorite_user_id,
      fullName: u?.full_name ?? null,
      email: u?.email ?? "",
      avatarUrl: u?.avatar_url ?? null,
      createdAt: f.created_at,
    };
  });

  return NextResponse.json({ favorites: result, ok: true });
}

// ---------------------------------------------------------------------------
// POST /api/chat/favorites — Add a favorite
// ---------------------------------------------------------------------------

const addFavoriteSchema = z.object({
  userId: z.string().uuid("Invalid user ID."),
});

export async function POST(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const parsed = addFavoriteSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { userId: targetUserId } = parsed.data;

  // Cannot favorite yourself
  if (targetUserId === user.id) {
    return jsonError("Cannot add yourself as a favorite.", 400);
  }

  // Verify target user is in the same investor org
  const { data: myMembership } = await supabase
    .from("organization_members")
    .select("organization_id, organizations!inner(id, org_type)")
    .eq("user_id", user.id)
    .limit(100);

  const investorMembership = (myMembership ?? []).find((m) => {
    const org = Array.isArray(m.organizations)
      ? m.organizations[0]
      : m.organizations;
    return org?.org_type === "investor";
  });

  if (!investorMembership) {
    return jsonError("No investor organization found.", 404);
  }

  const orgId = investorMembership.organization_id;

  const { data: targetMembership } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", orgId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!targetMembership) {
    return jsonError("User is not a member of your organization.", 400);
  }

  // Insert favorite — on conflict, succeed silently
  const { error: insertError } = await supabase
    .from("user_favorites")
    .upsert(
      {
        user_id: user.id,
        favorite_user_id: targetUserId,
      },
      { onConflict: "user_id,favorite_user_id" },
    );

  if (insertError) return jsonError("Failed to add favorite.", 500);

  return NextResponse.json({ ok: true }, { status: 201 });
}
