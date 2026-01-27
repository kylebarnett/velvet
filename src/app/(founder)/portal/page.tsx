import Link from "next/link";

export default function FounderPortalPage() {
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
          { label: "Pending requests", value: "—" },
          { label: "Submitted this month", value: "—" },
          { label: "Documents uploaded", value: "—" },
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium">Next actions</div>
            <div className="mt-2 text-sm text-white/60">
              View your pending requests or upload documents for ingestion.
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              className="inline-flex h-9 items-center justify-center rounded-md border border-white/15 px-3 text-sm text-white hover:bg-white/5"
              href="/portal/requests"
            >
              Requests
            </Link>
            <Link
              className="inline-flex h-9 items-center justify-center rounded-md bg-white px-3 text-sm font-medium text-black hover:bg-white/90"
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

