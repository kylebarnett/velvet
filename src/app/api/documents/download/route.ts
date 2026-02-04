import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const uuidSchema = z.string().uuid();

export async function GET(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const url = new URL(req.url);
  const filePath = url.searchParams.get("path");

  if (!filePath || typeof filePath !== "string") {
    return jsonError("Missing file path.", 400);
  }

  const role = user.user_metadata?.role;

  // Verify user has access to this document
  // Extract company_id from file path (format: {company_id}/{timestamp}-{filename})
  const pathParts = filePath.split("/");
  if (pathParts.length < 2) {
    return jsonError("Invalid file path.", 400);
  }
  const companyIdFromPath = pathParts[0];

  // Validate company ID is a valid UUID
  if (!uuidSchema.safeParse(companyIdFromPath).success) {
    return jsonError("Invalid file path.", 400);
  }

  if (role === "founder") {
    // Founder can only download their own company's documents
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("founder_id", user.id)
      .eq("id", companyIdFromPath)
      .single();

    if (!company) {
      return jsonError("Not authorized.", 403);
    }
  } else if (role === "investor") {
    // Investor can download documents from approved companies
    const { data: relationship } = await supabase
      .from("investor_company_relationships")
      .select("id")
      .eq("investor_id", user.id)
      .eq("company_id", companyIdFromPath)
      .in("approval_status", ["approved", "auto_approved"])
      .single();

    if (!relationship) {
      return jsonError("Not authorized.", 403);
    }
  } else {
    return jsonError("Forbidden.", 403);
  }

  // Create a signed URL using admin client — ownership verified above
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from("documents")
    .createSignedUrl(filePath, 60); // 60 second expiry

  if (error || !data) {
    return jsonError(error?.message ?? "Failed to generate download URL.", 500);
  }

  return NextResponse.json({ url: data.signedUrl });
}
