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
    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/5">
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={company.name}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="font-medium text-white/60 text-xs">{initial}</span>
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
          className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2 hover:bg-white/5"
        >
          <div className="flex items-center gap-3">
            <CompanyLogoDisplay company={company} />
            <div className="flex items-center">
              <span className="text-sm font-medium">{company.name}</span>
              {company.stage && (
                <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50">
                  {company.stage.replace(/_/g, " ")}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {company.founder_id ? (
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">
                Active
              </span>
            ) : (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200">
                Pending
              </span>
            )}
            <span className="text-xs text-white/40">
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
