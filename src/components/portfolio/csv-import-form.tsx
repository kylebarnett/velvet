"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type ParsedRow = {
  company_name: string;
  company_website?: string;
  dba?: string;
  first_name: string;
  last_name: string;
  email: string;
};

type ValidationError = {
  row: number;
  field: string;
  message: string;
};

// Normalize column names to snake_case (handles "Company Name", "companyName", "company_name", etc.)
function normalizeColumnName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    // Replace spaces, hyphens, and multiple underscores with single underscore
    .replace(/[\s-]+/g, "_")
    // Insert underscore before uppercase letters (for camelCase)
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase()
    // Remove any duplicate underscores
    .replace(/_+/g, "_");
}

// Map of common variations to canonical column names
const columnAliases: Record<string, string> = {
  company_name: "company_name",
  company: "company_name",
  companyname: "company_name",
  name: "company_name",
  company_website: "company_website",
  website: "company_website",
  companywebsite: "company_website",
  url: "company_website",
  company_url: "company_website",
  first_name: "first_name",
  firstname: "first_name",
  first: "first_name",
  last_name: "last_name",
  lastname: "last_name",
  last: "last_name",
  email: "email",
  email_address: "email",
  emailaddress: "email",
  dba: "dba",
  doing_business_as: "dba",
};

function mapColumnName(name: string): string {
  const normalized = normalizeColumnName(name).replace(/_/g, "");
  // Check aliases without underscores
  for (const [alias, canonical] of Object.entries(columnAliases)) {
    if (alias.replace(/_/g, "") === normalized) {
      return canonical;
    }
  }
  // Fall back to normalized version
  return normalizeColumnName(name);
}

function parseCSV(text: string): { rows: ParsedRow[]; errors: ValidationError[]; duplicates: Set<string> } {
  const lines = text.trim().split("\n");
  if (lines.length < 2) {
    return {
      rows: [],
      errors: [{ row: 0, field: "file", message: "CSV must have a header row and at least one data row." }],
      duplicates: new Set(),
    };
  }

  const rawHeader = lines[0].split(",").map((h) => h.trim());
  const header = rawHeader.map(mapColumnName);

  const requiredColumns = ["company_name", "first_name", "last_name", "email"];
  const missingColumns = requiredColumns.filter((col) => !header.includes(col));

  if (missingColumns.length > 0) {
    const friendlyNames: Record<string, string> = {
      company_name: "Company Name",
      first_name: "First Name",
      last_name: "Last Name",
      email: "Email",
    };
    const missing = missingColumns.map((col) => friendlyNames[col] || col).join(", ");
    return {
      rows: [],
      errors: [{ row: 0, field: "header", message: `Missing required columns: ${missing}` }],
      duplicates: new Set(),
    };
  }

  const rows: ParsedRow[] = [];
  const errors: ValidationError[] = [];
  const seenEmails = new Map<string, number>(); // email -> first row number
  const duplicates = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(",").map((v) => v.trim());
    const row: Record<string, string> = {};

    header.forEach((col, idx) => {
      row[col] = values[idx] || "";
    });

    // Validate required fields
    if (!row.company_name) {
      errors.push({ row: i + 1, field: "company_name", message: "Company name is required." });
    }
    if (!row.first_name) {
      errors.push({ row: i + 1, field: "first_name", message: "First name is required." });
    }
    if (!row.last_name) {
      errors.push({ row: i + 1, field: "last_name", message: "Last name is required." });
    }
    if (!row.email) {
      errors.push({ row: i + 1, field: "email", message: "Email is required." });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      errors.push({ row: i + 1, field: "email", message: "Invalid email format." });
    } else {
      // Check for duplicates
      const normalizedEmail = row.email.toLowerCase();
      if (seenEmails.has(normalizedEmail)) {
        duplicates.add(normalizedEmail);
        errors.push({
          row: i + 1,
          field: "email",
          message: `Duplicate email (also on row ${seenEmails.get(normalizedEmail)}).`,
        });
      } else {
        seenEmails.set(normalizedEmail, i + 1);
      }
    }

    rows.push({
      company_name: row.company_name,
      company_website: row.company_website || undefined,
      dba: row.dba || undefined,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
    });
  }

  return { rows, errors, duplicates };
}

