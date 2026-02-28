import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroSection } from "@/components/marketing/sections/hero-section";
import { CtaSection } from "@/components/marketing/sections/cta-section";
import { WorkflowWalkthrough } from "@/components/marketing/sections/workflow-walkthrough";
import { AnimatedSection } from "@/components/marketing/sections/animated-section";
import { MockWindow } from "@/components/marketing/ui/mock-window";
import { GlowEffect } from "@/components/marketing/ui/glow-effect";
import { MockDashboard } from "@/components/marketing/mocks/mock-dashboard";
import { MockCompanyCards } from "@/components/marketing/mocks/mock-company-cards";
import { MockCampaignWizard } from "@/components/marketing/mocks/mock-campaign-wizard";
import { MockChatbot } from "@/components/marketing/mocks/mock-chatbot";
import { MockFundPerformance } from "@/components/marketing/mocks/mock-fund-performance";

export const metadata = {
  title: "For Investors | PostSig",
  description:
    "Import your companies, request metrics from founders, and get a real-time view of your entire portfolio with AI insights and LP-ready reports.",
};

const workflowSteps = [
  {
    number: 1,
    title: "Import Your Portfolio",
    description:
      "Add your portfolio companies via CSV upload or manual entry. PostSig deduplicates by founder email, so multiple investors can track the same company.",
    mock: (
      <MockWindow title="Portfolio">
        <MockCompanyCards />
      </MockWindow>
    ),
  },
  {
    number: 2,
    title: "Request Metrics",
    description:
      "Create metric collection campaigns. Select which metrics you need, choose the reporting period, and send requests to all your founders at once.",
    mock: (
      <MockWindow title="New Metric Request">
        <MockCampaignWizard />
      </MockWindow>
    ),
  },
  {
    number: 3,
    title: "See Everything",
    description:
      "Your portfolio view shows real-time KPIs, portfolio-wide trends, and company-level drill-downs. Benchmark against industry percentiles to spot outliers.",
    mock: (
      <MockWindow title="Companies">
        <MockDashboard />
      </MockWindow>
    ),
  },
  {
    number: 4,
    title: "Get AI Insights",
    description:
      "Ask questions about your portfolio in plain English. 'What's the average burn rate?' 'Which companies grew fastest last quarter?' Get instant, data-backed answers.",
    mock: (
      <MockWindow title="AI Assistant">
        <MockChatbot />
      </MockWindow>
    ),
  },
  {
    number: 5,
    title: "Report to LPs",
    description:
      "Generate fund-level reports with TVPI, DPI, IRR, and MOIC calculations. Track investments, distributions, and net asset values across your funds.",
    mock: (
      <MockWindow title="Fund Performance">
        <MockFundPerformance />
      </MockWindow>
    ),
  },
];

export default function ForInvestorsPage() {
  return (
    <>
      <HeroSection
        title="Your portfolio, fully visible"
        subtitle="Import your companies, request metrics from founders, and get a real-time view of your entire portfolio — with AI insights and LP-ready reports."
        mock={
          <AnimatedSection delay={0.3}>
            <GlowEffect>
              <MockWindow title="PostSig">
                <MockDashboard />
              </MockWindow>
            </GlowEffect>
          </AnimatedSection>
        }
      >
        <Link href="/signup">
          <Button size="lg">Get started</Button>
        </Link>
        <Link href="/features">
          <Button variant="secondary" size="lg">
            See all features
          </Button>
        </Link>
      </HeroSection>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold text-text-primary">
          How investors use PostSig
        </h2>
        <p className="mt-3 mb-16 text-center text-text-secondary">
          Five steps to portfolio clarity
        </p>
        <WorkflowWalkthrough steps={workflowSteps} />
      </section>

      <CtaSection
        title="Start managing your portfolio"
        subtitle="Import your first company in under a minute."
      />
    </>
  );
}
