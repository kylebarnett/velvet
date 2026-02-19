import { vi } from "vitest";
import * as XLSX from "xlsx";

// Mock xlsx before import
vi.mock("xlsx", () => ({
  default: {
    utils: {
      aoa_to_sheet: vi.fn(() => ({})),
      book_new: vi.fn(() => ({ SheetNames: [], Sheets: {} })),
      book_append_sheet: vi.fn(),
    },
    write: vi.fn(() => new Uint8Array([1, 2, 3])),
  },
  utils: {
    aoa_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({ SheetNames: [], Sheets: {} })),
    book_append_sheet: vi.fn(),
  },
  write: vi.fn(() => new Uint8Array([1, 2, 3])),
}));

import { downloadExcel } from "./excel-export";

const mockedXLSX = vi.mocked(XLSX);

describe("downloadExcel", () => {
  let mockAnchor: Record<string, unknown>;

  beforeEach(() => {
    mockAnchor = { click: vi.fn() };
    vi.spyOn(document, "createElement").mockReturnValue(mockAnchor as unknown as HTMLElement);
    vi.spyOn(document.body, "appendChild").mockImplementation(() => null as unknown as Node);
    vi.spyOn(document.body, "removeChild").mockImplementation(() => null as unknown as Node);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("creates download with correct filename", async () => {
    await downloadExcel({
      filename: "test-export",
      headers: ["Name", "Value"],
      rows: [["Acme", 100]],
    });

    expect(mockAnchor.download).toBe("test-export.xlsx");
    expect(mockAnchor.click).toHaveBeenCalled();
  });

  it("cleans up DOM after download", async () => {
    await downloadExcel({
      filename: "test",
      headers: ["A"],
      rows: [["B"]],
    });

    expect(document.body.removeChild).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });

  it("escapes formula injection in cells", async () => {
    await downloadExcel({
      filename: "test",
      headers: ["=Header"],
      rows: [["=EVIL", 42, null]],
    });

    const aoaCall = (mockedXLSX.utils.aoa_to_sheet as ReturnType<typeof vi.fn>).mock.calls[0][0] as unknown[][];
    // Header should be escaped
    expect(aoaCall[0][0]).toBe("'=Header");
    // Cell starting with = should be escaped
    expect(aoaCall[1][0]).toBe("'=EVIL");
    // Number preserved
    expect(aoaCall[1][1]).toBe(42);
    // Null preserved
    expect(aoaCall[1][2]).toBe(null);
  });

  it("uses custom sheet name", async () => {
    await downloadExcel({
      filename: "test",
      headers: ["A"],
      rows: [],
      sheetName: "Custom",
    });

    expect(mockedXLSX.utils.book_append_sheet as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "Custom",
    );
  });

  it("defaults sheet name to Data", async () => {
    await downloadExcel({
      filename: "test",
      headers: ["A"],
      rows: [],
    });

    expect(mockedXLSX.utils.book_append_sheet as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "Data",
    );
  });
});
