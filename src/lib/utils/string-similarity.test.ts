import { similarity } from "./string-similarity";

describe("similarity", () => {
  it("returns 1 for identical strings", () => {
    expect(similarity("Acme", "Acme")).toBe(1);
  });

  it("returns 1 when strings differ only by stripped suffix (LLC vs Corp)", () => {
    // "Acme LLC" normalizes to "acme", "Acme Corp" normalizes to "acme"
    expect(similarity("Acme LLC", "Acme Corp")).toBe(1);
  });

  it("is case insensitive", () => {
    expect(similarity("ACME", "acme")).toBe(1);
  });

  it("returns high score when one contains the other (containment)", () => {
    // "Acme Inc" normalizes to "acme", "Acme" normalizes to "acme" → exact match
    expect(similarity("Acme Inc", "Acme")).toBe(1);
  });

  it("returns containment ratio for partial containment", () => {
    // "DataFlow" → "dataflow" (8 chars), "Data" → "data" (4 chars)
    // "dataflow" includes "data" → 4/8 = 0.5
    const score = similarity("DataFlow", "Data");
    expect(score).toBeCloseTo(4 / 8, 2);
  });

  it("returns 0 for empty string", () => {
    expect(similarity("", "Acme")).toBe(0);
    expect(similarity("Acme", "")).toBe(0);
  });

  it("returns 0 for both empty strings", () => {
    expect(similarity("", "")).toBe(0);
  });

  it("returns close to 0 for completely different strings", () => {
    const score = similarity("xyz", "Quantum");
    expect(score).toBeLessThan(0.2);
  });

  it("strips common suffixes for better matching", () => {
    // "Acme Inc" normalizes to "acme" (inc stripped)
    // "Acme Ltd" normalizes to "acme" (ltd stripped)
    // Both become "acme" → exact match = 1
    const score = similarity("Acme Inc", "Acme Ltd");
    expect(score).toBe(1);
  });

  it("uses Dice coefficient for non-containment strings", () => {
    // "alpha" and "alpho" — not containment since neither contains the other
    // bigrams: al, lp, ph, ha vs al, lp, ph, ho → overlap 3
    // score = 2*3 / (4+4) = 0.75
    const score = similarity("alpha", "alpho");
    expect(score).toBeCloseTo(0.75, 2);
  });
});
