import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";

// GET - Export founder's metrics as CSV
export async function GET(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "founder") return jsonError("Founders only.", 403);

  // Parse query params
  const url = new URL(req.url);
  const periodType = url.searchParams.get("periodType");

  // Get founder's company
  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("founder_id", user.id)
    .single();

  if (!company) return jsonError("No company found.", 404);

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
    .eq("company_id", company.id)
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

    // Escape fields for CSV (includes formula injection prevention)
    const escapeCsvField = (field: string | null): string => {
      if (field == null) return "";
      let str = String(field);
      // Prevent formula injection - prefix with single quote if starts with dangerous chars
      if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str;
      }
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
  const filename = `${(company.name).replace(/[^a-z0-9]/gi, "_")}_metrics.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
