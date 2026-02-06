/**
 * LP Reporting financial calculations.
 *
 * All functions handle edge cases (zero invested, empty arrays) and
 * return `null` for invalid inputs.
 */

export type Investment = {
  invested_amount: number;
  current_value: number;
  realized_value: number;
};

export type CashFlow = {
  date: Date;
  amount: number; // negative = outflow, positive = inflow
};

/* ------------------------------------------------------------------ */
/*  TVPI — Total Value to Paid-In                                      */
/* ------------------------------------------------------------------ */

export function calculateTVPI(investments: Investment[]): number | null {
  if (investments.length === 0) return null;

  let totalInvested = 0;
  let totalUnrealized = 0;
  let totalRealized = 0;

  for (const inv of investments) {
    totalInvested += inv.invested_amount;
    totalUnrealized += inv.current_value;
    totalRealized += inv.realized_value;
  }

  if (totalInvested === 0) return null;

  return (totalUnrealized + totalRealized) / totalInvested;
}

/* ------------------------------------------------------------------ */
/*  DPI — Distributions to Paid-In                                     */
/* ------------------------------------------------------------------ */

export function calculateDPI(investments: Investment[]): number | null {
  if (investments.length === 0) return null;

  let totalInvested = 0;
  let totalRealized = 0;

  for (const inv of investments) {
    totalInvested += inv.invested_amount;
    totalRealized += inv.realized_value;
  }

  if (totalInvested === 0) return null;

  return totalRealized / totalInvested;
}

/* ------------------------------------------------------------------ */
/*  RVPI — Residual Value to Paid-In                                   */
/* ------------------------------------------------------------------ */

export function calculateRVPI(investments: Investment[]): number | null {
  if (investments.length === 0) return null;

  let totalInvested = 0;
  let totalUnrealized = 0;

  for (const inv of investments) {
    totalInvested += inv.invested_amount;
    totalUnrealized += inv.current_value;
  }

  if (totalInvested === 0) return null;

  return totalUnrealized / totalInvested;
}

/* ------------------------------------------------------------------ */
/*  MOIC — Multiple on Invested Capital                                */
/* ------------------------------------------------------------------ */

export function calculateMOIC(investments: Investment[]): number | null {
  if (investments.length === 0) return null;

  let totalInvested = 0;
  let totalValue = 0;

  for (const inv of investments) {
    totalInvested += inv.invested_amount;
    totalValue += inv.current_value + inv.realized_value;
  }

  if (totalInvested === 0) return null;

  return totalValue / totalInvested;
}

/* ------------------------------------------------------------------ */
/*  IRR — Internal Rate of Return (Newton-Raphson)                     */
/* ------------------------------------------------------------------ */

/**
 * Calculates IRR using Newton-Raphson on dated cash flows.
 *
 * Cash flows: negative amounts are outflows (investments), positive are
 * inflows (distributions / current value).
 *
 * Max 100 iterations with 1e-8 tolerance.
 */
export function calculateIRR(cashFlows: CashFlow[]): number | null {
  if (cashFlows.length < 2) return null;

  // Need at least one negative and one positive cash flow
  const hasNegative = cashFlows.some((cf) => cf.amount < 0);
  const hasPositive = cashFlows.some((cf) => cf.amount > 0);
  if (!hasNegative || !hasPositive) return null;

  // Sort by date
  const sorted = [...cashFlows].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  const firstDate = sorted[0].date.getTime();
  const DAYS_PER_YEAR = 365.25;

  // Calculate year fractions from first cash flow
  const yearFractions = sorted.map(
    (cf) => (cf.date.getTime() - firstDate) / (DAYS_PER_YEAR * 86400000),
  );

  // NPV function: sum of cf / (1 + r)^t
  function npv(rate: number): number {
    let total = 0;
    for (let i = 0; i < sorted.length; i++) {
      const base = 1 + rate;
      if (base <= 0) return Infinity;
      total += sorted[i].amount / Math.pow(base, yearFractions[i]);
    }
    return total;
  }

  // Derivative of NPV with respect to rate
  function npvDerivative(rate: number): number {
    let total = 0;
    for (let i = 0; i < sorted.length; i++) {
      const base = 1 + rate;
      if (base <= 0) return Infinity;
      total +=
        -yearFractions[i] * sorted[i].amount / Math.pow(base, yearFractions[i] + 1);
    }
    return total;
  }

  // Newton-Raphson iteration
  let rate = 0.1; // initial guess 10%
  const MAX_ITERATIONS = 100;
  const TOLERANCE = 1e-8;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const f = npv(rate);
    const fPrime = npvDerivative(rate);

    if (Math.abs(fPrime) < 1e-14) {
      // Derivative too small, try a different starting point
      rate = rate + 0.1;
      continue;
    }

    const newRate = rate - f / fPrime;

    if (Math.abs(newRate - rate) < TOLERANCE) {
      // Sanity check: IRR should be between -100% and 10000%
      if (newRate < -1 || newRate > 100) return null;
      return newRate;
    }

    rate = newRate;

    // Guard against divergence
    if (!isFinite(rate) || isNaN(rate)) return null;
  }

  // Did not converge
  return null;
}
