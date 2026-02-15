"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save, ChevronDown, X } from "lucide-react";
import {
  Widget,
  ChartConfig,
  MetricCardConfig,
  TableConfig,
  DashboardLayout,
  MetricValue,
  PeriodType,
  isTableConfig,
  parseLayout,
} from "@/components/dashboard/types";
import {
  WidgetLibrary,
  WidgetTemplate,
} from "@/components/dashboard/widget-library";
import { WidgetConfig } from "@/components/dashboard/widget-config";
import { DashboardCanvas } from "@/components/dashboard/dashboard-canvas";
import { ConfirmModal } from "@/components/ui/confirm-modal";

type DashboardView = {
  id: string;
  name: string;
  is_default: boolean;
  layout: unknown;
};

type DashboardTemplate = {
  id: string;
  name: string;
  description: string | null;
  target_industry: string | null;
  layout: unknown;
  is_system: boolean;
};

type DashboardBuilderProps = {
  companyId: string;
  companyName: string;
  companyIndustry: string | null;
  availableMetrics: string[];
  metrics: MetricValue[];
  views: DashboardView[];
  templates: DashboardTemplate[];
  apiBasePath: string;
  redirectPath: string;
};

function generateWidgetId(): string {
  return `widget-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function DashboardBuilder({
  companyId,
  companyName,
  companyIndustry,
  availableMetrics,
  metrics,
  views,
  templates,
  apiBasePath,
  redirectPath,
}: DashboardBuilderProps) {
  const router = useRouter();
  const [selectedViewId, setSelectedViewId] = React.useState<string | null>(
    views.find((v) => v.is_default)?.id ?? views[0]?.id ?? null
  );
  const [widgets, setWidgets] = React.useState<Widget[]>(() => {
    const selectedView = views.find(
      (v) => v.id === (views.find((v2) => v2.is_default)?.id ?? views[0]?.id ?? null)
    );
    if (selectedView) {
      return parseLayout(selectedView.layout);
    }
    const industryTemplate = templates.find(
      (t) => t.target_industry === companyIndustry && t.is_system
    );
    if (industryTemplate) {
      return parseLayout(industryTemplate.layout);
    }
    const generalTemplate = templates.find(
      (t) => t.target_industry === null && t.is_system
    );
    return generalTemplate ? parseLayout(generalTemplate.layout) : [];
  });
  const [selectedWidgetId, setSelectedWidgetId] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saveAsError, setSaveAsError] = React.useState<string | null>(null);
  const [showViewDropdown, setShowViewDropdown] = React.useState(false);
  const [showTemplateDropdown, setShowTemplateDropdown] = React.useState(false);
  const [saveAsName, setSaveAsName] = React.useState("");
  const [showSaveAs, setShowSaveAs] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);

  // Confirmation dialogs
  const [confirmTemplate, setConfirmTemplate] = React.useState<DashboardTemplate | null>(null);
  const [confirmViewSwitch, setConfirmViewSwitch] = React.useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const templateDropdownRef = React.useRef<HTMLDivElement>(null);

  // Warn before unloading with unsaved changes
  React.useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowViewDropdown(false);
      }
      if (templateDropdownRef.current && !templateDropdownRef.current.contains(e.target as Node)) {
        setShowTemplateDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedWidget = widgets.find((w) => w.id === selectedWidgetId) ?? null;
  const currentView = views.find((v) => v.id === selectedViewId);

  function handleAddWidget(template: WidgetTemplate) {
    const maxY = widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0);
    const newWidget: Widget = {
      id: generateWidgetId(),
      type: template.type,
      x: 0,
      y: maxY,
      w: template.defaultW,
      h: template.defaultH,
      config: getDefaultConfig(template),
    };
    setWidgets([...widgets, newWidget]);
    setSelectedWidgetId(newWidget.id);
    setIsDirty(true);
  }

  function getDefaultConfig(
    template: WidgetTemplate
  ): ChartConfig | MetricCardConfig | TableConfig {
    if (template.type === "chart") {
      return {
        chartType: template.subtype ?? "line",
        metrics: availableMetrics.slice(0, 1),
        periodType: "quarterly",
        showLegend: true,
        title: template.label,
      };
    }
    if (template.type === "metric-card") {
      return {
        metric: availableMetrics[0] ?? "",
        showTrend: true,
        title: availableMetrics[0] ?? "Metric",
      };
    }
    return {
      metrics: availableMetrics.slice(0, 4),
      periodType: "quarterly",
      title: "Metrics Table",
    };
  }

  function handleWidgetChange(updatedWidget: Widget) {
    setWidgets(widgets.map((w) => (w.id === updatedWidget.id ? updatedWidget : w)));
    setIsDirty(true);
  }

  function handleDeleteWidget() {
    if (!selectedWidgetId) return;
    const target = widgets.find((w) => w.id === selectedWidgetId);
    if (target && isTableConfig(target.config) && target.config.showAllMetrics) return;
    setConfirmDelete(true);
  }

  function executeDeleteWidget() {
    if (!selectedWidgetId) return;
    setWidgets(widgets.filter((w) => w.id !== selectedWidgetId));
    setSelectedWidgetId(null);
    setIsDirty(true);
    setConfirmDelete(false);
  }

  function handleApplyTemplate(template: DashboardTemplate) {
    setShowTemplateDropdown(false);
    if (isDirty || widgets.length > 0) {
      setConfirmTemplate(template);
    } else {
      executeApplyTemplate(template);
    }
  }

  function executeApplyTemplate(template: DashboardTemplate) {
    const templateWidgets = parseLayout(template.layout);
    setWidgets(templateWidgets);
    setSelectedWidgetId(null);
    setIsDirty(true);
    setConfirmTemplate(null);
  }

  function handleViewChange(viewId: string) {
    setShowViewDropdown(false);
    if (isDirty) {
      setConfirmViewSwitch(viewId);
    } else {
      executeViewChange(viewId);
    }
  }

  function executeViewChange(viewId: string) {
    const view = views.find((v) => v.id === viewId);
    if (view) {
      setSelectedViewId(viewId);
      setWidgets(parseLayout(view.layout));
      setSelectedWidgetId(null);
      setIsDirty(false);
    }
    setConfirmViewSwitch(null);
  }

  function handleCancel() {
    if (isDirty) {
      setConfirmCancel(true);
    } else {
      router.push(redirectPath);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);

    try {
      if (currentView) {
        const res = await fetch(`${apiBasePath}/${currentView.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ layout: widgets }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to save");
      } else {
        const res = await fetch(apiBasePath, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId,
            name: "Default",
            isDefault: true,
            layout: widgets,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to save");
      }

      setIsDirty(false);
      router.push(redirectPath);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveAs(e?: React.FormEvent) {
    e?.preventDefault();
    if (!saveAsName.trim()) return;

    setIsSaving(true);
    setSaveAsError(null);

    try {
      const res = await fetch(apiBasePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          name: saveAsName.trim(),
          isDefault: false,
          layout: widgets,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");

      setIsDirty(false);
      setShowSaveAs(false);
      router.push(redirectPath);
      router.refresh();
    } catch (err: unknown) {
      // Keep modal open on error so user can see the message
      setSaveAsError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      {/* Main content */}
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* View selector */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowViewDropdown(!showViewDropdown)}
                className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-input px-3 py-1.5 text-xs font-medium text-text-primary hover:border-border-default"
              >
                <span>{currentView?.name ?? "New View"}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {showViewDropdown && (
                <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-border-default bg-bg-secondary py-1 shadow-xl backdrop-blur-sm">
                  {views.map((view) => (
                    <button
                      key={view.id}
                      type="button"
                      onClick={() => handleViewChange(view.id)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                        selectedViewId === view.id
                          ? "bg-bg-elevated text-text-primary"
                          : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                      }`}
                    >
                      {view.name}
                    </button>
                  ))}
                  {views.length === 0 && (
                    <div className="px-3 py-2 text-xs text-text-muted">No saved views</div>
                  )}
                </div>
              )}
            </div>

            {/* Template selector */}
            <div className="relative" ref={templateDropdownRef}>
              <button
                type="button"
                onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-input px-3 py-1.5 text-xs font-medium text-text-primary hover:border-border-default"
              >
                <span>Use Template</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {showTemplateDropdown && (
                <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] max-h-[300px] overflow-y-auto rounded-lg border border-border-default bg-bg-secondary py-1 shadow-xl backdrop-blur-sm">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleApplyTemplate(template)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
                    >
                      <div>
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="mt-0.5 text-text-muted line-clamp-1">
                            {template.description}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-border-default bg-bg-input px-3 py-1.5 text-xs font-medium text-text-primary hover:border-border-default"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setShowSaveAs(true)}
              className="rounded-lg border border-border-default bg-bg-input px-3 py-1.5 text-xs font-medium text-text-primary hover:border-border-default"
            >
              Save As
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg bg-btn-primary-bg px-3 py-1.5 text-xs font-medium text-btn-primary-text hover:bg-btn-primary-hover disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]">
            {error}
          </div>
        )}

        {/* Canvas */}
        <DashboardCanvas
          widgets={widgets}
          metrics={metrics}
          periodType="quarterly"
          onLayoutChange={(w) => {
            setWidgets(w);
            setIsDirty(true);
          }}
          onSelectWidget={setSelectedWidgetId}
          selectedWidgetId={selectedWidgetId}
        />
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        <WidgetLibrary onAddWidget={handleAddWidget} />

        {selectedWidget && (
          <WidgetConfig
            widget={selectedWidget}
            availableMetrics={availableMetrics}
            onChange={handleWidgetChange}
            onDelete={handleDeleteWidget}
            onClose={() => setSelectedWidgetId(null)}
          />
        )}
      </div>

      {/* Save As Modal */}
      {showSaveAs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-backdrop backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border-default bg-bg-secondary p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Save View As</h3>
              <button
                type="button"
                onClick={() => {
                  setShowSaveAs(false);
                  setSaveAsName("");
                  setSaveAsError(null);
                }}
                className="text-text-muted hover:text-text-tertiary"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-sm text-text-tertiary">
              Enter a name for your new dashboard view.
            </p>

            {saveAsError && (
              <div className="mt-3 rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]">
                {saveAsError}
              </div>
            )}

            <form onSubmit={handleSaveAs}>
              <input
                type="text"
                value={saveAsName}
                onChange={(e) => setSaveAsName(e.target.value)}
                placeholder="View name"
                maxLength={100}
                className="mt-4 h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm placeholder:text-text-faint focus:border-border-default focus:outline-none"
                autoFocus
              />
              <div className="mt-1 text-right text-xs text-text-muted">
                {saveAsName.length}/100
              </div>
              <div className="mt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowSaveAs(false);
                    setSaveAsName("");
                    setSaveAsError(null);
                  }}
                  className="rounded-lg border border-border-default bg-bg-elevated px-4 py-2 text-sm hover:bg-bg-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!saveAsName.trim() || isSaving}
                  className="rounded-lg bg-btn-primary-bg px-4 py-2 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template confirmation */}
      <ConfirmModal
        open={confirmTemplate !== null}
        title="Apply template?"
        message="This will replace your current layout. Any unsaved changes will be lost."
        confirmLabel="Apply Template"
        variant="danger"
        onConfirm={() => confirmTemplate && executeApplyTemplate(confirmTemplate)}
        onCancel={() => setConfirmTemplate(null)}
      />

      {/* View switch confirmation */}
      <ConfirmModal
        open={confirmViewSwitch !== null}
        title="Switch views?"
        message="You have unsaved changes. Switching views will discard them."
        confirmLabel="Switch View"
        variant="danger"
        onConfirm={() => confirmViewSwitch && executeViewChange(confirmViewSwitch)}
        onCancel={() => setConfirmViewSwitch(null)}
      />

      {/* Cancel confirmation */}
      <ConfirmModal
        open={confirmCancel}
        title="Discard unsaved changes?"
        message="You have unsaved changes that will be lost if you leave."
        confirmLabel="Discard"
        variant="danger"
        onConfirm={() => {
          setConfirmCancel(false);
          router.push(redirectPath);
        }}
        onCancel={() => setConfirmCancel(false)}
      />

      {/* Delete widget confirmation */}
      <ConfirmModal
        open={confirmDelete}
        title="Delete this widget?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={executeDeleteWidget}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
