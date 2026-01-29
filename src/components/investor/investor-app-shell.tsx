"use client";

import * as React from "react";

import { AppShell, type NavItem, type CompanyInfo } from "@/components/layouts/app-shell";
import { useOnboarding } from "@/contexts/onboarding-context";

type InvestorAppShellProps = {
  title: string;
  nav: NavItem[];
  company?: CompanyInfo;
  children: React.ReactNode;
};

export function InvestorAppShell({
  title,
  nav,
  company,
  children,
}: InvestorAppShellProps) {
  const { startTour } = useOnboarding();

  return (
    <AppShell
      title={title}
      nav={nav}
      company={company}
      showTakeTour={true}
      onTakeTour={startTour}
    >
      {children}
    </AppShell>
  );
}
