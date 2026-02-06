"use client";

import * as React from "react";
import { Sliders, ChevronDown, Check, Loader2 } from "lucide-react";
import { TileMetricConfig } from "./tile-metric-config";
import { getCompanyLogoUrl } from "@/lib/utils/logo";

type Company = {
  id: string;
  name: string;
  logoUrl: string | null;
  tilePrimaryMetric: string | null;
  tileSecondaryMetric: string | null;
};

type MetricOption = {
  name: string;
  displayName: string;
};

type TileSettingsMenuProps = {
  companies: Company[];
};

export function TileSettingsMenu({ companies }: TileSettingsMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedCompany, setSelectedCompany] = React.useState<Company | null>(null);
  const [availableMetrics, setAvailableMetrics] = React.useState<MetricOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [configOpen, setConfigOpen] = React.useState(false);
  const [companySettings, setCompanySettings] = React.useState<Map<string, { primary: string | null; secondary: string | null }>>(
    () => new Map(companies.map(c => [c.id, { primary: c.tilePrimaryMetric, secondary: c.tileSecondaryMetric }]))
  );
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSelectCompany(company: Company) {
    setSelectedCompany(company);
    setIsOpen(false);
    setLoading(true);

    try {
      // Fetch available metrics for this company
      const res = await fetch(`/api/investors/companies/${company.id}/metrics`);
      if (!res.ok) throw new Error("Failed to load metrics");

      const data = await res.json();
      const metrics = data.metrics ?? [];

      // Build unique list of metric names
      const metricSet = new Map<string, string>();
      for (const mv of metrics) {
        if (mv.metric_name && !metricSet.has(mv.metric_name.toLowerCase())) {
          metricSet.set(mv.metric_name.toLowerCase(), mv.metric_name);
        }
      }

      const options = Array.from(metricSet.entries())
        .map(([name, displayName]) => ({ name, displayName }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName));

      setAvailableMetrics(options);
      setConfigOpen(true);
    } catch (err) {
      console.error("Failed to load metrics:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleSave(primary: string | null, secondary: string | null) {
    if (selectedCompany) {
      setCompanySettings(prev => {
        const next = new Map(prev);
        next.set(selectedCompany.id, { primary, secondary });
        return next;
      });
    }
  }

  // Filter to only show companies with approved status (those that can have metrics)
  const approvedCompanies = companies.filter(c =>
    // All companies passed here should already be approved based on the dashboard query
    true
  );

  if (approvedCompanies.length === 0) return null;

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-white/60 hover:border-white/15 hover:text-white/80 transition-colors"
        >
          <Sliders className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Tile Settings</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-white/10 bg-zinc-900 py-1 shadow-xl">
            <div className="px-3 py-2 border-b border-white/10">
              <p className="text-xs text-white/60">
                Configure which metrics appear on company tiles
              </p>
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {approvedCompanies.map((company) => {
                const settings = companySettings.get(company.id);
                const hasCustomSettings = settings?.primary != null;
                const logoUrl = getCompanyLogoUrl(company.logoUrl);
                const initial = company.name.charAt(0).toUpperCase();

                return (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => handleSelectCompany(company)}
                    disabled={loading && selectedCompany?.id === company.id}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/5 transition-colors disabled:opacity-50"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded border border-white/10 bg-white/5">
                      {logoUrl ? (
                        <img src={logoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-medium text-white/60">{initial}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{company.name}</div>
                      {hasCustomSettings && (
                        <div className="text-xs text-white/40 truncate">
                          {settings?.primary}
                          {settings?.secondary && `, ${settings.secondary}`}
                        </div>
                      )}
                    </div>
                    {loading && selectedCompany?.id === company.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-white/40" />
                    ) : hasCustomSettings ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {selectedCompany && (
        <TileMetricConfig
          open={configOpen}
          companyId={selectedCompany.id}
          companyName={selectedCompany.name}
          availableMetrics={availableMetrics}
          initialPrimary={companySettings.get(selectedCompany.id)?.primary ?? null}
          initialSecondary={companySettings.get(selectedCompany.id)?.secondary ?? null}
          onClose={() => setConfigOpen(false)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
