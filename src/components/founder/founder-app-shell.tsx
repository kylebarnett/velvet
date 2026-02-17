"use client";

import * as React from "react";

import { AppShell, type NavItem, type CompanyInfo, type UserInfo } from "@/components/layouts/app-shell";
import { useOnboarding } from "@/contexts/onboarding-context";
import { useHelp } from "@/contexts/help-context";
import { useCommandPalette } from "@/components/command-palette/command-palette-provider";

type FounderAppShellProps = {
  title: string;
  nav: NavItem[];
  profileLinks?: NavItem[];
  company?: CompanyInfo;
  user?: UserInfo;
  initialTheme?: string;
  children: React.ReactNode;
};

export function FounderAppShell({
  title,
  nav,
  profileLinks,
  company,
  user,
  initialTheme,
  children,
}: FounderAppShellProps) {
  const { startTour } = useOnboarding();
  const { openHelp } = useHelp();
  const { open: openCommandPalette } = useCommandPalette();

  return (
    <AppShell
      title={title}
      nav={nav}
      profileLinks={profileLinks}
      company={company}
      user={user}
      role="founder"
      initialTheme={initialTheme}
      showTakeTour={true}
      onTakeTour={startTour}
      onOpenHelp={openHelp}
      onOpenCommandPalette={openCommandPalette}
    >
      {children}
    </AppShell>
  );
}
