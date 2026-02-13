"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  const [isUploading, setIsUploading] = React.useState(false);
  const [documentType, setDocumentType] = React.useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsUploading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Upload failed.");
      toast.success("Document uploaded successfully.");
      setDocumentType("");
      e.currentTarget.reset();
      setTimeout(() => router.push("/portal/documents"), 1500);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form
      className="max-w-2xl rounded-xl border border-border-default card-surface p-5"
      onSubmit={onSubmit}
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">
            Company
          </label>
          <div className="flex h-11 items-center rounded-md border border-border-default bg-bg-input px-3 text-sm text-text-secondary">
            {company.name}
          </div>
          <input type="hidden" name="companyId" value={company.id} />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">
            Document type<span className="text-[var(--error-accent)]"> *</span>
          </label>
          <input type="hidden" name="documentType" value={documentType} />
          <Select value={documentType || "__none__"} onValueChange={(v) => setDocumentType(v === "__none__" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent className="[&_[role=option]]:py-2.5 [&_[role=option]]:pr-4">
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
          {documentType && (
            <p className="text-xs text-text-muted">
              {{
                income_statement: "Revenue, expenses, and net income for a period",
                balance_sheet: "Assets, liabilities, and equity at a point in time",
                cash_flow_statement: "Cash inflows and outflows from operations, investing, and financing",
                consolidated_financial_statements: "Combined financial statements across entities",
                "409a_valuation": "Independent valuation report for stock option pricing",
                investor_update: "Periodic update letter to investors on company progress",
                board_deck: "Presentation materials prepared for board meetings",
                cap_table: "Ownership breakdown showing shares, options, and investor stakes",
                other: "Any other document type",
              }[documentType]}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="description">
            Description <span className="font-normal text-text-tertiary">(optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            placeholder="Add context about this document..."
            className="rounded-md border border-border-default bg-bg-input px-3 py-2 text-sm outline-none placeholder:text-text-muted focus:border-border-default"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="file">
            File<span className="text-[var(--error-accent)]"> *</span>
          </label>
          <div className="rounded-xl border border-dashed border-border-default bg-bg-input p-6">
            <input
              id="file"
              name="file"
              type="file"
              className="block w-full text-sm text-text-secondary file:mr-4 file:rounded-md file:border-0 file:bg-btn-primary-bg file:px-3 file:py-2 file:text-sm file:font-medium file:text-btn-primary-text hover:file:bg-btn-primary-hover"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt"
              required
            />
            <p className="mt-3 text-sm text-text-tertiary">
              Upload PDFs, decks, spreadsheets, or text files.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button loading={isUploading} disabled={!documentType} type="submit">
          Upload
        </Button>
      </div>
    </form>
  );
}
