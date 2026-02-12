/**
 * Shared CSV export utilities.
 * Extracted from /api/investors/portfolio/export/route.ts to avoid duplication.
 */

/**
 * Escape a CSV field to prevent formula injection and handle special characters.
 * Prefixes dangerous characters (=, +, -, @, tab, CR) with a single quote.
 */
export function escapeCsvField(value: string): string {
  // Prevent formula injection - prefix with single quote if starts with dangerous chars
  if (/^[=+\-@\t\r]/.test(value)) {
    value = "'" + value;
  }
  // If the value contains commas, quotes, or newlines, wrap in quotes and escape internal quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Build a CSV string from headers and rows, then trigger a browser download.
 */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: string[][]
): void {
  const headerLine = headers.map(escapeCsvField).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvField).join(","));
  const csv = [headerLine, ...dataLines].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
