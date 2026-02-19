"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AddContactModal } from "@/components/portfolio/add-contact-form";
import { AddMetricsPromptModal } from "./add-metrics-prompt-modal";
import { MetricEntryModal } from "./metric-entry-table";

type FlowStep = "idle" | "add-company" | "prompt-metrics" | "manual-entry";

export function AddCompanyFlow() {
  const router = useRouter();
  const [step, setStep] = React.useState<FlowStep>("idle");
  const [company, setCompany] = React.useState<{ id: string; name: string } | null>(null);

  function handleCompanyCreated(newCompany: { id: string; name: string }) {
    setCompany(newCompany);
    setStep("prompt-metrics");
  }

  function handleUpload() {
    if (!company) return;
    setStep("idle");
    router.push(`/historical-upload?companyId=${company.id}`);
  }

  function handleManual() {
    setStep("manual-entry");
  }

  function handleSkip() {
    setStep("idle");
    toast.success(`${company?.name ?? "Company"} added to your portfolio.`);
    router.refresh();
  }

  function handleManualClose() {
    setStep("idle");
    setCompany(null);
    router.refresh();
  }

  function handleClose() {
    setStep("idle");
    setCompany(null);
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => setStep("add-company")}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add Company
      </Button>

      <AddContactModal
        open={step === "add-company"}
        onClose={handleClose}
        onSuccess={handleCompanyCreated}
        mode="company"
      />

      <AddMetricsPromptModal
        open={step === "prompt-metrics"}
        onClose={handleSkip}
        companyName={company?.name ?? ""}
        onUpload={handleUpload}
        onManual={handleManual}
        onSkip={handleSkip}
      />

      {company && (
        <MetricEntryModal
          open={step === "manual-entry"}
          onClose={handleManualClose}
          companyId={company.id}
          companyName={company.name}
        />
      )}
    </>
  );
}
