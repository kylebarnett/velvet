import { Suspense } from "react";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UploadWizard } from "@/components/historical-upload/upload-wizard";
import { UploadHistory } from "@/components/historical-upload/upload-history";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function HistoricalUploadPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  await requireRole("investor");

  const { companyId } = await searchParams;

  // If a companyId is provided, look up the company name
  let preSelectedCompany: { id: string; name: string } | null = null;
  if (companyId) {
    const supabase = await createSupabaseServerClient();
    const { data: company } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", companyId)
      .single();
    if (company) {
      preSelectedCompany = { id: company.id, name: company.name };
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Companies", href: "/companies" },
          ...(preSelectedCompany
            ? [{ label: preSelectedCompany.name, href: `/companies/${preSelectedCompany.id}` }]
            : []),
          { label: "Import Historical Data" },
        ]}
      />

      <div>
        <h1 className="text-lg font-semibold text-text-primary">
          Import Historical Data
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {preSelectedCompany
            ? `Upload Excel or CSV files to import historical metrics for ${preSelectedCompany.name}.`
            : "Upload Excel or CSV files to bulk-import historical metrics for your portfolio companies. AI will analyze the spreadsheet structure and extract metric values for your review."}
        </p>
      </div>

      <Suspense>
        <UploadWizard
          role="investor"
          preSelectedCompany={preSelectedCompany ?? undefined}
        />
      </Suspense>

      <Suspense>
        <UploadHistory role="investor" />
      </Suspense>
    </div>
  );
}
