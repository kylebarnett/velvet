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
let mockSupabaseChain: ReturnType<typeof createChain>;
let mockAdminChain: ReturnType<typeof createChain>;
let mockAdminExistingChain: ReturnType<typeof createChain>;

vi.mock("@/lib/api/auth", () => ({
  getApiUser: vi.fn(async () => ({
    supabase: {
      from: vi.fn((table: string) => {
        // The route calls supabase.from("companies") then supabase.from("company_metric_values")
        return mockSupabaseChain;
      }),
    },
    user: mockUser,
  })),
  jsonError: vi.fn((message: string, status: number) => {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ error: message }, { status });
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "company_metric_values") return mockAdminExistingChain;
      if (table === "metric_value_history") return mockAdminChain;
      return mockAdminChain;
    }),
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
import { getApiUser } from "@/lib/api/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_BODY = {
  companyId: "550e8400-e29b-41d4-a716-446655440000",
  metricName: "Revenue",
  periodType: "monthly" as const,
  periodStart: "2026-01-01",
  periodEnd: "2026-01-31",
  value: "150000",
};

function makeRequest(body: unknown) {
  return new Request("http://localhost:3001/api/metrics/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/metrics/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockSupabaseChain = createChain();
    mockAdminChain = createChain();
    mockAdminExistingChain = createChain(null, null);
  });

  // --- Validation ---

  it("returns 400 for missing required fields", async () => {
    mockUser = { id: "u1", user_metadata: { role: "founder" }, app_metadata: { role: "founder" } };
    const res = await POST(makeRequest({ metricName: "Revenue" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid/i);
  });

  it("returns 400 for non-numeric value", async () => {
    mockUser = { id: "u1", user_metadata: { role: "founder" }, app_metadata: { role: "founder" } };
    const res = await POST(makeRequest({ ...VALID_BODY, value: "not-a-number" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is not JSON", async () => {
    mockUser = { id: "u1", user_metadata: { role: "founder" }, app_metadata: { role: "founder" } };
    const req = new Request("http://localhost:3001/api/metrics/submit", {
      method: "POST",
      body: "bad",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // --- Auth ---

  it("returns 401 when unauthenticated", async () => {
    mockUser = null;
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/unauthorized/i);
  });

  it("returns 403 when user is not a founder", async () => {
    mockUser = { id: "u1", user_metadata: { role: "investor" }, app_metadata: { role: "investor" } };
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/forbidden/i);
  });

  // --- Ownership ---

  it("returns 403 when company is not owned by the founder", async () => {
    mockUser = { id: "u1", user_metadata: { role: "founder" }, app_metadata: { role: "founder" } };

    // supabase.from("companies").select().eq().eq().single() → null
    mockSupabaseChain = createChain(null, null);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/not authorized/i);
  });

  // --- Successful submission ---

  it("returns 200 on successful metric submission (new metric)", async () => {
    mockUser = { id: "u1", user_metadata: { role: "founder" }, app_metadata: { role: "founder" } };

    // Company ownership check: success
    const companyChain = createChain({ id: VALID_BODY.companyId }, null);
    // Upsert chain: success
    const upsertChain = createChain({ id: "mv-1" }, null);

    // Track which table is called
    const fromFn = vi.fn((table: string) => {
      if (table === "companies") return companyChain;
      return upsertChain;
    });

    vi.mocked(getApiUser).mockResolvedValue({
      supabase: { from: fromFn } as any,
      user: mockUser,
    });

    // Admin: existing check → null (new metric, no history)
    mockAdminExistingChain = createChain(null, null);
    mockAdminChain = createChain(null, null);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe("mv-1");

    // Verify upsert was called
    expect(upsertChain.upsert).toHaveBeenCalled();
    const upsertArgs = upsertChain.upsert.mock.calls[0];
    expect(upsertArgs[0]).toMatchObject({
      company_id: VALID_BODY.companyId,
      metric_name: "Revenue",
      value: { raw: "150000" },
    });
  });

  it("returns 200 and creates history entry when updating an existing metric", async () => {
    mockUser = { id: "u1", user_metadata: { role: "founder" }, app_metadata: { role: "founder" } };

    const companyChain = createChain({ id: VALID_BODY.companyId }, null);
    const upsertChain = createChain({ id: "mv-1" }, null);

    const fromFn = vi.fn((table: string) => {
      if (table === "companies") return companyChain;
      return upsertChain;
    });

    vi.mocked(getApiUser).mockResolvedValue({
      supabase: { from: fromFn } as any,
      user: mockUser,
    });

    // Admin: existing metric found
    mockAdminExistingChain = createChain(
      { id: "mv-1", value: { raw: "100000" }, source: "manual" },
      null,
    );

    const historyChain = createChain(null, null);
    const adminFromFn = vi.fn((table: string) => {
      if (table === "company_metric_values") return mockAdminExistingChain;
      return historyChain;
    });

    const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createSupabaseAdminClient).mockReturnValue({ from: adminFromFn } as any);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);

    // Verify history insert was called
    expect(historyChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        metric_value_id: "mv-1",
        previous_value: { raw: "100000" },
        new_value: { raw: "150000" },
        changed_by: "u1",
      }),
    );
  });
});
