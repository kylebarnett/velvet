"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import { OnboardingProvider } from "@/contexts/onboarding-context";
import { MetricDefinitionsProvider } from "@/contexts/metric-definitions-context";
import { PresenceProvider } from "@/contexts/presence-context";
import { ChatProvider } from "@/contexts/chat-context";
import { OnboardingOverlay } from "@/components/onboarding/onboarding-provider";
import { ChatContainer } from "@/components/chat/chat-container";

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
  orgId: string | null;
  userId: string;
  userInfo: { fullName: string | null; email: string; avatarUrl: string | null };
};

export function InvestorLayoutClient({
  children,
  initialOnboardingStep,
  isOnboardingComplete,
  orgId,
  userId,
  userInfo,
}: InvestorLayoutClientProps) {
  const pathname = usePathname();
  const hideChatbot = pathname.startsWith("/funds") || pathname.startsWith("/reports");

  const content = (
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

  // Only wrap with presence + chat when user has an org
  if (!orgId) return content;

  return (
    <PresenceProvider orgId={orgId} userId={userId} userInfo={userInfo}>
      <ChatProvider orgId={orgId}>
        {content}
        <ChatContainer orgId={orgId} userId={userId} />
      </ChatProvider>
    </PresenceProvider>
  );
}
