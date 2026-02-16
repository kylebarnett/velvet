/** Map quarter to period_start and period_end date strings. */
export function getQuarterDates(
  quarter: string,
  year: number,
): { periodStart: string; periodEnd: string } | null {
  switch (quarter) {
    case "Q1":
      return { periodStart: `${year}-01-01`, periodEnd: `${year}-03-31` };
    case "Q2":
      return { periodStart: `${year}-04-01`, periodEnd: `${year}-06-30` };
    case "Q3":
      return { periodStart: `${year}-07-01`, periodEnd: `${year}-09-30` };
    case "Q4":
      return { periodStart: `${year}-10-01`, periodEnd: `${year}-12-31` };
    default:
      return null;
  }
}

/** Get the previous quarter and year. */
export function getPreviousQuarter(
  quarter: string,
  year: number,
): { quarter: string; year: number } | null {
  switch (quarter) {
    case "Q1":
      return { quarter: "Q4", year: year - 1 };
    case "Q2":
      return { quarter: "Q1", year };
    case "Q3":
      return { quarter: "Q2", year };
    case "Q4":
      return { quarter: "Q3", year };
    default:
      return null;
  }
}

/** Get the most recently completed quarter and year. */
export function getDefaultQuarter(): { quarter: string; year: number } {
  const now = new Date();
  const currentQ = Math.floor(now.getMonth() / 3) + 1;
  if (currentQ === 1) {
    return { quarter: "Q4", year: now.getFullYear() - 1 };
  }
  return { quarter: `Q${currentQ - 1}`, year: now.getFullYear() };
}
