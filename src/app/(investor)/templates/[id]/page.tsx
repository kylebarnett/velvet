"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

import { TemplateForm } from "@/components/investor/template-form";
import { TemplateAssignModal } from "@/components/investor/template-assign-modal";

type TemplateItem = {
  id: string;
  metric_name: string;
  period_type: "monthly" | "quarterly" | "annual";
  data_type: string;
  sort_order: number;
};

type Template = {
  id: string;
  name: string;
  description: string | null;
  metric_template_items: TemplateItem[];
};

export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [template, setTemplate] = React.useState<Template | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [assignOpen, setAssignOpen] = React.useState(false);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/investors/metric-templates/${id}`);
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error ?? "Template not found.");
        setTemplate(json.template);
      } catch (e: any) {
        setError(e?.message ?? "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return <div className="text-sm text-white/60">Loading template...</div>;
  }

  if (error || !template) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error ?? "Template not found."}
        </div>
        <button
          onClick={() => router.push("/templates")}
          className="text-sm text-white/60 hover:text-white"
          type="button"
        >
          Back to templates
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Edit template</h1>
          <p className="text-sm text-white/60">{template.name}</p>
        </div>
        <button
          onClick={() => setAssignOpen(true)}
          className="inline-flex h-9 items-center justify-center rounded-md bg-white px-3 text-sm font-medium text-black hover:bg-white/90"
          type="button"
        >
          Assign to companies
        </button>
      </div>

      <TemplateForm
        mode="edit"
        templateId={template.id}
        initialName={template.name}
        initialDescription={template.description ?? ""}
        initialItems={template.metric_template_items.map((item) => ({
          metric_name: item.metric_name,
          period_type: item.period_type,
          data_type: item.data_type,
          sort_order: item.sort_order,
        }))}
      />

      <TemplateAssignModal
        open={assignOpen}
        templateId={template.id}
        templateName={template.name}
        onClose={() => setAssignOpen(false)}
        onAssigned={() => {}}
      />
    </div>
  );
}
