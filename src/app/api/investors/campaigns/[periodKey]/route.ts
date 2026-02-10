import { NextResponse } from "next/server";
import { getApiUser, jsonError } from "@/lib/api/auth";

type RawRequest = {
  id: string;
  status: string;
  due_date: string | null;
  updated_at: string | null;
  company_id: string;
  companies:
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null;
  metric_definitions:
    | { name: string }
    | { name: string }[]
    | null;
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ periodKey: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { periodKey } = await params;

  // Parse periodKey: "2025-10-01_2025-12-31"
  const parts = periodKey.split("_");
  if (parts.length !== 2) {
    return jsonError("Invalid period key format. Expected: YYYY-MM-DD_YYYY-MM-DD", 400);
  }

  const [periodStart, periodEnd] = parts;

  // Validate date formats
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStart) || !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) {
    return jsonError("Invalid date format in period key.", 400);
  }

  // Fetch requests for this period
  const { data: rawRequests, error } = await supabase
    .from("metric_requests")
    .select(
      `
      id,
      status,
      due_date,
      updated_at,
      company_id,
      companies (id, name),
      metric_definitions (name)
    `,
    )
    .eq("investor_id", user.id)
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd);

  if (error) {
    return jsonError("Failed to fetch campaign details.", 500);
  }

  const requests = (rawRequests ?? []) as RawRequest[];

  // Get logo URLs for companies from investor_company_relationships
  const companyIds = [...new Set(requests.map((r) => r.company_id))];
  const logoMap = new Map<string, string | null>();

  if (companyIds.length > 0) {
    const { data: rels } = await supabase
      .from("investor_company_relationships")
      .select("company_id, logo_url")
      .eq("investor_id", user.id)
      .in("company_id", companyIds);

    if (rels) {
      for (const rel of rels) {
        logoMap.set(rel.company_id, rel.logo_url);
      }
    }
  }

  // Group by company
  type CompanyBucket = {
    companyId: string;
    companyName: string;
    logoUrl: string | null;
    totalMetrics: number;
    submittedMetrics: number;
    lastSubmittedAt: string | null;
    dueDate: string | null;
    pendingRequestIds: string[];
    metrics: { name: string; status: string }[];
  };

  const companyMap = new Map<string, CompanyBucket>();

  for (const r of requests) {
    const companyRaw = r.companies;
    const company = Array.isArray(companyRaw) ? companyRaw[0] : companyRaw;
    if (!company) continue;

    const defRaw = r.metric_definitions;
    const def = Array.isArray(defRaw) ? defRaw[0] : defRaw;
    const metricName = def?.name ?? "Unknown metric";

    let bucket = companyMap.get(company.id);
    if (!bucket) {
      bucket = {
        companyId: company.id,
        companyName: company.name,
        logoUrl: logoMap.get(company.id) ?? null,
        totalMetrics: 0,
        submittedMetrics: 0,
        lastSubmittedAt: null,
        dueDate: null,
        pendingRequestIds: [],
        metrics: [],
      };
      companyMap.set(company.id, bucket);
    }

    bucket.totalMetrics++;
    bucket.metrics.push({ name: metricName, status: r.status });

    if (r.status === "submitted") {
      bucket.submittedMetrics++;
      if (
        r.updated_at &&
        (!bucket.lastSubmittedAt || r.updated_at > bucket.lastSubmittedAt)
      ) {
        bucket.lastSubmittedAt = r.updated_at;
      }
    } else {
      bucket.pendingRequestIds.push(r.id);
      if (r.due_date) {
        if (!bucket.dueDate || r.due_date < bucket.dueDate) {
          bucket.dueDate = r.due_date;
        }
      }
    }
  }

  // Build response
  const now = new Date();
  const companies = Array.from(companyMap.values()).map((b) => {
    const completionPercent =
      b.totalMetrics > 0
        ? Math.round((b.submittedMetrics / b.totalMetrics) * 100)
        : 0;

    let status: "submitted" | "pending" | "overdue" = "pending";
    if (completionPercent === 100) {
      status = "submitted";
    } else if (b.dueDate && new Date(b.dueDate) < now) {
      status = "overdue";
    }

    return {
      companyId: b.companyId,
      companyName: b.companyName,
      logoUrl: b.logoUrl,
      totalMetrics: b.totalMetrics,
      submittedMetrics: b.submittedMetrics,
      completionPercent,
      status,
      lastSubmittedAt: b.lastSubmittedAt,
      dueDate: b.dueDate,
      pendingRequestIds: b.pendingRequestIds,
      metrics: b.metrics,
    };
  });

  // Sort: overdue first, then pending, then submitted
  const statusOrder = { overdue: 0, pending: 1, submitted: 2 };
  companies.sort(
    (a, b) => statusOrder[a.status] - statusOrder[b.status],
  );

  return NextResponse.json({ companies });
}
