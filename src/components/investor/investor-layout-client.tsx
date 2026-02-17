"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { OnboardingProvider } from "@/contexts/onboarding-context";
import { MetricDefinitionsProvider } from "@/contexts/metric-definitions-context";
import { HelpProvider } from "@/contexts/help-context";
import { OnboardingOverlay } from "@/components/onboarding/onboarding-provider";
import { ChatbotWidget } from "@/components/investor/chatbot-widget";
import { CommandPaletteProvider } from "@/components/command-palette/command-palette-provider";
import { CommandPalette } from "@/components/command-palette/command-palette";

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
  const pathname = usePathname();
  const hideChatbot = pathname.startsWith("/funds") || pathname.startsWith("/reports");

  return (
    <MetricDefinitionsProvider>
      <HelpProvider role="investor">
        <CommandPaletteProvider>
          <OnboardingProvider
            initialStep={initialOnboardingStep}
            isOnboardingComplete={isOnboardingComplete}
          >
            {children}
            <OnboardingOverlay />
            {!hideChatbot && <ChatbotWidget />}
            <CommandPalette role="investor" />
          </OnboardingProvider>
        </CommandPaletteProvider>
      </HelpProvider>
    </MetricDefinitionsProvider>
  );
}
