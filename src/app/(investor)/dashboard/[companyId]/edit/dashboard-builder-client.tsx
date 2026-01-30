"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save, ChevronDown } from "lucide-react";
import { Widget, ChartConfig, MetricCardConfig, TableConfig, DashboardLayout } from "@/components/dashboard/types";
import { WidgetLibrary, WidgetTemplate } from "@/components/dashboard/widget-library";
import { WidgetConfig } from "@/components/dashboard/widget-config";
import { DashboardCanvas } from "@/components/dashboard/dashboard-canvas";

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

type DashboardBuilderClientProps = {
  companyId: string;
  companyName: string;
  companyIndustry: string | null;
  availableMetrics: string[];
  views: DashboardView[];
  templates: DashboardTemplate[];
};

function generateWidgetId(): string {
  return `widget-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseLayout(layout: unknown): Widget[] {
  if (!layout) return [];
  if (Array.isArray(layout)) return layout as Widget[];
  if (typeof layout === "object" && layout !== null && "widgets" in layout) {
    return (layout as DashboardLayout).widgets;
  }
  return [];
}

export function DashboardBuilderClient({
  companyId,
  companyName,
  companyIndustry,
  availableMetrics,
  views,
  templates,
}: DashboardBuilderClientProps) {
  const router = useRouter();
  const [selectedViewId, setSelectedViewId] = React.useState<string | null>(
    views.find((v) => v.is_default)?.id ?? views[0]?.id ?? null
  );
  const [widgets, setWidgets] = React.useState<Widget[]>(() => {
    const selectedView = views.find((v) => v.id === selectedViewId);
    if (selectedView) {
      return parseLayout(selectedView.layout);
    }
    // Use industry template or general template
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
  const [showViewDropdown, setShowViewDropdown] = React.useState(false);
  const [showTemplateDropdown, setShowTemplateDropdown] = React.useState(false);
  const [saveAsName, setSaveAsName] = React.useState("");
  const [showSaveAs, setShowSaveAs] = React.useState(false);

  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const templateDropdownRef = React.useRef<HTMLDivElement>(null);

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
    // Find the lowest y position to place new widget
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
        title: `${template.label}`,
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
  }

  function handleDeleteWidget() {
    if (!selectedWidgetId) return;
    setWidgets(widgets.filter((w) => w.id !== selectedWidgetId));
    setSelectedWidgetId(null);
  }

  function handleApplyTemplate(template: DashboardTemplate) {
    const templateWidgets = parseLayout(template.layout);
    setWidgets(templateWidgets);
    setSelectedWidgetId(null);
    setShowTemplateDropdown(false);
  }

  function handleViewChange(viewId: string) {
    const view = views.find((v) => v.id === viewId);
    if (view) {
      setSelectedViewId(viewId);
      setWidgets(parseLayout(view.layout));
      setSelectedWidgetId(null);
    }
    setShowViewDropdown(false);
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);

    try {
      if (currentView) {
        // Update existing view
        const res = await fetch(`/api/investors/dashboard-views/${currentView.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ layout: widgets }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to save");
      } else {
        // Create new view
        const res = await fetch("/api/investors/dashboard-views", {
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

      router.push(`/dashboard/${companyId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveAs() {
    if (!saveAsName.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/investors/dashboard-views", {
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

      router.push(`/dashboard/${companyId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
      setShowSaveAs(false);
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
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-medium text-white/80 hover:border-white/20"
              >
                <span>{currentView?.name ?? "New View"}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {showViewDropdown && (
                <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-white/10 bg-zinc-900 shadow-xl">
                  {views.map((view) => (
                    <button
                      key={view.id}
                      type="button"
                      onClick={() => handleViewChange(view.id)}
                      className={`
                        block w-full px-3 py-2 text-left text-xs
                        ${selectedViewId === view.id ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5"}
                      `}
                    >
                      {view.name}
                    </button>
                  ))}
                  {views.length === 0 && (
                    <div className="px-3 py-2 text-xs text-white/40">No saved views</div>
                  )}
                </div>
              )}
            </div>

            {/* Template selector */}
            <div className="relative" ref={templateDropdownRef}>
              <button
                type="button"
                onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-medium text-white/80 hover:border-white/20"
              >
                <span>Use Template</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {showTemplateDropdown && (
                <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] max-h-[300px] overflow-y-auto rounded-lg border border-white/10 bg-zinc-900 shadow-xl">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleApplyTemplate(template)}
                      className="block w-full px-3 py-2 text-left text-xs text-white/70 hover:bg-white/5 hover:text-white"
                    >
                      <div className="font-medium">{template.name}</div>
                      {template.description && (
                        <div className="mt-0.5 text-white/40 line-clamp-1">
                          {template.description}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSaveAs(true)}
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-medium text-white/80 hover:border-white/20"
            >
              Save As
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-white/90 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Canvas */}
        <DashboardCanvas
          widgets={widgets}
          onLayoutChange={setWidgets}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-900 p-6">
            <h3 className="text-lg font-medium">Save View As</h3>
            <p className="mt-1 text-sm text-white/60">
              Enter a name for your new dashboard view.
            </p>
            <input
              type="text"
              value={saveAsName}
              onChange={(e) => setSaveAsName(e.target.value)}
              placeholder="View name"
              className="mt-4 h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm placeholder:text-white/40 focus:border-white/20 focus:outline-none"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowSaveAs(false);
                  setSaveAsName("");
                }}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAs}
                disabled={!saveAsName.trim() || isSaving}
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
