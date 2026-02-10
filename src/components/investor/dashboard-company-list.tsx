"use client";

import * as React from "react";
import Link from "next/link";
import { getCompanyLogoUrl } from "@/lib/utils/logo";

type Company = {
  id: string;
  name: string;
  website: string | null;
  founder_id: string | null;
  stage: string | null;
  industry: string | null;
  approvalStatus: string;
  logoUrl: string | null;
};

function CompanyLogoDisplay({ company }: { company: Company }) {
  const [imgError, setImgError] = React.useState(false);
  const logoUrl = getCompanyLogoUrl(company.logoUrl);
  const initial = company.name.charAt(0).toUpperCase();

  return (
    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-border-default bg-bg-elevated">
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={company.name}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="font-medium text-text-tertiary text-xs">{initial}</span>
      )}
    </div>
  );
}

export function DashboardCompanyList({ companies }: { companies: Company[] }) {
  return (
    <div className="mt-3 space-y-2">
      {companies.map((company) => (
        <Link
          key={company.id}
          href={`/dashboard/${company.id}`}
          className="flex items-center justify-between rounded-lg border border-border-subtle px-3 py-2 hover:bg-bg-elevated"
        >
          <div className="flex items-center gap-3">
            <CompanyLogoDisplay company={company} />
            <div className="flex items-center">
              <span className="text-sm font-medium">{company.name}</span>
              {company.stage && (
                <span className="ml-2 rounded-full bg-bg-hover px-2 py-0.5 text-xs text-text-tertiary">
                  {company.stage.replace(/_/g, " ")}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {company.founder_id ? (
              <span className="rounded-full bg-[var(--status-success-bg)] px-2 py-0.5 text-xs text-[var(--status-success-text)]">
                Founder joined
              </span>
            ) : (
              <span className="rounded-full bg-[var(--status-warning-bg)] px-2 py-0.5 text-xs text-[var(--status-warning-text)]">
                Awaiting signup
              </span>
            )}
            <span className="text-xs text-text-muted">
              {company.approvalStatus === "auto_approved" || company.approvalStatus === "approved"
                ? "Approved"
                : company.approvalStatus === "denied"
                  ? "Denied"
                  : "Awaiting approval"}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
