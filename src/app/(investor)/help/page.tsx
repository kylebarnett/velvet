import type { Metadata } from "next";
import { Suspense } from "react";
import { HelpPageContent } from "@/components/help/help-page-content";

export const metadata: Metadata = { title: "Help | Velvet" };

export default function InvestorHelpPage() {
  return (
    <Suspense>
      <HelpPageContent role="investor" helpBasePath="/help" />
    </Suspense>
  );
}
