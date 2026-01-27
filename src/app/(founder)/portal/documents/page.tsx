import Link from "next/link";

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Documents</h1>
          <p className="text-sm text-white/60">
            Upload decks, financials, and other supporting material.
          </p>
        </div>
        <Link
          className="inline-flex h-9 items-center justify-center rounded-md bg-white px-3 text-sm font-medium text-black hover:bg-white/90"
          href="/portal/documents/upload"
        >
          Upload
        </Link>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-medium">All documents</div>
        <div className="mt-3 text-sm text-white/60">
          Coming next: list documents from Supabase Storage + ingestion status.
        </div>
      </div>
    </div>
  );
}

