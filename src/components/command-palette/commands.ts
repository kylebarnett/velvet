export type Command = {
  id: string;
  label: string;
  group: "navigation" | "action";
  icon: string;
  keywords?: string[];
  href?: string;
  role: "investor" | "founder" | "both";
};

export const COMMANDS: Command[] = [
  // ── Investor navigation ──────────────────────────────────────────
  { id: "nav-companies", label: "Companies", group: "navigation", icon: "building2", href: "/companies", role: "investor", keywords: ["portfolio", "startups"] },
  { id: "nav-contacts", label: "Contacts", group: "navigation", icon: "users", href: "/contacts", role: "investor", keywords: ["people", "founders", "emails"] },
  { id: "nav-metric-requests", label: "Metric Requests", group: "navigation", icon: "send", href: "/metric-requests", role: "investor", keywords: ["campaigns", "data", "collect"] },
  { id: "nav-tear-sheets", label: "Tear Sheets", group: "navigation", icon: "file-spreadsheet", href: "/tear-sheets", role: "investor", keywords: ["summary", "overview"] },
  { id: "nav-reports", label: "Reports", group: "navigation", icon: "bar-chart-3", href: "/reports", role: "investor", keywords: ["analytics", "charts", "dashboard"] },
  { id: "nav-documents", label: "Documents", group: "navigation", icon: "file-text", href: "/documents", role: "investor", keywords: ["files", "uploads", "pdf"] },
  { id: "nav-funds", label: "Funds", group: "navigation", icon: "landmark", href: "/funds", role: "investor", keywords: ["lp", "fund"] },
  { id: "nav-lp-reports", label: "LP Reports", group: "navigation", icon: "bar-chart-3", href: "/funds/lp-reports", role: "investor", keywords: ["lp", "limited partner"] },
  { id: "nav-import-data-inv", label: "Import Data", group: "navigation", icon: "upload", href: "/historical-upload", role: "investor", keywords: ["excel", "historical", "bulk"] },
  { id: "nav-help-inv", label: "Help", group: "navigation", icon: "help-circle", href: "/help", role: "investor", keywords: ["guide", "docs", "support"] },
  { id: "nav-team-inv", label: "Team", group: "navigation", icon: "users", href: "/team", role: "investor", keywords: ["members", "invite"] },

  // ── Investor actions ─────────────────────────────────────────────
  { id: "act-new-request", label: "Create Metric Request", group: "action", icon: "send", href: "/metric-requests/new", role: "investor", keywords: ["new", "campaign", "request", "send", "ask", "data", "collect", "quarterly"] },
  { id: "act-import-csv", label: "Import Companies (CSV)", group: "action", icon: "upload", href: "/contacts/import", role: "investor", keywords: ["csv", "upload", "bulk", "spreadsheet", "add"] },
  { id: "act-import-historical-inv", label: "Import Historical Data", group: "action", icon: "upload", href: "/historical-upload", role: "investor", keywords: ["excel", "bulk", "spreadsheet", "metrics"] },

  // ── Founder navigation ───────────────────────────────────────────
  { id: "nav-dashboard", label: "Dashboard", group: "navigation", icon: "layout-dashboard", href: "/portal", role: "founder", keywords: ["home", "overview"] },
  { id: "nav-company-profile", label: "Company Profile", group: "navigation", icon: "building2", href: "/portal/company", role: "founder", keywords: ["settings", "info"] },
  { id: "nav-founder-requests", label: "Metric Requests", group: "navigation", icon: "inbox", href: "/portal/requests", role: "founder", keywords: ["campaigns", "data"] },
  { id: "nav-founder-documents", label: "Documents", group: "navigation", icon: "file-text", href: "/portal/documents", role: "founder", keywords: ["files", "uploads"] },
  { id: "nav-founder-tear-sheets", label: "Tear Sheets", group: "navigation", icon: "file-spreadsheet", href: "/portal/tear-sheets", role: "founder", keywords: ["summary"] },
  { id: "nav-founder-investors", label: "Investors", group: "navigation", icon: "shield", href: "/portal/investors", role: "founder", keywords: ["access", "approval"] },
  { id: "nav-founder-activity", label: "Activity", group: "navigation", icon: "activity", href: "/portal/activity", role: "founder", keywords: ["log", "history"] },
  { id: "nav-import-data-fnd", label: "Import Data", group: "navigation", icon: "upload", href: "/portal/historical-upload", role: "founder", keywords: ["excel", "historical", "bulk"] },
  { id: "nav-help-fnd", label: "Help", group: "navigation", icon: "help-circle", href: "/portal/help", role: "founder", keywords: ["guide", "docs", "support"] },
  { id: "nav-team-fnd", label: "Team", group: "navigation", icon: "users", href: "/portal/team", role: "founder", keywords: ["members", "invite"] },

  // ── Founder actions ──────────────────────────────────────────────
  { id: "act-new-tear-sheet", label: "Create Tear Sheet", group: "action", icon: "file-spreadsheet", href: "/portal/tear-sheets/new", role: "founder", keywords: ["new", "report", "summary", "add"] },
  { id: "act-upload-doc", label: "Upload Document", group: "action", icon: "upload", href: "/portal/documents?action=upload", role: "founder", keywords: ["file", "pdf", "attachment", "add"] },
  { id: "act-import-historical-fnd", label: "Import Historical Data", group: "action", icon: "upload", href: "/portal/historical-upload", role: "founder", keywords: ["excel", "bulk", "spreadsheet", "metrics"] },

  // ── Shared actions ───────────────────────────────────────────────
  { id: "act-toggle-theme", label: "Toggle Theme", group: "action", icon: "eye", role: "both", keywords: ["dark", "light", "mode", "appearance", "switch", "color", "night"] },
];

export function getCommandsForRole(role: "investor" | "founder"): Command[] {
  return COMMANDS.filter((c) => c.role === role || c.role === "both");
}
