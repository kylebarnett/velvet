"use client";

import { cn } from "@/lib/utils/cn";

export type NormalizationMode = "absolute" | "indexed" | "percent_change";

type NormalizationToggleProps = {
  value: NormalizationMode;
  onChange: (value: NormalizationMode) => void;
};

const OPTIONS: { value: NormalizationMode; label: string; description: string }[] = [
  {
    value: "absolute",
    label: "Absolute",
    description: "Raw values",
  },
  {
    value: "indexed",
    label: "Indexed",
    description: "Base 100",
  },
  {
    value: "percent_change",
    label: "% Change",
    description: "Period-over-period",
  },
];

export function NormalizationToggle({ value, onChange }: NormalizationToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border-default bg-bg-raised p-0.5">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          title={option.description}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150",
            value === option.value
              ? "bg-bg-hover text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
