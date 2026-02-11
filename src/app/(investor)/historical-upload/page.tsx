import { Suspense } from "react";
import { requireRole } from "@/lib/auth/require-role";
import { UploadWizard } from "@/components/historical-upload/upload-wizard";
import { UploadHistory } from "@/components/historical-upload/upload-history";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function HistoricalUploadPage() {
  await requireRole("investor");

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Portfolio", href: "/portfolio" },
          { label: "Import Historical Data" },
        ]}
      />

      <div>
        <h1 className="text-lg font-semibold text-text-primary">
          Import Historical Data
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Upload Excel or CSV files to bulk-import historical metrics for your portfolio companies.
          AI will analyze the spreadsheet structure and extract metric values for your review.
        </p>
      </div>

      <Suspense>
        <UploadWizard role="investor" />
      </Suspense>

      <Suspense>
        <UploadHistory role="investor" />
      </Suspense>
    </div>
  );
}
