import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";
import crypto from "crypto";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------- Helpers ----------

function getQuarterDates(quarter: string, year: number) {
  const qMap: Record<string, { start: string; end: string }> = {
    Q1: { start: `${year}-01-01`, end: `${year}-03-31` },
    Q2: { start: `${year}-04-01`, end: `${year}-06-30` },
    Q3: { start: `${year}-07-01`, end: `${year}-09-30` },
    Q4: { start: `${year}-10-01`, end: `${year}-12-31` },
  };
  return qMap[quarter];
}

function interpolate(start: number, end: number, progress: number): number {
  const base = start + (end - start) * progress;
  const variance = base * (Math.random() * 0.1 - 0.05);
  return base + variance;
}

// Quarters to seed: Q1 2024 through Q4 2025 (8 quarters)
const QUARTERS = [
  { q: "Q1", y: 2024 },
  { q: "Q2", y: 2024 },
  { q: "Q3", y: 2024 },
  { q: "Q4", y: 2024 },
  { q: "Q1", y: 2025 },
  { q: "Q2", y: 2025 },
  { q: "Q3", y: 2025 },
  { q: "Q4", y: 2025 },
];

// SaaS metrics for the test account
const TEST_ACCOUNT_METRICS: Record<
  string,
  { start: number; end: number; decimals?: number }
> = {
  Revenue: { start: 85000, end: 320000 },
  MRR: { start: 7000, end: 27000 },
  ARR: { start: 85000, end: 320000 },
  "Gross Margin": { start: 62, end: 78, decimals: 1 },
  "Burn Rate": { start: 45000, end: 28000 },
  Runway: { start: 14, end: 22 },
  Headcount: { start: 4, end: 12 },
  "Customer Count": { start: 15, end: 85 },
  CAC: { start: 1200, end: 850 },
  LTV: { start: 4500, end: 8200 },
  "Net Revenue Retention": { start: 105, end: 128, decimals: 1 },
  "Customer Churn Rate": { start: 5.2, end: 2.8, decimals: 1 },
};

// Tear sheet content template
function buildTearSheetContent(
  quarter: string,
  year: number,
  metricNames: string[],
) {
  const highlights: Record<string, string> = {
    "Q3 2025": "Crossed 60 customer milestone. Secured partnership with a major enterprise client. Launched v2.0 of the platform with 3x faster data processing.",
    "Q4 2025": "Record quarter with $27K MRR. Closed Series A term sheet. Expanded into European market with first 5 international customers. Team grew to 12.",
  };

  const milestones: Record<string, Array<{ title: string; description: string }>> = {
    "Q3 2025": [
      { title: "60 customers", description: "Passed 60 paying customers across 3 verticals" },
      { title: "Enterprise launch", description: "Signed first enterprise contract worth $48K ARR" },
      { title: "Platform v2.0", description: "Major platform rewrite with improved performance" },
    ],
    "Q4 2025": [
      { title: "Series A term sheet", description: "Signed term sheet at $12M pre-money valuation" },
      { title: "Europe expansion", description: "First 5 customers in UK and Germany" },
      { title: "$300K+ ARR", description: "Surpassed $300K annualized recurring revenue" },
      { title: "SOC 2 Type II", description: "Completed SOC 2 Type II certification" },
    ],
  };

  const challenges: Record<string, string> = {
    "Q3 2025": "Hiring senior engineers remains competitive. Onboarding time for enterprise clients is longer than expected (45 days vs. target of 30).",
    "Q4 2025": "Supply chain issues delayed hardware integration project. Need to build out customer success team before scaling further.",
  };

  const teamUpdates: Record<string, string> = {
    "Q3 2025": "Hired VP of Engineering from Datadog. Two new full-stack engineers started. Total team now at 9.",
    "Q4 2025": "Added Head of Sales and 2 SDRs. Promoted first engineer to tech lead. Team at 12 and planning to reach 18 by end of Q2 2026.",
  };

  const outlook: Record<string, string> = {
    "Q3 2025": "Targeting 80 customers by end of Q4. Enterprise pipeline has 12 qualified opportunities. Planning Series A raise in Q4.",
    "Q4 2025": "Series A close expected in January. Goal is 120 customers and $40K MRR by end of Q1 2026. Expanding sales team to support growth.",
  };

  const askOfInvestors: Record<string, string> = {
    "Q3 2025": "Introductions to VP Engineering candidates. Warm intros to enterprise prospects in healthcare and fintech verticals.",
    "Q4 2025": "Series A co-investor introductions. Connections to potential board members with SaaS scaling experience. EU market advisors.",
  };

  const key = `${quarter} ${year}`;

  return {
    highlights: highlights[key] ?? "",
    visibleMetrics: metricNames,
    milestones: milestones[key] ?? [],
    challenges: challenges[key] ?? "",
    teamUpdates: teamUpdates[key] ?? "",
    outlook: outlook[key] ?? "",
    askOfInvestors: askOfInvestors[key] ?? "",
  };
}

