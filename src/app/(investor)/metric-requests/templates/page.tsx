import type { Metadata } from "next";
import { Suspense } from "react";

import { requireRole } from "@/lib/auth/require-role";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { TemplatesTabContent } from "@/components/investor/templates-tab-content";

export const metadata: Metadata = { title: "Request Templates | PostSig" };
export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  await requireRole("investor");

  return (
    <div className="space-y-6">
      <Breadcrumbs
        icon="send"
        items={[
          { label: "Metric Requests", href: "/metric-requests" },
          { label: "Templates" },
        ]}
      />
      <Suspense>
        <TemplatesTabContent />
      </Suspense>
    </div>
  );
}
