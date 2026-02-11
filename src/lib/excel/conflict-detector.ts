import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConflictInfo, UploadValueInsert } from "./types";

type ValueKey = string;

function makeKey(
  companyId: string,
  metricName: string,
  periodType: string,
  periodStart: string,
): ValueKey {
  return `${companyId}:${metricName.toLowerCase()}:${periodType}:${periodStart}`;
}

/**
 * Detect conflicts for founder uploads against company_metric_values.
 */
export async function detectFounderConflicts(
  supabase: SupabaseClient,
  values: UploadValueInsert[],
): Promise<Map<number, ConflictInfo>> {
  const conflicts = new Map<number, ConflictInfo>();

  // Group values by company_id for batch queries
  const byCompany = new Map<string, number[]>();
  for (let i = 0; i < values.length; i++) {
    const cid = values[i].company_id;
    if (!cid) continue;
    const existing = byCompany.get(cid) ?? [];
    existing.push(i);
    byCompany.set(cid, existing);
  }

  for (const [companyId, indices] of byCompany) {
    const metricNames = [...new Set(indices.map((i) => values[i].metric_name))];
    const periodStarts = [...new Set(indices.map((i) => values[i].period_start))];

    // Batch query: get all matching existing values for this company
    const { data: existing } = await supabase
      .from("company_metric_values")
      .select("metric_name, period_type, period_start, value, source, submitted_at")
      .eq("company_id", companyId)
      .in("metric_name", metricNames)
      .in("period_start", periodStarts);

    if (!existing || existing.length === 0) continue;

    // Build lookup map
    const existingMap = new Map<ValueKey, (typeof existing)[0]>();
    for (const e of existing) {
      const key = makeKey(companyId, e.metric_name, e.period_type, e.period_start);
      existingMap.set(key, e);
    }

    // Check each value
    for (const idx of indices) {
      const v = values[idx];
      const key = makeKey(companyId, v.metric_name, v.period_type, v.period_start);
      const match = existingMap.get(key);

      if (match) {
        const existingVal = match.value as Record<string, unknown> | null;
        conflicts.set(idx, {
          type: "existing_value",
          existingValue: {
            raw: String(existingVal?.raw ?? ""),
            unit: existingVal?.unit ? String(existingVal.unit) : undefined,
            source: match.source ?? undefined,
            submittedAt: match.submitted_at ?? undefined,
          },
        });
      }
    }
  }

  // Also detect duplicates within the upload itself
  const seen = new Map<ValueKey, number>();
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!v.company_id) continue;
    const key = makeKey(v.company_id, v.metric_name, v.period_type, v.period_start);
    const prev = seen.get(key);
    if (prev !== undefined) {
      // Keep the one with higher confidence, mark the other
      const prevConf = values[prev].ai_confidence;
      const currConf = v.ai_confidence;
      const lowerIdx = currConf >= prevConf ? prev : i;
      if (!conflicts.has(lowerIdx)) {
        conflicts.set(lowerIdx, {
          type: "duplicate_in_upload",
          duplicateValueId: values[lowerIdx === prev ? i : prev].upload_id,
        });
      }
    } else {
      seen.set(key, i);
    }
  }

  return conflicts;
}

/**
 * Detect conflicts for investor uploads against investor_metric_values.
 */
export async function detectInvestorConflicts(
  supabase: SupabaseClient,
  investorId: string,
  values: UploadValueInsert[],
): Promise<Map<number, ConflictInfo>> {
  const conflicts = new Map<number, ConflictInfo>();

  // Group values by company_id
  const byCompany = new Map<string, number[]>();
  for (let i = 0; i < values.length; i++) {
    const cid = values[i].company_id;
    if (!cid) continue;
    const existing = byCompany.get(cid) ?? [];
    existing.push(i);
    byCompany.set(cid, existing);
  }

  for (const [companyId, indices] of byCompany) {
    const metricNames = [...new Set(indices.map((i) => values[i].metric_name))];
    const periodStarts = [...new Set(indices.map((i) => values[i].period_start))];

    // Batch query against investor's own private data
    const { data: existing } = await supabase
      .from("investor_metric_values")
      .select("metric_name, period_type, period_start, value, source, submitted_at")
      .eq("investor_id", investorId)
      .eq("company_id", companyId)
      .in("metric_name", metricNames)
      .in("period_start", periodStarts);

    if (!existing || existing.length === 0) continue;

    const existingMap = new Map<ValueKey, (typeof existing)[0]>();
    for (const e of existing) {
      const key = makeKey(companyId, e.metric_name, e.period_type, e.period_start);
      existingMap.set(key, e);
    }

    for (const idx of indices) {
      const v = values[idx];
      const key = makeKey(companyId, v.metric_name, v.period_type, v.period_start);
      const match = existingMap.get(key);

      if (match) {
        const existingVal = match.value as Record<string, unknown> | null;
        conflicts.set(idx, {
          type: "existing_value",
          existingValue: {
            raw: String(existingVal?.raw ?? ""),
            unit: existingVal?.unit ? String(existingVal.unit) : undefined,
            source: match.source ?? undefined,
            submittedAt: match.submitted_at ?? undefined,
          },
        });
      }
    }
  }

  // Detect duplicates within upload
  const seen = new Map<ValueKey, number>();
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!v.company_id) continue;
    const key = makeKey(v.company_id, v.metric_name, v.period_type, v.period_start);
    const prev = seen.get(key);
    if (prev !== undefined) {
      const prevConf = values[prev].ai_confidence;
      const currConf = v.ai_confidence;
      const lowerIdx = currConf >= prevConf ? prev : i;
      if (!conflicts.has(lowerIdx)) {
        conflicts.set(lowerIdx, {
          type: "duplicate_in_upload",
        });
      }
    } else {
      seen.set(key, i);
    }
  }

  return conflicts;
}
