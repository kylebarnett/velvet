/**
 * Safely unwrap a Supabase join result which may be an object, an array, or null.
 * Supabase typed joins sometimes return `T | T[]` depending on the query shape.
 */
export function unwrapJoin<T>(data: T | T[] | null | undefined): T | null {
  if (data == null) return null;
  return Array.isArray(data) ? data[0] ?? null : data;
}
