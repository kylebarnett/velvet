"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ManualMetricEntryModal } from "./manual-metric-entry-modal";

type Props = {
  companyId: string;
  companyName: string;
  size?: "sm" | "md";
};

export function AddMetricButton({ companyId, companyName, size = "sm" }: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button size={size} variant="secondary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add Metric
      </Button>

      <ManualMetricEntryModal
        open={open}
        onClose={() => setOpen(false)}
        companyId={companyId}
        companyName={companyName}
      />
    </>
  );
}
