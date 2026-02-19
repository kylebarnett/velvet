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
let mockSelectChain: ReturnType<typeof createChain>;
let mockUpdateChain: ReturnType<typeof createChain>;

vi.mock("@/lib/api/auth", () => ({
  getApiUser: vi.fn(async () => ({
    supabase: {
      from: vi.fn((table: string) => {
        // Both GET and PUT call supabase.from("users")
        // GET calls .select(...).eq().single()
        // PUT calls .select(...).eq().single() then .update(...).eq()
        // We return different chains based on whether select or update is expected
        return {
          select: vi.fn().mockReturnValue(mockSelectChain),
          update: vi.fn().mockReturnValue(mockUpdateChain),
        };
      }),
    },
    user: mockUser,
  })),
  jsonError: vi.fn((message: string, status: number) => {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ error: message }, { status });
  }),
}));

import { GET, PUT } from "./route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGetRequest(queryString = "") {
  return new Request(`http://localhost:3001/api/user/preferences${queryString}`);
}

function makePutRequest(body: unknown) {
  return new Request("http://localhost:3001/api/user/preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// GET Tests
// ---------------------------------------------------------------------------

describe("GET /api/user/preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockSelectChain = createChain(null, null);
    mockUpdateChain = createChain(null, null);
  });

  it("returns 401 when unauthenticated", async () => {
    mockUser = null;
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/unauthorized/i);
  });

  it("returns 200 with all preferences", async () => {
    mockUser = { id: "u1", user_metadata: { role: "investor" } };
    const prefs = { theme: "dark", metric_order: ["revenue", "mrr"] };
    mockSelectChain = createChain({ preferences: prefs }, null);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.preferences).toEqual(prefs);
  });

  it("returns 200 with single key value when ?key=X is provided", async () => {
    mockUser = { id: "u1", user_metadata: { role: "investor" } };
    const prefs = { theme: "dark", sidebar_collapsed: true };
    mockSelectChain = createChain({ preferences: prefs }, null);

    const res = await GET(makeGetRequest("?key=theme"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.value).toBe("dark");
  });

  it("returns null for a key that does not exist", async () => {
    mockUser = { id: "u1", user_metadata: { role: "investor" } };
    mockSelectChain = createChain({ preferences: { theme: "dark" } }, null);

    const res = await GET(makeGetRequest("?key=nonexistent"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.value).toBeNull();
  });

  it("returns empty object when user has no preferences", async () => {
    mockUser = { id: "u1", user_metadata: { role: "founder" } };
    mockSelectChain = createChain({ preferences: null }, null);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.preferences).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// PUT Tests
// ---------------------------------------------------------------------------

describe("PUT /api/user/preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockSelectChain = createChain(null, null);
    mockUpdateChain = createChain(null, null);
  });

  it("returns 401 when unauthenticated", async () => {
    mockUser = null;
    const res = await PUT(makePutRequest({ key: "theme", value: "light" }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/unauthorized/i);
  });

  it("returns 400 for invalid body (not JSON)", async () => {
    mockUser = { id: "u1", user_metadata: { role: "investor" } };
    const req = new Request("http://localhost:3001/api/user/preferences", {
      method: "PUT",
      body: "not json",
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid json/i);
  });

  it("returns 400 when neither key nor preferences is provided", async () => {
    mockUser = { id: "u1", user_metadata: { role: "investor" } };
    // Current prefs fetch succeeds
    mockSelectChain = createChain({ preferences: {} }, null);

    const res = await PUT(makePutRequest({ foo: "bar" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/must provide/i);
  });

  it("returns 200 for single key update", async () => {
    mockUser = { id: "u1", user_metadata: { role: "investor" } };
    mockSelectChain = createChain({ preferences: { theme: "dark" } }, null);
    mockUpdateChain = createChain(null, null);

    const res = await PUT(makePutRequest({ key: "theme", value: "light" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.preferences.theme).toBe("light");
  });

  it("returns 200 for bulk preferences update", async () => {
    mockUser = { id: "u1", user_metadata: { role: "investor" } };
    mockSelectChain = createChain({ preferences: { theme: "dark" } }, null);
    mockUpdateChain = createChain(null, null);

    const res = await PUT(
      makePutRequest({
        preferences: { sidebar_collapsed: true, metric_display: "chart" },
      }),
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    // Merged with existing
    expect(body.preferences).toEqual({
      theme: "dark",
      sidebar_collapsed: true,
      metric_display: "chart",
    });
  });

  it("returns 200 and deletes key when value is null", async () => {
    mockUser = { id: "u1", user_metadata: { role: "investor" } };
    mockSelectChain = createChain(
      { preferences: { theme: "dark", sidebar_collapsed: true } },
      null,
    );
    mockUpdateChain = createChain(null, null);

    const res = await PUT(makePutRequest({ key: "sidebar_collapsed", value: null }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    // sidebar_collapsed should be removed
    expect(body.preferences).toEqual({ theme: "dark" });
    expect(body.preferences).not.toHaveProperty("sidebar_collapsed");
  });
});
