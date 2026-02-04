"use client";

import * as React from "react";
import { FounderDocumentList } from "@/components/founder/document-list";
import { DocumentUploadModal } from "@/components/founder/document-upload-modal";

interface DocumentsTabProps {
  companyId: string;
}

export function DocumentsTab({ companyId }: DocumentsTabProps) {
  const [showUpload, setShowUpload] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);

  function handleUploadSuccess() {
    setShowUpload(false);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Documents</h2>
          <p className="text-sm text-white/60">
            Upload decks, financials, and other supporting material.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          className="inline-flex h-9 items-center justify-center rounded-md bg-white px-3 text-sm font-medium text-black hover:bg-white/90"
        >
          Upload
        </button>
      </div>

      <FounderDocumentList key={refreshKey} />

      {showUpload && (
        <DocumentUploadModal
          companyId={companyId}
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}
