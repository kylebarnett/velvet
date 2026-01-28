"use client";

import * as React from "react";
import { CompanyTagEditor, TagBadge } from "@/components/investor/company-tag-editor";

type Company = {
  id: string;
  name: string;
  website: string | null;
  stage: string | null;
  industry: string | null;
  business_model: string | null;
  founder_id: string | null;
  relationshipId: string;
  approvalStatus: string;
};

export function PortfolioCompanies({ companies: initialCompanies }: { companies: Company[] }) {
  const [companies, setCompanies] = React.useState(initialCompanies);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [filterStage, setFilterStage] = React.useState("");
  const [filterIndustry, setFilterIndustry] = React.useState("");
  const [filterModel, setFilterModel] = React.useState("");

  const filtered = companies.filter((c) => {
    if (filterStage && c.stage !== filterStage) return false;
    if (filterIndustry && c.industry !== filterIndustry) return false;
    if (filterModel && c.business_model !== filterModel) return false;
    return true;
  });

  const uniqueStages = [...new Set(companies.map((c) => c.stage).filter(Boolean))];
  const uniqueIndustries = [...new Set(companies.map((c) => c.industry).filter(Boolean))];
  const uniqueModels = [...new Set(companies.map((c) => c.business_model).filter(Boolean))];

  const formatLabel = (s: string) =>
    s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-4">
      {/* Filters */}
      {(uniqueStages.length > 0 || uniqueIndustries.length > 0 || uniqueModels.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {uniqueStages.length > 0 && (
            <select
              className="h-9 rounded-md border border-white/10 bg-black/30 px-2 text-xs outline-none focus:border-white/20"
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
            >
              <option value="">All stages</option>
              {uniqueStages.map((s) => (
                <option key={s} value={s!}>{formatLabel(s!)}</option>
              ))}
            </select>
          )}
          {uniqueIndustries.length > 0 && (
            <select
              className="h-9 rounded-md border border-white/10 bg-black/30 px-2 text-xs outline-none focus:border-white/20"
              value={filterIndustry}
              onChange={(e) => setFilterIndustry(e.target.value)}
            >
              <option value="">All industries</option>
              {uniqueIndustries.map((s) => (
                <option key={s} value={s!}>{formatLabel(s!)}</option>
              ))}
            </select>
          )}
          {uniqueModels.length > 0 && (
            <select
              className="h-9 rounded-md border border-white/10 bg-black/30 px-2 text-xs outline-none focus:border-white/20"
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value)}
            >
              <option value="">All models</option>
              {uniqueModels.map((s) => (
                <option key={s} value={s!}>{formatLabel(s!)}</option>
              ))}
            </select>
          )}
          {(filterStage || filterIndustry || filterModel) && (
            <button
              className="h-9 rounded-md border border-white/10 px-3 text-xs text-white/60 hover:bg-white/5"
              onClick={() => { setFilterStage(""); setFilterIndustry(""); setFilterModel(""); }}
              type="button"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Company cards */}
      <div className="space-y-3">
        {filtered.map((company) => (
          <div key={company.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{company.name}</span>
                  {company.founder_id && (
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">
                      Founder joined
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <TagBadge label="Stage" value={company.stage} />
                  <TagBadge label="Industry" value={company.industry} />
                  <TagBadge label="Model" value={company.business_model} />
                  {!company.stage && !company.industry && !company.business_model && (
                    <span className="text-xs text-white/40">No tags</span>
                  )}
                </div>
              </div>
              <button
                className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 px-3 text-xs font-medium text-white hover:bg-white/10"
                onClick={() => setEditingId(editingId === company.id ? null : company.id)}
                type="button"
              >
                {editingId === company.id ? "Close" : "Edit tags"}
              </button>
            </div>

            {editingId === company.id && (
              <div className="mt-4 border-t border-white/10 pt-4">
                <CompanyTagEditor
                  companyId={company.id}
                  stage={company.stage}
                  industry={company.industry}
                  businessModel={company.business_model}
                  onSaved={() => {
                    // Refresh companies from API
                    fetch("/api/investors/companies")
                      .then((r) => r.json())
                      .then((json) => {
                        if (json.companies) setCompanies(json.companies);
                      })
                      .catch(() => {});
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
          <p className="text-sm text-white/60">No companies match the selected filters.</p>
        </div>
      )}
    </div>
  );
}
