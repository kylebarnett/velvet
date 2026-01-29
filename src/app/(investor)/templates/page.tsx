"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Trash2, Sparkles } from "lucide-react";

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
  isSystem: boolean;
  targetIndustry: string | null;
  created_at: string;
  metric_template_items: TemplateItem[];
};

const INDUSTRY_LABELS: Record<string, string> = {
  saas: "SaaS",
  fintech: "Fintech",
  healthcare: "Healthcare",
  ecommerce: "E-commerce",
  edtech: "EdTech",
  ai_ml: "AI/ML",
  other: "General",
};

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [cloning, setCloning] = React.useState<string | null>(null);
  const [assignModal, setAssignModal] = React.useState<{
    open: boolean;
    template: Template | null;
  }>({
    open: false,
    template: null,
  });
  const [deleteModal, setDeleteModal] = React.useState<{
    open: boolean;
    template: Template | null;
  }>({
    open: false,
    template: null,
  });

  const systemTemplates = templates.filter((t) => t.isSystem);
  const userTemplates = templates.filter((t) => !t.isSystem);

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

  async function handleClone(template: Template) {
    setCloning(template.id);
    try {
      const res = await fetch("/api/investors/metric-templates/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceTemplateId: template.id }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to clone.");

      // Navigate to edit the new template
      router.push(`/templates/${json.id}`);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
      setCloning(null);
    }
  }

  async function handleDelete() {
    const tmpl = deleteModal.template;
    if (!tmpl) return;
    setDeleteModal({ open: false, template: null });

    try {
      const res = await fetch(`/api/investors/metric-templates/${tmpl.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Failed to delete.");
      }
      setTemplates((prev) => prev.filter((t) => t.id !== tmpl.id));
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    }
  }

  function renderTemplateCard(tmpl: Template) {
    const isSystem = tmpl.isSystem;

    return (
      <div
        key={tmpl.id}
        className="rounded-xl border border-white/10 bg-white/5 p-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {isSystem && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">
                  <Sparkles className="h-3 w-3" />
                  {INDUSTRY_LABELS[tmpl.targetIndustry ?? ""] ?? "Industry"}
                </span>
              )}
              {isSystem ? (
                <span className="text-sm font-medium">{tmpl.name}</span>
              ) : (
                <Link
                  href={`/templates/${tmpl.id}`}
                  className="text-sm font-medium hover:underline"
                >
                  {tmpl.name}
                </Link>
              )}
            </div>
            {tmpl.description && (
              <p className="mt-1 text-xs text-white/50">{tmpl.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tmpl.metric_template_items.slice(0, 6).map((item) => (
                <span
                  key={item.id}
                  className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70"
                >
                  {item.metric_name}
                </span>
              ))}
              {tmpl.metric_template_items.length > 6 && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50">
                  +{tmpl.metric_template_items.length - 6} more
                </span>
              )}
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
            {isSystem ? (
              <button
                onClick={() => handleClone(tmpl)}
                disabled={cloning === tmpl.id}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-60"
                type="button"
                title="Clone to customize"
              >
                <Copy className="h-3.5 w-3.5" />
                {cloning === tmpl.id ? "Cloning..." : "Clone"}
              </button>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1" data-onboarding="templates-title">
          <h1 className="text-xl font-semibold tracking-tight">
            Metric templates
          </h1>
          <p className="text-sm text-white/60">
            Use industry templates or create your own custom metric sets.
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

      {loading && (
        <div className="text-sm text-white/60">Loading templates...</div>
      )}

      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Industry Templates Section */}
          {systemTemplates.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-white/80">
                  Industry Templates
                </h2>
                <span className="text-xs text-white/40">
                  Pre-built metrics by industry
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {systemTemplates.map(renderTemplateCard)}
              </div>
            </div>
          )}

          {/* User Templates Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium text-white/80">
                My Templates
              </h2>
              {userTemplates.length > 0 && (
                <span className="text-xs text-white/40">
                  {userTemplates.length}{" "}
                  {userTemplates.length === 1 ? "template" : "templates"}
                </span>
              )}
            </div>
            {userTemplates.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
                <div className="text-sm text-white/60">
                  No custom templates yet.
                </div>
                <div className="mt-2 text-xs text-white/40">
                  Clone an industry template above or{" "}
                  <Link
                    href="/templates/new"
                    className="text-white underline underline-offset-4 hover:text-white/80"
                  >
                    create your own
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {userTemplates.map(renderTemplateCard)}
              </div>
            )}
          </div>
        </>
      )}

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