// ---------- Main ----------

async function seedFounderData() {
  console.log("Seeding founder-specific data...\n");

  // 1. Get all founders and their companies
  const { data: users } = await supabase.auth.admin.listUsers();
  const founders =
    users?.users?.filter((u) => u.user_metadata?.role === "founder") || [];

  if (founders.length === 0) {
    console.error("No founders found. Run seed-dummy-data.ts first.");
    process.exit(1);
  }

  // 2. Seed metrics for the test account (if it has none)
  const testFounder = founders.find(
    (f) => f.email === "lotrfantasyshorts@gmail.com",
  );
  if (testFounder) {
    const { data: testCompany } = await supabase
      .from("companies")
      .select("id, name")
      .eq("founder_id", testFounder.id)
      .single();

    if (testCompany) {
      const { count } = await supabase
        .from("company_metric_values")
        .select("id", { count: "exact", head: true })
        .eq("company_id", testCompany.id);

      if ((count ?? 0) === 0) {
        console.log(`Seeding metrics for ${testCompany.name}...`);
        const metricValues = [];
        for (const [name, config] of Object.entries(TEST_ACCOUNT_METRICS)) {
          for (let i = 0; i < QUARTERS.length; i++) {
            const { q, y } = QUARTERS[i];
            const dates = getQuarterDates(q, y);
            const progress = i / (QUARTERS.length - 1);
            let value = interpolate(config.start, config.end, progress);
            const dec = config.decimals ?? 0;
            value = Math.round(value * Math.pow(10, dec)) / Math.pow(10, dec);

            metricValues.push({
              company_id: testCompany.id,
              metric_name: name,
              period_type: "quarterly",
              period_start: dates.start,
              period_end: dates.end,
              value,
              submitted_by: testFounder.id,
            });
          }
        }

        const { error } = await supabase
          .from("company_metric_values")
          .insert(metricValues);

        if (error) {
          console.error("  Error inserting metrics:", error.message);
        } else {
          console.log(`  Inserted ${metricValues.length} metric values`);
        }
      } else {
        console.log(
          `${testCompany.name} already has ${count} metrics, skipping.`,
        );
      }
    }
  }

  // 3. Seed tear sheets for multiple founders
  const tearSheetFounders = [
    // Test account gets tear sheets
    {
      email: "lotrfantasyshorts@gmail.com",
      quarters: [
        { q: "Q3", y: 2025, status: "published", share: true },
        { q: "Q4", y: 2025, status: "draft", share: false },
      ],
    },
    // SpaceX
    {
      email: "elon@spacex.example.com",
      quarters: [
        { q: "Q2", y: 2025, status: "published", share: true },
        { q: "Q3", y: 2025, status: "published", share: true },
        { q: "Q4", y: 2025, status: "draft", share: false },
      ],
    },
    // Stripe
    {
      email: "patrick@stripe.example.com",
      quarters: [
        { q: "Q3", y: 2025, status: "published", share: false },
        { q: "Q4", y: 2025, status: "published", share: true },
      ],
    },
    // Notion
    {
      email: "ivan@notion.example.com",
      quarters: [
        { q: "Q4", y: 2025, status: "draft", share: false },
      ],
    },
  ];

  for (const config of tearSheetFounders) {
    const founder = founders.find((f) => f.email === config.email);
    if (!founder) {
      console.log(`Founder ${config.email} not found, skipping.`);
      continue;
    }

    const { data: company } = await supabase
      .from("companies")
      .select("id, name")
      .eq("founder_id", founder.id)
      .single();

    if (!company) {
      console.log(`No company for ${config.email}, skipping.`);
      continue;
    }

    console.log(`\nSeeding tear sheets for ${company.name}...`);

    // Get metric names for this company
    const { data: metricRows } = await supabase
      .from("company_metric_values")
      .select("metric_name")
      .eq("company_id", company.id)
      .limit(100);

    const metricNames = [
      ...new Set((metricRows ?? []).map((r) => r.metric_name)),
    ].slice(0, 8); // Show up to 8 metrics

    for (const tsConfig of config.quarters) {
      // Check if tear sheet already exists
      const { data: existing } = await supabase
        .from("tear_sheets")
        .select("id")
        .eq("company_id", company.id)
        .eq("quarter", tsConfig.q)
        .eq("year", tsConfig.y)
        .single();

      if (existing) {
        console.log(`  ${tsConfig.q} ${tsConfig.y} already exists, skipping.`);
        continue;
      }

      const content = buildTearSheetContent(tsConfig.q, tsConfig.y, metricNames);
      const shareToken = tsConfig.share ? crypto.randomUUID() : null;

      const { error } = await supabase.from("tear_sheets").insert({
        company_id: company.id,
        founder_id: founder.id,
        title: `${tsConfig.q} ${tsConfig.y} Update`,
        quarter: tsConfig.q,
        year: tsConfig.y,
        status: tsConfig.status,
        content,
        share_token: shareToken,
        share_enabled: tsConfig.share,
      });

      if (error) {
        console.error(
          `  Error creating ${tsConfig.q} ${tsConfig.y}:`,
          error.message,
        );
      } else {
        console.log(
          `  Created ${tsConfig.q} ${tsConfig.y} (${tsConfig.status}${tsConfig.share ? ", shared" : ""})`,
        );
        if (shareToken) {
          console.log(`    Share URL: /share/tear-sheet/${shareToken}`);
        }
      }
    }
  }

  // 4. Seed some metric requests (pending) for the test account
  if (testFounder) {
    const { data: testCompany } = await supabase
      .from("companies")
      .select("id")
      .eq("founder_id", testFounder.id)
      .single();

    // Find the investor
    const { data: rel } = await supabase
      .from("investor_company_relationships")
      .select("investor_id")
      .eq("company_id", testCompany?.id)
      .limit(1)
      .single();

    if (testCompany && rel) {
      const investorId = rel.investor_id;

      // Check if there are already metric requests
      const { count: existingRequests } = await supabase
        .from("metric_requests")
        .select("id", { count: "exact", head: true })
        .eq("company_id", testCompany.id)
        .eq("status", "pending");

      if ((existingRequests ?? 0) === 0) {
        console.log("\nSeeding pending metric requests for test account...");

        // Need metric_definitions for the investor
        const requestMetrics = [
          "Revenue",
          "MRR",
          "Burn Rate",
          "Headcount",
          "Customer Count",
        ];
        const q1_2026 = { start: "2026-01-01", end: "2026-03-31" };
        const dueDate = "2026-02-15";

        for (const metricName of requestMetrics) {
          // Ensure metric definition exists
          const { data: existingDef } = await supabase
            .from("metric_definitions")
            .select("id")
            .eq("investor_id", investorId)
            .eq("name", metricName)
            .single();

          let defId: string;
          if (existingDef) {
            defId = existingDef.id;
          } else {
            const { data: newDef, error: defErr } = await supabase
              .from("metric_definitions")
              .insert({
                investor_id: investorId,
                name: metricName,
                period_type: "quarterly",
                data_type: "number",
              })
              .select("id")
              .single();

            if (defErr || !newDef) {
              console.error(
                `  Error creating definition for ${metricName}:`,
                defErr?.message,
              );
              continue;
            }
            defId = newDef.id;
          }

          const { error: reqErr } = await supabase
            .from("metric_requests")
            .insert({
              investor_id: investorId,
              company_id: testCompany.id,
              metric_definition_id: defId,
              period_start: q1_2026.start,
              period_end: q1_2026.end,
              status: "pending",
              due_date: dueDate,
            });

          if (reqErr) {
            console.error(
              `  Error creating request for ${metricName}:`,
              reqErr.message,
            );
          } else {
            console.log(`  Created pending request: ${metricName} (Q1 2026)`);
          }
        }
      } else {
        console.log(
          `\nTest account already has ${existingRequests} pending requests, skipping.`,
        );
      }
    }
  }

  console.log("\nFounder data seeding complete!");
}

