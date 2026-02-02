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

  // Normalize all emails upfront
  const normalizedEmails = rows.map((row) => row.email.toLowerCase());
  const uniqueEmails = [...new Set(normalizedEmails)];

  // Batch 1: Get all existing companies by founder_email
  const { data: companiesByEmail } = await adminClient
    .from("companies")
    .select("id, founder_email")
    .in("founder_email", uniqueEmails);

  const emailToCompanyId = new Map<string, string>();
  for (const company of companiesByEmail ?? []) {
    if (company.founder_email) {
      emailToCompanyId.set(company.founder_email.toLowerCase(), company.id);
    }
  }

  // Batch 2: Get all users by email (for founders who signed up)
  const { data: usersByEmail } = await adminClient
    .from("users")
    .select("id, email")
    .in("email", uniqueEmails);

  const emailToUserId = new Map<string, string>();
  for (const u of usersByEmail ?? []) {
    if (u.email) {
      emailToUserId.set(u.email.toLowerCase(), u.id);
    }
  }

  // Batch 3: Get companies by founder_id for users who signed up
  const founderIds = [...emailToUserId.values()];
  const founderIdToCompanyId = new Map<string, string>();
  if (founderIds.length > 0) {
    const { data: companiesByFounder } = await adminClient
      .from("companies")
      .select("id, founder_id")
      .in("founder_id", founderIds);

    for (const company of companiesByFounder ?? []) {
      if (company.founder_id) {
        founderIdToCompanyId.set(company.founder_id, company.id);
      }
    }
  }

  // Batch 4: Get existing relationships for this investor
  const { data: existingRelationships } = await adminClient
    .from("investor_company_relationships")
    .select("company_id")
    .eq("investor_id", user.id);

  const existingCompanyIds = new Set((existingRelationships ?? []).map((r) => r.company_id));

  // Now process rows and build insert arrays
  const companiesToCreate: {
    name: string;
    website: string | null;
    founder_id: null;
    founder_email: string;
    rowIndex: number;
  }[] = [];
  const rowsWithExistingCompany: { row: typeof rows[0]; companyId: string; rowIndex: number }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const normalizedEmail = normalizedEmails[i];

    // Check for existing company
    let existingCompanyId: string | null = null;

    // First check by founder_email
    if (emailToCompanyId.has(normalizedEmail)) {
      existingCompanyId = emailToCompanyId.get(normalizedEmail)!;
    }

    // Then check via user -> company
    if (!existingCompanyId && emailToUserId.has(normalizedEmail)) {
      const founderId = emailToUserId.get(normalizedEmail)!;
      if (founderIdToCompanyId.has(founderId)) {
        existingCompanyId = founderIdToCompanyId.get(founderId)!;
      }
    }

    if (existingCompanyId) {
      // Check if already in portfolio
      if (existingCompanyIds.has(existingCompanyId)) {
        results.errors.push({
          row: i + 1,
          message: `Company already in your portfolio (${row.company_name}).`,
        });
        continue;
      }
      rowsWithExistingCompany.push({ row, companyId: existingCompanyId, rowIndex: i });
    } else {
      companiesToCreate.push({
        name: row.company_name,
        website: row.company_website || null,
        founder_id: null,
        founder_email: normalizedEmail,
        rowIndex: i,
      });
    }
  }

  // Batch insert new companies
  const rowIndexToNewCompanyId = new Map<number, string>();
  if (companiesToCreate.length > 0) {
    const { data: createdCompanies, error: createError } = await adminClient
      .from("companies")
      .insert(
        companiesToCreate.map((c) => ({
          name: c.name,
          website: c.website,
          founder_id: c.founder_id,
          founder_email: c.founder_email,
        }))
      )
      .select("id");

    if (createError) {
      // If bulk insert fails, report error for all companies
      for (const c of companiesToCreate) {
        results.errors.push({
          row: c.rowIndex + 1,
          message: `Failed to create company: ${createError.message}`,
        });
      }
    } else if (createdCompanies) {
      // Map row indices to new company IDs
      for (let i = 0; i < createdCompanies.length; i++) {
        rowIndexToNewCompanyId.set(companiesToCreate[i].rowIndex, createdCompanies[i].id);
      }
    }
  }

  // Build relationships to insert
  const relationshipsToCreate: {
    investor_id: string;
    company_id: string;
    approval_status: string;
    is_inviting_investor: boolean;
  }[] = [];
  const invitationsToCreate: {
    investor_id: string;
    company_id: string;
    email: string;
    first_name: string;
    last_name: string;
    status: string;
  }[] = [];
  const successfulRowIndices: number[] = [];

  // Add relationships for existing companies
  for (const { row, companyId, rowIndex } of rowsWithExistingCompany) {
    relationshipsToCreate.push({
      investor_id: user.id,
      company_id: companyId,
      approval_status: "pending",
      is_inviting_investor: true,
    });
    invitationsToCreate.push({
      investor_id: user.id,
      company_id: companyId,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      status: "pending",
    });
    successfulRowIndices.push(rowIndex);
  }

  // Add relationships for newly created companies
  for (const c of companiesToCreate) {
    const companyId = rowIndexToNewCompanyId.get(c.rowIndex);
    if (!companyId) continue; // Creation failed

    const row = rows[c.rowIndex];
    relationshipsToCreate.push({
      investor_id: user.id,
      company_id: companyId,
      approval_status: "pending",
      is_inviting_investor: true,
    });
    invitationsToCreate.push({
      investor_id: user.id,
      company_id: companyId,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      status: "pending",
    });
    successfulRowIndices.push(c.rowIndex);
  }

  // Batch insert relationships
  if (relationshipsToCreate.length > 0) {
    const { error: relError } = await adminClient
      .from("investor_company_relationships")
      .insert(relationshipsToCreate);

    if (relError) {
      // If relationships fail, we need to clean up created companies and report errors
      const newCompanyIds = [...rowIndexToNewCompanyId.values()];
      if (newCompanyIds.length > 0) {
        await adminClient.from("companies").delete().in("id", newCompanyIds);
      }
      for (const idx of successfulRowIndices) {
        results.errors.push({
          row: idx + 1,
          message: `Failed to create relationship: ${relError.message}`,
        });
      }
      return NextResponse.json(results);
    }
  }

  // Batch insert invitations
  if (invitationsToCreate.length > 0) {
    const { error: inviteError } = await adminClient
      .from("portfolio_invitations")
      .insert(invitationsToCreate);

    if (inviteError) {
      // Clean up relationships and new companies
      const companyIds = relationshipsToCreate.map((r) => r.company_id);
      await adminClient
        .from("investor_company_relationships")
        .delete()
        .eq("investor_id", user.id)
        .in("company_id", companyIds);

      const newCompanyIds = [...rowIndexToNewCompanyId.values()];
      if (newCompanyIds.length > 0) {
        await adminClient.from("companies").delete().in("id", newCompanyIds);
      }

      for (const idx of successfulRowIndices) {
        results.errors.push({
          row: idx + 1,
          message: `Failed to create invitation: ${inviteError.message}`,
        });
      }
      return NextResponse.json(results);
    }

    results.imported = invitationsToCreate.length;
  }

  return NextResponse.json(results);
}
