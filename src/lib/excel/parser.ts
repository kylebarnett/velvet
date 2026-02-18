import * as XLSX from "xlsx";
import { logger } from "@/lib/logger";
import type { ParsedWorkbook, ParsedSheet, CellValue } from "./types";
import { MAX_SHEETS, MAX_TOTAL_ROWS } from "./types";

/** Characters that could trigger formula injection in downstream systems */
const FORMULA_CHARS = /^[=+\-@\t\r]/;

/** Sanitize a string cell value to prevent formula injection */
function sanitizeCell(value: string): string {
  if (FORMULA_CHARS.test(value)) {
    return "'" + value;
  }
  return value;
}

/**
 * Parse an Excel/CSV buffer into a structured workbook.
 * Strips formulas, macros, and HTML. Sanitizes string values.
 */
export function parseExcelBuffer(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): ParsedWorkbook {
  const isCSV = mimeType === "text/csv" || fileName.endsWith(".csv");

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, {
      type: "buffer",
      cellFormula: false,
      cellHTML: false,
      cellStyles: false,
      // For CSV, use comma delimiter
      ...(isCSV ? { FS: "," } : {}),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("password") || msg.includes("encrypt")) {
      throw new Error("This file appears to be password-protected. Please remove the password and try again.");
    }
    throw new Error("Unable to read the file. Please ensure it is a valid Excel (.xlsx, .xls) or CSV file.");
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("The file contains no sheets.");
  }

  if (workbook.SheetNames.length > MAX_SHEETS) {
    throw new Error(`File has ${workbook.SheetNames.length} sheets. Maximum is ${MAX_SHEETS}.`);
  }

  const sheets: ParsedSheet[] = [];
  let totalRows = 0;

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;

    // Convert to array of arrays
    const rawRows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: null,
      blankrows: false,
    });

    if (rawRows.length === 0) continue;

    // Check total row limit
    totalRows += rawRows.length;
    if (totalRows > MAX_TOTAL_ROWS) {
      throw new Error(
        `File exceeds the maximum of ${MAX_TOTAL_ROWS.toLocaleString()} total rows. ` +
        `Please split large files into smaller uploads.`,
      );
    }

    // Sanitize all cell values
    const rows: CellValue[][] = rawRows.map((row) =>
      row.map((cell): CellValue => {
        if (cell === null || cell === undefined) return null;
        if (typeof cell === "string") return sanitizeCell(cell.trim());
        if (typeof cell === "number") return cell;
        if (typeof cell === "boolean") return cell;
        return String(cell);
      }),
    );

    // Determine column count from the widest row
    const totalCols = rows.reduce((max, row) => Math.max(max, row.length), 0);

    sheets.push({
      name: sheetName,
      rows,
      totalRows: rows.length,
      totalCols,
    });
  }

  if (sheets.length === 0 || totalRows === 0) {
    throw new Error("The file contains no data. Please check the file and try again.");
  }

  logger.info(`[excel-parser] Parsed ${fileName}: ${sheets.length} sheets, ${totalRows} total rows`);

  return {
    sheets,
    totalRows,
    fileName,
  };
}

/**
 * Get sample data for AI analysis (first N rows per sheet, limited sheets).
 */
export function getSampleData(
  workbook: ParsedWorkbook,
  maxRows: number = 200,
  maxSheets: number = 5,
): ParsedSheet[] {
  return workbook.sheets.slice(0, maxSheets).map((sheet) => ({
    ...sheet,
    rows: sheet.rows.slice(0, maxRows),
    totalRows: Math.min(sheet.totalRows, maxRows),
  }));
}
