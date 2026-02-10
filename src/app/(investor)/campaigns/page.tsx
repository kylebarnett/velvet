import { Suspense } from "react";
import { requireRole } from "@/lib/auth/require-role";
import { RequestsTabs } from "@/components/investor/requests-tabs";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  await requireRole("investor");

  return (
    <Suspense>
      <RequestsTabs />
    </Suspense>
  );
}
