"use client";

import { ChevronDown } from "lucide-react";
import * as React from "react";

export type DateRange = "1y" | "2y" | "all" | "custom";

type DateRangeSelectorProps = {
  value: DateRange;
  onChange: (value: DateRange) => void;
};

const options: Array<{ value: DateRange; label: string }> = [
  { value: "1y", label: "1 Year" },
  { value: "2y", label: "2 Years" },
  { value: "all", label: "All Time" },
];

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "1 Year";

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-raised px-3 py-1.5 text-xs font-medium text-text-tertiary hover:border-border-default hover:text-text-secondary transition-colors"
      >
        {selectedLabel}
        <ChevronDown className="h-3 w-3" />
      </button>
      {isOpen && (
        <div className="dropdown-enter absolute right-0 top-full z-50 mt-1 min-w-[120px] overflow-hidden rounded-lg border border-border-default bg-bg-secondary shadow-xl">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`
                block w-full px-3 py-2 text-left text-xs
                ${
                  value === option.value
                    ? "bg-bg-hover text-text-primary"
                    : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
