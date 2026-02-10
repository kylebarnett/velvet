import { NextResponse } from "next/server";
import { getApiUser, jsonError } from "@/lib/api/auth";
import { parsePagination } from "@/lib/api/pagination";

type RawRequest = {
  id: string;
  period_start: string;
  period_end: string;
  status: string;
  due_date: string | null;
  company_id: string;
  schedule_id: string | null;
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
  const start = new Date(periodStart);
  if (periodType === "quarterly") {
    const q = Math.floor(start.getMonth() / 3) + 1;
    return `Q${q} ${start.getFullYear()}`;
  }
  if (periodType === "monthly") {
    return start.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }
  return String(start.getFullYear());
}

export async function GET(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const url = new URL(req.url);
  const periodTypeFilter = url.searchParams.get("periodType");
  const statusFilter = url.searchParams.get("status");
  const { limit, offset } = parsePagination(url);

  // Fetch all metric_requests for this investor with metric_definitions join
  const { data: rawRequests, error } = await supabase
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
      metric_definitions (period_type),
      metric_request_schedules:schedule_id (name)
    `,
    )
    .eq("investor_id", user.id);

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

    const defRaw = r.metric_definitions;
    const def = Array.isArray(defRaw) ? defRaw[0] : defRaw;
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
    const schedRaw = r.metric_request_schedules;
    const sched = Array.isArray(schedRaw) ? schedRaw[0] : schedRaw;
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

    return {
      periodStart: b.periodStart,
      periodEnd: b.periodEnd,
      periodLabel: buildPeriodLabel(b.periodStart, b.periodType),
      periodType: b.periodType,
      totalRequests,
      submittedRequests,
      completionPercent,
      companyCount: b.companyIds.size,
      companiesSubmitted: b.companiesSubmitted.size,
      companiesPending: b.companiesPending.size,
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

  // Summary counts (before pagination)
  const activeCampaigns = campaigns.filter(
    (c) => c.completionPercent < 100,
  ).length;
  const companiesAwaiting = new Set(
    requests
      .filter((r) => r.status === "pending")
      .map((r) => r.company_id),
  ).size;

  // Paginate
  const paginated = campaigns.slice(offset, offset + limit);

  return NextResponse.json({
    campaigns: paginated,
    total,
    summary: {
      activeCampaigns,
      companiesAwaiting,
    },
  });
}
