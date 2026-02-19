import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSignInWithPassword = vi.fn();

vi.mock("@/lib/supabase/route-handler", () => ({
  createSupabaseRouteHandlerClient: vi.fn(() => ({
    supabase: {
      auth: { signInWithPassword: mockSignInWithPassword },
    },
    response: { headers: new Headers() },
  })),
}));

vi.mock("@/lib/api/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, retryAfter: 0 })),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

// Import after mocks so module-level code picks them up
import { POST } from "./route";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3001/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, retryAfter: 0 });
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, retryAfter: 30 });

    const res = await POST(makeRequest({ email: "a@b.com", password: "12345678" }));
    expect(res.status).toBe(429);

    const body = await res.json();
    expect(body.error).toMatch(/too many requests/i);
    expect(res.headers.get("Retry-After")).toBe("30");
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(makeRequest({ password: "12345678" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid/i);
  });

  it("returns 400 when password is missing", async () => {
    const res = await POST(makeRequest({ email: "user@example.com" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid/i);
  });

  it("returns 400 when password is too short", async () => {
    const res = await POST(makeRequest({ email: "user@example.com", password: "short" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid/i);
  });

  it("returns 400 when body is not valid JSON", async () => {
    const req = new NextRequest("http://localhost:3001/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 401 when signInWithPassword returns an error", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    });

    const res = await POST(makeRequest({ email: "user@example.com", password: "wrongpassword" }));
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toMatch(/invalid email or password/i);
  });

  it("returns 200 on successful login", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: "u1" }, session: { access_token: "tok" } },
      error: null,
    });

    const res = await POST(makeRequest({ email: "user@example.com", password: "validpass123" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "validpass123",
    });
  });
});
