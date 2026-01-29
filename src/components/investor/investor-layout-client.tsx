"use client";

import * as React from "react";

import { OnboardingProvider } from "@/contexts/onboarding-context";
import { OnboardingOverlay } from "@/components/onboarding/onboarding-provider";

type InvestorLayoutClientProps = {
  children: React.ReactNode;
  initialOnboardingStep: number | null;
  isOnboardingComplete: boolean;
};

export function InvestorLayoutClient({
  children,
  initialOnboardingStep,
  isOnboardingComplete,
}: InvestorLayoutClientProps) {
  return (
    <OnboardingProvider
      initialStep={initialOnboardingStep}
      isOnboardingComplete={isOnboardingComplete}
    >
      {children}
      <OnboardingOverlay />
    </OnboardingProvider>
  );
}
