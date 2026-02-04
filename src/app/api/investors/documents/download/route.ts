import { NextResponse } from "next/server";
import archiver from "archiver";
import { PassThrough } from "stream";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// GET - Bulk download documents as ZIP
export async function GET(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const url = new URL(req.url);
  const ids = url.searchParams.get("ids"); // Comma-separated document IDs
  const companyId = url.searchParams.get("companyId");
  const documentType = url.searchParams.get("type");

  // Get approved company IDs for this investor
  const { data: relationships } = await supabase
    .from("investor_company_relationships")
    .select("company_id, companies (name)")
    .eq("investor_id", user.id)
    .in("approval_status", ["auto_approved", "approved"]);

  const approvedCompanyIds = (relationships ?? []).map((r) => r.company_id);

  if (approvedCompanyIds.length === 0) {
    return jsonError("No approved companies in portfolio.", 403);
  }

  // Build query for documents
  let query = supabase
    .from("documents")
    .select(`
      id,
      file_name,
      file_path,
      company_id,
      companies (name)
    `)
    .in("company_id", approvedCompanyIds);

  // Filter by specific IDs if provided
  if (ids) {
    const idList = ids.split(",").filter(Boolean);
    if (idList.length === 0) {
      return jsonError("No document IDs provided.", 400);
    }
    query = query.in("id", idList);
  }

  // Filter by company
  if (companyId) {
    if (!approvedCompanyIds.includes(companyId)) {
      return jsonError("Company not in portfolio.", 403);
    }
    query = query.eq("company_id", companyId);
  }

  // Filter by document type
  if (documentType) {
    query = query.eq("document_type", documentType);
  }

  const { data: documents, error } = await query;

  if (error) return jsonError(error.message, 500);

  if (!documents || documents.length === 0) {
    return jsonError("No documents found.", 404);
  }

  // Create ZIP archive
  const archive = archiver("zip", { zlib: { level: 5 } });
  const passthrough = new PassThrough();

  archive.pipe(passthrough);

  // Track filenames to handle duplicates
  const usedNames = new Map<string, number>();

  // Use admin client for storage downloads — ownership verified via
  // approved portfolio relationships above
  const admin = createSupabaseAdminClient();

  for (const doc of documents) {
    // Handle Supabase join type (may be array or single object)
    const companyRaw = doc.companies;
    const company = (Array.isArray(companyRaw) ? companyRaw[0] : companyRaw) as { name: string } | null;
    const companyName = company?.name ?? "Unknown";

    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await admin.storage
      .from("documents")
      .download(doc.file_path);

    if (downloadError || !fileData) {
      console.error(`Failed to download ${doc.file_path}:`, downloadError);
      continue;
    }

    // Build filename with company prefix
    let fileName = `${companyName}/${doc.file_name}`;

    // Handle duplicates by appending a number
    if (usedNames.has(fileName)) {
      const count = usedNames.get(fileName)! + 1;
      usedNames.set(fileName, count);
      const ext = doc.file_name.includes(".")
        ? doc.file_name.substring(doc.file_name.lastIndexOf("."))
        : "";
      const base = doc.file_name.includes(".")
        ? doc.file_name.substring(0, doc.file_name.lastIndexOf("."))
        : doc.file_name;
      fileName = `${companyName}/${base}_${count}${ext}`;
    } else {
      usedNames.set(fileName, 1);
    }

    // Add file to archive
    const buffer = Buffer.from(await fileData.arrayBuffer());
    archive.append(buffer, { name: fileName });
  }

  await archive.finalize();

  // Determine filename
  let zipFilename = "velvet-documents";
  if (companyId && documents.length > 0) {
    const companyRaw = documents[0].companies;
    const company = (Array.isArray(companyRaw) ? companyRaw[0] : companyRaw) as { name: string } | null;
    if (company?.name) {
      zipFilename = company.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    }
  }
  const dateStr = new Date().toISOString().split("T")[0];
  zipFilename = `${zipFilename}-${dateStr}.zip`;

  // Convert PassThrough stream to ReadableStream for Response
  const reader = passthrough[Symbol.asyncIterator]();
  const readableStream = new ReadableStream({
    async pull(controller) {
      const { value, done } = await reader.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
  });

  return new NextResponse(readableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipFilename}"`,
    },
  });
}
