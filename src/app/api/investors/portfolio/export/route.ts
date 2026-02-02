import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";

export async function GET() {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  // Fetch all portfolio contacts with company info
  const { data: contacts, error } = await supabase
    .from("portfolio_invitations")
    .select(`
      email,
      first_name,
      last_name,
      companies (
        name,
        website
      )
    `)
    .eq("investor_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return jsonError(error.message, 500);
  }

  // Build CSV content
  const headers = ["Company Name", "First Name", "Last Name", "Email", "Company Website"];
  const rows = (contacts ?? []).map((contact) => {
    const company = Array.isArray(contact.companies)
      ? contact.companies[0]
      : contact.companies;
    return [
      escapeCsvField(company?.name ?? ""),
      escapeCsvField(contact.first_name ?? ""),
      escapeCsvField(contact.last_name ?? ""),
      escapeCsvField(contact.email ?? ""),
      escapeCsvField(company?.website ?? ""),
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");

  // Return as downloadable CSV
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="portfolio-contacts-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}

function escapeCsvField(value: string): string {
  // Prevent formula injection - prefix with single quote if starts with dangerous chars
  if (/^[=+\-@\t\r]/.test(value)) {
    value = "'" + value;
  }
  // If the value contains commas, quotes, or newlines, wrap in quotes and escape internal quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
