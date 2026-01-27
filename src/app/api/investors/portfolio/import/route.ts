import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const rowSchema = z.object({
  company_name: z.string().min(1),
  company_website: z.string().optional(),
  dba: z.string().optional(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
});

const schema = z.object({
  rows: z.array(rowSchema).min(1),
});

export async function POST(req: Request) {
  const { user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid request body.", 400);
  }

  const { rows } = parsed.data;
  const adminClient = createSupabaseAdminClient();

  const results: { imported: number; errors: { row: number; message: string }[] } = {
    imported: 0,
    errors: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      // Create company
      const { data: company, error: companyError } = await adminClient
        .from("companies")
        .insert({
          name: row.company_name,
          website: row.company_website || null,
          founder_id: null,
        })
        .select("id")
        .single();

      if (companyError || !company) {
        results.errors.push({
          row: i + 1,
          message: `Failed to create company: ${companyError?.message ?? "Unknown error"}`,
        });
        continue;
      }

      // Create investor-company relationship
      const { error: relError } = await adminClient
        .from("investor_company_relationships")
        .insert({
          investor_id: user.id,
          company_id: company.id,
        });

      if (relError) {
        // Cleanup company if relationship fails
        await adminClient.from("companies").delete().eq("id", company.id);
        results.errors.push({
          row: i + 1,
          message: `Failed to create relationship: ${relError.message}`,
        });
        continue;
      }

      // Create portfolio invitation
      const { error: inviteError } = await adminClient
        .from("portfolio_invitations")
        .insert({
          investor_id: user.id,
          company_id: company.id,
          email: row.email,
          first_name: row.first_name,
          last_name: row.last_name,
          status: "pending",
        });

      if (inviteError) {
        // Cleanup on failure
        await adminClient.from("investor_company_relationships").delete().eq("company_id", company.id);
        await adminClient.from("companies").delete().eq("id", company.id);
        results.errors.push({
          row: i + 1,
          message: `Failed to create invitation: ${inviteError.message}`,
        });
        continue;
      }

      results.imported++;
    } catch (err) {
      results.errors.push({
        row: i + 1,
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json(results);
}
