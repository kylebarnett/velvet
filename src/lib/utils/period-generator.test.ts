import {
  fmtDate,
  generateQuarterlyPeriods,
  generateAnnualPeriods,
  generateMonthlyPeriods,
} from "./period-generator";

describe("fmtDate", () => {
  it("formats a date as YYYY-MM-DD with zero-padded month and day", () => {
    expect(fmtDate(new Date(2024, 0, 5))).toBe("2024-01-05");
  });

  it("formats double-digit months and days correctly", () => {
    expect(fmtDate(new Date(2024, 11, 25))).toBe("2024-12-25");
  });

  it("formats single-digit month correctly", () => {
    expect(fmtDate(new Date(2023, 2, 1))).toBe("2023-03-01");
  });
});

describe("generateQuarterlyPeriods", () => {
  it("generates correct quarters going backward from Q3 2024", () => {
    const periods = generateQuarterlyPeriods("2024-07-01", 4);
    expect(periods).toHaveLength(4);

    // Q3 2024
    expect(periods[0].start).toBe("2024-07-01");
    expect(periods[0].end).toBe("2024-09-30");
    expect(periods[0].label).toBe("Q3 '24");
    expect(periods[0].isRequested).toBe(true);

    // Q2 2024
    expect(periods[1].start).toBe("2024-04-01");
    expect(periods[1].end).toBe("2024-06-30");
    expect(periods[1].label).toBe("Q2 '24");
    expect(periods[1].isRequested).toBe(false);

    // Q1 2024
    expect(periods[2].start).toBe("2024-01-01");
    expect(periods[2].end).toBe("2024-03-31");
    expect(periods[2].label).toBe("Q1 '24");

    // Q4 2023
    expect(periods[3].start).toBe("2023-10-01");
    expect(periods[3].end).toBe("2023-12-31");
    expect(periods[3].label).toBe("Q4 '23");
  });

  it("sets isRequested correctly only for matching period", () => {
    const periods = generateQuarterlyPeriods("2024-01-01", 2);
    expect(periods[0].isRequested).toBe(true);
    expect(periods[1].isRequested).toBe(false);
  });

  it("generates periods from current date when requestedStart is null", () => {
    const periods = generateQuarterlyPeriods(null, 3);
    expect(periods).toHaveLength(3);
    // All should have isRequested false since requestedStart is null
    periods.forEach((p) => {
      expect(p.isRequested).toBe(false);
    });
  });

  it("each period has a key matching its start date", () => {
    const periods = generateQuarterlyPeriods("2024-04-01", 2);
    periods.forEach((p) => {
      expect(p.key).toBe(p.start);
    });
  });
});

describe("generateAnnualPeriods", () => {
  it("generates correct years going backward", () => {
    const periods = generateAnnualPeriods("2024-01-01", 3);
    expect(periods).toHaveLength(3);

    expect(periods[0]).toEqual({
      key: "2024-01-01",
      start: "2024-01-01",
      end: "2024-12-31",
      label: "2024",
      isRequested: true,
    });

    expect(periods[1]).toEqual({
      key: "2023-01-01",
      start: "2023-01-01",
      end: "2023-12-31",
      label: "2023",
      isRequested: false,
    });

    expect(periods[2]).toEqual({
      key: "2022-01-01",
      start: "2022-01-01",
      end: "2022-12-31",
      label: "2022",
      isRequested: false,
    });
  });

  it("generates from current year when requestedStart is null", () => {
    const periods = generateAnnualPeriods(null, 2);
    expect(periods).toHaveLength(2);
    const currentYear = new Date().getFullYear();
    expect(periods[0].start).toBe(`${currentYear}-01-01`);
    expect(periods[1].start).toBe(`${currentYear - 1}-01-01`);
  });
});

describe("generateMonthlyPeriods", () => {
  it("generates correct months going backward", () => {
    const periods = generateMonthlyPeriods("2024-06-01", 3);
    expect(periods).toHaveLength(3);

    expect(periods[0].start).toBe("2024-06-01");
    expect(periods[0].end).toBe("2024-06-30");
    expect(periods[0].isRequested).toBe(true);

    expect(periods[1].start).toBe("2024-05-01");
    expect(periods[1].end).toBe("2024-05-31");

    expect(periods[2].start).toBe("2024-04-01");
    expect(periods[2].end).toBe("2024-04-30");
  });

  it("crosses year boundary correctly", () => {
    const periods = generateMonthlyPeriods("2024-01-01", 3);
    expect(periods[0].start).toBe("2024-01-01");
    expect(periods[1].start).toBe("2023-12-01");
    expect(periods[2].start).toBe("2023-11-01");
  });

  it("generates from current date when requestedStart is null", () => {
    const periods = generateMonthlyPeriods(null, 2);
    expect(periods).toHaveLength(2);
    periods.forEach((p) => {
      expect(p.isRequested).toBe(false);
    });
  });
});
