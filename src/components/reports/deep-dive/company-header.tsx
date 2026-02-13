"use client";

import { Building2, Globe, Calendar } from "lucide-react";
import { INDUSTRY_LABELS, STAGE_LABELS } from "@/lib/constants/industries";

type CompanyHeaderProps = {
  company: {
    name: string;
    industry: string | null;
    stage: string | null;
    website: string | null;
    logoUrl: string | null;
    lastSubmission: string | null;
  };
};

export function CompanyHeader({ company }: CompanyHeaderProps) {
  const industryLabel = company.industry
    ? (INDUSTRY_LABELS as Record<string, string>)[company.industry] ?? company.industry
    : null;
  const stageLabel = company.stage
    ? (STAGE_LABELS as Record<string, string>)[company.stage] ?? company.stage
    : null;

  return (
    <div className="flex items-start gap-4">
      {/* Logo */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-bg-elevated">
        {company.logoUrl ? (
          <img
            src={company.logoUrl}
            alt={company.name}
            className="h-10 w-10 rounded-md object-contain"
          />
        ) : (
          <Building2 className="h-6 w-6 text-text-muted" />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold text-text-primary">{company.name}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-muted">
          {industryLabel && (
            <span className="rounded-md bg-[var(--tag-blue-bg)] px-2 py-0.5 text-[var(--tag-blue-text)]">
              {industryLabel}
            </span>
          )}
          {stageLabel && (
            <span className="rounded-md bg-[var(--tag-violet-bg)] px-2 py-0.5 text-[var(--tag-violet-text)]">
              {stageLabel}
            </span>
          )}
          {company.website && (
            <a
              href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-text-secondary hover:text-text-primary"
            >
              <Globe className="h-3 w-3" />
              {company.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          {company.lastSubmission && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Last updated{" "}
              {new Date(company.lastSubmission).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
