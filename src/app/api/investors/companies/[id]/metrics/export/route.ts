import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";

// GET - Export metrics as CSV
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const { id: companyId } = await params;

  // Parse query params
  const url = new URL(req.url);
  const periodType = url.searchParams.get("periodType");

  // Verify investor has an approved relationship with this company
  const { data: relationship } = await supabase
    .from("investor_company_relationships")
    .select("id, approval_status")
    .eq("investor_id", user.id)
    .eq("company_id", companyId)
    .single();

  if (!relationship) return jsonError("Company not in portfolio.", 403);

  if (!["auto_approved", "approved"].includes(relationship.approval_status)) {
    return jsonError("Access pending approval.", 403);
  }

  // Get company name for filename
  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .single();

  // Fetch all metric values for this company
  let query = supabase
    .from("company_metric_values")
    .select(`
      metric_name,
      period_type,
      period_start,
      period_end,
      value,
      notes,
      submitted_at
    `)
    .eq("company_id", companyId)
    .order("metric_name", { ascending: true })
    .order("period_start", { ascending: false });

  if (periodType && ["monthly", "quarterly", "yearly"].includes(periodType)) {
    query = query.eq("period_type", periodType);
  }

  const { data: metrics, error } = await query;

  if (error) return jsonError(error.message, 500);

  // Generate CSV
  const csvRows: string[] = [
    // Header row
    ["Metric", "Period Type", "Period Start", "Period End", "Value", "Notes", "Submitted At"].join(","),
  ];

  for (const metric of metrics ?? []) {
    // Extract numeric value
    let value: string = "";
    if (metric.value != null) {
      if (typeof metric.value === "number") {
        value = String(metric.value);
      } else if (typeof metric.value === "object") {
        const v = (metric.value as Record<string, unknown>).value ?? (metric.value as Record<string, unknown>).raw;
        value = v != null ? String(v) : "";
      } else {
        value = String(metric.value);
      }
    }

    // Escape fields for CSV
    const escapeCsvField = (field: string | null): string => {
      if (field == null) return "";
      const str = String(field);
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    csvRows.push([
      escapeCsvField(metric.metric_name),
      escapeCsvField(metric.period_type),
      escapeCsvField(metric.period_start),
      escapeCsvField(metric.period_end),
      escapeCsvField(value),
      escapeCsvField(metric.notes),
      escapeCsvField(metric.submitted_at),
    ].join(","));
  }

  const csv = csvRows.join("\n");
  const filename = `${(company?.name ?? "company").replace(/[^a-z0-9]/gi, "_")}_metrics.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
