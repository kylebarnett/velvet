"use client";

import * as React from "react";

export function DocumentUploadForm() {
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsUploading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Upload failed.");
      setSuccess("Uploaded.");
      e.currentTarget.reset();
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form
      className="max-w-2xl rounded-xl border border-white/10 bg-white/5 p-5"
      onSubmit={onSubmit}
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="companyId">
            Company
          </label>
          <select
            id="companyId"
            name="companyId"
            className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-white/20"
            required
          >
            <option value="">Select…</option>
            <option value="demo-company">Demo company (placeholder)</option>
          </select>
          <p className="text-xs text-white/50">
            This will be auto-selected once companies are wired up.
          </p>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="documentType">
            Document type
          </label>
          <select
            id="documentType"
            name="documentType"
            className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-white/20"
            required
          >
            <option value="">Select type…</option>
            <option value="income_statement">Income Statement</option>
            <option value="balance_sheet">Balance Sheet</option>
            <option value="cash_flow_statement">Cash Flow Statement</option>
            <option value="consolidated_financial_statements">Consolidated Financial Statements</option>
            <option value="409a_valuation">409A Valuation</option>
            <option value="investor_update">Investor Update</option>
            <option value="board_deck">Board Deck</option>
            <option value="cap_table">Cap Table</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="description">
            Description <span className="font-normal text-white/50">(optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            placeholder="Add context about this document…"
            className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-white/40 focus:border-white/20"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="file">
            File
          </label>
          <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-6">
            <input
              id="file"
              name="file"
              type="file"
              className="block w-full text-sm text-white/70 file:mr-4 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-black hover:file:bg-white/90"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt"
              required
            />
            <p className="mt-3 text-sm text-white/60">
              Upload PDFs, decks, spreadsheets, or text files.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          {success}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          className="inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60"
          disabled={isUploading}
          type="submit"
        >
          {isUploading ? "Uploading…" : "Upload"}
        </button>
      </div>
    </form>
  );
}

