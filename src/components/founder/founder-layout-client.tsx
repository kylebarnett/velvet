"use client";

import * as React from "react";

import { OnboardingProvider, useOnboarding } from "@/contexts/onboarding-context";
import { OnboardingOverlay } from "@/components/onboarding/onboarding-provider";

type FounderLayoutClientProps = {
  children: React.ReactNode;
  initialOnboardingStep: number | null;
  isOnboardingComplete: boolean;
};

export function FounderLayoutClient({
  children,
  initialOnboardingStep,
  isOnboardingComplete,
}: FounderLayoutClientProps) {
  return (
    <OnboardingProvider
      initialStep={initialOnboardingStep}
      isOnboardingComplete={isOnboardingComplete}
      role="founder"
    >
      {children}
      <OnboardingOverlay />
    </OnboardingProvider>
  );
}

/**
 * Hook to get the founder tour's startTour function.
 * Wraps useOnboarding safely for use in founder AppShell.
 */
export function useFounderTour() {
  return useOnboarding();
}
