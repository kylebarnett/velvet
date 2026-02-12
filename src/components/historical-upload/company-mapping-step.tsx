"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type DetectedCompany = {
  name: string;
  source: string;
  sheetName?: string;
};

type PortfolioCompany = {
  id: string;
  name: string;
};

type Mapping = {
  detectedName: string;
  companyId: string | null;
  companyName: string | null;
  confidence: number;
  autoMatched: boolean;
};

export function CompanyMappingStep({
  uploadId,
  companiesDetected,
  onComplete,
  onBack,
}: {
  uploadId: string;
  companiesDetected: DetectedCompany[];
  onComplete: () => void;
  onBack: () => void;
}) {
  const [portfolioCompanies, setPortfolioCompanies] = useState<PortfolioCompany[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch portfolio companies and initial mapping suggestions
  useEffect(() => {
    async function load() {
      try {
        // Fetch upload details which includes company mapping info
        const res = await fetch(`/api/historical-upload/${uploadId}`);
        if (!res.ok) throw new Error("Failed to load upload data.");
        const data = await res.json();

        // Extract unique company names from the upload's detected companies
        const companies = data.companies as Array<{ detectedName: string; companyId: string | null }>;

        // Fetch the investor's portfolio companies for the dropdown
        const portfolioRes = await fetch("/api/investors/companies");
        let portfolio: PortfolioCompany[] = [];
        if (portfolioRes.ok) {
          const portfolioData = await portfolioRes.json();
          portfolio = (portfolioData.companies ?? portfolioData ?? []).map((c: Record<string, unknown>) => ({
            id: String(c.id ?? c.company_id ?? ""),
            name: String(c.name ?? c.company_name ?? ""),
          })).filter((c: PortfolioCompany) => c.id && c.name);
        }
        setPortfolioCompanies(portfolio);

        // Build initial mappings from upload data
        const initialMappings: Mapping[] = companiesDetected.map((dc) => {
          const existing = companies.find((c) => c.detectedName === dc.name);
          const matchedPortfolio = existing?.companyId
            ? portfolio.find((p) => p.id === existing.companyId)
            : null;

          return {
            detectedName: dc.name,
            companyId: existing?.companyId ?? null,
            companyName: matchedPortfolio?.name ?? null,
            confidence: existing?.companyId ? 0.9 : 0,
            autoMatched: !!existing?.companyId,
          };
        });

        setMappings(initialMappings);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [uploadId, companiesDetected]);

  const handleMappingChange = useCallback(
    (detectedName: string, companyId: string | null) => {
      setMappings((prev) =>
        prev.map((m) =>
          m.detectedName === detectedName
            ? {
                ...m,
                companyId,
                companyName: portfolioCompanies.find((p) => p.id === companyId)?.name ?? null,
                autoMatched: false,
              }
            : m,
        ),
      );
    },
    [portfolioCompanies],
  );

  const handleConfirm = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/historical-upload/${uploadId}/company-mapping`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mappings: mappings.map((m) => ({
            detectedName: m.detectedName,
            companyId: m.companyId,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save mappings.");
      }

      onComplete();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const mappedCount = mappings.filter((m) => m.companyId).length;
  const unmappedCount = mappings.length - mappedCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-text-primary">Map Companies</h3>
        <p className="mt-1 text-xs text-text-secondary">
          We detected {mappings.length} company name{mappings.length !== 1 ? "s" : ""} in your file.
          Match each to a portfolio company, or skip to exclude them.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-[var(--error-border)] bg-[var(--error-bg-subtle)] p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--error-accent)]" />
          <p className="text-sm text-[var(--status-error-text)]">{error}</p>
        </div>
      )}

      <div className="divide-y divide-border-default rounded-xl border border-border-default">
        {mappings.map((mapping) => (
          <div
            key={mapping.detectedName}
            className="flex items-center gap-4 p-4"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Building2 className="h-5 w-5 shrink-0 text-text-tertiary" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">
                  {mapping.detectedName}
                </p>
                {mapping.autoMatched && (
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--success-accent)]">
                    <CheckCircle2 className="h-3 w-3" />
                    Auto-matched
                  </span>
                )}
              </div>
            </div>

            <select
              value={mapping.companyId ?? ""}
              onChange={(e) =>
                handleMappingChange(
                  mapping.detectedName,
                  e.target.value || null,
                )
              }
              className="h-11 min-w-[200px] rounded-md border border-border-default bg-bg-input px-3 text-sm text-text-primary transition-colors hover:border-border-default focus:border-border-default focus:outline-none"
            >
              <option value="">Skip (exclude)</option>
              {portfolioCompanies.map((pc) => (
                <option key={pc.id} value={pc.id}>
                  {pc.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-text-secondary">
          {mappedCount} mapped, {unmappedCount} skipped
        </p>
        <div className="flex gap-3">
          <button
            onClick={onBack}
            disabled={saving}
            className="rounded-md border border-border-default px-4 py-2 text-sm text-text-secondary hover:bg-bg-secondary disabled:opacity-60"
          >
            Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || mappedCount === 0}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60",
              mappedCount > 0
                ? "bg-btn-primary-bg text-btn-primary-text hover:bg-btn-primary-hover"
                : "bg-bg-tertiary text-text-tertiary",
            )}
          >
            {saving ? "Saving..." : "Confirm Mapping"}
          </button>
        </div>
      </div>
    </div>
  );
}
