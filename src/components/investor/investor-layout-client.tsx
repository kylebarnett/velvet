"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { OnboardingProvider } from "@/contexts/onboarding-context";
import { MetricDefinitionsProvider } from "@/contexts/metric-definitions-context";
import { OnboardingOverlay } from "@/components/onboarding/onboarding-provider";
import { ChatbotWidget } from "@/components/investor/chatbot-widget";

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
  const hideChatbot = pathname.startsWith("/funds");

  return (
    <MetricDefinitionsProvider>
      <OnboardingProvider
        initialStep={initialOnboardingStep}
        isOnboardingComplete={isOnboardingComplete}
      >
        {children}
        <OnboardingOverlay />
        {!hideChatbot && <ChatbotWidget />}
      </OnboardingProvider>
    </MetricDefinitionsProvider>
  );
}
