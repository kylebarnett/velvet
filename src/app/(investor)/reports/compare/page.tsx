import { Suspense } from "react";

import { requireRole } from "@/lib/auth/require-role";
import { CompareContent } from "./compare-content";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    companies?: string;
    periodType?: string;
    startDate?: string;
    endDate?: string;
    normalize?: string;
    metric?: string;
  }>;
};

export default async function ComparePage({ searchParams }: PageProps) {
  await requireRole("investor");
  const params = await searchParams;

  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-40 animate-pulse rounded-xl bg-white/5" />
          <div className="h-80 animate-pulse rounded-xl bg-white/5" />
        </div>
      }
    >
      <CompareContent
        selectedCompanies={params.companies}
        periodType={params.periodType}
        startDate={params.startDate}
        endDate={params.endDate}
        normalize={params.normalize}
        selectedMetric={params.metric}
      />
    </Suspense>
  );
}
