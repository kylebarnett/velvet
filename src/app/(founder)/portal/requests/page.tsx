import { MetricSubmissionForm } from "@/components/forms/metric-submission-form";

export default function FounderRequestsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Pending requests
        </h1>
        <p className="text-sm text-white/60">
          Fill in requested metrics from your investors.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="text-sm font-medium">Demo request (placeholder)</div>
        <div className="mt-3">
          <MetricSubmissionForm />
        </div>
      </div>
    </div>
  );
}

