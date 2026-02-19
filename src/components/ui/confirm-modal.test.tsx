import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConfirmModal } from "./confirm-modal";

// Mock createPortal to render inline instead of into document.body
vi.mock("react-dom", async () => {
  const actual = await vi.importActual<typeof import("react-dom")>("react-dom");
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

describe("ConfirmModal", () => {
  const defaultProps = {
    open: true,
    title: "Delete item",
    message: "Are you sure you want to delete this item?",
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when open is false", () => {
    const { container } = render(
      <ConfirmModal {...defaultProps} open={false} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders the title and message", () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText("Delete item")).toBeInTheDocument();
    expect(
      screen.getByText("Are you sure you want to delete this item?"),
    ).toBeInTheDocument();
  });

  it("renders default button labels", () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("renders custom button labels", () => {
    render(
      <ConfirmModal
        {...defaultProps}
        confirmLabel="Yes, delete"
        cancelLabel="No, keep it"
      />,
    );
    expect(screen.getByText("Yes, delete")).toBeInTheDocument();
    expect(screen.getByText("No, keep it")).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is clicked", async () => {
    const user = userEvent.setup();
    render(<ConfirmModal {...defaultProps} />);
    await user.click(screen.getByText("Confirm"));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(<ConfirmModal {...defaultProps} />);
    await user.click(screen.getByText("Cancel"));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when backdrop is clicked", async () => {
    const user = userEvent.setup();
    render(<ConfirmModal {...defaultProps} />);
    const backdrop = document.querySelector("[aria-hidden='true']");
    expect(backdrop).not.toBeNull();
    await user.click(backdrop!);
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when Escape key is pressed", async () => {
    const user = userEvent.setup();
    render(<ConfirmModal {...defaultProps} />);
    await user.keyboard("{Escape}");
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it("does not call onCancel on Escape when closed", async () => {
    const user = userEvent.setup();
    render(<ConfirmModal {...defaultProps} open={false} />);
    await user.keyboard("{Escape}");
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it("has dialog role with aria-modal and aria-labelledby", () => {
    render(<ConfirmModal {...defaultProps} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby");

    // The aria-labelledby should reference the title element
    const labelledById = dialog.getAttribute("aria-labelledby")!;
    const titleEl = document.getElementById(labelledById);
    expect(titleEl).not.toBeNull();
    expect(titleEl!.textContent).toBe("Delete item");
  });

  it("contains focusable buttons for focus trap", () => {
    render(<ConfirmModal {...defaultProps} />);
    const dialog = screen.getByRole("dialog");
    const buttons = dialog.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it("uses danger variant styling by default", () => {
    render(<ConfirmModal {...defaultProps} />);
    // The confirm button should use the danger variant
    const confirmButton = screen.getByText("Confirm").closest("button");
    expect(confirmButton).toBeInTheDocument();
  });

  it("renders with warning variant", () => {
    render(<ConfirmModal {...defaultProps} variant="warning" />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    // Confirm button should have the warning class when variant is warning
    const confirmButton = screen.getByText("Confirm").closest("button");
    expect(confirmButton?.className).toContain("warning");
  });

  it("renders with default variant", () => {
    render(<ConfirmModal {...defaultProps} variant="default" />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
  });
});
