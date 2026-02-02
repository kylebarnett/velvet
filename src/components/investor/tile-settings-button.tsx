"use client";

import * as React from "react";
import { Sliders } from "lucide-react";
import { TileMetricConfig } from "./tile-metric-config";

type MetricOption = {
  name: string;
  displayName: string;
};

type TileSettingsButtonProps = {
  companyId: string;
  companyName: string;
  availableMetrics: MetricOption[];
  initialPrimary: string | null;
  initialSecondary: string | null;
};

export function TileSettingsButton({
  companyId,
  companyName,
  availableMetrics,
  initialPrimary,
  initialSecondary,
}: TileSettingsButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [currentPrimary, setCurrentPrimary] = React.useState(initialPrimary);
  const [currentSecondary, setCurrentSecondary] = React.useState(initialSecondary);

  function handleSave(primary: string | null, secondary: string | null) {
    setCurrentPrimary(primary);
    setCurrentSecondary(secondary);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 sm:py-1.5 text-xs font-medium text-white/80 hover:border-white/20"
        title="Configure tile metrics"
      >
        <Sliders className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Tile Settings</span>
      </button>

      <TileMetricConfig
        open={open}
        companyId={companyId}
        companyName={companyName}
        availableMetrics={availableMetrics}
        initialPrimary={currentPrimary}
        initialSecondary={currentSecondary}
        onClose={() => setOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}
