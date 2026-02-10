import { describe, it, expect } from "vitest";
import { parsePagination } from "./pagination";

function makeURL(params: Record<string, string> = {}): URL {
  const url = new URL("http://localhost:3001/api/test");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url;
}

describe("parsePagination", () => {
  it("returns defaults when no params provided", () => {
    const result = parsePagination(makeURL());
    expect(result).toEqual({ limit: 50, offset: 0 });
  });

  it("parses valid limit and offset", () => {
    const result = parsePagination(makeURL({ limit: "25", offset: "10" }));
    expect(result).toEqual({ limit: 25, offset: 10 });
  });

  it("caps limit at 100", () => {
    const result = parsePagination(makeURL({ limit: "500" }));
    expect(result.limit).toBe(100);
  });

  it("ignores negative limit", () => {
    const result = parsePagination(makeURL({ limit: "-5" }));
    expect(result.limit).toBe(50);
  });

  it("ignores zero limit", () => {
    const result = parsePagination(makeURL({ limit: "0" }));
    expect(result.limit).toBe(50);
  });

  it("ignores negative offset", () => {
    const result = parsePagination(makeURL({ offset: "-1" }));
    expect(result.offset).toBe(0);
  });

  it("allows zero offset", () => {
    const result = parsePagination(makeURL({ offset: "0" }));
    expect(result.offset).toBe(0);
  });

  it("ignores non-numeric values", () => {
    const result = parsePagination(makeURL({ limit: "abc", offset: "xyz" }));
    expect(result).toEqual({ limit: 50, offset: 0 });
  });

  it("ignores NaN values", () => {
    const result = parsePagination(makeURL({ limit: "NaN" }));
    expect(result.limit).toBe(50);
  });

  it("ignores Infinity", () => {
    const result = parsePagination(makeURL({ limit: "Infinity" }));
    expect(result.limit).toBe(50);
  });
});
