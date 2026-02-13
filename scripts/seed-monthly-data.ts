import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// ---------------------------------------------------------------------------
// FLOW_METRICS — duplicated from src/lib/metrics/temporal-aggregation.ts
// to keep this script self-contained (no src/ imports in scripts)
// ---------------------------------------------------------------------------

const FLOW_METRICS = new Set([
  "revenue",
  "net revenue",
  "gmv",
  "gross merchandise volume",
  "total transaction volume",
  "transaction volume",
  "operating expenses",
  "opex",
  "r&d spend",
  "r&d expenses",
  "research and development",
  "marketing spend",
  "marketing expenses",
  "sales expenses",
  "sales spend",
  "cost of goods sold",
  "cogs",
  "api calls",
  "data processing volume",
  "total sales",
  "gross sales",
  "net sales",
  "operating costs",
  "total expenses",
  "payroll expenses",
  "infrastructure costs",
  "cloud costs",
  "hosting costs",
]);

function isFlowMetric(name: string): boolean {
  return FLOW_METRICS.has(name.toLowerCase().trim());
}

// ---------------------------------------------------------------------------
// Company Definitions (10 dummy + test account)
// Metric ranges are quarterly-scale (same as seed-dummy-data.ts)
// ---------------------------------------------------------------------------

type MetricConfig = { start: number; end: number; decimals?: number };
type CompanyDef = {
  founderEmail: string;
  metrics: Record<string, MetricConfig>;
};

