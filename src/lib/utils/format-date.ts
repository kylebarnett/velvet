import { format, parseISO, formatDistanceToNow } from "date-fns";

/**
 * Format a period range as human-readable text.
 * quarterly: "Q1 2024" | monthly: "Jan 2024" | annual: "2024"
 * fallback: "Jan 1 – Mar 31, 2024"
 */
export function formatPeriodRange(
  start: string,
  end: string,
  periodType?: string,
): string {
  const startDate = parseISO(start);

  if (periodType === "quarterly") {
    // Use UTC to avoid timezone shifts on date-only strings
    const quarter = Math.ceil((startDate.getUTCMonth() + 1) / 3);
    return `Q${quarter} ${startDate.getUTCFullYear()}`;
  }

  if (periodType === "monthly") {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthNames[startDate.getUTCMonth()]} ${startDate.getUTCFullYear()}`;
  }

  if (periodType === "annual" || periodType === "yearly") {
    return String(startDate.getUTCFullYear());
  }

  // Fallback: full range
  const endDate = parseISO(end);
  if (startDate.getUTCFullYear() === endDate.getUTCFullYear()) {
    return `${format(startDate, "MMM d")} – ${format(endDate, "MMM d, yyyy")}`;
  }
  return `${format(startDate, "MMM d, yyyy")} – ${format(endDate, "MMM d, yyyy")}`;
}

/**
 * Format an ISO date string as "Jan 15, 2024"
 */
export function formatDate(iso: string): string {
  return format(parseISO(iso), "MMM d, yyyy");
}

/**
 * Format an ISO date string as relative time: "3 days ago", "2 weeks ago"
 */
export function formatRelativeDate(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true });
}
