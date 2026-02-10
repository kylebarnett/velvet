import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/** Metadata keys differ by role so they don't collide. */
function metaKeys(role: string) {
  if (role === "founder") {
    return { step: "founder_onboarding_step", complete: "founder_onboarding_complete" };
  }
  return { step: "onboarding_step", complete: "onboarding_complete" };
}

// GET - Fetch current onboarding state
export async function GET(req: Request) {
  const { user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const url = new URL(req.url);
  const role = url.searchParams.get("role") ?? "investor";
  const keys = metaKeys(role);

  const onboardingStep = user.user_metadata?.[keys.step] ?? null;
  const onboardingComplete = user.user_metadata?.[keys.complete] ?? false;

  return NextResponse.json({
    step: onboardingStep,
    completed: onboardingComplete,
  });
}

// PUT - Update onboarding step
export async function PUT(req: Request) {
  const { user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  let body: { step?: number | null; completed?: boolean; role?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON.", 400);
  }

  const { step, completed, role } = body;
  const keys = metaKeys(role ?? "investor");

  // Validate step is a number or null
  if (step !== null && step !== undefined && typeof step !== "number") {
    return jsonError("Invalid step value.", 400);
  }

  // Use admin client to update user metadata
  const supabaseAdmin = createSupabaseAdminClient();

  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      [keys.step]: step ?? null,
      [keys.complete]: completed ?? false,
    },
  });

  if (error) {
    logger.error("Failed to update onboarding:", error);
    return jsonError("Failed to update onboarding state.", 500);
  }

  return NextResponse.json({
    ok: true,
    step: step ?? null,
    completed: completed ?? false,
  });
}