const COMPANIES: CompanyDef[] = [
  {
    founderEmail: "elon@spacex.example.com",
    metrics: {
      Revenue: { start: 3200, end: 12000 },
      "Gross Margin": { start: 25, end: 35 },
      "Operating Expenses": { start: 800, end: 1200 },
      "Burn Rate": { start: 200, end: 150 },
      Runway: { start: 36, end: 48 },
      Headcount: { start: 12000, end: 15000 },
      "Customer Count": { start: 150, end: 280 },
      "Contract Value": { start: 8500, end: 18000 },
      "Launch Success Rate": { start: 94, end: 98 },
      "Launches Per Quarter": { start: 8, end: 15 },
      "Starlink Subscribers": { start: 1000000, end: 3500000 },
      EBITDA: { start: -100, end: 800 },
    },
  },
  {
    founderEmail: "patrick@stripe.example.com",
    metrics: {
      Revenue: { start: 14000, end: 22000 },
      "Gross Margin": { start: 45, end: 52 },
      GMV: { start: 800000, end: 1200000 },
      "Take Rate": { start: 1.75, end: 1.85, decimals: 2 },
      "Active Merchants": { start: 3500000, end: 5000000 },
      Headcount: { start: 7000, end: 8500 },
      "Net Revenue Retention": { start: 115, end: 125, decimals: 1 },
      "Customer Churn Rate": { start: 2.5, end: 1.8, decimals: 1 },
      "Fraud Prevention Rate": { start: 99.2, end: 99.6, decimals: 1 },
      ARPU: { start: 4000, end: 4400, decimals: 2 },
      "API Uptime": { start: 99.95, end: 99.99, decimals: 2 },
      EBITDA: { start: 1200, end: 3500 },
    },
  },
  {
    founderEmail: "ali@databricks.example.com",
    metrics: {
      ARR: { start: 1200, end: 2800 },
      Revenue: { start: 1100, end: 2600 },
      "Gross Margin": { start: 72, end: 78 },
      Customers: { start: 8000, end: 12000 },
      "Net Revenue Retention": { start: 140, end: 145, decimals: 1 },
      "Customer Churn Rate": { start: 3, end: 2, decimals: 1 },
      Headcount: { start: 5000, end: 7000 },
      "Data Processed": { start: 15, end: 45 },
      "Enterprise Customers": { start: 1200, end: 2000 },
      CAC: { start: 45000, end: 42000 },
      LTV: { start: 350000, end: 420000 },
      "Burn Rate": { start: 150, end: 80 },
    },
  },
  {
    founderEmail: "melanie@canva.example.com",
    metrics: {
      Revenue: { start: 1400, end: 2500 },
      ARR: { start: 1200, end: 2200 },
      "Gross Margin": { start: 85, end: 88 },
      MAU: { start: 100, end: 180 },
      "Paying Users": { start: 8, end: 16 },
      "Enterprise Teams": { start: 150000, end: 350000 },
      ARPU: { start: 12.5, end: 13.75, decimals: 2 },
      "Net Revenue Retention": { start: 110, end: 118, decimals: 1 },
      CAC: { start: 35, end: 32 },
      LTV: { start: 180, end: 220 },
      Headcount: { start: 3500, end: 4500 },
      "Designs Created": { start: 15000, end: 25000 },
    },
  },
  {
    founderEmail: "jason@discord.example.com",
    metrics: {
      Revenue: { start: 500, end: 800 },
      "Gross Margin": { start: 65, end: 72 },
      MAU: { start: 150, end: 200 },
      DAU: { start: 50, end: 75 },
      "Nitro Subscribers": { start: 8, end: 15 },
      ARPU: { start: 3.3, end: 4.0, decimals: 2 },
      "Server Count": { start: 19, end: 25 },
      "Messages Per Day": { start: 4000, end: 6500 },
      Headcount: { start: 650, end: 850 },
      "Conversion Rate": { start: 5.3, end: 7.5, decimals: 1 },
      "Burn Rate": { start: 80, end: 40 },
      CAC: { start: 8, end: 6.5, decimals: 1 },
    },
  },
  {
    founderEmail: "dylan@figma.example.com",
    metrics: {
      ARR: { start: 500, end: 800 },
      Revenue: { start: 450, end: 750 },
      "Gross Margin": { start: 88, end: 91 },
      Seats: { start: 4000000, end: 6000000 },
      "Paying Organizations": { start: 150000, end: 280000 },
      "Net Revenue Retention": { start: 135, end: 145, decimals: 1 },
      "Enterprise ARR": { start: 150, end: 320 },
      MAU: { start: 4, end: 6 },
      Headcount: { start: 850, end: 1200 },
      CAC: { start: 500, end: 450 },
      LTV: { start: 8500, end: 10000 },
      "Files Created": { start: 80, end: 150 },
    },
  },
  {
    founderEmail: "fidji@instacart.example.com",
    metrics: {
      GMV: { start: 28000, end: 35000 },
      Revenue: { start: 2500, end: 3500 },
      "Gross Margin": { start: 32, end: 38 },
      Orders: { start: 250, end: 300 },
      AOV: { start: 112, end: 117 },
      "Active Shoppers": { start: 600000, end: 750000 },
      "Retail Partners": { start: 1100, end: 1500 },
      MAU: { start: 12, end: 18 },
      "Take Rate": { start: 8.9, end: 10, decimals: 1 },
      "Ad Revenue": { start: 600, end: 950 },
      Headcount: { start: 3200, end: 3800 },
      EBITDA: { start: 150, end: 450 },
    },
  },
  {
    founderEmail: "zach@plaid.example.com",
    metrics: {
      Revenue: { start: 300, end: 500 },
      "Gross Margin": { start: 68, end: 74 },
      "API Calls": { start: 5000, end: 12000 },
      Customers: { start: 6000, end: 9000 },
      "Connected Accounts": { start: 80, end: 120 },
      "Financial Institutions": { start: 11000, end: 12500 },
      "Net Revenue Retention": { start: 125, end: 135, decimals: 1 },
      ARPU: { start: 50000, end: 55000, decimals: 2 },
      Headcount: { start: 900, end: 1100 },
      CAC: { start: 25000, end: 22000 },
      LTV: { start: 180000, end: 220000 },
      "Burn Rate": { start: 60, end: 30 },
    },
  },
  {
    founderEmail: "ivan@notion.example.com",
    metrics: {
      ARR: { start: 300, end: 600 },
      Revenue: { start: 280, end: 550 },
      "Gross Margin": { start: 82, end: 86 },
      MAU: { start: 30, end: 50 },
      Teams: { start: 4000000, end: 8000000 },
      "Enterprise Customers": { start: 8000, end: 18000 },
      "Net Revenue Retention": { start: 125, end: 135, decimals: 1 },
      ARPU: { start: 70, end: 75, decimals: 2 },
      Headcount: { start: 400, end: 650 },
      CAC: { start: 150, end: 130 },
      LTV: { start: 1200, end: 1500 },
      "Pages Created": { start: 500, end: 1200 },
    },
  },
  {
    founderEmail: "howie@airtable.example.com",
    metrics: {
      ARR: { start: 400, end: 600 },
      Revenue: { start: 350, end: 550 },
      "Gross Margin": { start: 78, end: 82 },
      Seats: { start: 300000, end: 500000 },
      "Enterprise Customers": { start: 2500, end: 4500 },
      "Net Revenue Retention": { start: 118, end: 128, decimals: 1 },
      MAU: { start: 1.5, end: 2.5, decimals: 1 },
      Headcount: { start: 800, end: 950 },
      CAC: { start: 2500, end: 2200 },
      LTV: { start: 15000, end: 18000 },
      "Bases Created": { start: 25, end: 45 },
      "Burn Rate": { start: 45, end: 25 },
    },
  },
  // Test account
  {
    founderEmail: "lotrfantasyshorts@gmail.com",
    metrics: {
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
    },
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function interpolateValue(
  start: number,
  end: number,
  progress: number,
  addVariance = true,
): number {
  const base = start + (end - start) * progress;
  if (!addVariance) return base;
  const variance = base * (Math.random() * 0.1 - 0.05);
  return base + variance;
}

function roundValue(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Last day of a month (1-indexed month, but Date uses 0-indexed) */
function lastDayOfMonth(year: number, monthZero: number): number {
  return new Date(Date.UTC(year, monthZero + 1, 0)).getUTCDate();
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// ---------------------------------------------------------------------------
// Period Generators
// ---------------------------------------------------------------------------

type MonthPeriod = {
  year: number;
  month: number; // 0-indexed
  periodStart: string;
  periodEnd: string;
  index: number;
};

function generateMonths(): MonthPeriod[] {
  const months: MonthPeriod[] = [];
  let index = 0;
  for (let year = 2023; year <= 2025; year++) {
    for (let m = 0; m < 12; m++) {
      const last = lastDayOfMonth(year, m);
      months.push({
        year,
        month: m,
        periodStart: `${year}-${pad2(m + 1)}-01`,
        periodEnd: `${year}-${pad2(m + 1)}-${pad2(last)}`,
        index,
      });
      index++;
    }
  }
  return months;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

type MetricRow = {
  company_id: string;
  metric_name: string;
  period_type: string;
  period_start: string;
  period_end: string;
  value: number;
  submitted_by: string;
};

async function seedMonthlyData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("Seeding monthly metric data with rollups...\n");

  const months = generateMonths();
  const founderEmails = COMPANIES.map((c) => c.founderEmail);

  // Look up companies by founder_email
  const { data: companies, error: lookupError } = await supabase
    .from("companies")
    .select("id, name, founder_id, founder_email")
    .in("founder_email", founderEmails);

  if (lookupError) {
    console.error("Error looking up companies:", lookupError);
    process.exit(1);
  }

  if (!companies || companies.length === 0) {
    console.error(
      "No companies found. Run seed-dummy-data.ts and seed-founder-data.ts first.",
    );
    process.exit(1);
  }

  console.log(`Found ${companies.length} of ${COMPANIES.length} companies.\n`);

  const companyByEmail = new Map(
    companies.map((c) => [c.founder_email, c]),
  );

  let totalInserted = 0;
  let companiesProcessed = 0;

  for (const companyDef of COMPANIES) {
    const company = companyByEmail.get(companyDef.founderEmail);
    if (!company) {
      console.log(
        `  SKIP ${companyDef.founderEmail} — company not found`,
      );
      continue;
    }
    if (!company.founder_id) {
      console.log(`  SKIP ${company.name} — no founder_id`);
      continue;
    }

    console.log(`${company.name}:`);

    // Delete existing metric values for a fresh start
    const { error: deleteError } = await supabase
      .from("company_metric_values")
      .delete()
      .eq("company_id", company.id);

    if (deleteError) {
      console.error(`  Error deleting existing metrics:`, deleteError);
      continue;
    }

    // Generate monthly values per metric
    // Quarterly/annual rollups are computed client-side by computeRollups()
    // in src/lib/metrics/rollup.ts, which shows rollup indicators (Σ/●).
    // Inserting them into the DB would suppress the rollup engine.
    const allRows: MetricRow[] = [];
    const metricCount = Object.keys(companyDef.metrics).length;

    for (const [metricName, config] of Object.entries(companyDef.metrics)) {
      const flow = isFlowMetric(metricName);
      const decimals = config.decimals ?? 0;

      // Flow metrics: divide start/end by 3 for monthly scale
      // (existing ranges are quarterly-scale)
      const start = flow ? config.start / 3 : config.start;
      const end = flow ? config.end / 3 : config.end;

      for (const month of months) {
        const progress = month.index / (months.length - 1);
        const raw = interpolateValue(start, end, progress);
        const value = roundValue(raw, decimals);

        allRows.push({
          company_id: company.id,
          metric_name: metricName,
          period_type: "monthly",
          period_start: month.periodStart,
          period_end: month.periodEnd,
          value,
          submitted_by: company.founder_id,
        });
      }
    }

    // Batch insert
    const BATCH_SIZE = 500;
    let inserted = 0;

    for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
      const batch = allRows.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase
        .from("company_metric_values")
        .insert(batch);

      if (insertError) {
        console.error(
          `  Error inserting batch at offset ${i}:`,
          insertError.message,
        );
      } else {
        inserted += batch.length;
      }
    }

    console.log(
      `  ${inserted} monthly rows (${metricCount} metrics x 36 months)`,
    );
    totalInserted += inserted;
    companiesProcessed++;
  }

  console.log(
    `\nDone! ${totalInserted} total rows across ${companiesProcessed} companies.`,
  );
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

async function cleanup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("Cleaning up metric values for all seeded companies...\n");

  const founderEmails = COMPANIES.map((c) => c.founderEmail);

  const { data: companies, error: lookupError } = await supabase
    .from("companies")
    .select("id, name, founder_email")
    .in("founder_email", founderEmails);

  if (lookupError) {
    console.error("Error looking up companies:", lookupError);
    process.exit(1);
  }

  if (!companies || companies.length === 0) {
    console.log("No matching companies found.");
    return;
  }

  const companyIds = companies.map((c) => c.id);
  console.log(`Found ${companies.length} companies:`);
  companies.forEach((c) => console.log(`  - ${c.name}`));

  const { error: deleteError } = await supabase
    .from("company_metric_values")
    .delete()
    .in("company_id", companyIds);

  if (deleteError) {
    console.error("Error deleting metric values:", deleteError);
  } else {
    console.log("\nDeleted all company_metric_values for these companies.");
  }

  console.log("Cleanup complete!");
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
if (args.includes("--cleanup")) {
  cleanup();
} else {
  seedMonthlyData();
}
