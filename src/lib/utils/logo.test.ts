import { describe, it, expect } from "vitest";
import { getCompanyLogoUrl } from "./logo";

describe("getCompanyLogoUrl", () => {
  it("returns URL when provided", () => {
    expect(getCompanyLogoUrl("https://example.com/logo.png")).toBe(
      "https://example.com/logo.png"
    );
  });

  it("returns null for null input", () => {
    expect(getCompanyLogoUrl(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(getCompanyLogoUrl(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getCompanyLogoUrl("")).toBeNull();
  });
});
