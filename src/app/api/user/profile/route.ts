import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name too long"),
});

/**
 * PUT /api/user/profile
 * Update the authenticated user's profile (full_name).
 */
export async function PUT(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input.";
    return jsonError(message, 400);
  }

  const { full_name } = parsed.data;

  // Update the users table (RLS allows users to update their own row)
  const { error: updateError } = await supabase
    .from("users")
    .update({ full_name })
    .eq("id", user.id);

  if (updateError) {
    return jsonError("Failed to update profile.", 500);
  }

  // Admin client is needed to update auth.user_metadata because the regular
  // supabase client does not have permission to modify auth user records.
  const adminClient = createSupabaseAdminClient();
  const { error: authError } = await adminClient.auth.admin.updateUserById(
    user.id,
    {
      user_metadata: {
        ...user.user_metadata,
        full_name,
      },
    },
  );

  if (authError) {
    return jsonError("Failed to update user metadata.", 500);
  }

  return NextResponse.json({ ok: true });
}
