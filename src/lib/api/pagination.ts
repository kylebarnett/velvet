const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export function parsePagination(url: URL) {
  const rawLimit = parseInt(url.searchParams.get("limit") ?? "", 10);
  const rawOffset = parseInt(url.searchParams.get("offset") ?? "", 10);

  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(rawLimit, MAX_LIMIT)
    : DEFAULT_LIMIT;

  const offset = Number.isFinite(rawOffset) && rawOffset >= 0
    ? rawOffset
    : 0;

  return { limit, offset };
}
