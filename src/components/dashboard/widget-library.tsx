"use client";

import { BarChart3, LineChart, AreaChart, PieChart, LayoutGrid, Table } from "lucide-react";

export type WidgetTemplate = {
  type: "chart" | "metric-card" | "table";
  subtype?: "line" | "bar" | "area" | "pie";
  label: string;
  icon: React.ReactNode;
  defaultW: number;
  defaultH: number;
};

export const WIDGET_TEMPLATES: WidgetTemplate[] = [
  {
    type: "chart",
    subtype: "line",
    label: "Line Chart",
    icon: <LineChart className="h-5 w-5" />,
    defaultW: 6,
    defaultH: 2,
  },
  {
    type: "chart",
    subtype: "bar",
    label: "Bar Chart",
    icon: <BarChart3 className="h-5 w-5" />,
    defaultW: 6,
    defaultH: 2,
  },
  {
    type: "chart",
    subtype: "area",
    label: "Area Chart",
    icon: <AreaChart className="h-5 w-5" />,
    defaultW: 6,
    defaultH: 2,
  },
  {
    type: "chart",
    subtype: "pie",
    label: "Pie Chart",
    icon: <PieChart className="h-5 w-5" />,
    defaultW: 4,
    defaultH: 2,
  },
  {
    type: "metric-card",
    label: "Metric Card",
    icon: <LayoutGrid className="h-5 w-5" />,
    defaultW: 3,
    defaultH: 1,
  },
  {
    type: "table",
    label: "Table",
    icon: <Table className="h-5 w-5" />,
    defaultW: 12,
    defaultH: 2,
  },
];

type WidgetLibraryProps = {
  onAddWidget: (template: WidgetTemplate) => void;
};

export function WidgetLibrary({ onAddWidget }: WidgetLibraryProps) {
  return (
    <div className="rounded-xl border border-border-default bg-bg-elevated p-4">
      <h3 className="mb-3 text-sm font-medium text-text-secondary">Widget Library</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {WIDGET_TEMPLATES.map((template) => (
          <button
            key={`${template.type}-${template.subtype ?? ""}`}
            type="button"
            onClick={() => onAddWidget(template)}
            className="flex flex-col items-center gap-2 rounded-lg border border-border-default bg-bg-input p-3 transition-colors hover:border-border-default hover:bg-bg-elevated"
          >
            <span className="text-text-tertiary">{template.icon}</span>
            <span className="text-xs text-text-secondary">{template.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
