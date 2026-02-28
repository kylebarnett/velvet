import type { Metadata } from "next";
import Link from "next/link";
import {
  Upload,
  UserPlus,
  BarChart3,
  FileText,
  LayoutDashboard,
  Send,
  Sparkles,
  Landmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroSection } from "@/components/marketing/sections/hero-section";
import { CtaSection } from "@/components/marketing/sections/cta-section";
import { FeatureGrid } from "@/components/marketing/sections/feature-grid";
import { HowItWorks } from "@/components/marketing/sections/how-it-works";
import { TwoSidesSection } from "@/components/marketing/sections/two-sides-section";
import { AnimatedSection } from "@/components/marketing/sections/animated-section";
import { MockWindow } from "@/components/marketing/ui/mock-window";
import { GlowEffect } from "@/components/marketing/ui/glow-effect";
import { MockDashboard } from "@/components/marketing/mocks/mock-dashboard";

export const metadata: Metadata = {
  title: "PostSig — Portfolio Metrics, Connected",
  description:
    "Collect, track, and report on portfolio company metrics. Founder portals, AI insights, dashboards, and LP reporting for venture investors.",
};

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <HeroSection
        title="Portfolio metrics, connected."
        subtitle="Collect, track, and report on portfolio company metrics — with founder portals, AI insights, dashboards, and LP reporting."
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
            See features
          </Button>
        </Link>
      </HeroSection>

      {/* Built for Both Sides */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold text-text-primary">
          Built for both sides
        </h2>
        <p className="mt-3 mb-12 text-center text-text-secondary">
          Whether you&#39;re tracking metrics or reporting them
        </p>
        <AnimatedSection>
          <TwoSidesSection />
        </AnimatedSection>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold text-text-primary">
          How it works
        </h2>
        <p className="mt-3 mb-12 text-center text-text-secondary">
          Get up and running in four simple steps
        </p>
        <HowItWorks
          steps={[
            {
              icon: <Upload className="h-5 w-5" />,
              title: "Import Portfolio",
              description:
                "Add your portfolio companies via CSV or manual entry.",
            },
            {
              icon: <UserPlus className="h-5 w-5" />,
              title: "Connect Founders",
              description:
                "Invite founders to their own reporting portal.",
            },
            {
              icon: <BarChart3 className="h-5 w-5" />,
              title: "Collect Metrics",
              description:
                "Request and receive quarterly metrics automatically.",
            },
            {
              icon: <FileText className="h-5 w-5" />,
              title: "Generate Reports",
              description:
                "Build LP-ready reports and benchmark analysis.",
            },
          ]}
        />
      </section>

      {/* Feature Highlights */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold text-text-primary">
          Everything you need
        </h2>
        <p className="mt-3 mb-12 text-center text-text-secondary">
          Powerful tools for portfolio management
        </p>
        <FeatureGrid
          features={[
            {
              icon: <LayoutDashboard className="h-5 w-5" />,
              title: "Dashboard & KPIs",
              description:
                "Real-time portfolio overview with company cards and customizable metric tracking.",
            },
            {
              icon: <Send className="h-5 w-5" />,
              title: "Metric Requests",
              description:
                "Send metric collection campaigns to founders with automated reminders.",
            },
            {
              icon: <BarChart3 className="h-5 w-5" />,
              title: "Reports & Benchmarks",
              description:
                "Generate comparison reports and benchmark against industry percentiles.",
            },
            {
              icon: <Sparkles className="h-5 w-5" />,
              title: "AI Analysis",
              description:
                "Ask questions about your portfolio in natural language and get instant answers.",
            },
            {
              icon: <FileText className="h-5 w-5" />,
              title: "Document Management",
              description:
                "Upload financial documents and let AI extract key metrics automatically.",
            },
            {
              icon: <Landmark className="h-5 w-5" />,
              title: "LP Reporting",
              description:
                "Track fund performance with TVPI, DPI, IRR, and MOIC calculations.",
            },
          ]}
        />
        <div className="mt-8 text-center">
          <Link
            href="/features"
            className="text-sm font-medium text-accent hover:text-accent-hover"
          >
            See all features &rarr;
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <CtaSection
        title="Start tracking your portfolio today"
        subtitle="Join investors and founders already using PostSig to streamline portfolio metrics."
      />
    </>
  );
}
