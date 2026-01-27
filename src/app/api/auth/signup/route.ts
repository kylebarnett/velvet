import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["investor", "founder"]),
  fullName: z.string().min(2),
  companyName: z.string().optional(),
  companyWebsite: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { supabase, response } = createSupabaseRouteHandlerClient(request);
  const { email, password, role, fullName, companyName, companyWebsite } =
    parsed.data;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role, full_name: fullName },
    },
  });
  if (error) return jsonError(error.message, 400);

  // Create company record for founders
  if (role === "founder" && companyName && data.user) {
    const adminClient = createSupabaseAdminClient();
    const { error: companyError } = await adminClient.from("companies").insert({
      name: companyName,
      website: companyWebsite || null,
      founder_id: data.user.id,
    });
    if (companyError) {
      console.error("Failed to create company record:", companyError);
    }
  }

  return NextResponse.json({ ok: true }, { headers: response.headers });
}

