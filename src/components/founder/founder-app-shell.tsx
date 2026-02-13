"use client";

import * as React from "react";

import { AppShell, type NavItem, type CompanyInfo, type UserInfo } from "@/components/layouts/app-shell";
import { useOnboarding } from "@/contexts/onboarding-context";

type FounderAppShellProps = {
  title: string;
  nav: NavItem[];
  company?: CompanyInfo;
  user?: UserInfo;
  initialTheme?: string;
  children: React.ReactNode;
};

export function FounderAppShell({
  title,
  nav,
  company,
  user,
  initialTheme,
  children,
}: FounderAppShellProps) {
  const { startTour } = useOnboarding();

  return (
    <AppShell
      title={title}
      nav={nav}
      company={company}
      user={user}
      role="founder"
      initialTheme={initialTheme}
      showTakeTour={true}
      onTakeTour={startTour}
    >
      {children}
    </AppShell>
  );
}
