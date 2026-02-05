import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  // Verify membership
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", id)
    .eq("user_id", user.id)
    .single();

  if (!membership) return jsonError("Not a member of this organization.", 403);

  // Get all members (without join - auth.users can't be joined directly)
  const { data: members } = await supabase
    .from("organization_members")
    .select("id, user_id, role, joined_at")
    .eq("organization_id", id)
    .order("joined_at");

  if (!members || members.length === 0) {
    return NextResponse.json({ members: [] });
  }

  // Fetch user info separately from public.users
  const userIds = members.map((m) => m.user_id);
  const { data: users } = await supabase
    .from("users")
    .select("id, email, full_name")
    .in("id", userIds);

  const userMap = new Map(
    (users ?? []).map((u) => [u.id, u])
  );

  const result = members.map((m) => {
    const userInfo = userMap.get(m.user_id);
    return {
      id: m.id,
      userId: m.user_id,
      email: userInfo?.email ?? "",
      name: userInfo?.full_name ?? userInfo?.email ?? "",
      role: m.role,
      joinedAt: m.joined_at,
    };
  });

  return NextResponse.json({ members: result });
}
