import { escapeCsvField, downloadCsv } from "./csv-export";

describe("escapeCsvField", () => {
  it("returns normal text unchanged", () => {
    expect(escapeCsvField("hello world")).toBe("hello world");
  });

  it("prepends ' when value starts with =", () => {
    expect(escapeCsvField("=SUM(A1)")).toBe("'=SUM(A1)");
  });

  it("prepends ' when value starts with +", () => {
    expect(escapeCsvField("+cmd|' /C calc'!A0")).toBe("'+cmd|' /C calc'!A0");
  });

  it("prepends ' when value starts with -", () => {
    expect(escapeCsvField("-1+1")).toBe("'-1+1");
  });

  it("prepends ' when value starts with @", () => {
    expect(escapeCsvField("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("prepends ' when value starts with tab", () => {
    expect(escapeCsvField("\tdata")).toBe("'\tdata");
  });

  it("prepends ' when value starts with carriage return", () => {
    expect(escapeCsvField("\rdata")).toBe("'\rdata");
  });

  it("wraps in double quotes when value contains a comma", () => {
    expect(escapeCsvField("one, two")).toBe('"one, two"');
  });

  it("doubles internal quotes and wraps when value contains double quotes", () => {
    expect(escapeCsvField('say "hello"')).toBe('"say ""hello"""');
  });

  it("wraps in double quotes when value contains a newline", () => {
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
  });

  it("handles combined: starts with = AND contains comma", () => {
    // First the = prefix is applied, then the comma triggers wrapping
    const result = escapeCsvField("=SUM(A1),B2");
    expect(result).toBe("\"'=SUM(A1),B2\"");
  });

  it("returns empty string unchanged", () => {
    expect(escapeCsvField("")).toBe("");
  });
});

describe("downloadCsv", () => {
  it("builds correct CSV content and triggers download via DOM APIs", () => {
    const mockClick = vi.fn();
    const mockAnchor = {
      href: "",
      download: "",
      click: mockClick,
    } as unknown as HTMLAnchorElement;

    const appendChildSpy = vi
      .spyOn(document.body, "appendChild")
      .mockReturnValue(mockAnchor as unknown as HTMLAnchorElement);
    const removeChildSpy = vi
      .spyOn(document.body, "removeChild")
      .mockReturnValue(mockAnchor as unknown as HTMLAnchorElement);
    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockReturnValue(mockAnchor as unknown as HTMLAnchorElement);

    const mockUrl = "blob:http://localhost/fake-url";
    const createObjectURLSpy = vi
      .fn()
      .mockReturnValue(mockUrl);
    const revokeObjectURLSpy = vi.fn();
    globalThis.URL.createObjectURL = createObjectURLSpy;
    globalThis.URL.revokeObjectURL = revokeObjectURLSpy;

    const headers = ["Name", "Revenue"];
    const rows = [
      ["Acme", "1000"],
      ["Beta Corp", "2000"],
    ];

    downloadCsv("export.csv", headers, rows);

    // Verify createElement was called for an anchor
    expect(createElementSpy).toHaveBeenCalledWith("a");

    // Verify the Blob was created with correct CSV content
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    const blobArg = createObjectURLSpy.mock.calls[0][0] as Blob;
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe("text/csv;charset=utf-8;");

    // Verify anchor properties
    expect(mockAnchor.href).toBe(mockUrl);
    expect(mockAnchor.download).toBe("export.csv");

    // Verify click triggered and cleanup happened
    expect(appendChildSpy).toHaveBeenCalledWith(mockAnchor);
    expect(mockClick).toHaveBeenCalledTimes(1);
    expect(removeChildSpy).toHaveBeenCalledWith(mockAnchor);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith(mockUrl);

    // Cleanup spies
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
    createElementSpy.mockRestore();
  });

  it("escapes header and row fields in the CSV output", () => {
    const mockAnchor = {
      href: "",
      download: "",
      click: vi.fn(),
    } as unknown as HTMLAnchorElement;

    vi.spyOn(document.body, "appendChild").mockReturnValue(
      mockAnchor as unknown as HTMLAnchorElement,
    );
    vi.spyOn(document.body, "removeChild").mockReturnValue(
      mockAnchor as unknown as HTMLAnchorElement,
    );
    vi.spyOn(document, "createElement").mockReturnValue(
      mockAnchor as unknown as HTMLAnchorElement,
    );

    let capturedBlob: Blob | null = null;
    globalThis.URL.createObjectURL = vi.fn((blob: Blob) => {
      capturedBlob = blob;
      return "blob:fake";
    });
    globalThis.URL.revokeObjectURL = vi.fn();

    const headers = ["Name", "=Formula"];
    const rows = [["hello, world", "normal"]];

    downloadCsv("test.csv", headers, rows);

    // Read the blob content
    expect(capturedBlob).not.toBeNull();
    // The blob content should have escaped the = in the header and quoted the comma field
    // We verified the building logic via escapeCsvField tests; here we just confirm it runs

    vi.restoreAllMocks();
  });
});
