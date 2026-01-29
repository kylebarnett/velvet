"use client";

import * as React from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";

import { TemplateAssignModal } from "@/components/investor/template-assign-modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";

type TemplateItem = {
  id: string;
  metric_name: string;
  period_type: string;
  data_type: string;
  sort_order: number;
};

type Template = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  metric_template_items: TemplateItem[];
};

export default function TemplatesPage() {
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [assignModal, setAssignModal] = React.useState<{ open: boolean; template: Template | null }>({
    open: false,
    template: null,
  });
  const [deleteModal, setDeleteModal] = React.useState<{ open: boolean; template: Template | null }>({
    open: false,
    template: null,
  });

  async function loadTemplates() {
    try {
      const res = await fetch("/api/investors/metric-templates");
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to load.");
      setTemplates(json.templates ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadTemplates();
  }, []);

  async function handleDelete() {
    const tmpl = deleteModal.template;
    if (!tmpl) return;
    setDeleteModal({ open: false, template: null });

    try {
      const res = await fetch(`/api/investors/metric-templates/${tmpl.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Failed to delete.");
      }
      setTemplates((prev) => prev.filter((t) => t.id !== tmpl.id));
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1" data-onboarding="templates-title">
          <h1 className="text-xl font-semibold tracking-tight">Metric templates</h1>
          <p className="text-sm text-white/60">
            Create reusable metric sets and assign them to portfolio companies.
          </p>
        </div>
        <Link
          href="/templates/new"
          className="inline-flex h-9 items-center justify-center rounded-md bg-white px-3 text-sm font-medium text-black hover:bg-white/90"
          data-onboarding="new-template"
        >
          New template
        </Link>
      </div>

      {loading && <div className="text-sm text-white/60">Loading templates...</div>}

      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && templates.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <div className="text-sm text-white/60">No templates yet.</div>
          <div className="mt-2">
            <Link
              href="/templates/new"
              className="text-sm text-white underline underline-offset-4 hover:text-white/80"
            >
              Create your first template
            </Link>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {templates.map((tmpl) => (
          <div key={tmpl.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link
                  href={`/templates/${tmpl.id}`}
                  className="text-sm font-medium hover:underline"
                >
                  {tmpl.name}
                </Link>
                {tmpl.description && (
                  <p className="mt-0.5 text-xs text-white/50">{tmpl.description}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tmpl.metric_template_items.map((item) => (
                    <span
                      key={item.id}
                      className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70"
                    >
                      {item.metric_name}
                      <span className="ml-1 text-white/40">{item.period_type}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  onClick={() => setAssignModal({ open: true, template: tmpl })}
                  className="inline-flex h-8 items-center justify-center rounded-md bg-white px-3 text-xs font-medium text-black hover:bg-white/90"
                  type="button"
                >
                  Assign
                </button>
                <Link
                  href={`/templates/${tmpl.id}`}
                  className="inline-flex h-8 items-center justify-center rounded-md border border-white/10 bg-white/5 px-3 text-xs font-medium text-white hover:bg-white/10"
                >
                  Edit
                </Link>
                <button
                  onClick={() => setDeleteModal({ open: true, template: tmpl })}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10"
                  type="button"
                  title="Delete template"
                >
                  <Trash2 className="h-4 w-4 text-red-400/60" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Assign modal */}
      {assignModal.template && (
        <TemplateAssignModal
          open={assignModal.open}
          templateId={assignModal.template.id}
          templateName={assignModal.template.name}
          onClose={() => setAssignModal({ open: false, template: null })}
          onAssigned={() => {}}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        open={deleteModal.open}
        title="Delete Template"
        message={
          deleteModal.template
            ? `Are you sure you want to delete "${deleteModal.template.name}"? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ open: false, template: null })}
      />
    </div>
  );
}
