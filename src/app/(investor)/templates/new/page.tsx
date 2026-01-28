import { TemplateForm } from "@/components/investor/template-form";

export default function NewTemplatePage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">New template</h1>
        <p className="text-sm text-white/60">
          Define a reusable set of metrics to request from portfolio companies.
        </p>
      </div>

      <TemplateForm mode="create" />
    </div>
  );
}
