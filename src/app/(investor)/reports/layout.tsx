import { Suspense } from "react";
import { ReportsProvider } from "@/components/reports/reports-context";
import { ReportsLayoutShell } from "@/components/reports/reports-layout-shell";

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ReportsProvider>
      <ReportsLayoutShell>
        <Suspense
          fallback={
            <div className="space-y-4">
              <div className="h-12 w-full animate-pulse rounded-2xl bg-bg-raised" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 animate-pulse rounded-2xl bg-bg-raised" />
                ))}
              </div>
            </div>
          }
        >
          {children}
        </Suspense>
      </ReportsLayoutShell>
    </ReportsProvider>
  );
}
