export default function CompanyMetricsPage({
  params,
}: {
  params: { companyId: string };
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Metrics</h1>
        <p className="text-sm text-white/60">
          Detailed view for{" "}
          <span className="text-white">{params.companyId}</span>
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-white/60">
          Coming next: filter by month/quarter/year and export.
        </div>
      </div>
    </div>
  );
}

