"use client";

import * as React from "react";
import { Copy, Trash2, Sparkles, EyeOff, Eye, ChevronDown, ChevronUp, Plus, Pencil, CheckSquare, Square, XSquare } from "lucide-react";

import { TemplateAssignModal } from "@/components/investor/template-assign-modal";
import { TemplateFormModal } from "@/components/investor/template-form-modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { getMetricDefinition } from "@/lib/metric-definitions";

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

function MetricChip({ name }: { name: string }) {
  const [showTooltip, setShowTooltip] = React.useState(false);
  const metricInfo = getMetricDefinition(name);

  return (
    <div className="relative inline-block">
      <span
        className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70 cursor-default"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {name}
      </span>
      {showTooltip && metricInfo && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-lg border border-white/10 bg-zinc-900 p-3 shadow-xl">
          <p className="text-xs font-medium text-white">{name}</p>
          <p className="mt-1 text-xs text-white/60">{metricInfo.description}</p>
          {metricInfo.formula && (
            <div className="mt-2 rounded bg-white/5 px-2 py-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/40">Formula</p>
              <p className="mt-0.5 text-xs text-emerald-400">{metricInfo.formula}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TemplatesTabContent() {
  const myTemplatesRef = React.useRef<HTMLDivElement>(null);
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [hiddenTemplateIds, setHiddenTemplateIds] = React.useState<string[]>([]);
  const [expandedTemplates, setExpandedTemplates] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editingSystem, setEditingSystem] = React.useState<string | null>(null);
  const [showHidden, setShowHidden] = React.useState(false);

  function toggleExpanded(templateId: string) {
    setExpandedTemplates((prev) => {
      const next = new Set(prev);
      if (next.has(templateId)) {
        next.delete(templateId);
      } else {
        next.add(templateId);
      }
      return next;
    });
  }

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = React.useState(false);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(userTemplates.map((t) => t.id)));
  }

  function selectNone() {
    setSelectedIds(new Set());
  }

  const [assignModal, setAssignModal] = React.useState<{
    open: boolean;
    template: Template | null;
  }>({ open: false, template: null });

  const [deleteModal, setDeleteModal] = React.useState<{
    open: boolean;
    templateIds: string[];
    label: string;
  }>({ open: false, templateIds: [], label: "" });

  const [hideModal, setHideModal] = React.useState<{
    open: boolean;
    template: Template | null;
  }>({ open: false, template: null });

  const [formModal, setFormModal] = React.useState<{
    open: boolean;
    mode: "create" | "edit";
    template: Template | null;
  }>({ open: false, mode: "create", template: null });

  const systemTemplates = templates.filter((t) => t.isSystem);
  const visibleSystemTemplates = systemTemplates.filter(
    (t) => !hiddenTemplateIds.includes(t.id)
  );
  const hiddenSystemTemplates = systemTemplates.filter((t) =>
    hiddenTemplateIds.includes(t.id)
  );
  const userTemplates = templates.filter((t) => !t.isSystem);

  async function loadData() {
    try {
      const [templatesRes, hiddenRes] = await Promise.all([
        fetch("/api/investors/metric-templates", { cache: "no-store" }),
        fetch("/api/user/hidden-templates", { cache: "no-store" }),
      ]);

      const templatesJson = await templatesRes.json().catch(() => null);
      const hiddenJson = await hiddenRes.json().catch(() => null);

      if (!templatesRes.ok) throw new Error(templatesJson?.error ?? "Failed to load.");

      setTemplates(templatesJson.templates ?? []);
      setHiddenTemplateIds(hiddenJson?.hiddenTemplates ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadData();
  }, []);

  async function handleClone(template: Template) {
    setEditingSystem(template.id);
    try {
      const res = await fetch("/api/investors/metric-templates/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceTemplateId: template.id }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to clone template.");

      setEditingSystem(null);
      await loadData();

      setTimeout(() => {
        myTemplatesRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
      setEditingSystem(null);
    }
  }

  async function handleHide() {
    const tmpl = hideModal.template;
    if (!tmpl) return;
    setHideModal({ open: false, template: null });

    try {
      const res = await fetch("/api/user/hidden-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: tmpl.id, action: "hide" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to hide template.");
      }
      setHiddenTemplateIds((prev) => [...prev, tmpl.id]);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    }
  }

  async function handleRestore(templateId: string) {
    try {
      const res = await fetch("/api/user/hidden-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, action: "show" }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Failed to restore template.");
      }
      setHiddenTemplateIds((prev) => prev.filter((id) => id !== templateId));
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    }
  }

  async function handleDelete() {
    const ids = deleteModal.templateIds;
    if (ids.length === 0) return;
    setDeleteModal({ open: false, templateIds: [], label: "" });
    setBulkDeleting(true);

    try {
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/investors/metric-templates/${id}`, { method: "DELETE" })
        )
      );
      const failedCount = results.filter((r) => !r.ok).length;
      if (failedCount > 0) {
        setError(`Failed to delete ${failedCount} template${failedCount > 1 ? "s" : ""}.`);
      }
      const deletedIds = new Set(
        ids.filter((_, i) => results[i].ok)
      );
      setTemplates((prev) => prev.filter((t) => !deletedIds.has(t.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        deletedIds.forEach((id) => next.delete(id));
        return next;
      });
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setBulkDeleting(false);
    }
  }

  function renderSystemTemplateCard(tmpl: Template, isHidden = false) {
    const isExpanded = expandedTemplates.has(tmpl.id);
    const hasMoreMetrics = tmpl.metric_template_items.length > 6;
    const displayedMetrics = isExpanded
      ? tmpl.metric_template_items
      : tmpl.metric_template_items.slice(0, 6);

    return (
      <div
        key={tmpl.id}
        className={`rounded-xl border border-white/10 bg-white/5 p-4 ${isHidden ? "opacity-60" : ""}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">
                <Sparkles className="h-3 w-3" />
                {INDUSTRY_LABELS[tmpl.targetIndustry ?? ""] ?? "Industry"}
              </span>
              <span className="text-sm font-medium">{tmpl.name}</span>
            </div>
            {tmpl.description && (
              <p className="mt-1 text-xs text-white/50">{tmpl.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {displayedMetrics.map((item) => (
                <MetricChip key={item.id} name={item.metric_name} />
              ))}
            </div>
            {hasMoreMetrics && (
              <button
                onClick={() => toggleExpanded(tmpl.id)}
                className="mt-2 inline-flex items-center gap-1 text-xs text-white/50 hover:text-white/70"
                type="button"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Show all {tmpl.metric_template_items.length} metrics
                  </>
                )}
              </button>
            )}
          </div>
          <div className="flex shrink-0 gap-1.5">
            {isHidden ? (
              <button
                onClick={() => handleRestore(tmpl.id)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-white px-3 text-xs font-medium text-black hover:bg-white/90"
                type="button"
              >
                <Eye className="h-3.5 w-3.5" />
                Restore
              </button>
            ) : (
              <>
                <button
                  onClick={() => setAssignModal({ open: true, template: tmpl })}
                  className="inline-flex h-8 items-center justify-center rounded-md bg-white px-3 text-xs font-medium text-black hover:bg-white/90"
                  type="button"
                >
                  Assign
                </button>
                <button
                  onClick={() => handleClone(tmpl)}
                  disabled={editingSystem === tmpl.id}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-60"
                  type="button"
                  title="Clone to My Templates"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {editingSystem === tmpl.id ? "Cloning..." : "Clone"}
                </button>
                <button
                  onClick={() => setHideModal({ open: true, template: tmpl })}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10"
                  type="button"
                  title="Hide from view"
                >
                  <EyeOff className="h-4 w-4 text-white/40" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderUserTemplateCard(tmpl: Template) {
    const isExpanded = expandedTemplates.has(tmpl.id);
    const hasMoreMetrics = tmpl.metric_template_items.length > 6;
    const displayedMetrics = isExpanded
      ? tmpl.metric_template_items
      : tmpl.metric_template_items.slice(0, 6);
    const isSelected = selectedIds.has(tmpl.id);

    return (
      <div
        key={tmpl.id}
        className={`rounded-xl border p-4 transition-colors ${
          isSelected
            ? "border-white/20 bg-white/[0.08]"
            : "border-white/10 bg-white/5"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleSelected(tmpl.id)}
                className="shrink-0 text-white/40 hover:text-white/70"
                title={isSelected ? "Deselect" : "Select"}
              >
                {isSelected ? (
                  <CheckSquare className="h-4 w-4 text-white/70" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setFormModal({ open: true, mode: "edit", template: tmpl })}
                className="text-sm font-medium hover:underline"
              >
                {tmpl.name}
              </button>
            </div>
            {tmpl.description && (
              <p className="mt-1 text-xs text-white/50">{tmpl.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {displayedMetrics.map((item) => (
                <MetricChip key={item.id} name={item.metric_name} />
              ))}
            </div>
            {hasMoreMetrics && (
              <button
                onClick={() => toggleExpanded(tmpl.id)}
                className="mt-2 inline-flex items-center gap-1 text-xs text-white/50 hover:text-white/70"
                type="button"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Show all {tmpl.metric_template_items.length} metrics
                  </>
                )}
              </button>
            )}
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button
              onClick={() => setAssignModal({ open: true, template: tmpl })}
              className="inline-flex h-8 items-center justify-center rounded-md bg-white px-3 text-xs font-medium text-black hover:bg-white/90"
              type="button"
            >
              Assign
            </button>
            <button
              type="button"
              onClick={() => setFormModal({ open: true, mode: "edit", template: tmpl })}
              className="inline-flex h-8 items-center justify-center rounded-md border border-white/10 bg-white/5 px-3 text-xs font-medium text-white hover:bg-white/10"
            >
              <Pencil className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>
            <button
              onClick={() =>
                setDeleteModal({
                  open: true,
                  templateIds: [tmpl.id],
                  label: `"${tmpl.name}"`,
                })
              }
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10"
              type="button"
              title="Delete template"
            >
              <Trash2 className="h-4 w-4 text-red-400/60" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with new template button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/60">
          Use industry templates or create your own custom metric sets.
        </p>
        <button
          type="button"
          onClick={() => setFormModal({ open: true, mode: "create", template: null })}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-white px-3 text-sm font-medium text-black hover:bg-white/90"
          data-onboarding="new-template"
        >
          <Plus className="h-4 w-4" />
          New template
        </button>
      </div>

      {loading && (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="h-5 w-40 animate-pulse rounded bg-white/10" />
            <div className="grid gap-3 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-16 animate-pulse rounded-full bg-violet-500/20" />
                        <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
                      </div>
                      <div className="h-3 w-48 animate-pulse rounded bg-white/10" />
                      <div className="flex flex-wrap gap-1.5">
                        {[1, 2, 3, 4].map((j) => (
                          <div
                            key={j}
                            className="h-5 w-16 animate-pulse rounded-full bg-white/10"
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="h-8 w-16 animate-pulse rounded-md bg-white/20" />
                      <div className="h-8 w-16 animate-pulse rounded-md bg-white/10" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-5 w-28 animate-pulse rounded bg-white/10" />
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {visibleSystemTemplates.length > 0 && (
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
                {visibleSystemTemplates.map((t) => renderSystemTemplateCard(t))}
              </div>
            </div>
          )}

          {hiddenSystemTemplates.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => setShowHidden(!showHidden)}
                className="flex items-center gap-2 text-sm text-white/50 hover:text-white/70"
                type="button"
              >
                {showHidden ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                {hiddenSystemTemplates.length} hidden{" "}
                {hiddenSystemTemplates.length === 1 ? "template" : "templates"}
              </button>
              {showHidden && (
                <div className="grid gap-3 md:grid-cols-2">
                  {hiddenSystemTemplates.map((t) =>
                    renderSystemTemplateCard(t, true)
                  )}
                </div>
              )}
            </div>
          )}

          <div ref={myTemplatesRef} className="space-y-3">
            <div className="flex items-center justify-between">
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
              {userTemplates.length > 0 && (
                <div className="flex items-center gap-2">
                  {selectedIds.size > 0 ? (
                    <>
                      <span className="text-xs text-white/50">
                        {selectedIds.size} selected
                      </span>
                      <button
                        type="button"
                        onClick={selectNone}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 text-xs text-white/60 hover:bg-white/10"
                        title="Clear selection"
                      >
                        <XSquare className="h-3.5 w-3.5" />
                        Clear
                      </button>
                      <button
                        type="button"
                        disabled={bulkDeleting}
                        onClick={() =>
                          setDeleteModal({
                            open: true,
                            templateIds: Array.from(selectedIds),
                            label: `${selectedIds.size} template${selectedIds.size > 1 ? "s" : ""}`,
                          })
                        }
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-red-500/20 bg-red-500/10 px-2 text-xs text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {bulkDeleting ? "Deleting..." : "Delete selected"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={selectAll}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 text-xs text-white/50 hover:bg-white/10 hover:text-white/70"
                    >
                      <CheckSquare className="h-3.5 w-3.5" />
                      Select all
                    </button>
                  )}
                </div>
              )}
            </div>
            {userTemplates.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
                <div className="text-sm text-white/60">
                  No custom templates yet.
                </div>
                <div className="mt-2 text-xs text-white/40">
                  Clone an industry template above or{" "}
                  <button
                    type="button"
                    onClick={() => setFormModal({ open: true, mode: "create", template: null })}
                    className="text-white underline underline-offset-4 hover:text-white/80"
                  >
                    create your own
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {userTemplates.map(renderUserTemplateCard)}
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

      {/* Template form modal */}
      <TemplateFormModal
        open={formModal.open}
        mode={formModal.mode}
        templateId={formModal.template?.id}
        initialName={formModal.template?.name}
        initialDescription={formModal.template?.description ?? ""}
        initialItems={
          formModal.template?.metric_template_items.map((item) => ({
            metric_name: item.metric_name,
            period_type: item.period_type as "monthly" | "quarterly" | "annual",
            data_type: item.data_type,
            sort_order: item.sort_order,
          }))
        }
        onClose={() => setFormModal({ open: false, mode: "create", template: null })}
        onSaved={() => {
          setFormModal({ open: false, mode: "create", template: null });
          loadData();
        }}
      />

      {/* Delete confirmation */}
      <ConfirmModal
        open={deleteModal.open}
        title={deleteModal.templateIds.length > 1 ? "Delete Templates" : "Delete Template"}
        message={
          deleteModal.templateIds.length > 0
            ? `Are you sure you want to delete ${deleteModal.label}? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ open: false, templateIds: [], label: "" })}
      />

      {/* Hide confirmation */}
      <ConfirmModal
        open={hideModal.open}
        title="Hide Template"
        message={
          hideModal.template
            ? `Hide "${hideModal.template.name}" from your templates? You can restore it later.`
            : ""
        }
        confirmLabel="Hide"
        cancelLabel="Cancel"
        variant="default"
        onConfirm={handleHide}
        onCancel={() => setHideModal({ open: false, template: null })}
      />
    </div>
  );
}
