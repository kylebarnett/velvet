"use client";

import * as React from "react";
import { CalendarDays, CalendarClock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Cadence = "quarterly" | "annual";

interface CadenceSelectorProps {
  value: Cadence;
  onChange: (value: Cadence) => void;
  dayOfMonth: number;
  onDayOfMonthChange: (value: number) => void;
}

const CADENCE_OPTIONS: {
  value: Cadence;
  label: string;
  description: string;
  icon: typeof CalendarDays;
}[] = [
  {
    value: "quarterly",
    label: "Quarterly",
    description: "Request metrics every quarter",
    icon: CalendarDays,
  },
  {
    value: "annual",
    label: "Annually",
    description: "Request metrics once per year",
    icon: CalendarClock,
  },
];

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export function CadenceSelector({
  value,
  onChange,
  dayOfMonth,
  onDayOfMonthChange,
}: CadenceSelectorProps) {
  return (
    <div className="space-y-6">
      {/* Cadence selection */}
      <div>
        <label className="text-sm font-medium text-text-secondary">Frequency</label>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {CADENCE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = value === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className={`flex flex-col items-start rounded-xl border p-4 text-left transition-colors ${
                  isSelected
                    ? "border-border-default bg-bg-hover"
                    : "border-border-default bg-bg-elevated hover:border-border-default hover:bg-bg-hover"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className={`h-4 w-4 ${
                      isSelected ? "text-text-primary" : "text-text-muted"
                    }`}
                  />
                  <span
                    className={`font-medium ${
                      isSelected ? "text-text-primary" : "text-text-secondary"
                    }`}
                  >
                    {option.label}
                  </span>
                </div>
                <span className="mt-1 text-xs text-text-tertiary">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day of month selection */}
      <div>
        <label className="text-sm font-medium text-text-secondary">
          Day of the{" "}
          {value === "quarterly"
            ? "quarter's first month"
            : "year (January)"}
        </label>
        <p className="mt-1 text-xs text-text-tertiary">
          Requests will be created on this day to request data for the previous{" "}
          {value === "quarterly"
            ? "quarter"
            : "year"}
        </p>
        <div className="mt-3">
          <Select value={String(dayOfMonth)} onValueChange={(v) => onDayOfMonthChange(Number(v))}>
            <SelectTrigger className="max-w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((day) => (
                <SelectItem key={day} value={String(day)}>
                  {day}
                  {getOrdinalSuffix(day)} of each{" "}
                  {value === "quarterly"
                    ? "quarter"
                    : "year"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="mt-2 text-xs text-text-muted">
          Tip: Choose a day between 1-7 to give founders time at the beginning
          of each period to prepare their metrics.
        </p>
      </div>
    </div>
  );
}
