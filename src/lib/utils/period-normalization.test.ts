import {
  normalizePeriod,
  normalizeMetricPeriods,
  isPeriodAligned,
  getPeriodKey,
} from "./period-normalization";

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

describe("normalizePeriod", () => {
  describe("quarterly", () => {
    it("snaps mid-quarter date to quarter start", () => {
      const result = normalizePeriod("2024-02-15", null, "quarterly");
      expect(result).not.toBeNull();
      expect(result!.period_start).toBe("2024-01-01");
      expect(result!.period_end).toBe("2024-03-31");
      expect(result!.label).toBe("Q1 2024");
      expect(result!.was_adjusted).toBe(true);
    });

    it("keeps already-aligned Q1 date unchanged", () => {
      const result = normalizePeriod("2024-01-01", "2024-03-31", "quarterly");
      expect(result).not.toBeNull();
      expect(result!.period_start).toBe("2024-01-01");
      expect(result!.period_end).toBe("2024-03-31");
      expect(result!.was_adjusted).toBe(false);
    });

    it("normalizes Q2 correctly", () => {
      const result = normalizePeriod("2024-05-20", null, "quarterly");
      expect(result!.period_start).toBe("2024-04-01");
      expect(result!.period_end).toBe("2024-06-30");
      expect(result!.label).toBe("Q2 2024");
    });

    it("normalizes Q3 correctly", () => {
      const result = normalizePeriod("2024-08-10", null, "quarterly");
      expect(result!.period_start).toBe("2024-07-01");
      expect(result!.period_end).toBe("2024-09-30");
      expect(result!.label).toBe("Q3 2024");
    });

    it("normalizes Q4 correctly", () => {
      const result = normalizePeriod("2024-10-01", null, "quarterly");
      expect(result!.period_start).toBe("2024-10-01");
      expect(result!.period_end).toBe("2024-12-31");
      expect(result!.label).toBe("Q4 2024");
      expect(result!.was_adjusted).toBe(false);
    });

    it("detects was_adjusted when period_end also changes", () => {
      const result = normalizePeriod("2024-01-01", "2024-04-01", "quarterly");
      expect(result!.was_adjusted).toBe(true);
      expect(result!.period_end).toBe("2024-03-31");
    });
  });

  describe("monthly", () => {
    it("snaps mid-month date to first of month", () => {
      const result = normalizePeriod("2024-06-15", null, "monthly");
      expect(result).not.toBeNull();
      expect(result!.period_start).toBe("2024-06-01");
      expect(result!.period_end).toBe("2024-06-30");
      expect(result!.label).toBe("Jun 2024");
      expect(result!.was_adjusted).toBe(true);
    });

    it("keeps aligned monthly date unchanged", () => {
      const result = normalizePeriod("2024-03-01", "2024-03-31", "monthly");
      expect(result!.period_start).toBe("2024-03-01");
      expect(result!.period_end).toBe("2024-03-31");
      expect(result!.was_adjusted).toBe(false);
    });

    it("handles February correctly (non-leap year)", () => {
      const result = normalizePeriod("2023-02-14", null, "monthly");
      expect(result!.period_start).toBe("2023-02-01");
      expect(result!.period_end).toBe("2023-02-28");
    });

    it("handles February correctly (leap year)", () => {
      const result = normalizePeriod("2024-02-14", null, "monthly");
      expect(result!.period_start).toBe("2024-02-01");
      expect(result!.period_end).toBe("2024-02-29");
    });

    it("generates correct label for December", () => {
      const result = normalizePeriod("2024-12-25", null, "monthly");
      expect(result!.label).toBe("Dec 2024");
    });
  });

  describe("annual", () => {
    it("snaps mid-year date to Jan 1", () => {
      const result = normalizePeriod("2024-07-15", null, "annual");
      expect(result).not.toBeNull();
      expect(result!.period_start).toBe("2024-01-01");
      expect(result!.period_end).toBe("2024-12-31");
      expect(result!.label).toBe("2024");
      expect(result!.was_adjusted).toBe(true);
    });

    it("keeps aligned annual date unchanged", () => {
      const result = normalizePeriod("2024-01-01", "2024-12-31", "annual");
      expect(result!.period_start).toBe("2024-01-01");
      expect(result!.period_end).toBe("2024-12-31");
      expect(result!.was_adjusted).toBe(false);
    });
  });

  describe("yearly (alias for annual)", () => {
    it("treats yearly as annual", () => {
      const result = normalizePeriod("2024-06-01", null, "yearly");
      expect(result).not.toBeNull();
      expect(result!.period_start).toBe("2024-01-01");
      expect(result!.period_end).toBe("2024-12-31");
      expect(result!.period_type).toBe("annual");
      expect(result!.label).toBe("2024");
    });
  });

  describe("invalid input", () => {
    it("returns null for invalid date string", () => {
      const result = normalizePeriod("not-a-date", null, "quarterly");
      expect(result).toBeNull();
    });

    it("returns null for empty string", () => {
      const result = normalizePeriod("", null, "monthly");
      expect(result).toBeNull();
    });
  });
});

