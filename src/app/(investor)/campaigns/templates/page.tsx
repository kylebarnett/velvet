import { Suspense } from "react";
import { requireRole } from "@/lib/auth/require-role";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { TemplatesTabContent } from "@/components/investor/templates-tab-content";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  await requireRole("investor");

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Metric Requests", href: "/campaigns" },
          { label: "Templates" },
        ]}
      />
      <Suspense>
        <TemplatesTabContent />
      </Suspense>
    </div>
  );
}
