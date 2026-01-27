export default function CompanyDashboardPage({
  params,
}: {
  params: { companyId: string };
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Company dashboard
        </h1>
        <p className="text-sm text-white/60">
          Company: <span className="text-white">{params.companyId}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-medium">Metrics (charts)</div>
          <div className="mt-3 text-sm text-white/60">
            This page will visualize revenue, burn, cash, headcount over time.
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-medium">Requests</div>
          <div className="mt-3 text-sm text-white/60">
            Recent metric requests and submission status.
          </div>
        </div>
      </div>
    </div>
  );
}

