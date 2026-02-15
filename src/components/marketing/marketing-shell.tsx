"use client";

import { LazyMotion, domAnimation } from "framer-motion";
import { MarketingNav } from "@/components/marketing/nav/marketing-nav";
import { Footer } from "@/components/marketing/footer";

interface MarketingShellProps {
  children: React.ReactNode;
}

export function MarketingShell({ children }: MarketingShellProps) {
  return (
    <LazyMotion features={domAnimation}>
      <div className="flex min-h-screen flex-col bg-bg-primary text-text-primary">
        <MarketingNav />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </LazyMotion>
  );
}
