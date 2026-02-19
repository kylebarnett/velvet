import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CompanyCard } from "./company-card";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock the CompanyCardMenu to avoid its internal complexity
vi.mock("@/components/investor/company-card-menu", () => ({
  CompanyCardMenu: ({ companyName }: { companyName: string }) => (
    <button aria-label={`Actions for ${companyName}`}>Menu</button>
  ),
}));

// Mock the logo utility
vi.mock("@/lib/utils/logo", () => ({
  getCompanyLogoUrl: (url: string | null) => url || null,
}));

// Mock the company constants
vi.mock("@/lib/company/constants", () => ({
  getTagLabel: (_type: string, value: string | null) => {
    if (!value) return "";
    const labels: Record<string, string> = {
      saas: "SaaS",
      fintech: "Fintech",
      seed: "Seed",
      series_a: "Series A",
    };
    return labels[value] ?? value;
  },
}));

describe("CompanyCard", () => {
  const defaultProps = {
    id: "comp-123",
    name: "Acme Corp",
    stage: "seed" as string | null,
    industry: "saas" as string | null,
    logoUrl: null as string | null,
    founderId: "founder-456" as string | null,
    approvalStatus: "approved",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the company name", () => {
    render(<CompanyCard {...defaultProps} />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("renders as a link to the company detail page", () => {
    render(<CompanyCard {...defaultProps} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/companies/comp-123");
  });

  it("renders the initial letter when no logo is provided", () => {
    render(<CompanyCard {...defaultProps} logoUrl={null} />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders an image when logoUrl is provided", () => {
    render(<CompanyCard {...defaultProps} logoUrl="https://example.com/logo.png" />);
    const img = screen.getByAltText("Acme Corp");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/logo.png");
  });

  it("renders industry and stage tags", () => {
    render(<CompanyCard {...defaultProps} />);
    expect(screen.getByText("SaaS")).toBeInTheDocument();
    expect(screen.getByText("Seed")).toBeInTheDocument();
  });

  it("handles null industry gracefully", () => {
    render(<CompanyCard {...defaultProps} industry={null} />);
    // Should not crash. Stage tag should still render.
    expect(screen.getByText("Seed")).toBeInTheDocument();
  });

  it("handles null stage gracefully", () => {
    render(<CompanyCard {...defaultProps} stage={null} />);
    // Should not crash. Industry tag should still render.
    expect(screen.getByText("SaaS")).toBeInTheDocument();
  });

  it("handles both null industry and stage gracefully", () => {
    render(<CompanyCard {...defaultProps} industry={null} stage={null} />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  // --- Approval status tests ---

  it("shows 'Pending approval' badge when approvalStatus is pending", () => {
    render(<CompanyCard {...defaultProps} approvalStatus="pending" />);
    expect(screen.getByText("Pending approval")).toBeInTheDocument();
  });

  it("shows 'Access denied' badge when approvalStatus is denied", () => {
    render(<CompanyCard {...defaultProps} approvalStatus="denied" />);
    expect(screen.getByText("Access denied")).toBeInTheDocument();
  });

  it("does not show approval badges when approved", () => {
    render(<CompanyCard {...defaultProps} approvalStatus="approved" />);
    expect(screen.queryByText("Pending approval")).not.toBeInTheDocument();
    expect(screen.queryByText("Access denied")).not.toBeInTheDocument();
  });

  it("does not show approval badges when auto_approved", () => {
    render(<CompanyCard {...defaultProps} approvalStatus="auto_approved" />);
    expect(screen.queryByText("Pending approval")).not.toBeInTheDocument();
    expect(screen.queryByText("Access denied")).not.toBeInTheDocument();
  });

  // --- Metric display tests ---

  it("renders primary metric when present", () => {
    render(
      <CompanyCard
        {...defaultProps}
        latestMetric={{
          name: "MRR",
          value: 50000,
          previousValue: 40000,
          percentChange: 25,
          periodLabel: "Jan 2026",
        }}
      />,
    );
    expect(screen.getByText("MRR")).toBeInTheDocument();
    expect(screen.getByText("$50K")).toBeInTheDocument();
    // Period label is rendered as "· Jan 2026" inside a child span
    expect(screen.getByText("· Jan 2026")).toBeInTheDocument();
    expect(screen.getByText("+25%")).toBeInTheDocument();
  });

  it("formats revenue values as currency", () => {
    render(
      <CompanyCard
        {...defaultProps}
        latestMetric={{
          name: "Revenue",
          value: 2500000,
          previousValue: null,
          percentChange: null,
          periodLabel: null,
        }}
      />,
    );
    expect(screen.getByText("$2.5M")).toBeInTheDocument();
  });

  it("formats burn rate as currency (not percentage)", () => {
    render(
      <CompanyCard
        {...defaultProps}
        latestMetric={{
          name: "Burn Rate",
          value: 150000,
          previousValue: null,
          percentChange: null,
          periodLabel: null,
        }}
      />,
    );
    // "Burn Rate" contains "burn" (currency) AND "rate" (percentage).
    // Per the MEMORY.md rule, currency checks must come first.
    expect(screen.getByText("$150K")).toBeInTheDocument();
  });

  it("formats percentage metrics correctly", () => {
    render(
      <CompanyCard
        {...defaultProps}
        latestMetric={{
          name: "Churn Rate",
          value: 5.2,
          previousValue: null,
          percentChange: null,
          periodLabel: null,
        }}
      />,
    );
    // "Churn Rate" - churn triggers percentage formatting
    // But wait - "rate" appears after currency checks, so it depends on order
    // Actually "churn" is in percentage check group, not currency.
    expect(screen.getByText("5.2%")).toBeInTheDocument();
  });

  it("renders secondary metric when present", () => {
    render(
      <CompanyCard
        {...defaultProps}
        latestMetric={{
          name: "MRR",
          value: 50000,
          previousValue: null,
          percentChange: null,
          periodLabel: null,
        }}
        secondaryMetric={{
          name: "Revenue",
          value: 1200000,
          previousValue: null,
          percentChange: -10,
          periodLabel: "Dec 2025",
        }}
      />,
    );
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("$1.2M")).toBeInTheDocument();
    expect(screen.getByText("-10%")).toBeInTheDocument();
  });

  it("does not render metric section when latestMetric is null", () => {
    render(<CompanyCard {...defaultProps} latestMetric={null} />);
    expect(screen.queryByText("MRR")).not.toBeInTheDocument();
  });

  it("does not render metric section when latestMetric.value is null", () => {
    render(
      <CompanyCard
        {...defaultProps}
        latestMetric={{
          name: "MRR",
          value: null,
          previousValue: null,
          percentChange: null,
          periodLabel: null,
        }}
      />,
    );
    // The metric name should NOT appear in the metrics section (hasAnyMetric is false)
    // The name "MRR" should not appear as a heading metric display
    expect(screen.queryByText("$0")).not.toBeInTheDocument();
  });

  it("shows trend indicator with positive change", () => {
    render(
      <CompanyCard
        {...defaultProps}
        latestMetric={{
          name: "MRR",
          value: 10000,
          previousValue: 8000,
          percentChange: 25,
          periodLabel: null,
        }}
      />,
    );
    expect(screen.getByText("+25%")).toBeInTheDocument();
    expect(screen.getByText(/Trending up/)).toBeInTheDocument();
  });

  it("shows trend indicator with negative change", () => {
    render(
      <CompanyCard
        {...defaultProps}
        latestMetric={{
          name: "MRR",
          value: 8000,
          previousValue: 10000,
          percentChange: -20,
          periodLabel: null,
        }}
      />,
    );
    expect(screen.getByText("-20%")).toBeInTheDocument();
    expect(screen.getByText(/Trending down/)).toBeInTheDocument();
  });

  it("shows neutral trend indicator for zero change", () => {
    render(
      <CompanyCard
        {...defaultProps}
        latestMetric={{
          name: "MRR",
          value: 10000,
          previousValue: 10000,
          percentChange: 0,
          periodLabel: null,
        }}
      />,
    );
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText(/No change/)).toBeInTheDocument();
  });

  // --- No founder / no metrics states ---

  it("shows 'Awaiting founder signup' when founderId is null", () => {
    render(<CompanyCard {...defaultProps} founderId={null} />);
    expect(screen.getByText("Awaiting founder signup")).toBeInTheDocument();
    expect(screen.getByText("Manage contacts")).toBeInTheDocument();
  });

  it("shows 'No metrics submitted yet' when approved with founder but no metrics", () => {
    render(
      <CompanyCard
        {...defaultProps}
        approvalStatus="approved"
        founderId="founder-456"
        latestMetric={undefined}
      />,
    );
    expect(screen.getByText("No metrics submitted yet")).toBeInTheDocument();
    expect(screen.getByText("Import historical data")).toBeInTheDocument();
  });

  // --- Freshness / stale indicator ---

  it("shows freshness label for recent submissions", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    render(
      <CompanyCard
        {...defaultProps}
        latestMetric={{
          name: "MRR",
          value: 10000,
          previousValue: null,
          percentChange: null,
          periodLabel: null,
        }}
        lastSubmittedAt={yesterday.toISOString()}
      />,
    );
    expect(screen.getByText("Updated yesterday")).toBeInTheDocument();
  });

  it("shows 'Stale' for very old submissions", () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 120);

    render(
      <CompanyCard
        {...defaultProps}
        latestMetric={{
          name: "MRR",
          value: 10000,
          previousValue: null,
          percentChange: null,
          periodLabel: null,
        }}
        lastSubmittedAt={oldDate.toISOString()}
      />,
    );
    expect(screen.getByText("Stale")).toBeInTheDocument();
  });

  // --- Formatting edge cases ---

  it("formats values under 1000 without suffix", () => {
    render(
      <CompanyCard
        {...defaultProps}
        latestMetric={{
          name: "Headcount",
          value: 42,
          previousValue: null,
          percentChange: null,
          periodLabel: null,
        }}
      />,
    );
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("formats large non-currency numbers with M suffix", () => {
    render(
      <CompanyCard
        {...defaultProps}
        latestMetric={{
          name: "Users",
          value: 5200000,
          previousValue: null,
          percentChange: null,
          periodLabel: null,
        }}
      />,
    );
    expect(screen.getByText("5.2M")).toBeInTheDocument();
  });
});
