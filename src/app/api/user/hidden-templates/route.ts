import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// GET - Fetch hidden template IDs
export async function GET() {
  const { user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const hiddenTemplates = user.user_metadata?.hidden_templates ?? [];

  return NextResponse.json({
    hiddenTemplates,
  });
}

const updateSchema = z.object({
  templateId: z.string().min(1),
  action: z.enum(["hide", "show"]),
});

// PUT - Hide or show a system template
export async function PUT(req: Request) {
  const { user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON.", 400);
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    console.error("Validation error:", parsed.error);
    return jsonError("Invalid request body.", 400);
  }

  const { templateId, action } = parsed.data;

  const currentHidden: string[] = user.user_metadata?.hidden_templates ?? [];

  let newHidden: string[];
  if (action === "hide") {
    // Add to hidden list if not already there
    newHidden = currentHidden.includes(templateId)
      ? currentHidden
      : [...currentHidden, templateId];
  } else {
    // Remove from hidden list
    newHidden = currentHidden.filter((id) => id !== templateId);
  }

  // Use admin client to update user metadata
  const supabaseAdmin = createSupabaseAdminClient();

  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      hidden_templates: newHidden,
    },
  });

  if (error) {
    console.error("Failed to update hidden templates:", error);
    return jsonError("Failed to update hidden templates.", 500);
  }

  return NextResponse.json({
    ok: true,
    hiddenTemplates: newHidden,
  });
}
