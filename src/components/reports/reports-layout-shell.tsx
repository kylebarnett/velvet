export function ReportsLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold tracking-tight text-text-primary"
          data-onboarding="reports-title"
        >
          Reports
        </h1>
        <p className="mt-1 text-sm text-text-tertiary">
          Portfolio-level analytics and insights
        </p>
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
