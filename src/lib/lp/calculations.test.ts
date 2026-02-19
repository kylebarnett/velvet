import { describe, it, expect } from "vitest";
import {
  calculateTVPI,
  calculateDPI,
  calculateRVPI,
  calculateMOIC,
  calculateIRR,
  type Investment,
  type CashFlow,
} from "./calculations";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function inv(
  invested_amount: number,
  current_value: number,
  realized_value: number,
): Investment {
  return { invested_amount, current_value, realized_value };
}

function cf(dateStr: string, amount: number): CashFlow {
  return { date: new Date(dateStr), amount };
}

// ---------------------------------------------------------------------------
// calculateTVPI
// ---------------------------------------------------------------------------

describe("calculateTVPI", () => {
  it("returns null for an empty array", () => {
    expect(calculateTVPI([])).toBeNull();
  });

  it("returns null when total invested is zero", () => {
    expect(calculateTVPI([inv(0, 100, 50)])).toBeNull();
  });

  it("calculates correctly for a single investment", () => {
    // (current_value + realized_value) / invested_amount = (150 + 50) / 100 = 2.0
    expect(calculateTVPI([inv(100, 150, 50)])).toBe(2.0);
  });

  it("calculates correctly for multiple investments", () => {
    const investments = [inv(100, 120, 30), inv(200, 250, 70)];
    // total invested: 300, total unrealized: 370, total realized: 100
    // (370 + 100) / 300 = 470 / 300 ≈ 1.5667
    expect(calculateTVPI(investments)).toBeCloseTo(470 / 300, 6);
  });

  it("returns a number type", () => {
    const result = calculateTVPI([inv(100, 150, 50)]);
    expect(typeof result).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// calculateDPI
// ---------------------------------------------------------------------------

describe("calculateDPI", () => {
  it("returns null for an empty array", () => {
    expect(calculateDPI([])).toBeNull();
  });

  it("returns null when total invested is zero", () => {
    expect(calculateDPI([inv(0, 100, 50)])).toBeNull();
  });

  it("calculates correctly for a single investment", () => {
    // realized / invested = 50 / 100 = 0.5
    expect(calculateDPI([inv(100, 150, 50)])).toBe(0.5);
  });

  it("calculates correctly for multiple investments", () => {
    const investments = [inv(100, 120, 30), inv(200, 250, 70)];
    // total realized: 100, total invested: 300 => 100/300 ≈ 0.3333
    expect(calculateDPI(investments)).toBeCloseTo(100 / 300, 6);
  });
});

// ---------------------------------------------------------------------------
// calculateRVPI
// ---------------------------------------------------------------------------

describe("calculateRVPI", () => {
  it("returns null for an empty array", () => {
    expect(calculateRVPI([])).toBeNull();
  });

  it("returns null when total invested is zero", () => {
    expect(calculateRVPI([inv(0, 100, 50)])).toBeNull();
  });

  it("calculates correctly for a single investment", () => {
    // current_value / invested = 150 / 100 = 1.5
    expect(calculateRVPI([inv(100, 150, 50)])).toBe(1.5);
  });

  it("calculates correctly for multiple investments", () => {
    const investments = [inv(100, 120, 30), inv(200, 250, 70)];
    // total unrealized: 370, total invested: 300 => 370/300 ≈ 1.2333
    expect(calculateRVPI(investments)).toBeCloseTo(370 / 300, 6);
  });
});

// ---------------------------------------------------------------------------
// calculateMOIC
// ---------------------------------------------------------------------------

describe("calculateMOIC", () => {
  it("returns null for an empty array", () => {
    expect(calculateMOIC([])).toBeNull();
  });

  it("returns null when total invested is zero", () => {
    expect(calculateMOIC([inv(0, 200, 100)])).toBeNull();
  });

  it("calculates correctly for a single investment", () => {
    // (current_value + realized_value) / invested = (150 + 50) / 100 = 2.0
    expect(calculateMOIC([inv(100, 150, 50)])).toBe(2.0);
  });

  it("calculates correctly for multiple investments", () => {
    const investments = [inv(100, 120, 30), inv(200, 250, 70)];
    // total value: (120+30)+(250+70) = 470, total invested: 300 => 470/300
    expect(calculateMOIC(investments)).toBeCloseTo(470 / 300, 6);
  });

  it("TVPI and MOIC are equal (they use the same formula)", () => {
    const investments = [inv(500, 300, 200)];
    expect(calculateTVPI(investments)).toBe(calculateMOIC(investments));
  });
});

// ---------------------------------------------------------------------------
// calculateIRR
// ---------------------------------------------------------------------------

describe("calculateIRR", () => {
  it("returns null for fewer than 2 cash flows", () => {
    expect(calculateIRR([])).toBeNull();
    expect(calculateIRR([cf("2023-01-01", -100)])).toBeNull();
  });

  it("returns null when all flows are negative (only outflows)", () => {
    expect(
      calculateIRR([cf("2023-01-01", -100), cf("2023-06-01", -50)]),
    ).toBeNull();
  });

  it("returns null when all flows are positive (only inflows)", () => {
    expect(
      calculateIRR([cf("2023-01-01", 100), cf("2023-06-01", 50)]),
    ).toBeNull();
  });

  it("calculates ~100% IRR for 2x return in 1 year", () => {
    const flows: CashFlow[] = [
      cf("2023-01-01", -1000),
      cf("2024-01-01", 2000),
    ];
    const irr = calculateIRR(flows);
    expect(irr).not.toBeNull();
    // ~100% annual return (2x in one year)
    expect(irr).toBeCloseTo(1.0, 1);
  });

  it("calculates ~0% IRR for break-even in 1 year", () => {
    const flows: CashFlow[] = [
      cf("2023-01-01", -1000),
      cf("2024-01-01", 1000),
    ];
    const irr = calculateIRR(flows);
    expect(irr).not.toBeNull();
    expect(irr).toBeCloseTo(0.0, 2);
  });

  it("calculates positive IRR for profitable multi-period investment", () => {
    const flows: CashFlow[] = [
      cf("2022-01-01", -1000),
      cf("2022-07-01", 200),
      cf("2023-01-01", 300),
      cf("2023-07-01", 400),
      cf("2024-01-01", 500),
    ];
    const irr = calculateIRR(flows);
    expect(irr).not.toBeNull();
    expect(irr!).toBeGreaterThan(0);
  });

  it("calculates negative IRR for a modest loss", () => {
    // Invest 1000, get back 800 after one year => ~-20% IRR
    const flows: CashFlow[] = [
      cf("2023-01-01", -1000),
      cf("2024-01-01", 800),
    ];
    const irr = calculateIRR(flows);
    expect(irr).not.toBeNull();
    expect(irr).toBeCloseTo(-0.2, 1);
  });

  it("returns a number when converging", () => {
    const flows: CashFlow[] = [
      cf("2023-01-01", -100),
      cf("2024-01-01", 150),
    ];
    const result = calculateIRR(flows);
    expect(typeof result).toBe("number");
  });

  it("handles unsorted cash flows by sorting them internally", () => {
    const flows: CashFlow[] = [
      cf("2024-01-01", 2000),
      cf("2023-01-01", -1000),
    ];
    const irr = calculateIRR(flows);
    expect(irr).not.toBeNull();
    expect(irr).toBeCloseTo(1.0, 1);
  });
});
