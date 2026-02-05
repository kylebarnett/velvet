import { NextResponse } from "next/server";
import { getApiUser, jsonError } from "@/lib/api/auth";

/**
 * GET /api/user/preferences
 * Get user preferences. Optionally filter by key with ?key=metric_order.company-123
 */
export async function GET(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const url = new URL(req.url);
  const key = url.searchParams.get("key");

  const { data, error } = await supabase
    .from("users")
    .select("preferences")
    .eq("id", user.id)
    .single();

  if (error) {
    return jsonError("Failed to fetch preferences.", 500);
  }

  const preferences = (data?.preferences as Record<string, unknown>) ?? {};

  // If a specific key is requested, return just that value
  if (key) {
    return NextResponse.json({ value: preferences[key] ?? null });
  }

  return NextResponse.json({ preferences });
}

/**
 * PUT /api/user/preferences
 * Update user preferences. Merges with existing preferences.
 * Body: { key: string, value: unknown } or { preferences: Record<string, unknown> }
 */
export async function PUT(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  let body: { key?: string; value?: unknown; preferences?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  // Get current preferences
  const { data: current, error: fetchError } = await supabase
    .from("users")
    .select("preferences")
    .eq("id", user.id)
    .single();

  if (fetchError) {
    return jsonError("Failed to fetch current preferences.", 500);
  }

  const currentPrefs = (current?.preferences as Record<string, unknown>) ?? {};

  // Merge new preferences
  let updatedPrefs: Record<string, unknown>;

  if (body.key !== undefined) {
    // Single key update
    if (body.value === null) {
      // Delete the key
      const { [body.key]: _, ...rest } = currentPrefs;
      updatedPrefs = rest;
    } else {
      updatedPrefs = { ...currentPrefs, [body.key]: body.value };
    }
  } else if (body.preferences) {
    // Bulk update - merge
    updatedPrefs = { ...currentPrefs, ...body.preferences };
  } else {
    return jsonError("Must provide 'key' and 'value', or 'preferences' object.", 400);
  }

  // Save updated preferences
  const { error: updateError } = await supabase
    .from("users")
    .update({ preferences: updatedPrefs })
    .eq("id", user.id);

  if (updateError) {
    return jsonError("Failed to save preferences.", 500);
  }

  return NextResponse.json({ ok: true, preferences: updatedPrefs });
}
