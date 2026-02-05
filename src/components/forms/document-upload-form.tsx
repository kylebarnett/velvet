"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  company: {
    id: string;
    name: string;
  };
};

export function DocumentUploadForm({ company }: Props) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [documentType, setDocumentType] = React.useState("");

  // Auto-dismiss success message after 4 seconds
  React.useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
        router.push("/portal/documents");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success, router]);

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
      setSuccess("Document uploaded successfully.");
      setDocumentType("");
      e.currentTarget.reset();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
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
          <label className="text-sm font-medium">
            Company
          </label>
          <div className="flex h-11 items-center rounded-md border border-white/10 bg-black/20 px-3 text-sm text-white/80">
            {company.name}
          </div>
          <input type="hidden" name="companyId" value={company.id} />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">
            Document type
          </label>
          <input type="hidden" name="documentType" value={documentType} />
          <Select value={documentType || "__none__"} onValueChange={(v) => setDocumentType(v === "__none__" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="income_statement">Income Statement</SelectItem>
              <SelectItem value="balance_sheet">Balance Sheet</SelectItem>
              <SelectItem value="cash_flow_statement">Cash Flow Statement</SelectItem>
              <SelectItem value="consolidated_financial_statements">Consolidated Financial Statements</SelectItem>
              <SelectItem value="409a_valuation">409A Valuation</SelectItem>
              <SelectItem value="investor_update">Investor Update</SelectItem>
              <SelectItem value="board_deck">Board Deck</SelectItem>
              <SelectItem value="cap_table">Cap Table</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="description">
            Description <span className="font-normal text-white/60">(optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            placeholder="Add context about this document..."
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
          className="inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/50"
          disabled={isUploading || !documentType}
          type="submit"
        >
          {isUploading ? "Uploading..." : "Upload"}
        </button>
      </div>
    </form>
  );
}
