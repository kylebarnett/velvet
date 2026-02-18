"use client";

import { useState } from "react";
import { UploadWizard } from "./upload-wizard";
import { UploadHistory } from "./upload-history";

type Props = {
  role: "investor" | "founder";
  preSelectedCompany?: { id: string; name: string };
};

type ResumePayload = {
  id: string;
  file_name: string;
  total_values_detected: number;
  companies_detected: { name: string; source: string; sheetName?: string }[] | null;
};

export function UploadPageClient({ role, preSelectedCompany }: Props) {
  const [resumeUpload, setResumeUpload] = useState<ResumePayload | null>(null);

  return (
    <>
      <UploadWizard
        role={role}
        preSelectedCompany={preSelectedCompany}
        resumeUploadOverride={resumeUpload ?? undefined}
        onResumeHandled={() => setResumeUpload(null)}
      />
      <UploadHistory
        role={role}
        onResumeUpload={(upload) => setResumeUpload(upload)}
      />
    </>
  );
}
