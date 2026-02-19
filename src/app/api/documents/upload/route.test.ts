import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock chain helper
// ---------------------------------------------------------------------------

function createChain(resolvedData: unknown = null, resolvedError: unknown = null) {
  const chain: Record<string, any> = {};
  const methods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "in", "or", "ilike",
    "order", "range", "single", "maybeSingle",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = vi.fn((resolve: any) => resolve({ data: resolvedData, error: resolvedError }));
  return chain;
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let mockUser: any = null;
let mockCompanyChain: ReturnType<typeof createChain>;

vi.mock("@/lib/api/auth", () => ({
  getApiUser: vi.fn(async () => ({
    supabase: {
      from: vi.fn(() => mockCompanyChain),
    },
    user: mockUser,
  })),
  jsonError: vi.fn((message: string, status: number, headers?: Record<string, string>) => {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ error: message }, { status, headers });
  }),
}));

vi.mock("@/lib/api/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, retryAfter: 0 })),
}));

const mockStorageUpload = vi.fn();
const mockStorageFrom = vi.fn(() => ({
  upload: mockStorageUpload,
}));
const mockListBuckets = vi.fn();
const mockCreateBucket = vi.fn();
let mockAdminDocChain: ReturnType<typeof createChain>;

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    storage: {
      listBuckets: mockListBuckets,
      createBucket: mockCreateBucket,
      from: mockStorageFrom,
    },
    from: vi.fn(() => mockAdminDocChain),
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { POST } from "./route";
import { checkRateLimit } from "@/lib/api/rate-limit";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_COMPANY_ID = "550e8400-e29b-41d4-a716-446655440000";

/**
 * Build a Request whose .formData() resolves to the given FormData
 * synchronously — works around jsdom's inability to parse multipart bodies.
 */
function makeUploadRequest(overrides?: {
  file?: File | null;
  companyId?: string | null;
  documentType?: string | null;
  omitFile?: boolean;
  omitCompanyId?: boolean;
  omitDocumentType?: boolean;
}) {
  const form = new FormData();

  if (!overrides?.omitFile) {
    const file =
      overrides?.file ??
      new File(["test content"], "test.pdf", { type: "application/pdf" });
    form.append("file", file);
  }

  if (!overrides?.omitCompanyId) {
    form.append("companyId", overrides?.companyId ?? VALID_COMPANY_ID);
  }

  if (!overrides?.omitDocumentType) {
    form.append("documentType", overrides?.documentType ?? "income_statement");
  }

  // Build a plain Request and monkey-patch formData() so it resolves
  // immediately — the jsdom multipart parser can hang otherwise.
  const req = new Request("http://localhost:3001/api/documents/upload", {
    method: "POST",
  });
  (req as any).formData = () => Promise.resolve(form);
  return req;
}

/**
 * Return a Request whose .formData() rejects — simulates invalid/corrupt body.
 */
