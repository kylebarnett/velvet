import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";

const schema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().min(1),
});

export async function POST(req: Request) {
  // Authentication required
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  // Role verification - only investors and founders can send notifications
  const role = user.user_metadata?.role;
  if (role !== "investor" && role !== "founder") {
    return jsonError("Forbidden.", 403);
  }

  // Rate limit: 10 emails per minute per user
  const rl = checkRateLimit(`notify:${user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return jsonError("Too many requests. Please try again later.", 429);
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return jsonError("Missing RESEND_API_KEY.", 500);

  const { to, subject, html } = parsed.data;

  // Validate that the recipient email belongs to a founder/company in the sender's portfolio
  if (role === "investor") {
    const { data: relationship } = await supabase
      .from("investor_company_relationships")
      .select("id, companies!inner(founder_email)")
      .eq("investor_id", user.id)
      .eq("companies.founder_email", to)
      .limit(1);

    if (!relationship || relationship.length === 0) {
      return jsonError("Recipient is not in your portfolio.", 403);
    }
  } else if (role === "founder") {
    // Founders can only email investors who have a relationship with their company
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("founder_id", user.id)
      .limit(1)
      .single();

    if (!company) {
      return jsonError("Company not found.", 404);
    }

    const { data: investors } = await supabase
      .from("investor_company_relationships")
      .select("investor_id, users!investor_company_relationships_investor_id_fkey(email)")
      .eq("company_id", company.id);

    const investorEmails = (investors ?? []).flatMap((inv) => {
      const u = Array.isArray(inv.users) ? inv.users[0] : inv.users;
      return u?.email ? [u.email] : [];
    });

    if (!investorEmails.includes(to)) {
      return jsonError("Recipient is not an investor linked to your company.", 403);
    }
  }

  // Minimal Resend integration (server-side)
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Velvet <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return jsonError(`Email failed: ${text || res.statusText}`, 400);
  }

  const json = await res.json().catch(() => ({}));
  return NextResponse.json(json);
}
