"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { FounderDocumentList } from "@/components/founder/document-list";
import { DocumentUploadModal } from "@/components/founder/document-upload-modal";

export default function DocumentsPage() {
  const [showUpload, setShowUpload] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [companyId, setCompanyId] = React.useState<string | null>(null);

  // Fetch companyId once on mount
  React.useEffect(() => {
    async function loadCompanyId() {
      try {
        const res = await fetch("/api/founder/company-metrics");
        const json = await res.json().catch(() => null);
        if (json?.companyId) setCompanyId(json.companyId);
      } catch {
        // ignore
      }
    }
    loadCompanyId();
  }, []);

  function handleUploadSuccess() {
    setShowUpload(false);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Breadcrumbs items={[{ label: "Dashboard", href: "/portal" }, { label: "Documents" }]} />
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight" data-onboarding="documents-title">Documents</h1>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setShowUpload(true)}
        >
          Upload
        </Button>
      </div>

      <FounderDocumentList key={refreshKey} />

      {showUpload && companyId && (
        <DocumentUploadModal
          companyId={companyId}
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}