function makeBadFormDataRequest() {
  const req = new Request("http://localhost:3001/api/documents/upload", {
    method: "POST",
  });
  (req as any).formData = () => Promise.reject(new Error("bad form data"));
  return req;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/documents/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockCompanyChain = createChain(null, null);
    mockAdminDocChain = createChain({ id: "doc-1" }, null);
    mockListBuckets.mockResolvedValue({ data: [{ name: "documents" }] });
    mockStorageUpload.mockResolvedValue({ error: null });
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, retryAfter: 0 });
  });

  // --- Auth ---

  it("returns 401 when unauthenticated", async () => {
    mockUser = null;
    const res = await POST(makeUploadRequest());
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/unauthorized/i);
  });

  it("returns 403 when user is not a founder", async () => {
    mockUser = { id: "u1", user_metadata: { role: "investor" }, app_metadata: { role: "investor" } };
    const res = await POST(makeUploadRequest());
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/forbidden/i);
  });

  // --- Rate limiting ---

  it("returns 429 when rate limited", async () => {
    mockUser = { id: "u1", user_metadata: { role: "founder" }, app_metadata: { role: "founder" } };
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, retryAfter: 45 });

    const res = await POST(makeUploadRequest());
    expect(res.status).toBe(429);
    expect((await res.json()).error).toMatch(/too many requests/i);
    expect(res.headers.get("Retry-After")).toBe("45");
  });

  // --- Invalid form data ---

  it("returns 400 for invalid form data (corrupt body)", async () => {
    mockUser = { id: "u1", user_metadata: { role: "founder" }, app_metadata: { role: "founder" } };
    const res = await POST(makeBadFormDataRequest());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid form data/i);
  });

  it("returns 400 when file is missing", async () => {
    mockUser = { id: "u1", user_metadata: { role: "founder" }, app_metadata: { role: "founder" } };
    const res = await POST(makeUploadRequest({ omitFile: true }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/missing file/i);
  });

  // --- MIME type validation ---

  it("returns 400 for SVG file (unsupported MIME type)", async () => {
    mockUser = { id: "u1", user_metadata: { role: "founder" }, app_metadata: { role: "founder" } };
    const svgFile = new File(["<svg></svg>"], "logo.svg", { type: "image/svg+xml" });
    const res = await POST(makeUploadRequest({ file: svgFile }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/unsupported file type/i);
  });

  it("returns 400 for unsupported MIME type (text/html)", async () => {
    mockUser = { id: "u1", user_metadata: { role: "founder" }, app_metadata: { role: "founder" } };
    const htmlFile = new File(["<html></html>"], "page.html", { type: "text/html" });
    const res = await POST(makeUploadRequest({ file: htmlFile }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/unsupported file type/i);
  });

  // --- File size ---

  it("returns 400 when file exceeds 50MB", async () => {
    mockUser = { id: "u1", user_metadata: { role: "founder" }, app_metadata: { role: "founder" } };
    // Create a File stub that reports a large size
    const bigFile = new File(["x"], "big.pdf", { type: "application/pdf" });
    Object.defineProperty(bigFile, "size", { value: 51 * 1024 * 1024 });

    const res = await POST(makeUploadRequest({ file: bigFile }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/file too large/i);
  });

  // --- companyId validation ---

  it("returns 400 when companyId is missing", async () => {
    mockUser = { id: "u1", user_metadata: { role: "founder" }, app_metadata: { role: "founder" } };
    const res = await POST(makeUploadRequest({ omitCompanyId: true }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/missing companyId/i);
  });

  it("returns 400 for invalid companyId UUID format", async () => {
    mockUser = { id: "u1", user_metadata: { role: "founder" }, app_metadata: { role: "founder" } };
    const res = await POST(makeUploadRequest({ companyId: "not-a-uuid" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid companyId format/i);
  });

  // --- documentType validation ---

  it("returns 400 when documentType is missing", async () => {
    mockUser = { id: "u1", user_metadata: { role: "founder" }, app_metadata: { role: "founder" } };
    const res = await POST(makeUploadRequest({ omitDocumentType: true }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/missing documentType/i);
  });

  it("returns 400 for invalid documentType", async () => {
    mockUser = { id: "u1", user_metadata: { role: "founder" }, app_metadata: { role: "founder" } };
    const res = await POST(makeUploadRequest({ documentType: "invalid_type" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid documentType/i);
  });

  // --- Ownership ---

  it("returns 403 when company is not owned by the founder", async () => {
    mockUser = { id: "u1", user_metadata: { role: "founder" }, app_metadata: { role: "founder" } };
    // Company lookup returns null
    mockCompanyChain = createChain(null, null);

    const res = await POST(makeUploadRequest());
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/not authorized/i);
  });

  // --- Successful upload ---

  it("returns 200 on successful upload", async () => {
    mockUser = { id: "u1", user_metadata: { role: "founder" }, app_metadata: { role: "founder" } };

    // Company ownership check succeeds
    mockCompanyChain = createChain({ id: VALID_COMPANY_ID }, null);

    // Admin: bucket exists, upload succeeds, doc insert succeeds
    mockListBuckets.mockResolvedValue({ data: [{ name: "documents" }] });
    mockStorageUpload.mockResolvedValue({ error: null });
    mockAdminDocChain = createChain({ id: "doc-123" }, null);

    const res = await POST(makeUploadRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.id).toBe("doc-123");

    // Verify storage upload was called
    expect(mockStorageFrom).toHaveBeenCalledWith("documents");
    expect(mockStorageUpload).toHaveBeenCalled();

    // Verify document record was inserted
    expect(mockAdminDocChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: VALID_COMPANY_ID,
        uploaded_by: "u1",
        file_name: "test.pdf",
        document_type: "income_statement",
        ingestion_status: "pending",
      }),
    );
  });

  it("creates bucket if it does not exist", async () => {
    mockUser = { id: "u1", user_metadata: { role: "founder" }, app_metadata: { role: "founder" } };
    mockCompanyChain = createChain({ id: VALID_COMPANY_ID }, null);
    mockListBuckets.mockResolvedValue({ data: [] }); // No buckets
    mockStorageUpload.mockResolvedValue({ error: null });
    mockAdminDocChain = createChain({ id: "doc-456" }, null);

    const res = await POST(makeUploadRequest());
    expect(res.status).toBe(200);
    expect(mockCreateBucket).toHaveBeenCalledWith("documents", { public: false });
  });

  it("sanitizes filename in storage path", async () => {
    mockUser = { id: "u1", user_metadata: { role: "founder" }, app_metadata: { role: "founder" } };
    mockCompanyChain = createChain({ id: VALID_COMPANY_ID }, null);
    mockListBuckets.mockResolvedValue({ data: [{ name: "documents" }] });
    mockStorageUpload.mockResolvedValue({ error: null });
    mockAdminDocChain = createChain({ id: "doc-789" }, null);

    const unsafeFile = new File(["content"], "my report (2026).pdf", { type: "application/pdf" });
    const res = await POST(makeUploadRequest({ file: unsafeFile }));
    expect(res.status).toBe(200);

    // The file name should have spaces and parens replaced with underscores
    expect(mockAdminDocChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        file_name: "my_report__2026_.pdf",
      }),
    );
  });
});
