import { Suspense } from "react";

import { requireRole } from "@/lib/auth/require-role";
import { ReportFilters, ReportHeader } from "@/components/reports";
import { SummaryContent } from "./summary-content";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    industries?: string;
    stages?: string;
    periodType?: string;
    startDate?: string;
    endDate?: string;
  }>;
};

export default async function ReportsPage({ searchParams }: PageProps) {
  await requireRole("investor");
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="h-10 animate-pulse rounded-lg bg-white/5" />}>
        <ReportHeader
          reportType="summary"
          currentFilters={params}
        />
      </Suspense>

      <Suspense fallback={<div className="h-20 animate-pulse rounded-lg bg-white/5" />}>
        <ReportFilters showPeriodType={true} showDateRange={true} />
      </Suspense>

      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-white/5" />
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-48 animate-pulse rounded-xl bg-white/5" />
              ))}
            </div>
          </div>
        }
      >
        <SummaryContent
          industries={params.industries}
          stages={params.stages}
          periodType={params.periodType}
          startDate={params.startDate}
          endDate={params.endDate}
        />
      </Suspense>
    </div>
  );
}
