"use client";

import * as React from "react";

import { AppShell, type NavItem, type CompanyInfo, type UserInfo } from "@/components/layouts/app-shell";
import { useOnboarding } from "@/contexts/onboarding-context";

type InvestorAppShellProps = {
  title: string;
  nav: NavItem[];
  profileLinks?: NavItem[];
  company?: CompanyInfo;
  user?: UserInfo;
  initialTheme?: string;
  children: React.ReactNode;
};

export function InvestorAppShell({
  title,
  nav,
  profileLinks,
  company,
  user,
  initialTheme,
  children,
}: InvestorAppShellProps) {
  const { startTour } = useOnboarding();

  return (
    <AppShell
      title={title}
      nav={nav}
      profileLinks={profileLinks}
      company={company}
      user={user}
      role="investor"
      initialTheme={initialTheme}
      showTakeTour={true}
      onTakeTour={startTour}
    >
      {children}
    </AppShell>
  );
}
