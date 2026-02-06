/** LP Report color themes for PDF-ready previews. */

export type ReportThemeColors = {
  headerBg: string;
  headerText: string;
  sectionHeading: string;
  bodyText: string;
  secondaryText: string;
  kpiCardBg: string;
  kpiCardBorder: string;
  tableHeaderBg: string;
  tableBorder: string;
  tableAltRow: string;
  positive: string;
  divider: string;
  pageBg: string;
  badgeBg: string;
};

export type ReportThemeId =
  | "professional-blue"
  | "slate-minimal"
  | "forest-green"
  | "charcoal"
  | "midnight-indigo";

export type ReportTheme = {
  id: ReportThemeId;
  label: string;
  description: string;
  colors: ReportThemeColors;
};

export const REPORT_THEMES: Record<ReportThemeId, ReportTheme> = {
  "professional-blue": {
    id: "professional-blue",
    label: "Professional Blue",
    description: "Clean corporate navy",
    colors: {
      headerBg: "#1e3a5f",
      headerText: "#ffffff",
      sectionHeading: "#1e3a5f",
      bodyText: "#1e293b",
      secondaryText: "#64748b",
      kpiCardBg: "#f8fafc",
      kpiCardBorder: "#e2e8f0",
      tableHeaderBg: "#f1f5f9",
      tableBorder: "#e2e8f0",
      tableAltRow: "#f8fafc",
      positive: "#059669",
      divider: "#e2e8f0",
      pageBg: "#ffffff",
      badgeBg: "rgba(255,255,255,0.2)",
    },
  },
  "slate-minimal": {
    id: "slate-minimal",
    label: "Slate Minimal",
    description: "Neutral and modern",
    colors: {
      headerBg: "#1e293b",
      headerText: "#f8fafc",
      sectionHeading: "#334155",
      bodyText: "#1e293b",
      secondaryText: "#64748b",
      kpiCardBg: "#f8fafc",
      kpiCardBorder: "#e2e8f0",
      tableHeaderBg: "#f1f5f9",
      tableBorder: "#e2e8f0",
      tableAltRow: "#f8fafc",
      positive: "#059669",
      divider: "#e2e8f0",
      pageBg: "#ffffff",
      badgeBg: "rgba(255,255,255,0.15)",
    },
  },
  "forest-green": {
    id: "forest-green",
    label: "Forest Green",
    description: "Growth and stability",
    colors: {
      headerBg: "#14532d",
      headerText: "#f0fdf4",
      sectionHeading: "#14532d",
      bodyText: "#1a2e1a",
      secondaryText: "#4b6b4b",
      kpiCardBg: "#f0fdf4",
      kpiCardBorder: "#bbf7d0",
      tableHeaderBg: "#f0fdf4",
      tableBorder: "#bbf7d0",
      tableAltRow: "#f7fef9",
      positive: "#059669",
      divider: "#d1fae5",
      pageBg: "#ffffff",
      badgeBg: "rgba(255,255,255,0.2)",
    },
  },
  charcoal: {
    id: "charcoal",
    label: "Charcoal",
    description: "Bold, high-contrast",
    colors: {
      headerBg: "#18181b",
      headerText: "#fafafa",
      sectionHeading: "#18181b",
      bodyText: "#18181b",
      secondaryText: "#52525b",
      kpiCardBg: "#fafafa",
      kpiCardBorder: "#d4d4d8",
      tableHeaderBg: "#f4f4f5",
      tableBorder: "#d4d4d8",
      tableAltRow: "#fafafa",
      positive: "#059669",
      divider: "#d4d4d8",
      pageBg: "#ffffff",
      badgeBg: "rgba(255,255,255,0.15)",
    },
  },
  "midnight-indigo": {
    id: "midnight-indigo",
    label: "Midnight Indigo",
    description: "Premium and distinctive",
    colors: {
      headerBg: "#312e81",
      headerText: "#eef2ff",
      sectionHeading: "#312e81",
      bodyText: "#1e1b4b",
      secondaryText: "#6366f1",
      kpiCardBg: "#eef2ff",
      kpiCardBorder: "#c7d2fe",
      tableHeaderBg: "#eef2ff",
      tableBorder: "#c7d2fe",
      tableAltRow: "#f5f3ff",
      positive: "#059669",
      divider: "#c7d2fe",
      pageBg: "#ffffff",
      badgeBg: "rgba(255,255,255,0.2)",
    },
  },
};

export const DEFAULT_THEME_ID: ReportThemeId = "professional-blue";

export function getReportTheme(id?: string): ReportTheme {
  if (id && id in REPORT_THEMES) {
    return REPORT_THEMES[id as ReportThemeId];
  }
  return REPORT_THEMES[DEFAULT_THEME_ID];
}
