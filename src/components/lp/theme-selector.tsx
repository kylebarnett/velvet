"use client";

import { Check } from "lucide-react";
import {
  REPORT_THEMES,
  type ReportThemeId,
  type ReportTheme,
} from "@/lib/lp/report-themes";
import { cn } from "@/lib/utils/cn";

type ThemeSelectorProps = {
  value: ReportThemeId;
  onChange: (id: ReportThemeId) => void;
};

const THEME_LIST: ReportTheme[] = Object.values(REPORT_THEMES);

function ThemeSwatch({
  theme,
  selected,
  onSelect,
}: {
  theme: ReportTheme;
  selected: boolean;
  onSelect: () => void;
}) {
  const { colors } = theme;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={theme.label}
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors",
        selected
          ? "border-white/40 bg-white/[0.08] ring-2 ring-white/50"
          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]",
      )}
    >
      {/* Mini preview swatch */}
      <div
        className="w-full overflow-hidden rounded"
        style={{ aspectRatio: "4 / 3", backgroundColor: colors.pageBg }}
      >
        {/* Header bar */}
        <div
          style={{
            backgroundColor: colors.headerBg,
            height: "28%",
          }}
        />
        {/* KPI cards row */}
        <div
          style={{ padding: "4% 6%", display: "flex", gap: "4%" }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: "8px",
                backgroundColor: colors.kpiCardBg,
                border: `1px solid ${colors.kpiCardBorder}`,
                borderRadius: "2px",
              }}
            />
          ))}
        </div>
        {/* Table header */}
        <div
          style={{
            margin: "0 6%",
            height: "6px",
            backgroundColor: colors.tableHeaderBg,
            borderRadius: "1px",
          }}
        />
        {/* Table rows */}
        <div style={{ margin: "2px 6% 0", display: "flex", flexDirection: "column", gap: "1px" }}>
          <div style={{ height: "5px", backgroundColor: colors.pageBg }} />
          <div style={{ height: "5px", backgroundColor: colors.tableAltRow }} />
          <div style={{ height: "5px", backgroundColor: colors.pageBg }} />
        </div>
      </div>

      {/* Label */}
      <span className="text-[10px] font-medium leading-tight text-white/60">
        {theme.label}
      </span>

      {/* Check badge */}
      {selected && (
        <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white">
          <Check className="h-2.5 w-2.5 text-black" />
        </div>
      )}
    </button>
  );
}

export function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Report theme"
      className="grid grid-cols-3 gap-2 sm:grid-cols-5"
    >
      {THEME_LIST.map((theme) => (
        <ThemeSwatch
          key={theme.id}
          theme={theme}
          selected={value === theme.id}
          onSelect={() => onChange(theme.id)}
        />
      ))}
    </div>
  );
}
