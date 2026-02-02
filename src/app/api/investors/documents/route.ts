import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";

// GET - List all documents across investor's portfolio
export async function GET(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const url = new URL(req.url);
  const companyId = url.searchParams.get("companyId");
  const documentType = url.searchParams.get("type");
  const search = url.searchParams.get("search");

  // Build query for documents in investor's approved portfolio companies
  let query = supabase
    .from("documents")
    .select(`
      id,
      file_name,
      file_type,
      file_size,
      document_type,
      description,
      uploaded_at,
      company_id,
      companies!inner (
        id,
        name
      )
    `)
    .order("uploaded_at", { ascending: false });

  // Filter by companies in investor's approved portfolio
  // The RLS policy handles this, but we need to ensure only approved relationships
  const { data: relationships } = await supabase
    .from("investor_company_relationships")
    .select("company_id")
    .eq("investor_id", user.id)
    .in("approval_status", ["auto_approved", "approved"]);

  const approvedCompanyIds = (relationships ?? []).map((r) => r.company_id);

  if (approvedCompanyIds.length === 0) {
    return NextResponse.json({ documents: [] });
  }

  query = query.in("company_id", approvedCompanyIds);

  // Apply filters
  if (companyId) {
    // Verify company is in approved portfolio before filtering
    if (!approvedCompanyIds.includes(companyId)) {
      return jsonError("Company not in portfolio.", 403);
    }
    query = query.eq("company_id", companyId);
  }

  if (documentType) {
    query = query.eq("document_type", documentType);
  }

  if (search) {
    query = query.ilike("file_name", `%${search}%`);
  }

  const { data: documents, error } = await query;

  if (error) return jsonError(error.message, 500);

  // Transform response
  const result = (documents ?? []).map((doc) => {
    // Handle Supabase join type (may be array or single object)
    const companyRaw = doc.companies;
    const company = (Array.isArray(companyRaw) ? companyRaw[0] : companyRaw) as { id: string; name: string } | null;
    return {
      id: doc.id,
      file_name: doc.file_name,
      file_type: doc.file_type,
      file_size: doc.file_size,
      document_type: doc.document_type,
      description: doc.description,
      uploaded_at: doc.uploaded_at,
      company: company
        ? {
            id: company.id,
            name: company.name,
          }
        : null,
    };
  });

  return NextResponse.json({ documents: result });
}
