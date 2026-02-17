"use client";

import * as React from "react";

import { OnboardingProvider, useOnboarding } from "@/contexts/onboarding-context";
import { HelpProvider } from "@/contexts/help-context";
import { OnboardingOverlay } from "@/components/onboarding/onboarding-provider";
import { CommandPaletteProvider } from "@/components/command-palette/command-palette-provider";
import { CommandPalette } from "@/components/command-palette/command-palette";

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
    <HelpProvider role="founder">
      <CommandPaletteProvider>
        <OnboardingProvider
          initialStep={initialOnboardingStep}
          isOnboardingComplete={isOnboardingComplete}
          role="founder"
        >
          {children}
          <OnboardingOverlay />
          <CommandPalette role="founder" />
        </OnboardingProvider>
      </CommandPaletteProvider>
    </HelpProvider>
  );
}

/**
 * Hook to get the founder tour's startTour function.
 * Wraps useOnboarding safely for use in founder AppShell.
 */
export function useFounderTour() {
  return useOnboarding();
}
