import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SlidingTabs, SlidingIconTabs } from "./sliding-tabs";
import type { TabItem } from "./sliding-tabs";
import { Activity, BarChart3, PieChart } from "lucide-react";

// Mock getBoundingClientRect for indicator positioning
const mockGetBoundingClientRect = vi.fn(() => ({
  left: 0,
  top: 0,
  right: 100,
  bottom: 40,
  width: 100,
  height: 40,
  x: 0,
  y: 0,
  toJSON: () => {},
}));

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.getBoundingClientRect = mockGetBoundingClientRect;
});

const tabs: TabItem[] = [
  { value: "overview", label: "Overview" },
  { value: "metrics", label: "Metrics" },
  { value: "documents", label: "Documents" },
];

describe("SlidingTabs", () => {
  it("renders all tab labels", () => {
    render(
      <SlidingTabs tabs={tabs} value="overview" onChange={vi.fn()} />,
    );
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Metrics")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
  });

  it("has tablist role on the container", () => {
    render(
      <SlidingTabs tabs={tabs} value="overview" onChange={vi.fn()} />,
    );
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("renders buttons with tab role", () => {
    render(
      <SlidingTabs tabs={tabs} value="overview" onChange={vi.fn()} />,
    );
    const tabElements = screen.getAllByRole("tab");
    expect(tabElements).toHaveLength(3);
  });

  it("sets aria-selected=true on active tab and false on others", () => {
    render(
      <SlidingTabs tabs={tabs} value="metrics" onChange={vi.fn()} />,
    );
    const tabElements = screen.getAllByRole("tab");
    expect(tabElements[0]).toHaveAttribute("aria-selected", "false");
    expect(tabElements[1]).toHaveAttribute("aria-selected", "true");
    expect(tabElements[2]).toHaveAttribute("aria-selected", "false");
  });

  it("sets tabIndex=0 on active tab and -1 on others", () => {
    render(
      <SlidingTabs tabs={tabs} value="overview" onChange={vi.fn()} />,
    );
    const tabElements = screen.getAllByRole("tab");
    expect(tabElements[0]).toHaveAttribute("tabindex", "0");
    expect(tabElements[1]).toHaveAttribute("tabindex", "-1");
    expect(tabElements[2]).toHaveAttribute("tabindex", "-1");
  });

  it("calls onChange when a tab is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SlidingTabs tabs={tabs} value="overview" onChange={onChange} />,
    );
    await user.click(screen.getByText("Documents"));
    expect(onChange).toHaveBeenCalledWith("documents");
  });

  it("calls onChange with next tab on ArrowRight key", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SlidingTabs tabs={tabs} value="overview" onChange={onChange} />,
    );
    // Focus the active tab first
    screen.getAllByRole("tab")[0].focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith("metrics");
  });

  it("calls onChange with previous tab on ArrowLeft key", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SlidingTabs tabs={tabs} value="metrics" onChange={onChange} />,
    );
    screen.getAllByRole("tab")[1].focus();
    await user.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenCalledWith("overview");
  });

  it("wraps around to first tab on ArrowRight from last tab", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SlidingTabs tabs={tabs} value="documents" onChange={onChange} />,
    );
    screen.getAllByRole("tab")[2].focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith("overview");
  });

  it("wraps around to last tab on ArrowLeft from first tab", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SlidingTabs tabs={tabs} value="overview" onChange={onChange} />,
    );
    screen.getAllByRole("tab")[0].focus();
    await user.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenCalledWith("documents");
  });

  it("navigates to first tab on Home key", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SlidingTabs tabs={tabs} value="documents" onChange={onChange} />,
    );
    screen.getAllByRole("tab")[2].focus();
    await user.keyboard("{Home}");
    expect(onChange).toHaveBeenCalledWith("overview");
  });

  it("navigates to last tab on End key", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SlidingTabs tabs={tabs} value="overview" onChange={onChange} />,
    );
    screen.getAllByRole("tab")[0].focus();
    await user.keyboard("{End}");
    expect(onChange).toHaveBeenCalledWith("documents");
  });

  it("renders short labels when provided", () => {
    const tabsWithShortLabels: TabItem[] = [
      { value: "overview", label: "Overview", shortLabel: "OV" },
      { value: "metrics", label: "Metrics", shortLabel: "MET" },
    ];
    render(
      <SlidingTabs
        tabs={tabsWithShortLabels}
        value="overview"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("OV")).toBeInTheDocument();
  });

  it("renders badge counts when provided", () => {
    const tabsWithBadges: TabItem[] = [
      { value: "overview", label: "Overview", badge: 5 },
      { value: "metrics", label: "Metrics", badge: 0 },
      { value: "documents", label: "Documents", badge: 150 },
    ];
    render(
      <SlidingTabs
        tabs={tabsWithBadges}
        value="overview"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("5")).toBeInTheDocument();
    // badge of 0 should not render
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    // badge > 99 shows 99+
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("renders with pill variant", () => {
    render(
      <SlidingTabs
        tabs={tabs}
        value="overview"
        onChange={vi.fn()}
        variant="pill"
      />,
    );
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });

  it("renders icons when provided and showIcons is true", () => {
    const tabsWithIcons: TabItem[] = [
      { value: "overview", label: "Overview", icon: Activity },
      { value: "metrics", label: "Metrics", icon: BarChart3 },
    ];
    render(
      <SlidingTabs
        tabs={tabsWithIcons}
        value="overview"
        onChange={vi.fn()}
        showIcons={true}
      />,
    );
    // Icons are rendered with aria-hidden="true"
    const hiddenIcons = document.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenIcons.length).toBeGreaterThanOrEqual(2);
  });

  it("does not render icons when showIcons is false", () => {
    const tabsWithIcons: TabItem[] = [
      { value: "overview", label: "Overview", icon: Activity },
    ];
    const { container } = render(
      <SlidingTabs
        tabs={tabsWithIcons}
        value="overview"
        onChange={vi.fn()}
        showIcons={false}
      />,
    );
    // No SVG icons should be rendered inside tab buttons (the indicator glow div is not an SVG)
    const svgElements = container.querySelectorAll("svg");
    expect(svgElements).toHaveLength(0);
  });

  it("applies custom className", () => {
    const { container } = render(
      <SlidingTabs
        tabs={tabs}
        value="overview"
        onChange={vi.fn()}
        className="my-custom-class"
      />,
    );
    expect(container.firstElementChild).toHaveClass("my-custom-class");
  });
});

