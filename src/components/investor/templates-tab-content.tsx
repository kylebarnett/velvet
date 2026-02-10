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
        className="rounded-full bg-bg-hover px-2 py-0.5 text-xs text-text-secondary cursor-default"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {name}
      </span>
      {showTooltip && metricInfo && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-lg border border-border-default bg-bg-secondary p-3 shadow-xl">
          <p className="text-xs font-medium text-text-primary">{name}</p>
          <p className="mt-1 text-xs text-text-tertiary">{metricInfo.description}</p>
          {metricInfo.formula && (
            <div className="mt-2 rounded bg-bg-elevated px-2 py-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Formula</p>
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

  const toggleExpanded = React.useCallback((templateId: string) => {
    setExpandedTemplates((prev) => {
      const next = new Set(prev);
      if (next.has(templateId)) {
        next.delete(templateId);
      } else {
        next.add(templateId);
      }
      return next;
    });
  }, []);

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = React.useState(false);

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

  const systemTemplates = React.useMemo(
    () => templates.filter((t) => t.isSystem),
    [templates],
  );
  const visibleSystemTemplates = React.useMemo(
    () => systemTemplates.filter((t) => !hiddenTemplateIds.includes(t.id)),
    [systemTemplates, hiddenTemplateIds],
  );
  const hiddenSystemTemplates = React.useMemo(
    () => systemTemplates.filter((t) => hiddenTemplateIds.includes(t.id)),
    [systemTemplates, hiddenTemplateIds],
  );
  const userTemplates = React.useMemo(
    () => templates.filter((t) => !t.isSystem),
    [templates],
  );

  const toggleSelected = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = React.useCallback(() => {
    setSelectedIds(new Set(userTemplates.map((t) => t.id)));
  }, [userTemplates]);

  const selectNone = React.useCallback(() => {
    setSelectedIds(new Set());
  }, []);

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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
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
        className={`rounded-xl border border-border-default bg-bg-elevated p-4 ${isHidden ? "opacity-60" : ""}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--tag-violet-bg)] px-2 py-0.5 text-xs text-[var(--tag-violet-text)]">
                <Sparkles className="h-3 w-3" />
                {INDUSTRY_LABELS[tmpl.targetIndustry ?? ""] ?? "Industry"}
              </span>
              <span className="text-sm font-medium">{tmpl.name}</span>
            </div>
            {tmpl.description && (
              <p className="mt-1 text-xs text-text-tertiary">{tmpl.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {displayedMetrics.map((item) => (
                <MetricChip key={item.id} name={item.metric_name} />
              ))}
            </div>
            {hasMoreMetrics && (
              <button
                onClick={() => toggleExpanded(tmpl.id)}
                className="mt-2 inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary"
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
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-btn-primary-bg px-3 text-xs font-medium text-btn-primary-text hover:bg-btn-primary-hover"
                type="button"
              >
                <Eye className="h-3.5 w-3.5" />
                Restore
              </button>
            ) : (
              <>
                <button
                  onClick={() => setAssignModal({ open: true, template: tmpl })}
                  className="inline-flex h-9 items-center justify-center rounded-md bg-btn-primary-bg px-3 text-xs font-medium text-btn-primary-text hover:bg-btn-primary-hover"
                  type="button"
                >
                  Assign
                </button>
                <button
                  onClick={() => handleClone(tmpl)}
                  disabled={editingSystem === tmpl.id}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border-default bg-bg-elevated px-3 text-xs font-medium text-text-primary hover:bg-bg-hover disabled:opacity-60"
                  type="button"
                  title="Clone to My Templates"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {editingSystem === tmpl.id ? "Cloning..." : "Clone"}
                </button>
                <button
                  onClick={() => setHideModal({ open: true, template: tmpl })}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
                  type="button"
                  title="Hide from view"
                  aria-label={`Hide ${tmpl.name} template`}
                >
                  <EyeOff className="h-4 w-4 text-text-muted" />
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
            ? "border-border-default bg-bg-hover"
            : "border-border-default bg-bg-elevated"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleSelected(tmpl.id)}
                className="shrink-0 text-text-muted hover:text-text-secondary"
                title={isSelected ? "Deselect" : "Select"}
              >
                {isSelected ? (
                  <CheckSquare className="h-4 w-4 text-text-secondary" />
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
              <p className="mt-1 text-xs text-text-tertiary">{tmpl.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {displayedMetrics.map((item) => (
                <MetricChip key={item.id} name={item.metric_name} />
              ))}
            </div>
            {hasMoreMetrics && (
              <button
                onClick={() => toggleExpanded(tmpl.id)}
                className="mt-2 inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary"
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
              className="inline-flex h-9 items-center justify-center rounded-md bg-btn-primary-bg px-3 text-xs font-medium text-btn-primary-text hover:bg-btn-primary-hover"
              type="button"
            >
              Assign
            </button>
            <button
              type="button"
              onClick={() => setFormModal({ open: true, mode: "edit", template: tmpl })}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border-default bg-bg-elevated px-3 text-xs font-medium text-text-primary hover:bg-bg-hover"
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
              className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
              type="button"
              title="Delete template"
              aria-label={`Delete ${tmpl.name} template`}
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
        <p className="text-sm text-text-tertiary">
          Use industry templates or create your own custom metric sets.
        </p>
        <button
          type="button"
          onClick={() => setFormModal({ open: true, mode: "create", template: null })}
          className="inline-flex h-10 items-center gap-1.5 rounded-md bg-btn-primary-bg px-3 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
          data-onboarding="new-template"
        >
          <Plus className="h-4 w-4" />
          New template
        </button>
      </div>

      {loading && (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="h-5 w-40 animate-pulse rounded bg-bg-hover" />
            <div className="grid gap-3 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border-default bg-bg-elevated p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-16 animate-pulse rounded-full bg-violet-500/20" />
                        <div className="h-4 w-32 animate-pulse rounded bg-bg-hover" />
                      </div>
                      <div className="h-3 w-48 animate-pulse rounded bg-bg-hover" />
                      <div className="flex flex-wrap gap-1.5">
                        {[1, 2, 3, 4].map((j) => (
                          <div
                            key={j}
                            className="h-5 w-16 animate-pulse rounded-full bg-bg-hover"
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="h-8 w-16 animate-pulse rounded-md bg-bg-hover" />
                      <div className="h-8 w-16 animate-pulse rounded-md bg-bg-hover" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-5 w-28 animate-pulse rounded bg-bg-hover" />
            <div className="rounded-xl border border-border-default bg-bg-elevated p-4">
              <div className="h-4 w-40 animate-pulse rounded bg-bg-hover" />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {visibleSystemTemplates.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-text-primary">
                  Industry Templates
                </h2>
                <span className="text-xs text-text-tertiary">
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
                className="flex items-center gap-2 text-sm text-text-muted hover:text-text-secondary"
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
                <h2 className="text-sm font-medium text-text-primary">
                  My Templates
                </h2>
                {userTemplates.length > 0 && (
                  <span className="text-xs text-text-tertiary">
                    {userTemplates.length}{" "}
                    {userTemplates.length === 1 ? "template" : "templates"}
                  </span>
                )}
              </div>
              {userTemplates.length > 0 && (
                <div className="flex items-center gap-2">
                  {selectedIds.size > 0 ? (
                    <>
                      <span className="text-xs text-text-tertiary">
                        {selectedIds.size} selected
                      </span>
                      <button
                        type="button"
                        onClick={selectNone}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-border-default bg-bg-elevated px-2 text-xs text-text-tertiary hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
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
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-2 text-xs text-[var(--status-error-text)] hover:bg-red-500/20 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {bulkDeleting ? "Deleting..." : "Delete selected"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={selectAll}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-border-default bg-bg-elevated px-2 text-xs text-text-muted hover:bg-bg-hover hover:text-text-secondary focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
                    >
                      <CheckSquare className="h-3.5 w-3.5" />
                      Select all
                    </button>
                  )}
                </div>
              )}
            </div>
            {userTemplates.length === 0 ? (
              <div className="rounded-xl border border-border-default bg-bg-elevated p-6 text-center">
                <div className="text-sm text-text-tertiary">
                  No custom templates yet.
                </div>
                <div className="mt-2 text-xs text-text-tertiary">
                  Clone an industry template above or{" "}
                  <button
                    type="button"
                    onClick={() => setFormModal({ open: true, mode: "create", template: null })}
                    className="text-text-primary underline underline-offset-4 hover:text-text-secondary"
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
