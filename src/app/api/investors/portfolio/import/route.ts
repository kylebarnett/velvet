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
      const normalizedEmail = row.email.toLowerCase();

      // Check for existing company by founder_email or by founder's user email
      let existingCompanyId: string | null = null;

      // Check founder_email column
      const { data: byFounderEmail } = await adminClient
        .from("companies")
        .select("id")
        .eq("founder_email", normalizedEmail)
        .limit(1)
        .maybeSingle();

      if (byFounderEmail) {
        existingCompanyId = byFounderEmail.id;
      }

      // If not found, check via users table (founder already signed up)
      if (!existingCompanyId) {
        const { data: byUserEmail } = await adminClient
          .from("users")
          .select("id")
          .eq("email", normalizedEmail)
          .limit(1)
          .maybeSingle();

        if (byUserEmail) {
          const { data: byFounderId } = await adminClient
            .from("companies")
            .select("id")
            .eq("founder_id", byUserEmail.id)
            .limit(1)
            .maybeSingle();

          if (byFounderId) {
            existingCompanyId = byFounderId.id;
          }
        }
      }

      let companyId: string;

      if (existingCompanyId) {
        // Reuse existing company — check if this investor already has a relationship
        const { data: existingRel } = await adminClient
          .from("investor_company_relationships")
          .select("id")
          .eq("investor_id", user.id)
          .eq("company_id", existingCompanyId)
          .maybeSingle();

        if (existingRel) {
          results.errors.push({
            row: i + 1,
            message: `Company already in your portfolio (${row.company_name}).`,
          });
          continue;
        }

        companyId = existingCompanyId;
      } else {
        // Create new company with founder_email set for future dedup
        const { data: company, error: companyError } = await adminClient
          .from("companies")
          .insert({
            name: row.company_name,
            website: row.company_website || null,
            founder_id: null,
            founder_email: normalizedEmail,
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

        companyId = company.id;
      }

      // Create investor-company relationship
      const { error: relError } = await adminClient
        .from("investor_company_relationships")
        .insert({
          investor_id: user.id,
          company_id: companyId,
          approval_status: "pending",
          is_inviting_investor: true,
        });

      if (relError) {
        // Cleanup company only if we just created it (no existing company)
        if (!existingCompanyId) {
          await adminClient.from("companies").delete().eq("id", companyId);
        }
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
          company_id: companyId,
          email: row.email,
          first_name: row.first_name,
          last_name: row.last_name,
          status: "pending",
        });

      if (inviteError) {
        // Cleanup on failure
        await adminClient
          .from("investor_company_relationships")
          .delete()
          .eq("company_id", companyId)
          .eq("investor_id", user.id);
        if (!existingCompanyId) {
          await adminClient.from("companies").delete().eq("id", companyId);
        }
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
