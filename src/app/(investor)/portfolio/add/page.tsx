import Link from "next/link";

import { requireRole } from "@/lib/auth/require-role";
import { AddContactForm } from "@/components/portfolio/add-contact-form";

export const dynamic = "force-dynamic";

export default async function AddContactPage() {
  await requireRole("investor");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Add Contact</h1>
          <p className="text-sm text-white/60">
            Manually add a portfolio company and founder contact.
          </p>
        </div>
        <Link
          href="/portfolio"
          className="text-sm text-white/60 hover:text-white"
        >
          Back to Portfolio
        </Link>
      </div>

      <AddContactForm />
    </div>
  );
}
