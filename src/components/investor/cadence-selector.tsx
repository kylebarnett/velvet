"use client";

import * as React from "react";
import { Calendar, CalendarDays, CalendarClock } from "lucide-react";

type Cadence = "monthly" | "quarterly" | "annual";

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
  icon: typeof Calendar;
}[] = [
  {
    value: "monthly",
    label: "Monthly",
    description: "Request metrics every month",
    icon: Calendar,
  },
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
        <label className="text-sm font-medium text-white/70">Frequency</label>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
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
                    ? "border-white/30 bg-white/10"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className={`h-4 w-4 ${
                      isSelected ? "text-white" : "text-white/50"
                    }`}
                  />
                  <span
                    className={`font-medium ${
                      isSelected ? "text-white" : "text-white/70"
                    }`}
                  >
                    {option.label}
                  </span>
                </div>
                <span className="mt-1 text-xs text-white/50">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day of month selection */}
      <div>
        <label className="text-sm font-medium text-white/70">
          Day of the{" "}
          {value === "monthly"
            ? "month"
            : value === "quarterly"
              ? "quarter's first month"
              : "year (January)"}
        </label>
        <p className="mt-1 text-xs text-white/50">
          Requests will be created on this day to request data for the previous{" "}
          {value === "monthly"
            ? "month"
            : value === "quarterly"
              ? "quarter"
              : "year"}
        </p>
        <div className="mt-3">
          <select
            value={dayOfMonth}
            onChange={(e) => onDayOfMonthChange(Number(e.target.value))}
            className="h-11 w-full max-w-[200px] rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-white/20"
          >
            {DAYS.map((day) => (
              <option key={day} value={day}>
                {day}
                {getOrdinalSuffix(day)} of each{" "}
                {value === "monthly"
                  ? "month"
                  : value === "quarterly"
                    ? "quarter"
                    : "year"}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-2 text-xs text-white/40">
          Tip: Choose a day between 1-7 to give founders time at the beginning
          of each period to prepare their metrics.
        </p>
      </div>
    </div>
  );
}
