"use client";

import { MockSidebar } from "./mock-sidebar";
import { MockKPICards } from "./mock-kpi-cards";
import { MockChart } from "./mock-chart";

export function MockDashboard() {
  return (
    <div
      aria-hidden="true"
      className="flex overflow-hidden rounded-xl border border-border-default"
    >
      {/* Sidebar */}
      <MockSidebar />

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col bg-bg-primary">
        {/* Header */}
        <div className="border-b border-border-subtle px-6 py-4">
          <p className="text-xs text-text-muted">Dashboard</p>
          <p className="mt-0.5 text-sm font-medium text-text-primary">
            Good morning, Sarah
          </p>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4 p-5">
          {/* KPI Cards row */}
          <MockKPICards />

          {/* Chart */}
          <div className="card-surface rounded-lg border border-border-default p-4">
            <p className="mb-2 text-xs font-medium text-text-secondary">
              Portfolio ARR
            </p>
            <MockChart />
          </div>
        </div>
      </div>
    </div>
  );
}
