/**
 * Canonical numeric value extraction from metric values.
 *
 * DB stores JSONB as { raw: "123456" } (founder/historical submissions)
 * or { value: 123456 } (some legacy paths). This function handles both
 * formats, plain numbers, and plain strings.
 *
 * Strips non-numeric characters (currency symbols, commas, etc.) before
 * parsing so values like "$1,234.56" are handled gracefully.
 */
export function getNumericValue(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;

  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    // Handle { raw: "123456" } — primary DB format
    const raw = obj.raw;
    if (typeof raw === "number") return raw;
    if (typeof raw === "string") {
      const parsed = parseFloat(raw.replace(/[^0-9.\-]/g, ""));
      return isNaN(parsed) ? null : parsed;
    }
    // Handle { value: 123456 } — legacy format
    const v = obj.value;
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const parsed = parseFloat(v.replace(/[^0-9.\-]/g, ""));
      return isNaN(parsed) ? null : parsed;
    }
  }

  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(/[^0-9.\-]/g, ""));
    return isNaN(parsed) ? null : parsed;
  }

  return null;
}

/**
 * Extract numeric value and return as string.
 * Used by tear sheet routes that build JSON responses with string values.
 */
export function getNumericValueAsString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "number") return value.toString();
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    // Handle { raw: "..." } — primary DB format
    const raw = obj.raw;
    if (typeof raw === "string") return raw;
    if (typeof raw === "number") return raw.toString();
    // Handle { value: ... } — legacy format
    const v = obj.value;
    if (typeof v === "number") return v.toString();
    if (typeof v === "string") return v;
  }
  return null;
}