describe("isPeriodAligned", () => {
  it("returns true for Jan 1 quarterly", () => {
    expect(isPeriodAligned("2024-01-01", "quarterly")).toBe(true);
  });

  it("returns true for Apr 1 quarterly", () => {
    expect(isPeriodAligned("2024-04-01", "quarterly")).toBe(true);
  });

  it("returns true for Jul 1 quarterly", () => {
    expect(isPeriodAligned("2024-07-01", "quarterly")).toBe(true);
  });

  it("returns true for Oct 1 quarterly", () => {
    expect(isPeriodAligned("2024-10-01", "quarterly")).toBe(true);
  });

  it("returns false for Feb 1 quarterly", () => {
    expect(isPeriodAligned("2024-02-01", "quarterly")).toBe(false);
  });

  it("returns false for mid-month quarterly", () => {
    expect(isPeriodAligned("2024-01-15", "quarterly")).toBe(false);
  });

  it("returns true for first of any month (monthly)", () => {
    expect(isPeriodAligned("2024-06-01", "monthly")).toBe(true);
  });

  it("returns false for non-first day (monthly)", () => {
    expect(isPeriodAligned("2024-06-15", "monthly")).toBe(false);
  });

  it("returns true for Jan 1 annual", () => {
    expect(isPeriodAligned("2024-01-01", "annual")).toBe(true);
  });

  it("returns false for non-Jan-1 annual", () => {
    expect(isPeriodAligned("2024-06-01", "annual")).toBe(false);
  });

  it("returns true for Jan 1 yearly", () => {
    expect(isPeriodAligned("2024-01-01", "yearly")).toBe(true);
  });

  it("returns false for invalid date", () => {
    expect(isPeriodAligned("invalid", "quarterly")).toBe(false);
  });
});

describe("getPeriodKey", () => {
  it("returns canonical key for quarterly", () => {
    expect(getPeriodKey("2024-02-15", "quarterly")).toBe(
      "quarterly:2024-01-01",
    );
  });

  it("returns canonical key for monthly", () => {
    expect(getPeriodKey("2024-06-15", "monthly")).toBe("monthly:2024-06-01");
  });

  it("returns canonical key for annual", () => {
    expect(getPeriodKey("2024-07-15", "annual")).toBe("annual:2024-01-01");
  });

  it("returns null for invalid date", () => {
    expect(getPeriodKey("bad-date", "quarterly")).toBeNull();
  });
});

describe("normalizeMetricPeriods", () => {
  it("normalizes a batch of metrics", () => {
    const metrics = [
      {
        id: "1",
        period_start: "2024-02-15",
        period_end: null,
        period_type: "quarterly",
      },
      {
        id: "2",
        period_start: "2024-06-01",
        period_end: "2024-06-30",
        period_type: "monthly",
      },
    ];

    const results = normalizeMetricPeriods(metrics);
    expect(results).toHaveLength(2);

    // First metric was adjusted
    expect(results[0].period_start).toBe("2024-01-01");
    expect(results[0].period_end).toBe("2024-03-31");
    expect(results[0].period_was_adjusted).toBe(true);
    expect(results[0].original_period_start).toBe("2024-02-15");

    // Second metric was already aligned
    expect(results[1].period_start).toBe("2024-06-01");
    expect(results[1].period_end).toBe("2024-06-30");
    expect(results[1].period_was_adjusted).toBe(false);
    expect(results[1].original_period_start).toBeUndefined();
  });

  it("preserves original fields on metrics", () => {
    const metrics = [
      {
        id: "abc",
        name: "Revenue",
        period_start: "2024-01-01",
        period_end: "2024-03-31",
        period_type: "quarterly",
      },
    ];

    const results = normalizeMetricPeriods(metrics);
    expect(results[0].id).toBe("abc");
    expect(results[0].name).toBe("Revenue");
  });

  it("handles invalid dates gracefully", () => {
    const metrics = [
      {
        id: "1",
        period_start: "invalid",
        period_end: null,
        period_type: "quarterly",
      },
    ];

    const results = normalizeMetricPeriods(metrics);
    expect(results).toHaveLength(1);
    expect(results[0].period_was_adjusted).toBe(false);
    // Original period_start is kept since normalization failed
    expect(results[0].period_start).toBe("invalid");
  });
});