// ---------- Cleanup ----------

async function cleanupFounderData() {
  console.log("Cleaning up founder-specific data...\n");

  // Delete all tear sheets
  const { error: tsErr, count: tsCount } = await supabase
    .from("tear_sheets")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  console.log(
    tsErr
      ? `Error deleting tear sheets: ${tsErr.message}`
      : "Deleted tear sheets",
  );

  // Delete test account metrics
  const { data: testCompany } = await supabase
    .from("companies")
    .select("id")
    .eq("name", "Test account")
    .single();

  if (testCompany) {
    const { error: mErr } = await supabase
      .from("company_metric_values")
      .delete()
      .eq("company_id", testCompany.id);

    console.log(
      mErr
        ? `Error deleting test account metrics: ${mErr.message}`
        : "Deleted test account metrics",
    );

    // Delete pending metric requests for test account
    const { error: rErr } = await supabase
      .from("metric_requests")
      .delete()
      .eq("company_id", testCompany.id)
      .eq("status", "pending");

    console.log(
      rErr
        ? `Error deleting test requests: ${rErr.message}`
        : "Deleted test account pending requests",
    );
  }

  console.log("\nCleanup complete!");
}

// ---------- Entry ----------

const args = process.argv.slice(2);
if (args.includes("--cleanup")) {
  cleanupFounderData();
} else {
  seedFounderData();
}
