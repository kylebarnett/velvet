import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DocumentUploadForm } from "@/components/forms/document-upload-form";

export const dynamic = "force-dynamic";

export default async function DocumentUploadPage() {
  const user = await requireRole("founder");
  const supabase = await createSupabaseServerClient();

  // Get the founder's company
  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("founder_id", user.id)
    .single();

  if (!company) {
    // Founder has no company - redirect back to documents
    redirect("/portal/documents");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Upload document</h1>
        <p className="text-sm text-white/60">
          Upload a file for storage now; ingestion will be structured for AI
          extraction later.
        </p>
      </div>

      <DocumentUploadForm company={company} />
    </div>
  );
}
