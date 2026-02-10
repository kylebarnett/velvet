import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit, getClientIp } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    // Reset time mocking between tests
    vi.useRealTimers();
  });

  it("allows first request", () => {
    const result = checkRateLimit("test-first", 5, 60_000);
    expect(result.allowed).toBe(true);
  });

  it("allows requests within limit", () => {
    const key = "test-within-limit";
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(key, 5, 60_000);
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks requests exceeding limit", () => {
    const key = "test-exceed";
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, 5, 60_000);
    }
    const result = checkRateLimit(key, 5, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("resets after window expires", () => {
    vi.useFakeTimers();
    const key = "test-reset";

    // Use up all attempts
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, 5, 1_000);
    }
    expect(checkRateLimit(key, 5, 1_000).allowed).toBe(false);

    // Advance past the window
    vi.advanceTimersByTime(1_100);

    expect(checkRateLimit(key, 5, 1_000).allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("extracts IP from x-real-ip", () => {
    const req = new Request("http://localhost", {
      headers: { "x-real-ip": "10.0.0.1" },
    });
    expect(getClientIp(req)).toBe("10.0.0.1");
  });

  it("returns 'unknown' when no IP headers", () => {
    const req = new Request("http://localhost");
    expect(getClientIp(req)).toBe("unknown");
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    const req = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "1.1.1.1",
        "x-real-ip": "2.2.2.2",
      },
    });
    expect(getClientIp(req)).toBe("1.1.1.1");
  });
});
