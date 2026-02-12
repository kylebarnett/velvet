/**
 * Excel export utility — creates .xlsx files from tabular data.
 * Uses the xlsx (SheetJS) package.
 */

import * as XLSX from "xlsx";

type ExcelExportOptions = {
  /** Output filename (without .xlsx extension) */
  filename: string;
  /** Column headers */
  headers: string[];
  /** Row data (array of arrays matching headers) */
  rows: (string | number | null)[][];
  /** Optional sheet name */
  sheetName?: string;
};

/**
 * Escape a cell value to prevent formula injection in Excel.
 * Prefixes dangerous characters with a single quote.
 */
function escapeExcelCell(value: string | number | null): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  // Prevent formula injection
  if (/^[=+\-@\t\r]/.test(value)) {
    return "'" + value;
  }
  return value;
}

export function downloadExcel({
  filename,
  headers,
  rows,
  sheetName = "Data",
}: ExcelExportOptions): void {
  // Escape all cell values
  const safeHeaders = headers.map((h) => escapeExcelCell(h) ?? "");
  const safeRows = rows.map((row) => row.map(escapeExcelCell));

  // Build worksheet from array of arrays
  const wsData = [safeHeaders, ...safeRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Auto-size columns based on content
  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map((row) => String(row[i] ?? "").length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws["!cols"] = colWidths;

  // Create workbook and write
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Generate binary and download
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filename}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
