import { requireRole } from "@/lib/auth/require-role";
import { BenchmarksClient } from "@/components/reports/benchmarks/benchmarks-client";

export const dynamic = "force-dynamic";

export default async function BenchmarksPage() {
  await requireRole("investor");
  return <BenchmarksClient />;
}
