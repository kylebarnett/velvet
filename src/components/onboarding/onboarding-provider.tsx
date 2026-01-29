"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { useOnboarding } from "@/contexts/onboarding-context";
import { SpotlightOverlay } from "./spotlight-overlay";
import { OnboardingTooltip } from "./onboarding-tooltip";
import { CompletionModal } from "./completion-modal";

export function OnboardingOverlay() {
  const pathname = usePathname();
  const {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    advance,
    skip,
    showCompletionModal,
    closeCompletionModal,
    restart,
  } = useOnboarding();

  // Don't render if tour is not active or no current step
  if (!isActive || !currentStep || currentStepIndex === null) {
    return (
      <>
        {showCompletionModal && (
          <CompletionModal onClose={closeCompletionModal} onRestart={restart} />
        )}
      </>
    );
  }

  // Don't render if we're not on the correct page
  if (currentStep.page !== pathname) {
    return null;
  }

  const isLastStep = currentStepIndex === totalSteps - 1;

  return (
    <>
      <SpotlightOverlay
        targetSelector={currentStep.target}
        onClick={advance}
      />
      <OnboardingTooltip
        targetSelector={currentStep.target}
        title={currentStep.title}
        message={currentStep.message}
        currentStep={currentStepIndex}
        totalSteps={totalSteps}
        onNext={advance}
        onSkip={skip}
        isLastStep={isLastStep}
      />
      {showCompletionModal && (
        <CompletionModal onClose={closeCompletionModal} onRestart={restart} />
      )}
    </>
  );
}
