import { requireRole } from "@/lib/auth/require-role";
import { BenchmarksClient } from "@/components/reports/benchmarks/benchmarks-client";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function BenchmarksPage() {
  await requireRole("investor");
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Reports", href: "/reports" },
        { label: "Benchmarks" },
      ]} />
      <BenchmarksClient />
    </div>
  );
}
