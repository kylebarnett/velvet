import { NextResponse } from "next/server";
import { getApiUser, jsonError } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { parsePagination } from "@/lib/api/pagination";
import { unwrapJoin } from "@/lib/api/utils";

type RawRequest = {
  id: string;
  period_start: string;
  period_end: string;
  status: string;
  due_date: string | null;
  company_id: string;
  schedule_id: string | null;
  companies:
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null;
  metric_definitions:
    | { period_type: string }
    | { period_type: string }[]
    | null;
  metric_request_schedules:
    | { name: string }
    | { name: string }[]
    | null;
};

function inferPeriodType(periodStart: string, periodEnd: string): string {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const days = Math.round(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days >= 360) return "annual";
  if (days >= 80) return "quarterly";
  return "monthly";
}

function buildPeriodLabel(
  periodStart: string,
  periodType: string,
): string {
  // Use UTC methods — date-only strings parse as midnight UTC.
  const start = new Date(periodStart);
  if (periodType === "quarterly") {
    const q = Math.floor(start.getUTCMonth() / 3) + 1;
    return `Q${q} ${start.getUTCFullYear()}`;
  }
  if (periodType === "monthly") {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthNames[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
  }
  return String(start.getUTCFullYear());
}

export async function GET(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  // Rate limit: 60 reads/min per user
  const { allowed, retryAfter } = checkRateLimit(`metric-requests-read:${user.id}`, 60, 60_000);
  if (!allowed) {
    return jsonError("Too many requests. Try again later.", 429, {
      "Retry-After": String(retryAfter),
    });
  }

  const url = new URL(req.url);
  const periodTypeFilter = url.searchParams.get("periodType");
  const statusFilter = url.searchParams.get("status");
  const { limit, offset } = parsePagination(url);

  // Fetch metric_requests for this investor with metric_definitions join.
  // Use count: "exact" so we know if there are more results beyond the page.
  // Campaign bucketing requires all requests, but we only need lightweight columns.
  const { data: rawRequests, error, count: totalRequestCount } = await supabase
    .from("metric_requests")
    .select(
      `
      id,
      period_start,
      period_end,
      status,
      due_date,
      company_id,
      schedule_id,
      companies (id, name),
      metric_definitions (period_type),
      metric_request_schedules:schedule_id (name)
    `,
      { count: "exact" },
    )
    .eq("investor_id", user.id)
    .order("period_start", { ascending: false });

  if (error) {
    return jsonError("Failed to fetch requests.", 500);
  }

  const requests = (rawRequests ?? []) as RawRequest[];

  // Group by (period_start, period_end) → campaign
  type CampaignBucket = {
    periodStart: string;
    periodEnd: string;
    periodType: string;
    requests: RawRequest[];
    companyIds: Set<string>;
    companiesSubmitted: Set<string>;
    companiesPending: Set<string>;
    scheduleNames: Set<string>;
  };

  const buckets = new Map<string, CampaignBucket>();

  for (const r of requests) {
    const key = `${r.period_start}_${r.period_end}`;
    let bucket = buckets.get(key);

    const def = unwrapJoin(r.metric_definitions);
    const periodType =
      def?.period_type || inferPeriodType(r.period_start, r.period_end);

    if (!bucket) {
      bucket = {
        periodStart: r.period_start,
        periodEnd: r.period_end,
        periodType,
        requests: [],
        companyIds: new Set(),
        companiesSubmitted: new Set(),
        companiesPending: new Set(),
        scheduleNames: new Set(),
      };
      buckets.set(key, bucket);
    }

    bucket.requests.push(r);
    bucket.companyIds.add(r.company_id);

    if (r.status === "submitted") {
      bucket.companiesSubmitted.add(r.company_id);
    } else {
      bucket.companiesPending.add(r.company_id);
    }

    // Track schedule name
    const sched = unwrapJoin(r.metric_request_schedules);
    if (sched?.name) {
      bucket.scheduleNames.add(sched.name);
    }
  }

  // Build campaign objects
  let campaigns = Array.from(buckets.values()).map((b) => {
    const totalRequests = b.requests.length;
    const submittedRequests = b.requests.filter(
      (r) => r.status === "submitted",
    ).length;
    const completionPercent =
      totalRequests > 0
        ? Math.round((submittedRequests / totalRequests) * 100)
        : 0;

    // Find earliest pending due_date
    const pendingDueDates = b.requests
      .filter((r) => r.status === "pending" && r.due_date)
      .map((r) => r.due_date!)
      .sort();
    const dueDate = pendingDueDates[0] ?? null;
    const isOverdue = dueDate ? new Date(dueDate) < new Date() : false;

    // Schedule name: only show if all requests come from same schedule
    const scheduleName =
      b.scheduleNames.size === 1
        ? Array.from(b.scheduleNames)[0]
        : null;

    // Response-rate fields: classify companies by engagement level
    const companiesResponded = b.companiesSubmitted.size;
    const companiesNotResponded = Array.from(b.companiesPending).filter(
      (id) => !b.companiesSubmitted.has(id),
    ).length;
    const companiesPartial = Array.from(b.companiesSubmitted).filter(
      (id) => b.companiesPending.has(id),
    ).length;
    const companiesFullyComplete = Array.from(b.companiesSubmitted).filter(
      (id) => !b.companiesPending.has(id),
    ).length;
    const companyCount = b.companyIds.size;
    const responseRate =
      companyCount > 0
        ? Math.round((companiesResponded / companyCount) * 100)
        : 0;

    return {
      periodStart: b.periodStart,
      periodEnd: b.periodEnd,
      periodLabel: buildPeriodLabel(b.periodStart, b.periodType),
      periodType: b.periodType,
      totalRequests,
      submittedRequests,
      completionPercent,
      companyCount,
      companiesResponded,
      companiesNotResponded,
      companiesPartial,
      companiesFullyComplete,
      responseRate,
      dueDate,
      isOverdue,
      scheduleName,
    };
  });

  // Apply filters
  if (periodTypeFilter) {
    campaigns = campaigns.filter((c) => c.periodType === periodTypeFilter);
  }

  if (statusFilter === "active") {
    campaigns = campaigns.filter((c) => c.completionPercent < 100);
  } else if (statusFilter === "completed") {
    campaigns = campaigns.filter((c) => c.completionPercent === 100);
  }

  // Sort by period_start descending (most recent first)
  campaigns.sort(
    (a, b) =>
      new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime(),
  );

  const total = campaigns.length;

  // Summary counts (before pagination, across ALL campaigns not just filtered)
  const allCampaigns = Array.from(buckets.values()).map((b) => {
    const totalReqs = b.requests.length;
    const submittedReqs = b.requests.filter(
      (r) => r.status === "submitted",
    ).length;
    const pct = totalReqs > 0 ? Math.round((submittedReqs / totalReqs) * 100) : 0;
    const pendingDueDates = b.requests
      .filter((r) => r.status === "pending" && r.due_date)
      .map((r) => r.due_date!)
      .sort();
    const dd = pendingDueDates[0] ?? null;
    const overdue = dd ? new Date(dd) < new Date() : false;

    const responded = b.companiesSubmitted.size;
    const count = b.companyIds.size;
    const rr = count > 0 ? Math.round((responded / count) * 100) : 0;

    return {
      periodStart: b.periodStart,
      periodEnd: b.periodEnd,
      periodLabel: buildPeriodLabel(b.periodStart, b.periodType),
      totalRequests: totalReqs,
      submittedRequests: submittedReqs,
      completionPercent: pct,
      responseRate: rr,
      companiesResponded: responded,
      companyCount: count,
      dueDate: dd,
      isOverdue: overdue,
    };
  });

  const activeCampaignsList = allCampaigns.filter((c) => c.completionPercent < 100);
  const activeCampaigns = activeCampaignsList.length;

  // Overall completion across active campaigns
  const totalActiveRequests = activeCampaignsList.reduce((s, c) => s + c.totalRequests, 0);
  const submittedActiveRequests = activeCampaignsList.reduce((s, c) => s + c.submittedRequests, 0);
  const overallCompletionPercent =
    totalActiveRequests > 0
      ? Math.round((submittedActiveRequests / totalActiveRequests) * 100)
      : 0;

  // Portfolio-level response rate across active campaigns (unique companies)
  const allActiveCompanyIds = new Set<string>();
  const allActiveRespondedIds = new Set<string>();
  const allActiveNotRespondedIds = new Set<string>();
  const allActivePartialIds = new Set<string>();
  for (const b of buckets.values()) {
    const totalReqs = b.requests.length;
    const submittedReqs = b.requests.filter((r) => r.status === "submitted").length;
    const pct = totalReqs > 0 ? Math.round((submittedReqs / totalReqs) * 100) : 0;
    if (pct >= 100) continue; // Only active campaigns
    for (const id of b.companyIds) allActiveCompanyIds.add(id);
    for (const id of b.companiesSubmitted) allActiveRespondedIds.add(id);
    for (const id of b.companiesPending) {
      if (!b.companiesSubmitted.has(id)) allActiveNotRespondedIds.add(id);
      else allActivePartialIds.add(id);
    }
  }
  const totalCompaniesActive = allActiveCompanyIds.size;
  const respondedCompaniesActive = allActiveRespondedIds.size;
  const portfolioResponseRate =
    totalCompaniesActive > 0
      ? Math.round((respondedCompaniesActive / totalCompaniesActive) * 100)
      : 0;
  const notRespondedCount = allActiveNotRespondedIds.size;
  const partialCount = allActivePartialIds.size;

  const overdueCampaigns = activeCampaignsList.filter((c) => c.isOverdue).length;

  // Urgent campaigns: overdue first, then closest due date, top 5
  const urgentCampaigns = [...activeCampaignsList]
    .sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    })
    .slice(0, 5)
    .map((c) => ({
      periodStart: c.periodStart,
      periodEnd: c.periodEnd,
      periodLabel: c.periodLabel,
      completionPercent: c.completionPercent,
      responseRate: c.responseRate,
      companiesResponded: c.companiesResponded,
      companyCount: c.companyCount,
      dueDate: c.dueDate,
      isOverdue: c.isOverdue,
    }));

  // Build awaiting companies map from pending requests
  const now = new Date();
  type AwaitingEntry = {
    name: string;
    pendingCount: number;
    submittedCount: number;
    totalCount: number;
    earliestDueDate: string | null;
    isOverdue: boolean;
  };
  const awaitingMap = new Map<string, AwaitingEntry>();

  // First pass: collect companies with pending requests
  for (const r of requests) {
    if (r.status !== "pending") continue;
    const companyRaw = r.companies;
    const company = Array.isArray(companyRaw) ? companyRaw[0] : companyRaw;
    const companyName = company?.name ?? "Unknown";

    let entry = awaitingMap.get(r.company_id);
    if (!entry) {
      entry = { name: companyName, pendingCount: 0, submittedCount: 0, totalCount: 0, earliestDueDate: null, isOverdue: false };
      awaitingMap.set(r.company_id, entry);
    }
    entry.pendingCount++;
    entry.totalCount++;
    if (r.due_date) {
      if (!entry.earliestDueDate || r.due_date < entry.earliestDueDate) {
        entry.earliestDueDate = r.due_date;
      }
      if (new Date(r.due_date) < now) {
        entry.isOverdue = true;
      }
    }
  }

  // Second pass: count submitted requests for awaiting companies
  for (const r of requests) {
    if (r.status !== "submitted") continue;
    const entry = awaitingMap.get(r.company_id);
    if (entry) {
      entry.submittedCount++;
      entry.totalCount++;
    }
  }

  const companiesAwaiting = awaitingMap.size;
  const overdueCompanyCount = Array.from(awaitingMap.values()).filter((c) => c.isOverdue).length;

  // Fetch logo URLs for awaiting companies
  const awaitingCompanyIds = Array.from(awaitingMap.keys());
  const logoMap = new Map<string, string | null>();

  if (awaitingCompanyIds.length > 0) {
    const { data: rels } = await supabase
      .from("investor_company_relationships")
      .select("company_id, logo_url")
      .eq("investor_id", user.id)
      .in("company_id", awaitingCompanyIds);

    if (rels) {
      for (const rel of rels) {
        logoMap.set(rel.company_id, rel.logo_url);
      }
    }
  }

  // Top 8 awaiting companies sorted by urgency (no response first, then partial)
  const awaitingCompanies = Array.from(awaitingMap.entries())
    .sort(([, a], [, b]) => {
      // No response companies first (more urgent)
      const aStatus = a.submittedCount === 0 ? 0 : 1;
      const bStatus = b.submittedCount === 0 ? 0 : 1;
      if (aStatus !== bStatus) return aStatus - bStatus;
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      if (a.earliestDueDate && b.earliestDueDate)
        return a.earliestDueDate.localeCompare(b.earliestDueDate);
      if (a.earliestDueDate) return -1;
      if (b.earliestDueDate) return 1;
      return 0;
    })
    .slice(0, 8)
    .map(([companyId, entry]) => ({
      companyId,
      companyName: entry.name,
      logoUrl: logoMap.get(companyId) ?? null,
      pendingCount: entry.pendingCount,
      submittedCount: entry.submittedCount,
      totalCount: entry.totalCount,
      responseStatus: (entry.submittedCount === 0 ? "not_responded" : "partial") as
        | "not_responded"
        | "partial",
      earliestDueDate: entry.earliestDueDate,
      isOverdue: entry.isOverdue,
    }));

  // Paginate
  const paginated = campaigns.slice(offset, offset + limit);

  return NextResponse.json({
    campaigns: paginated,
    total,
    totalRequests: totalRequestCount ?? 0,
    summary: {
      activeCampaigns,

      // Primary KPIs: response rate
      portfolioResponseRate,
      totalCompaniesActive,
      respondedCompaniesActive,
      notRespondedCount,
      partialCount,

      // Secondary: metric-level completion (demoted)
      overallCompletionPercent,
      totalActiveRequests,
      submittedActiveRequests,

      // Unchanged
      overdueCampaigns,
      overdueCompanyCount,
      companiesAwaiting,
      urgentCampaigns,
      awaitingCompanies,
    },
  },
  {
    headers: {
      "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
    },
  });
}
