export default function InvestorDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-white/60">
          Portfolio overview and recent metric activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Portfolio companies", value: "—" },
          { label: "Pending requests", value: "—" },
          { label: "Submitted this week", value: "—" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="text-sm text-white/60">{card.label}</div>
            <div className="mt-2 text-2xl font-semibold">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-medium">Portfolio companies</div>
        <div className="mt-3 text-sm text-white/60">
          Wiring this up to Supabase comes next (companies + relationships).
        </div>
      </div>
    </div>
  );
}

