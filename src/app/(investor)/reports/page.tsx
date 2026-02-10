import { Suspense } from "react";
import Link from "next/link";
import { BarChart3, GitCompare, Award } from "lucide-react";

import { requireRole } from "@/lib/auth/require-role";
import { ReportFilters } from "@/components/reports";
import { SummaryContent } from "./summary-content";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    industries?: string;
    stages?: string;
  }>;
};

const REPORT_VIEWS = [
  {
    href: "/reports/compare",
    label: "Compare Companies",
    description: "Side-by-side metric comparison across selected portfolio companies",
    icon: GitCompare,
  },
  {
    href: "/reports/benchmarks",
    label: "Benchmarks",
    description: "See how your portfolio companies rank against industry percentiles",
    icon: Award,
  },
];

export default async function ReportsPage({ searchParams }: PageProps) {
  await requireRole("investor");
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-text-tertiary">
          Portfolio-level analytics and metric summaries.
        </p>
      </div>

      {/* Report type navigation */}
      <div className="grid gap-3 sm:grid-cols-2">
        {REPORT_VIEWS.map((view) => (
          <Link
            key={view.href}
            href={view.href}
            className="card-hover-lift flex items-start gap-3 rounded-xl border border-border-subtle card-surface p-4 hover:border-border-default"
          >
            <div className="rounded-lg bg-bg-elevated p-2">
              <view.icon className="h-4 w-4 text-text-tertiary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-text-primary">{view.label}</h3>
              <p className="mt-0.5 text-xs text-text-muted">{view.description}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="space-y-1">
        <h2 className="text-base font-medium text-text-primary">Portfolio Summary</h2>
      </div>

      <Suspense fallback={<div className="h-20 animate-pulse rounded-lg bg-bg-elevated" />}>
        <ReportFilters />
      </Suspense>

      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-bg-elevated" />
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-48 animate-pulse rounded-xl bg-bg-elevated" />
              ))}
            </div>
          </div>
        }
      >
        <SummaryContent
          industries={params.industries}
          stages={params.stages}
        />
      </Suspense>
    </div>
  );
}
