import { Suspense } from "react";
import { HelpPageContent } from "@/components/help/help-page-content";

export default function InvestorHelpPage() {
  return (
    <Suspense>
      <HelpPageContent role="investor" helpBasePath="/help" />
    </Suspense>
  );
}
