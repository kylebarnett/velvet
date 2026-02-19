import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DownloadCsvButton } from "./download-csv-button";

// Mock the logger to prevent Sentry import issues
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("DownloadCsvButton", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
  let clickedAnchors: HTMLAnchorElement[];

  beforeEach(() => {
    clickedAnchors = [];

    // Mock fetch
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch as typeof globalThis.fetch;

    // Mock URL methods
    mockCreateObjectURL = vi.fn(() => "blob:http://localhost/fake-blob-url");
    mockRevokeObjectURL = vi.fn();
    globalThis.URL.createObjectURL = mockCreateObjectURL as typeof URL.createObjectURL;
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL as typeof URL.revokeObjectURL;

    // Spy on document.createElement to intercept anchor creation for download
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string, options?: ElementCreationOptions) => {
      const el = originalCreateElement(tagName, options);
      if (tagName === "a") {
        // Intercept click on the anchor to prevent navigation
        vi.spyOn(el as HTMLAnchorElement, "click").mockImplementation(() => {
          clickedAnchors.push(el as HTMLAnchorElement);
        });
      }
      return el;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the export button with correct text", () => {
    render(<DownloadCsvButton />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Export CSV");
  });

  it("is not disabled by default", () => {
    render(<DownloadCsvButton />);
    expect(screen.getByRole("button")).not.toBeDisabled();
  });

  it("calls fetch to the portfolio export endpoint on click", async () => {
    const user = userEvent.setup();
    const mockBlob = new Blob(["col1,col2\nval1,val2"], { type: "text/csv" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });

    render(<DownloadCsvButton />);
    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/investors/portfolio/export");
    });
  });

  it("creates a blob URL and triggers download on successful fetch", async () => {
    const user = userEvent.setup();
    const mockBlob = new Blob(["col1,col2\nval1,val2"], { type: "text/csv" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });

    render(<DownloadCsvButton />);
    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
    });

    await waitFor(() => {
      expect(clickedAnchors.length).toBeGreaterThanOrEqual(1);
      const anchor = clickedAnchors[0];
      expect(anchor.href).toContain("blob:");
      expect(anchor.download).toMatch(/^portfolio-contacts-\d{4}-\d{2}-\d{2}\.csv$/);
    });

    // Should revoke the blob URL after download
    await waitFor(() => {
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:http://localhost/fake-blob-url");
    });
  });

  it("shows 'Downloading...' text while fetching", async () => {
    const user = userEvent.setup();
    let resolveBlob: (blob: Blob) => void;
    const blobPromise = new Promise<Blob>((resolve) => {
      resolveBlob = resolve;
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      blob: () => blobPromise,
    });

    render(<DownloadCsvButton />);
    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent("Downloading...");
    });

    // Button should be disabled while downloading
    expect(screen.getByRole("button")).toBeDisabled();

    // Resolve the blob to complete download
    resolveBlob!(new Blob(["data"]));

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent("Export CSV");
      expect(screen.getByRole("button")).not.toBeDisabled();
    });
  });

  it("handles fetch failure gracefully", async () => {
    const user = userEvent.setup();
    const { logger } = await import("@/lib/logger");

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<DownloadCsvButton />);
    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(logger.error).toHaveBeenCalled();
    });

    // Button should be re-enabled after failure
    await waitFor(() => {
      expect(screen.getByRole("button")).not.toBeDisabled();
      expect(screen.getByRole("button")).toHaveTextContent("Export CSV");
    });
  });

  it("handles network error gracefully", async () => {
    const user = userEvent.setup();
    const { logger } = await import("@/lib/logger");

    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<DownloadCsvButton />);
    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(logger.error).toHaveBeenCalled();
    });

    // Button should be re-enabled after error
    await waitFor(() => {
      expect(screen.getByRole("button")).not.toBeDisabled();
    });
  });
});
