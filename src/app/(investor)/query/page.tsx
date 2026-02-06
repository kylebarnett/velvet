import { requireRole } from "@/lib/auth/require-role";
import { QueryClient } from "@/components/investor/query-client";

export const dynamic = "force-dynamic";

export default async function QueryPage() {
  await requireRole("investor");
  return <QueryClient />;
}
