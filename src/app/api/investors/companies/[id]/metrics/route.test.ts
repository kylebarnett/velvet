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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockFromFn: any;

vi.mock("@/lib/api/auth", () => ({
  getApiUser: vi.fn(async () => ({
    supabase: {
      from: (...args: any[]) => mockFromFn(...args),
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

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { GET, POST } from "./route";
import { checkRateLimit } from "@/lib/api/rate-limit";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COMPANY_ID = "550e8400-e29b-41d4-a716-446655440000";

function makeGetRequest() {
  return new Request(`http://localhost:3001/api/investors/companies/${COMPANY_ID}/metrics`);
}

function makePostRequest(body: unknown) {
  return new Request(`http://localhost:3001/api/investors/companies/${COMPANY_ID}/metrics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeParams(id = COMPANY_ID) {
  return { params: Promise.resolve({ id }) };
}

// ---------------------------------------------------------------------------
// GET Tests
// ---------------------------------------------------------------------------

describe("GET /api/investors/companies/[id]/metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockFromFn = vi.fn();
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, retryAfter: 0 });
  });

  it("returns 401 when unauthenticated", async () => {
    mockUser = null;
    const res = await GET(makeGetRequest(), makeParams());
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/unauthorized/i);
  });

  it("returns 403 for non-investor role", async () => {
    mockUser = { id: "u1", user_metadata: { role: "founder" } };
    const res = await GET(makeGetRequest(), makeParams());
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/investors only/i);
  });

  it("returns 403 when company is not in portfolio", async () => {
    mockUser = { id: "u1", user_metadata: { role: "investor" } };

    // Relationship check returns null
    const relChain = createChain(null, null);
    mockFromFn.mockReturnValue(relChain);

    const res = await GET(makeGetRequest(), makeParams());
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/not in portfolio/i);
  });

  it("returns 403 when approval status is pending", async () => {
    mockUser = { id: "u1", user_metadata: { role: "investor" } };

    const relChain = createChain({ id: "rel-1", approval_status: "pending" }, null);
    mockFromFn.mockReturnValue(relChain);

    const res = await GET(makeGetRequest(), makeParams());
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/pending approval/i);
  });

  it("returns 403 when approval status is denied", async () => {
    mockUser = { id: "u1", user_metadata: { role: "investor" } };

    const relChain = createChain({ id: "rel-1", approval_status: "denied" }, null);
    mockFromFn.mockReturnValue(relChain);

    const res = await GET(makeGetRequest(), makeParams());
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/pending approval/i);
  });

  it("returns 200 with merged metrics (founder + investor gap fill)", async () => {
    mockUser = { id: "u1", user_metadata: { role: "investor" } };

    const founderMetrics = [
      {
        id: "fm-1",
        metric_name: "Revenue",
        period_type: "monthly",
        period_start: "2026-01-01",
        period_end: "2026-01-31",
        value: { raw: "100000" },
        notes: null,
        source: "manual",
        source_upload_id: null,
        submitted_at: "2026-01-15",
        updated_at: "2026-01-15",
      },
    ];

    const investorMetrics = [
      {
        id: "im-1",
        metric_name: "Revenue",
        period_type: "monthly",
        period_start: "2026-01-01",
        period_end: "2026-01-31",
        value: { raw: "95000" },
        notes: null,
        source: "manual",
        source_upload_id: null,
        submitted_at: "2026-01-10",
        updated_at: "2026-01-10",
      },
      {
        id: "im-2",
        metric_name: "Revenue",
        period_type: "monthly",
        period_start: "2025-12-01",
        period_end: "2025-12-31",
        value: { raw: "90000" },
        notes: null,
        source: "manual",
        source_upload_id: null,
        submitted_at: "2026-01-05",
        updated_at: "2026-01-05",
      },
    ];

    // Relationship check: approved
    const relChain = createChain({ id: "rel-1", approval_status: "approved" }, null);

    // Founder metrics chain
    const founderChain = createChain(founderMetrics, null);

    // Investor metrics chain
    const investorChain = createChain(investorMetrics, null);

    let callIndex = 0;
    mockFromFn.mockImplementation((table: string) => {
      if (table === "investor_company_relationships") return relChain;
      if (table === "company_metric_values") return founderChain;
      if (table === "investor_metric_values") return investorChain;
      return createChain();
    });

    const res = await GET(makeGetRequest(), makeParams());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.companyId).toBe(COMPANY_ID);
    expect(body.metrics).toBeDefined();
    expect(Array.isArray(body.metrics)).toBe(true);

    // Should have 2 metrics: 1 founder (Jan) + 1 investor gap fill (Dec)
    // The investor Jan metric should be excluded (founder has it)
    expect(body.metrics).toHaveLength(2);

    // Founder metric tagged as "founder"
    const founderItem = body.metrics.find((m: any) => m.data_source === "founder");
    expect(founderItem).toBeDefined();
    expect(founderItem.metric_name).toBe("Revenue");
    expect(founderItem.period_start).toBe("2026-01-01");

    // Investor gap-fill tagged as "investor_historical"
    const investorItem = body.metrics.find((m: any) => m.data_source === "investor_historical");
    expect(investorItem).toBeDefined();
    expect(investorItem.period_start).toBe("2025-12-01");
  });

  it("returns 200 with auto_approved relationship", async () => {
    mockUser = { id: "u1", user_metadata: { role: "investor" } };

    const relChain = createChain({ id: "rel-1", approval_status: "auto_approved" }, null);
    const founderChain = createChain([], null);
    const investorChain = createChain([], null);

    mockFromFn.mockImplementation((table: string) => {
      if (table === "investor_company_relationships") return relChain;
      if (table === "company_metric_values") return founderChain;
      if (table === "investor_metric_values") return investorChain;
      return createChain();
    });

    const res = await GET(makeGetRequest(), makeParams());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.metrics).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// POST Tests
// ---------------------------------------------------------------------------

describe("POST /api/investors/companies/[id]/metrics", () => {
  const VALID_BODY = {
    metrics: [
      {
        metric_name: "Revenue",
        value: "150000",
        period_type: "monthly" as const,
        period_start: "2026-01-01",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockFromFn = vi.fn();
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, retryAfter: 0 });
  });

  it("returns 401 when unauthenticated", async () => {
    mockUser = null;
    const res = await POST(makePostRequest(VALID_BODY), makeParams());
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/unauthorized/i);
  });

  it("returns 403 for non-investor role", async () => {
    mockUser = { id: "u1", user_metadata: { role: "founder" } };
    const res = await POST(makePostRequest(VALID_BODY), makeParams());
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/investors only/i);
  });

  it("returns 429 when rate limited", async () => {
    mockUser = { id: "u1", user_metadata: { role: "investor" } };
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, retryAfter: 20 });

    const res = await POST(makePostRequest(VALID_BODY), makeParams());
    expect(res.status).toBe(429);
    expect((await res.json()).error).toMatch(/too many requests/i);
  });

  it("returns 403 when company is not in portfolio", async () => {
    mockUser = { id: "u1", user_metadata: { role: "investor" } };

    // Relationship check: not found
    const relChain = createChain(null, null);
    mockFromFn.mockReturnValue(relChain);

    const res = await POST(makePostRequest(VALID_BODY), makeParams());
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/not in portfolio/i);
  });

  it("returns 400 for invalid body (empty metrics array)", async () => {
    mockUser = { id: "u1", user_metadata: { role: "investor" } };

    // Relationship check passes
    const relChain = createChain({ id: "rel-1" }, null);
    mockFromFn.mockReturnValue(relChain);

    const res = await POST(makePostRequest({ metrics: [] }), makeParams());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid/i);
  });

  it("returns 400 for invalid body (missing metric_name)", async () => {
    mockUser = { id: "u1", user_metadata: { role: "investor" } };

    const relChain = createChain({ id: "rel-1" }, null);
    mockFromFn.mockReturnValue(relChain);

    const res = await POST(
      makePostRequest({
        metrics: [{ value: "100", period_type: "monthly", period_start: "2026-01-01" }],
      }),
      makeParams(),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid period_start format", async () => {
    mockUser = { id: "u1", user_metadata: { role: "investor" } };

    const relChain = createChain({ id: "rel-1" }, null);
    mockFromFn.mockReturnValue(relChain);

    const res = await POST(
      makePostRequest({
        metrics: [{
          metric_name: "Revenue",
          value: "100",
          period_type: "monthly",
          period_start: "Jan 2026", // Invalid format
        }],
      }),
      makeParams(),
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 on successful metric submission", async () => {
    mockUser = { id: "u1", user_metadata: { role: "investor" } };

    const relChain = createChain({ id: "rel-1" }, null);
    const upsertChain = createChain(null, null);

    mockFromFn.mockImplementation((table: string) => {
      if (table === "investor_company_relationships") return relChain;
      if (table === "investor_metric_values") return upsertChain;
      return createChain();
    });

    const res = await POST(makePostRequest(VALID_BODY), makeParams());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.count).toBe(1);

    // Verify upsert was called with the correct structure
    expect(upsertChain.upsert).toHaveBeenCalled();
    const upsertArgs = upsertChain.upsert.mock.calls[0];
    const rows = upsertArgs[0];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      investor_id: "u1",
      company_id: COMPANY_ID,
      metric_name: "Revenue",
      period_type: "monthly",
      period_start: "2026-01-01",
      value: { raw: "150000" },
      source: "manual",
    });
    // period_end should be computed
    expect(rows[0].period_end).toBe("2026-01-31");
  });

  it("computes period_end correctly for quarterly", async () => {
    mockUser = { id: "u1", user_metadata: { role: "investor" } };

    const relChain = createChain({ id: "rel-1" }, null);
    const upsertChain = createChain(null, null);

    mockFromFn.mockImplementation((table: string) => {
      if (table === "investor_company_relationships") return relChain;
      if (table === "investor_metric_values") return upsertChain;
      return createChain();
    });

    const quarterlyBody = {
      metrics: [
        {
          metric_name: "Revenue",
          value: "500000",
          period_type: "quarterly" as const,
          period_start: "2026-01-01",
        },
      ],
    };

    const res = await POST(makePostRequest(quarterlyBody), makeParams());
    expect(res.status).toBe(200);

    const rows = upsertChain.upsert.mock.calls[0][0];
    expect(rows[0].period_end).toBe("2026-03-31");
  });

  it("handles multiple metrics in a single request", async () => {
    mockUser = { id: "u1", user_metadata: { role: "investor" } };

    const relChain = createChain({ id: "rel-1" }, null);
    const upsertChain = createChain(null, null);

    mockFromFn.mockImplementation((table: string) => {
      if (table === "investor_company_relationships") return relChain;
      if (table === "investor_metric_values") return upsertChain;
      return createChain();
    });

    const multiBody = {
      metrics: [
        { metric_name: "Revenue", value: "100", period_type: "monthly", period_start: "2026-01-01" },
        { metric_name: "Burn Rate", value: "50000", period_type: "monthly", period_start: "2026-01-01" },
      ],
    };

    const res = await POST(makePostRequest(multiBody), makeParams());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.count).toBe(2);
  });
});
