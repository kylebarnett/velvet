"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import { OnboardingProvider } from "@/contexts/onboarding-context";
import { MetricDefinitionsProvider } from "@/contexts/metric-definitions-context";
import { OnboardingOverlay } from "@/components/onboarding/onboarding-provider";

const ChatbotWidget = dynamic(
  () => import("@/components/investor/chatbot-widget").then(m => ({ default: m.ChatbotWidget })),
  { ssr: false }
);
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
    </MetricDefinitionsProvider>
  );
}
