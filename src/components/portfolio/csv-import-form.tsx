"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload, AlertCircle, CheckCircle } from "lucide-react";

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

function parseCSV(text: string): { rows: ParsedRow[]; errors: ValidationError[] } {
  const lines = text.trim().split("\n");
  if (lines.length < 2) {
    return { rows: [], errors: [{ row: 0, field: "file", message: "CSV must have a header row and at least one data row." }] };
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
    };
  }

  const rows: ParsedRow[] = [];
  const errors: ValidationError[] = [];

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

  return { rows, errors };
}

export function CsvImportForm() {
  const router = useRouter();
  const [dragActive, setDragActive] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [parsedData, setParsedData] = React.useState<{ rows: ParsedRow[]; errors: ValidationError[] } | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [importResult, setImportResult] = React.useState<{ imported: number; errors: { row: number; message: string }[] } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setFile(file);
    setError(null);
    setImportResult(null);

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
      setError("Please drop a CSV file.");
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
    setError(null);

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

      if (json.imported > 0) {
        setTimeout(() => {
          router.push("/portfolio");
          router.refresh();
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setImporting(false);
    }
  }

  const hasValidationErrors = parsedData && parsedData.errors.length > 0;
  const canImport = parsedData && parsedData.rows.length > 0 && !hasValidationErrors && !importing;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Drop zone */}
      <div
        className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragActive
            ? "border-white/40 bg-white/5"
            : "border-white/10 hover:border-white/20"
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
        <Upload className="mx-auto h-10 w-10 text-white/40" />
        <p className="mt-4 text-sm text-white/70">
          {file ? file.name : "Drag and drop a CSV file, or click to select"}
        </p>
        <p className="mt-2 text-xs text-white/50">
          <span className="font-medium text-white/60">Required:</span> Company Name, First Name, Last Name, Email
        </p>
        <p className="mt-0.5 text-xs text-white/50">
          <span className="font-medium text-white/60">Optional:</span> Company Website
        </p>
      </div>

      {/* Validation errors */}
      {hasValidationErrors && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
          <div className="flex items-center gap-2 text-red-200">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Validation Errors</span>
          </div>
          <ul className="mt-2 space-y-1 text-sm text-red-200/80">
            {parsedData.errors.map((err, i) => (
              <li key={i}>
                Row {err.row}: {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview table */}
      {parsedData && parsedData.rows.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h3 className="mb-4 text-sm font-medium">
            Preview ({parsedData.rows.length} {parsedData.rows.length === 1 ? "company" : "companies"})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-white/60">
                  <th className="pb-2 pr-4">Company</th>
                  <th className="pb-2 pr-4">Contact</th>
                  <th className="pb-2">Email</th>
                </tr>
              </thead>
              <tbody>
                {parsedData.rows.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-2 pr-4">{row.company_name}</td>
                    <td className="py-2 pr-4">
                      {row.first_name} {row.last_name}
                    </td>
                    <td className="py-2 text-white/60">{row.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedData.rows.length > 10 && (
              <p className="mt-2 text-xs text-white/40">
                ...and {parsedData.rows.length - 10} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Import result */}
      {importResult && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <div className="flex items-center gap-2 text-emerald-200">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              Successfully imported {importResult.imported} {importResult.imported === 1 ? "company" : "companies"}
            </span>
          </div>
          {importResult.errors.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-amber-200/80">
              {importResult.errors.map((err, i) => (
                <li key={i}>
                  Row {err.row}: {err.message}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-emerald-200/60">Redirecting to portfolio...</p>
        </div>
      )}

      {/* Import button */}
      {parsedData && parsedData.rows.length > 0 && !importResult && (
        <div className="flex justify-end">
          <button
            onClick={handleImport}
            disabled={!canImport}
            className="inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60"
          >
            {importing
              ? "Importing..."
              : `Import ${parsedData.rows.length} ${parsedData.rows.length === 1 ? "Company" : "Companies"}`}
          </button>
        </div>
      )}
    </div>
  );
}
