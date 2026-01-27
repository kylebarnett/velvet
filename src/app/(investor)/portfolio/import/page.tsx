import Link from "next/link";

import { requireRole } from "@/lib/auth/require-role";
import { CsvImportForm } from "@/components/portfolio/csv-import-form";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireRole("investor");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Import Portfolio Contacts</h1>
          <p className="text-sm text-white/60">
            Upload a CSV file with your portfolio company contacts.
          </p>
        </div>
        <Link
          href="/portfolio"
          className="text-sm text-white/60 hover:text-white"
        >
          Back to Portfolio
        </Link>
      </div>

      <CsvImportForm />
    </div>
  );
}
