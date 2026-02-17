import type { Metadata } from "next";
import { Suspense } from "react";
import { requireRole } from "@/lib/auth/require-role";
import { UploadWizard } from "@/components/historical-upload/upload-wizard";
import { UploadHistory } from "@/components/historical-upload/upload-history";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata: Metadata = { title: "Import Data | Velvet" };
export const dynamic = "force-dynamic";

export default async function FounderHistoricalUploadPage() {
  await requireRole("founder");

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/portal" },
          { label: "Import Historical Metrics" },
        ]}
      />

      <div>
        <h1 className="text-lg font-semibold text-text-primary">
          Import Historical Metrics
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Upload Excel or CSV files to bulk-import your historical metrics.
          AI will analyze the spreadsheet structure and extract metric values for your review.
          Approved values will be visible to all your approved investors.
        </p>
      </div>

      <Suspense>
        <UploadWizard role="founder" />
      </Suspense>

      <Suspense>
        <UploadHistory role="founder" />
      </Suspense>
    </div>
  );
}
