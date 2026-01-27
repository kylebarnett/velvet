import { DocumentUploadForm } from "@/components/forms/document-upload-form";

export default function DocumentUploadPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Upload document</h1>
        <p className="text-sm text-white/60">
          Upload a file for storage now; ingestion will be structured for AI
          extraction later.
        </p>
      </div>

      <DocumentUploadForm />
    </div>
  );
}

