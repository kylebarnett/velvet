import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroSection } from "@/components/marketing/sections/hero-section";
import { CtaSection } from "@/components/marketing/sections/cta-section";
import { WorkflowWalkthrough } from "@/components/marketing/sections/workflow-walkthrough";
import { AnimatedSection } from "@/components/marketing/sections/animated-section";
import { MockWindow } from "@/components/marketing/ui/mock-window";
import { GlowEffect } from "@/components/marketing/ui/glow-effect";
import { MockRequestInbox } from "@/components/marketing/mocks/mock-request-inbox";
import { MockBatchSubmission } from "@/components/marketing/mocks/mock-batch-submission";
import { MockAccessControl } from "@/components/marketing/mocks/mock-access-control";
import { MockTearSheet } from "@/components/marketing/mocks/mock-tear-sheet";
import { MockDocumentUpload } from "@/components/marketing/mocks/mock-document-upload";

export const metadata = {
  title: "For Founders | Velvet",
  description:
    "Submit your metrics once and every approved investor sees the same data. Control who has access, build tear sheets, and let AI handle document extraction.",
};

const workflowSteps = [
  {
    number: 1,
    title: "Review Incoming Requests",
    description:
      "See all metric requests from your investors in one place. Each request shows which metrics are needed and the reporting period.",
    mock: (
      <MockWindow title="Metric Requests">
        <MockRequestInbox />
      </MockWindow>
    ),
  },
  {
    number: 2,
    title: "Submit in Minutes",
    description:
      "Fill in your metrics in a simple table. Previous period values are shown for reference. Submit once and all approved investors see the data.",
    mock: (
      <MockWindow title="Submit Metrics">
        <MockBatchSubmission />
      </MockWindow>
    ),
  },
  {
    number: 3,
    title: "Control Access",
    description:
      "You decide which investors can see your metrics. Approve, deny, or revoke access at any time. Your data, your rules.",
    mock: (
      <MockWindow title="Investor Access">
        <MockAccessControl />
      </MockWindow>
    ),
  },
  {
    number: 4,
    title: "Share Your Story",
    description:
      "Build a beautiful tear sheet with your key metrics, team info, and company highlights. Share it with a single link.",
    mock: (
      <MockWindow title="Tear Sheet">
        <MockTearSheet />
      </MockWindow>
    ),
  },
  {
    number: 5,
    title: "Upload & Extract",
    description:
      "Drop your financial documents and let AI extract the key metrics. Review the extracted values before they're added to your profile.",
    mock: (
      <MockWindow title="Documents">
        <MockDocumentUpload />
      </MockWindow>
    ),
  },
];

export default function ForFoundersPage() {
  return (
    <>
      <HeroSection
        title="Report once, satisfy every investor"
        subtitle="Submit your metrics once and every approved investor sees the same data. Control who has access, build tear sheets, and let AI handle document extraction."
        mock={
          <AnimatedSection delay={0.3}>
            <GlowEffect color="success">
              <MockWindow title="Metric Requests">
                <MockRequestInbox />
              </MockWindow>
            </GlowEffect>
          </AnimatedSection>
        }
      >
        <Link href="/signup">
          <Button size="lg">Join Velvet</Button>
        </Link>
        <Link href="/features">
          <Button variant="secondary" size="lg">
            See all features
          </Button>
        </Link>
      </HeroSection>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold text-text-primary">
          How founders use Velvet
        </h2>
        <p className="mt-3 mb-16 text-center text-text-secondary">
          Five steps to effortless reporting
        </p>
        <WorkflowWalkthrough steps={workflowSteps} />
      </section>

      <CtaSection
        title="Join your investors on Velvet"
        subtitle="Get started in minutes — your investors are already here."
      />
    </>
  );
}
