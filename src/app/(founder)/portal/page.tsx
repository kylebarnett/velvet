import Link from "next/link";

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FounderPortalPage() {
  const user = await requireRole("founder");
  const supabase = await createSupabaseServerClient();

  // Get founder's company
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("founder_id", user.id)
    .single();

  let pendingCount = 0;
  let submittedCount = 0;
  let documentsCount = 0;

  if (company) {
    // Count pending metric requests (from approved investors only, via RLS)
    const { count: pending } = await supabase
      .from("metric_requests")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id)
      .eq("status", "pending");
    pendingCount = pending ?? 0;

    // Count submitted metric values this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count: submitted } = await supabase
      .from("company_metric_values")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id)
      .gte("submitted_at", monthStart);
    submittedCount = submitted ?? 0;

    // Count documents
    const { count: docs } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id);
    documentsCount = docs ?? 0;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Founder portal</h1>
        <p className="text-sm text-white/60">
          Submit requested metrics and manage supporting documents.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Pending requests", value: String(pendingCount) },
          { label: "Submitted this month", value: String(submittedCount) },
          { label: "Documents uploaded", value: String(documentsCount) },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="text-sm text-white/60">{card.label}</div>
            <div className="mt-2 text-2xl font-semibold">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm font-medium">Next actions</div>
            <div className="mt-2 text-sm text-white/60">
              View your pending requests or upload documents for ingestion.
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              className="inline-flex h-10 sm:h-9 flex-1 sm:flex-none items-center justify-center rounded-md border border-white/15 px-3 text-sm text-white hover:bg-white/5"
              href="/portal/requests"
            >
              Requests
            </Link>
            <Link
              className="inline-flex h-10 sm:h-9 flex-1 sm:flex-none items-center justify-center rounded-md bg-white px-3 text-sm font-medium text-black hover:bg-white/90"
              href="/portal/documents/upload"
            >
              Upload
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
