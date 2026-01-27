import { MetricRequestForm } from "@/components/forms/metric-request-form";

export default function NewRequestPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Create metric request
        </h1>
        <p className="text-sm text-white/60">
          Choose a company, define metrics, and set a due date.
        </p>
      </div>

      <MetricRequestForm />
    </div>
  );
}

