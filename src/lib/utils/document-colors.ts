/**
 * Shared document type labels, short labels, and color classes.
 * Used by both founder and investor document views.
 */

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  income_statement: "Income Statement",
  balance_sheet: "Balance Sheet",
  cash_flow_statement: "Cash Flow Statement",
  consolidated_financial_statements: "Consolidated Financial Statements",
  "409a_valuation": "409A Valuation",
  investor_update: "Investor Update",
  board_deck: "Board Deck",
  cap_table: "Cap Table",
  other: "Other",
};

export const DOCUMENT_TYPE_SHORT_LABELS: Record<string, string> = {
  income_statement: "Income Stmt",
  balance_sheet: "Balance Sheet",
  cash_flow_statement: "Cash Flow",
  consolidated_financial_statements: "Consolidated",
  "409a_valuation": "409A",
  investor_update: "Update",
  board_deck: "Board Deck",
  cap_table: "Cap Table",
  other: "Other",
};

/**
 * Color-coded badge classes per document type category.
 * - Financial statements: emerald
 * - Valuation: amber
 * - Communications: blue
 * - Board: violet
 * - Ownership: pink
 * - Other/unknown: neutral
 */
export const DOCUMENT_TYPE_COLORS: Record<string, string> = {
  // Financial statements — emerald
  income_statement: "bg-[var(--tag-emerald-bg)] text-[var(--tag-emerald-text)]",
  balance_sheet: "bg-[var(--tag-emerald-bg)] text-[var(--tag-emerald-text)]",
  cash_flow_statement: "bg-[var(--tag-emerald-bg)] text-[var(--tag-emerald-text)]",
  consolidated_financial_statements: "bg-[var(--tag-emerald-bg)] text-[var(--tag-emerald-text)]",
  // Valuation — amber
  "409a_valuation": "bg-[var(--tag-amber-bg)] text-[var(--tag-amber-text)]",
  // Communications — blue
  investor_update: "bg-[var(--tag-blue-bg)] text-[var(--tag-blue-text)]",
  // Board — violet
  board_deck: "bg-[var(--tag-violet-bg)] text-[var(--tag-violet-text)]",
  // Ownership — pink
  cap_table: "bg-[var(--tag-pink-bg)] text-[var(--tag-pink-text)]",
  // Fallback
  other: "bg-bg-hover text-text-tertiary",
};

/** Get document type color classes with fallback for unknown types. */
export function getDocumentTypeColor(type: string): string {
  return DOCUMENT_TYPE_COLORS[type] ?? DOCUMENT_TYPE_COLORS.other;
}

/** Array of document types for filter dropdowns. */
export const DOCUMENT_TYPES = Object.entries(DOCUMENT_TYPE_LABELS).map(
  ([value, label]) => ({ value, label }),
);
