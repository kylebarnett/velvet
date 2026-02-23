import type { Metadata } from "next";
import {
  BarChart3,
  FileText,
  Sparkles,
  Upload,
  Landmark,
  Shield,
  Clock,
  Download,
  TrendingUp,
} from "lucide-react";
import { HeroSection } from "@/components/marketing/sections/hero-section";
import { CtaSection } from "@/components/marketing/sections/cta-section";
import { FeatureGrid } from "@/components/marketing/sections/feature-grid";
import { AlternatingSpotlight } from "@/components/marketing/sections/alternating-spotlight";
import { MockWindow } from "@/components/marketing/ui/mock-window";
import { MockDashboard } from "@/components/marketing/mocks/mock-dashboard";
import { MockCampaignWizard } from "@/components/marketing/mocks/mock-campaign-wizard";
import { MockChart } from "@/components/marketing/mocks/mock-chart";
import { MockChatbot } from "@/components/marketing/mocks/mock-chatbot";

export const metadata: Metadata = {
  title: "Features — Velvet",
  description:
    "Dashboards, metric collection, AI insights, LP reporting, benchmarks, and more. Everything you need to manage portfolio metrics.",
};

export default function FeaturesPage() {
  return (
    <>
      {/* Compact Hero */}
      <HeroSection
        title="Everything you need to manage portfolio metrics"
        subtitle="From data collection to AI-powered insights, Velvet gives investors and founders the tools they need."
        compact
      />

      {/* Alternating Spotlights */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <AlternatingSpotlight
          spotlights={[
            {
              title: "Portfolio Dashboard",
              description:
                "Get a real-time bird's-eye view of your entire portfolio. Customizable KPI cards, trend charts, and company-level drill-downs — all in one place.",
              bullets: [
                "Customizable KPI cards",
                "Portfolio-wide trend charts",
                "Company-level drill-downs",
              ],
              mock: (
                <MockWindow title="Companies">
                  <MockDashboard />
                </MockWindow>
              ),
            },
            {
              title: "Metric Collection",
              description:
                "Create metric request campaigns in minutes. Select metrics, choose companies, and send — founders get a simple portal to submit.",
              bullets: [
                "Multi-step request wizard",
                "Automated follow-up reminders",
                "Founder-friendly submission portal",
              ],
              mock: (
                <MockWindow title="New Request">
                  <MockCampaignWizard />
                </MockWindow>
              ),
            },
            {
              title: "Reporting & Analytics",
              description:
                "Generate beautiful reports comparing companies across metrics. Benchmark against industry percentiles and track trends over time.",
              bullets: [
                "Cross-company comparison views",
                "Industry benchmarking",
                "Exportable reports",
              ],
              mock: (
                <MockWindow title="Portfolio ARR">
                  <MockChart />
                </MockWindow>
              ),
            },
            {
              title: "AI Portfolio Assistant",
              description:
                "Ask questions about your portfolio in plain English. Get instant answers backed by your actual data.",
              bullets: [
                "Natural language queries",
                "Data-backed responses",
                "Portfolio-wide analysis",
              ],
              mock: (
                <MockWindow title="AI Assistant">
                  <MockChatbot />
                </MockWindow>
              ),
            },
          ]}
        />
      </section>

      {/* And More Grid */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold text-text-primary">
          And much more
        </h2>
        <p className="mt-3 mb-12 text-center text-text-secondary">
          Built-in tools for every stage of portfolio management
        </p>
        <FeatureGrid
          features={[
            {
              icon: <TrendingUp className="h-5 w-5" />,
              title: "Benchmarks",
              description:
                "See how your companies stack up against industry percentiles.",
            },
            {
              icon: <FileText className="h-5 w-5" />,
              title: "Tear Sheets",
              description:
                "Create shareable company profiles with key metrics and highlights.",
            },
            {
              icon: <Sparkles className="h-5 w-5" />,
              title: "Document AI",
              description:
                "Upload financials and let AI extract metrics automatically.",
            },
            {
              icon: <Upload className="h-5 w-5" />,
              title: "Historical Import",
              description:
                "Bulk import years of historical data from Excel spreadsheets.",
            },
            {
              icon: <Landmark className="h-5 w-5" />,
              title: "LP Reporting",
              description:
                "Track fund-level performance with TVPI, DPI, IRR, and MOIC.",
            },
            {
              icon: <Shield className="h-5 w-5" />,
              title: "Access Control",
              description:
                "Founders control exactly which investors see their data.",
            },
            {
              icon: <Clock className="h-5 w-5" />,
              title: "Scheduled Requests",
              description:
                "Set up recurring metric collection on quarterly or monthly cadences.",
            },
            {
              icon: <Download className="h-5 w-5" />,
              title: "CSV Export",
              description:
                "Export any report or dataset as a clean CSV file.",
            },
          ]}
        />
      </section>

      {/* Final CTA */}
      <CtaSection
        title="Ready to streamline your portfolio metrics?"
        subtitle="Get started in minutes — no credit card required."
      />
    </>
  );
}
