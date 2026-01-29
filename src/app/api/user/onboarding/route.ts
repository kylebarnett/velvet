import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// GET - Fetch current onboarding state
export async function GET() {
  const { user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const onboardingStep = user.user_metadata?.onboarding_step ?? null;
  const onboardingComplete = user.user_metadata?.onboarding_complete ?? false;

  return NextResponse.json({
    step: onboardingStep,
    completed: onboardingComplete,
  });
}

// PUT - Update onboarding step
export async function PUT(req: Request) {
  const { user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  let body: { step?: number | null; completed?: boolean };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON.", 400);
  }

  const { step, completed } = body;

  // Validate step is a number or null
  if (step !== null && step !== undefined && typeof step !== "number") {
    return jsonError("Invalid step value.", 400);
  }

  // Use admin client to update user metadata
  const supabaseAdmin = createSupabaseAdminClient();

  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      onboarding_step: step ?? null,
      onboarding_complete: completed ?? false,
    },
  });

  if (error) {
    console.error("Failed to update onboarding:", error);
    return jsonError("Failed to update onboarding state.", 500);
  }

  return NextResponse.json({
    ok: true,
    step: step ?? null,
    completed: completed ?? false,
  });
}