describe("SlidingIconTabs", () => {
  const iconTabs = [
    { value: "chart", icon: BarChart3, label: "Chart view" },
    { value: "pie", icon: PieChart, label: "Pie view" },
  ] as const;

  it("renders all tabs with tab role", () => {
    render(
      <SlidingIconTabs
        tabs={[...iconTabs]}
        value="chart"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("tab")).toHaveLength(2);
  });

  it("has aria-label from tab.label on each button", () => {
    render(
      <SlidingIconTabs
        tabs={[...iconTabs]}
        value="chart"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Chart view")).toBeInTheDocument();
    expect(screen.getByLabelText("Pie view")).toBeInTheDocument();
  });

  it("sets correct aria-selected on active tab", () => {
    render(
      <SlidingIconTabs
        tabs={[...iconTabs]}
        value="pie"
        onChange={vi.fn()}
      />,
    );
    const tabElements = screen.getAllByRole("tab");
    expect(tabElements[0]).toHaveAttribute("aria-selected", "false");
    expect(tabElements[1]).toHaveAttribute("aria-selected", "true");
  });

  it("calls onChange on click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SlidingIconTabs
        tabs={[...iconTabs]}
        value="chart"
        onChange={onChange}
      />,
    );
    await user.click(screen.getByLabelText("Pie view"));
    expect(onChange).toHaveBeenCalledWith("pie");
  });

  it("supports keyboard navigation with ArrowRight", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SlidingIconTabs
        tabs={[...iconTabs]}
        value="chart"
        onChange={onChange}
      />,
    );
    screen.getAllByRole("tab")[0].focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith("pie");
  });
});
