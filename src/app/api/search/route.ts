import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { searchArticles } from "@/lib/help/search";
import { ALL_ARTICLES } from "@/lib/help/content/index";
import { getArticlesByRole } from "@/lib/help/types";

function escapeIlike(value: string): string {
  const clean = value.replace(/[(),."'\\]/g, "");
  return clean.replace(/[%_]/g, "\\$&");
}

const querySchema = z.object({
  q: z.string().min(2).max(100),
  limit: z.coerce.number().int().min(1).max(10).default(5),
});

type SearchResult = {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  icon: string;
};

export async function GET(req: NextRequest) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role as "investor" | "founder" | undefined;
  if (!role || (role !== "investor" && role !== "founder")) {
    return jsonError("Forbidden.", 403);
  }

  // Rate limit: 30/min per user
  const rl = checkRateLimit(`search:${user.id}`, 30, 60_000);
  if (!rl.allowed) {
    return jsonError("Too many requests.", 429, {
      "Retry-After": String(rl.retryAfter ?? 60),
    });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return jsonError("Invalid query parameters.", 400);
  }

  const { q, limit } = parsed.data;
  const escaped = escapeIlike(q);
  const pattern = `%${escaped}%`;

  const results: SearchResult[] = [];

  if (role === "investor") {
    const { data: rels } = await supabase
      .from("investor_company_relationships")
      .select("company_id")
      .eq("investor_id", user.id)
      .in("approval_status", ["auto_approved", "approved"]);

    const companyIds = (rels ?? []).map((r) => r.company_id).filter(Boolean) as string[];

    const [companiesRes, contactsRes, docsRes, requestsRes, tearSheetsRes, fundsRes] =
      await Promise.all([
        companyIds.length > 0
          ? supabase
              .from("companies")
              .select("id, name, stage, industry")
              .in("id", companyIds)
              .ilike("name", pattern)
              .limit(limit)
          : Promise.resolve({ data: null }),

        supabase
          .from("portfolio_invitations")
          .select("id, email, first_name, last_name")
          .eq("investor_id", user.id)
          .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern}`)
          .limit(limit),

        companyIds.length > 0
          ? supabase
              .from("documents")
              .select("id, file_name, document_type, company_id, companies!inner(name)")
              .in("company_id", companyIds)
              .ilike("file_name", pattern)
              .limit(limit)
          : Promise.resolve({ data: null }),

        supabase
          .from("metric_requests")
          .select("id, company_id, metric_definition_id, companies(name)")
          .eq("investor_id", user.id)
          .limit(limit),

        supabase
          .from("tear_sheets")
          .select("id, title, company_id, companies(name)")
          .eq("investor_id", user.id)
          .ilike("title", pattern)
          .limit(limit),

        supabase
          .from("funds")
          .select("id, name")
          .eq("investor_id", user.id)
          .ilike("name", pattern)
          .limit(limit),
      ]);

    if (companiesRes.data) {
      for (const c of companiesRes.data) {
        const parts = [c.stage, c.industry].filter(Boolean);
        results.push({
          type: "company",
          id: c.id,
          title: c.name,
          subtitle: parts.join(" · ") || undefined,
          href: `/companies/${c.id}`,
          icon: "building2",
        });
      }
    }

    if (contactsRes.data) {
      for (const c of contactsRes.data) {
        const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email;
        results.push({
          type: "contact",
          id: c.id,
          title: name,
          subtitle: c.email,
          href: "/contacts",
          icon: "users",
        });
      }
    }

    if (docsRes.data) {
      for (const d of docsRes.data) {
        const company = Array.isArray(d.companies) ? d.companies[0] : d.companies;
        results.push({
          type: "document",
          id: d.id,
          title: d.file_name,
          subtitle: [company?.name, d.document_type].filter(Boolean).join(" · ") || undefined,
          href: "/documents",
          icon: "file-text",
        });
      }
    }

    if (tearSheetsRes.data) {
      for (const t of tearSheetsRes.data) {
        const company = Array.isArray(t.companies) ? t.companies[0] : t.companies;
        results.push({
          type: "tear_sheet",
          id: t.id,
          title: t.title || "Untitled Tear Sheet",
          subtitle: company?.name || undefined,
          href: `/tear-sheets/${t.id}`,
          icon: "file-spreadsheet",
        });
      }
    }

    if (fundsRes.data) {
      for (const f of fundsRes.data) {
        results.push({
          type: "fund",
          id: f.id,
          title: f.name,
          href: `/funds/${f.id}`,
          icon: "landmark",
        });
      }
    }
  } else {
    const { data: company } = await supabase
      .from("companies")
      .select("id, name")
      .eq("founder_id", user.id)
      .single();

    if (company) {
      const [docsRes, tearSheetsRes, investorsRes] = await Promise.all([
        supabase
          .from("documents")
          .select("id, file_name, document_type")
          .eq("company_id", company.id)
          .ilike("file_name", pattern)
          .limit(limit),

        supabase
          .from("tear_sheets")
          .select("id, title")
          .eq("founder_id", user.id)
          .ilike("title", pattern)
          .limit(limit),

        supabase
          .from("investor_company_relationships")
          .select("investor_id, users!investor_company_relationships_investor_id_fkey(id, full_name, email)")
          .eq("company_id", company.id)
          .limit(20),
      ]);

      if (docsRes.data) {
        for (const d of docsRes.data) {
          results.push({
            type: "document",
            id: d.id,
            title: d.file_name,
            subtitle: d.document_type || undefined,
            href: "/portal/documents",
            icon: "file-text",
          });
        }
      }

      if (tearSheetsRes.data) {
        for (const t of tearSheetsRes.data) {
          results.push({
            type: "tear_sheet",
            id: t.id,
            title: t.title || "Untitled Tear Sheet",
            href: `/portal/tear-sheets/${t.id}`,
            icon: "file-spreadsheet",
          });
        }
      }

      if (investorsRes.data) {
        const lowerQ = q.toLowerCase();
        for (const rel of investorsRes.data) {
          const u = Array.isArray(rel.users) ? rel.users[0] : rel.users;
          if (!u) continue;
          const name = u.full_name || u.email || "";
          if (
            name.toLowerCase().includes(lowerQ) ||
            (u.email && u.email.toLowerCase().includes(lowerQ))
          ) {
            results.push({
              type: "investor",
              id: u.id,
              title: u.full_name || u.email || "Unknown",
              subtitle: u.email,
              href: "/portal/investors",
              icon: "shield",
            });
          }
          if (results.filter((r) => r.type === "investor").length >= limit) break;
        }
      }
    }
  }

  const roleArticles = getArticlesByRole(role, ALL_ARTICLES);
  const helpMatches = searchArticles(q, roleArticles).slice(0, 3);
  for (const article of helpMatches) {
    const helpHref = role === "founder" ? `/portal/help/${article.slug}` : `/help/${article.slug}`;
    results.push({
      type: "help",
      id: `help-${article.slug}`,
      title: article.title,
      subtitle: "Help article",
      href: helpHref,
      icon: "help-circle",
    });
  }

  return NextResponse.json(
    { results: results.slice(0, 20) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
