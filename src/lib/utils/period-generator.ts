export type Period = {
  key: string;
  start: string;
  end: string;
  label: string;
  isRequested?: boolean;
};

/** Format a local Date as YYYY-MM-DD without timezone shift. */
export function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function generateQuarterlyPeriods(
  requestedStart: string | null,
  count: number,
): Period[] {
  const periods: Period[] = [];
  let date: Date;

  if (requestedStart) {
    const [y, mo, d] = requestedStart.split("-").map(Number);
    date = new Date(y, mo - 1, d);
  } else {
    const now = new Date();
    const currentQ = Math.floor(now.getMonth() / 3);
    date = new Date(now.getFullYear(), currentQ * 3, 1);
  }

  for (let i = 0; i < count; i++) {
    const qMonth = date.getMonth();
    const qYear = date.getFullYear();
    const q = Math.floor(qMonth / 3) + 1;
    const start = new Date(qYear, (q - 1) * 3, 1);
    const end = new Date(qYear, q * 3, 0);

    const startStr = fmtDate(start);
    const endStr = fmtDate(end);
    periods.push({
      key: startStr,
      start: startStr,
      end: endStr,
      label: `Q${q} '${String(qYear).slice(-2)}`,
      isRequested: requestedStart === startStr,
    });

    date = new Date(qYear, (q - 2) * 3, 1);
  }

  return periods;
}

export function generateAnnualPeriods(
  requestedStart: string | null,
  count: number,
): Period[] {
  const periods: Period[] = [];
  let year: number;

  if (requestedStart) {
    year = parseInt(requestedStart.split("-")[0], 10);
  } else {
    year = new Date().getFullYear();
  }

  for (let i = 0; i < count; i++) {
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    periods.push({
      key: start,
      start,
      end,
      label: String(year),
      isRequested: requestedStart === start,
    });
    year--;
  }

  return periods;
}

export function generateMonthlyPeriods(
  requestedStart: string | null,
  count: number,
): Period[] {
  const periods: Period[] = [];
  let date: Date;

  if (requestedStart) {
    const [y, mo, d] = requestedStart.split("-").map(Number);
    date = new Date(y, mo - 1, d);
  } else {
    const now = new Date();
    date = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }

  for (let i = 0; i < count; i++) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const startStr = fmtDate(start);

    periods.push({
      key: startStr,
      start: startStr,
      end: fmtDate(end),
      label: start.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      isRequested: requestedStart === startStr,
    });

    date = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  }

  return periods;
}