export function CsvImportForm() {
  const router = useRouter();
  const [dragActive, setDragActive] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [parsedData, setParsedData] = React.useState<{
    rows: ParsedRow[];
    errors: ValidationError[];
    duplicates: Set<string>;
  } | null>(null);
  const [showAll, setShowAll] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [importResult, setImportResult] = React.useState<{ imported: number; errors: { row: number; message: string }[] } | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setFile(file);
    setImportResult(null);
    setShowAll(false);

    const text = await file.text();
    const parsed = parseCSV(text);
    setParsedData(parsed);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.name.endsWith(".csv")) {
      handleFile(droppedFile);
    } else {
      toast.error("Please drop a CSV file.");
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  }

  async function handleImport() {
    if (!parsedData || parsedData.rows.length === 0) return;

    setImporting(true);

    try {
      const res = await fetch("/api/investors/portfolio/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsedData.rows }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error ?? "Import failed.");
      }

      setImportResult(json);
      toast.success(`Successfully imported ${json.imported} ${json.imported === 1 ? "company" : "companies"}`);

      if (json.imported > 0) {
        setTimeout(() => {
          router.push("/portfolio");
          router.refresh();
        }, 2000);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setImporting(false);
    }
  }

  const hasValidationErrors = parsedData && parsedData.errors.length > 0;
  const hasDuplicates = parsedData && parsedData.duplicates.size > 0;
  const canImport = parsedData && parsedData.rows.length > 0 && !hasValidationErrors && !importing;

  const PREVIEW_LIMIT = 10;
  const displayRows = parsedData
    ? showAll
      ? parsedData.rows
      : parsedData.rows.slice(0, PREVIEW_LIMIT)
    : [];

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        className={`relative rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
          dragActive
            ? "border-border-default bg-bg-elevated"
            : "border-border-default hover:border-border-default"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={handleChange}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        <Upload className="mx-auto h-10 w-10 text-text-muted" />
        <p className="mt-4 text-sm text-text-secondary">
          {file ? file.name : "Drag and drop a CSV file, or click to select"}
        </p>
        <p className="mt-2 text-xs text-text-tertiary">
          <span className="font-medium text-text-tertiary">Required:</span> Company Name, First Name, Last Name, Email
        </p>
        <p className="mt-0.5 text-xs text-text-tertiary">
          <span className="font-medium text-text-tertiary">Optional:</span> Company Website
        </p>
      </div>

      {/* Duplicate warning */}
      {hasDuplicates && (
        <div className="rounded-xl border border-[var(--status-warning-bg)] bg-[var(--status-warning-bg)] p-4">
          <div className="flex items-center gap-2 text-[var(--status-warning-text)]">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              Duplicate Emails Detected ({parsedData.duplicates.size})
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--status-warning-text)]/80">
            The following emails appear multiple times in your CSV:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[...parsedData.duplicates].map((email) => (
              <span
                key={email}
                className="rounded-full bg-[var(--status-warning-bg)] px-2 py-0.5 text-xs text-[var(--status-warning-text)]"
              >
                {email}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Validation errors */}
      {hasValidationErrors && !hasDuplicates && (
        <div className="rounded-xl border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] p-4">
          <div className="flex items-center gap-2 text-[var(--status-error-text)]">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Validation Errors</span>
          </div>
          <ul className="mt-2 space-y-1 text-sm text-[var(--status-error-text)]/80">
            {parsedData.errors.slice(0, 10).map((err, i) => (
              <li key={i}>
                Row {err.row}: {err.message}
              </li>
            ))}
            {parsedData.errors.length > 10 && (
              <li className="text-[var(--status-error-text)]/60">
                ...and {parsedData.errors.length - 10} more errors
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Preview table */}
      {parsedData && parsedData.rows.length > 0 && (
        <div className="rounded-xl border border-border-default card-surface p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium">
              Preview ({parsedData.rows.length} {parsedData.rows.length === 1 ? "company" : "companies"})
            </h3>
            {parsedData.rows.length > PREVIEW_LIMIT && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-sm text-text-tertiary hover:text-text-secondary"
              >
                {showAll ? "Show less" : `Show all ${parsedData.rows.length}`}
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default text-left text-text-tertiary">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Company</th>
                  <th className="pb-2 pr-4">Contact</th>
                  <th className="pb-2">Email</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, i) => {
                  const isDuplicate = parsedData.duplicates.has(row.email.toLowerCase());
                  return (
                    <tr
                      key={i}
                      className={`border-b border-border-subtle ${isDuplicate ? "bg-[var(--warning-bg-subtle)]" : ""}`}
                    >
                      <td className="py-2 pr-4 text-text-muted">{i + 1}</td>
                      <td className="py-2 pr-4">{row.company_name}</td>
                      <td className="py-2 pr-4">
                        {row.first_name} {row.last_name}
                      </td>
                      <td className={`py-2 ${isDuplicate ? "text-[var(--status-warning-text)]" : "text-text-tertiary"}`}>
                        {row.email}
                        {isDuplicate && (
                          <span className="ml-2 text-xs text-[var(--status-warning-text)]/60">(duplicate)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!showAll && parsedData.rows.length > PREVIEW_LIMIT && (
              <p className="mt-2 text-xs text-text-muted">
                ...and {parsedData.rows.length - PREVIEW_LIMIT} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Import result */}
      {importResult && (
        <div className="rounded-xl border border-[var(--status-success-bg)] bg-[var(--status-success-bg)] p-4">
          <div className="flex items-center gap-2 text-[var(--status-success-text)]">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              Successfully imported {importResult.imported} {importResult.imported === 1 ? "company" : "companies"}
            </span>
          </div>
          {importResult.errors.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-[var(--status-warning-text)]/80">
              {importResult.errors.map((err, i) => (
                <li key={i}>
                  Row {err.row}: {err.message}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-[var(--status-success-text)]/60">Redirecting to portfolio...</p>
        </div>
      )}

      {/* Import button */}
      {parsedData && parsedData.rows.length > 0 && !importResult && (
        <div className="flex justify-end">
          <Button
            onClick={handleImport}
            disabled={!canImport}
            loading={importing}
          >
            {importing
              ? "Importing..."
              : `Import ${parsedData.rows.length} ${parsedData.rows.length === 1 ? "Company" : "Companies"}`}
          </Button>
        </div>
      )}
    </div>
  );
}
