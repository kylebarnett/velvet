import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const INVESTOR_ID = "8047b3eb-4b06-4b69-b677-bcd4131c795c";
const DUMMY_FOUNDER_PASSWORD = "DummyFounder123!";

// Company definitions with their metrics (10+ metrics per company)
const COMPANIES = [
  {
    name: "SpaceX",
    website: "https://spacex.com",
    founderEmail: "elon@spacex.example.com",
    founderFirstName: "Elon",
    founderLastName: "Musk",
    industry: "ai_ml",
    stage: "growth",
    businessModel: "b2b",
    metrics: {
      Revenue: { start: 3200, end: 12000, unit: "M" },
      "Gross Margin": { start: 25, end: 35, unit: "%" },
      "Operating Expenses": { start: 800, end: 1200, unit: "M" },
      "Burn Rate": { start: 200, end: 150, unit: "M" },
      Runway: { start: 36, end: 48, unit: "months" },
      Headcount: { start: 12000, end: 15000, unit: "" },
      "Customer Count": { start: 150, end: 280, unit: "" },
      "Contract Value": { start: 8500, end: 18000, unit: "M" },
      "Launch Success Rate": { start: 94, end: 98, unit: "%" },
      "Launches Per Quarter": { start: 8, end: 15, unit: "" },
      "Starlink Subscribers": { start: 1000000, end: 3500000, unit: "" },
      EBITDA: { start: -100, end: 800, unit: "M" },
    },
  },
  {
    name: "Stripe",
    website: "https://stripe.com",
    founderEmail: "patrick@stripe.example.com",
    founderFirstName: "Patrick",
    founderLastName: "Collison",
    industry: "fintech",
    stage: "growth",
    businessModel: "b2b",
    metrics: {
      Revenue: { start: 14000, end: 22000, unit: "M" },
      "Gross Margin": { start: 45, end: 52, unit: "%" },
      GMV: { start: 800000, end: 1200000, unit: "M" },
      "Take Rate": { start: 1.75, end: 1.85, unit: "%" },
      "Active Merchants": { start: 3500000, end: 5000000, unit: "" },
      Headcount: { start: 7000, end: 8500, unit: "" },
      "Net Revenue Retention": { start: 115, end: 125, unit: "%" },
      "Customer Churn Rate": { start: 2.5, end: 1.8, unit: "%" },
      "Fraud Prevention Rate": { start: 99.2, end: 99.6, unit: "%" },
      ARPU: { start: 4000, end: 4400, unit: "" },
      "API Uptime": { start: 99.95, end: 99.99, unit: "%" },
      EBITDA: { start: 1200, end: 3500, unit: "M" },
    },
  },
  {
    name: "Databricks",
    website: "https://databricks.com",
    founderEmail: "ali@databricks.example.com",
    founderFirstName: "Ali",
    founderLastName: "Ghodsi",
    industry: "ai_ml",
    stage: "series_c",
    businessModel: "b2b",
    metrics: {
      ARR: { start: 1200, end: 2800, unit: "M" },
      Revenue: { start: 1100, end: 2600, unit: "M" },
      "Gross Margin": { start: 72, end: 78, unit: "%" },
      Customers: { start: 8000, end: 12000, unit: "" },
      "Net Revenue Retention": { start: 140, end: 145, unit: "%" },
      "Customer Churn Rate": { start: 3, end: 2, unit: "%" },
      Headcount: { start: 5000, end: 7000, unit: "" },
      "Data Processed": { start: 15, end: 45, unit: "EB" },
      "Enterprise Customers": { start: 1200, end: 2000, unit: "" },
      CAC: { start: 45000, end: 42000, unit: "" },
      LTV: { start: 350000, end: 420000, unit: "" },
      "Burn Rate": { start: 150, end: 80, unit: "M" },
    },
  },
  {
    name: "Canva",
    website: "https://canva.com",
    founderEmail: "melanie@canva.example.com",
    founderFirstName: "Melanie",
    founderLastName: "Perkins",
    industry: "saas",
    stage: "growth",
    businessModel: "b2b2c",
    metrics: {
      Revenue: { start: 1400, end: 2500, unit: "M" },
      ARR: { start: 1200, end: 2200, unit: "M" },
      "Gross Margin": { start: 85, end: 88, unit: "%" },
      MAU: { start: 100, end: 180, unit: "M" },
      "Paying Users": { start: 8, end: 16, unit: "M" },
      "Enterprise Teams": { start: 150000, end: 350000, unit: "" },
      ARPU: { start: 12.5, end: 13.75, unit: "" },
      "Net Revenue Retention": { start: 110, end: 118, unit: "%" },
      CAC: { start: 35, end: 32, unit: "" },
      LTV: { start: 180, end: 220, unit: "" },
      Headcount: { start: 3500, end: 4500, unit: "" },
      "Designs Created": { start: 15000, end: 25000, unit: "M" },
    },
  },
  {
    name: "Discord",
    website: "https://discord.com",
    founderEmail: "jason@discord.example.com",
    founderFirstName: "Jason",
    founderLastName: "Citron",
    industry: "saas",
    stage: "series_c",
    businessModel: "b2c",
    metrics: {
      Revenue: { start: 500, end: 800, unit: "M" },
      "Gross Margin": { start: 65, end: 72, unit: "%" },
      MAU: { start: 150, end: 200, unit: "M" },
      DAU: { start: 50, end: 75, unit: "M" },
      "Nitro Subscribers": { start: 8, end: 15, unit: "M" },
      ARPU: { start: 3.3, end: 4.0, unit: "" },
      "Server Count": { start: 19, end: 25, unit: "M" },
      "Messages Per Day": { start: 4000, end: 6500, unit: "M" },
      Headcount: { start: 650, end: 850, unit: "" },
      "Conversion Rate": { start: 5.3, end: 7.5, unit: "%" },
      "Burn Rate": { start: 80, end: 40, unit: "M" },
      CAC: { start: 8, end: 6.5, unit: "" },
    },
  },
  {
    name: "Figma",
    website: "https://figma.com",
    founderEmail: "dylan@figma.example.com",
    founderFirstName: "Dylan",
    founderLastName: "Field",
    industry: "saas",
    stage: "growth",
    businessModel: "b2b",
    metrics: {
      ARR: { start: 500, end: 800, unit: "M" },
      Revenue: { start: 450, end: 750, unit: "M" },
      "Gross Margin": { start: 88, end: 91, unit: "%" },
      Seats: { start: 4000000, end: 6000000, unit: "" },
      "Paying Organizations": { start: 150000, end: 280000, unit: "" },
      "Net Revenue Retention": { start: 135, end: 145, unit: "%" },
      "Enterprise ARR": { start: 150, end: 320, unit: "M" },
      MAU: { start: 4, end: 6, unit: "M" },
      Headcount: { start: 850, end: 1200, unit: "" },
      CAC: { start: 500, end: 450, unit: "" },
      LTV: { start: 8500, end: 10000, unit: "" },
      "Files Created": { start: 80, end: 150, unit: "M" },
    },
  },
  {
    name: "Instacart",
    website: "https://instacart.com",
    founderEmail: "fidji@instacart.example.com",
    founderFirstName: "Fidji",
    founderLastName: "Simo",
    industry: "ecommerce",
    stage: "growth",
    businessModel: "marketplace",
    metrics: {
      GMV: { start: 28000, end: 35000, unit: "M" },
      Revenue: { start: 2500, end: 3500, unit: "M" },
      "Gross Margin": { start: 32, end: 38, unit: "%" },
      Orders: { start: 250, end: 300, unit: "M" },
      AOV: { start: 112, end: 117, unit: "" },
      "Active Shoppers": { start: 600000, end: 750000, unit: "" },
      "Retail Partners": { start: 1100, end: 1500, unit: "" },
      MAU: { start: 12, end: 18, unit: "M" },
      "Take Rate": { start: 8.9, end: 10, unit: "%" },
      "Ad Revenue": { start: 600, end: 950, unit: "M" },
      Headcount: { start: 3200, end: 3800, unit: "" },
      EBITDA: { start: 150, end: 450, unit: "M" },
    },
  },
  {
    name: "Plaid",
    website: "https://plaid.com",
    founderEmail: "zach@plaid.example.com",
    founderFirstName: "Zach",
    founderLastName: "Perret",
    industry: "fintech",
    stage: "series_c",
    businessModel: "b2b",
    metrics: {
      Revenue: { start: 300, end: 500, unit: "M" },
      "Gross Margin": { start: 68, end: 74, unit: "%" },
      "API Calls": { start: 5000, end: 12000, unit: "M" },
      Customers: { start: 6000, end: 9000, unit: "" },
      "Connected Accounts": { start: 80, end: 120, unit: "M" },
      "Financial Institutions": { start: 11000, end: 12500, unit: "" },
      "Net Revenue Retention": { start: 125, end: 135, unit: "%" },
      ARPU: { start: 50000, end: 55000, unit: "" },
      Headcount: { start: 900, end: 1100, unit: "" },
      CAC: { start: 25000, end: 22000, unit: "" },
      LTV: { start: 180000, end: 220000, unit: "" },
      "Burn Rate": { start: 60, end: 30, unit: "M" },
    },
  },
  {
    name: "Notion",
    website: "https://notion.so",
    founderEmail: "ivan@notion.example.com",
    founderFirstName: "Ivan",
    founderLastName: "Zhao",
    industry: "saas",
    stage: "series_c",
    businessModel: "b2b2c",
    metrics: {
      ARR: { start: 300, end: 600, unit: "M" },
      Revenue: { start: 280, end: 550, unit: "M" },
      "Gross Margin": { start: 82, end: 86, unit: "%" },
      MAU: { start: 30, end: 50, unit: "M" },
      Teams: { start: 4000000, end: 8000000, unit: "" },
      "Enterprise Customers": { start: 8000, end: 18000, unit: "" },
      "Net Revenue Retention": { start: 125, end: 135, unit: "%" },
      ARPU: { start: 70, end: 75, unit: "" },
      Headcount: { start: 400, end: 650, unit: "" },
      CAC: { start: 150, end: 130, unit: "" },
      LTV: { start: 1200, end: 1500, unit: "" },
      "Pages Created": { start: 500, end: 1200, unit: "M" },
    },
  },
  {
    name: "Airtable",
    website: "https://airtable.com",
    founderEmail: "howie@airtable.example.com",
    founderFirstName: "Howie",
    founderLastName: "Liu",
    industry: "saas",
    stage: "series_c",
    businessModel: "b2b",
    metrics: {
      ARR: { start: 400, end: 600, unit: "M" },
      Revenue: { start: 350, end: 550, unit: "M" },
      "Gross Margin": { start: 78, end: 82, unit: "%" },
      Seats: { start: 300000, end: 500000, unit: "" },
      "Enterprise Customers": { start: 2500, end: 4500, unit: "" },
      "Net Revenue Retention": { start: 118, end: 128, unit: "%" },
      MAU: { start: 1.5, end: 2.5, unit: "M" },
      Headcount: { start: 800, end: 950, unit: "" },
      CAC: { start: 2500, end: 2200, unit: "" },
      LTV: { start: 15000, end: 18000, unit: "" },
      "Bases Created": { start: 25, end: 45, unit: "M" },
      "Burn Rate": { start: 45, end: 25, unit: "M" },
    },
  },
];

// Generate quarterly periods from Q1 2023 to Q4 2025
function generateQuarters(): Array<{
  label: string;
  periodStart: string;
  periodEnd: string;
  index: number;
}> {
  const quarters = [];
  let index = 0;
  for (let year = 2023; year <= 2025; year++) {
    for (let q = 1; q <= 4; q++) {
      const startMonth = (q - 1) * 3 + 1;
      const endMonth = q * 3;
      const lastDay =
        endMonth === 3 || endMonth === 12
          ? 31
          : endMonth === 6 || endMonth === 9
            ? 30
            : 28;

      quarters.push({
        label: `Q${q} ${year}`,
        periodStart: `${year}-${String(startMonth).padStart(2, "0")}-01`,
        periodEnd: `${year}-${String(endMonth).padStart(2, "0")}-${lastDay}`,
        index,
      });
      index++;
    }
  }
  return quarters;
}

// Interpolate metric value with some variance
function interpolateValue(
  start: number,
  end: number,
  progress: number,
  addVariance = true,
): number {
  const base = start + (end - start) * progress;
  if (!addVariance) return base;
  // Add +/- 5% variance for realism
  const variance = base * (Math.random() * 0.1 - 0.05);
  return base + variance;
}

// Helper to wait for the public.users trigger to complete
async function waitForUserRecord(
  supabase: SupabaseClient,
  userId: string,
  maxAttempts = 10,
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();
    if (data) return true;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

async function seedData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log("Seeding dummy data...\n");

  const quarters = generateQuarters();
  const companyNames = COMPANIES.map((c) => c.name);

  // Check if dummy data already exists
  const { data: existingCompanies } = await supabase
    .from("companies")
    .select("id, name")
    .in("name", companyNames);

  if (existingCompanies && existingCompanies.length > 0) {
    console.log(
      `Found ${existingCompanies.length} existing dummy companies. Run with --cleanup to remove them first.`,
    );
    process.exit(1);
  }

  // Verify investor exists
  const { data: investor } = await supabase
    .from("users")
    .select("id")
    .eq("id", INVESTOR_ID)
    .single();

  if (!investor) {
    console.error(`Investor with ID ${INVESTOR_ID} not found.`);
    process.exit(1);
  }

  console.log(`Found investor: ${INVESTOR_ID}`);

  for (const company of COMPANIES) {
    console.log(`\nCreating ${company.name}...`);

    // 1. Create founder auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: company.founderEmail,
        password: DUMMY_FOUNDER_PASSWORD,
        email_confirm: true,
        user_metadata: {
          first_name: company.founderFirstName,
          last_name: company.founderLastName,
          role: "founder",
        },
      });

    if (authError) {
      console.error(
        `Error creating auth user for ${company.name}:`,
        authError,
      );
      continue;
    }

    const founderId = authData.user.id;
    console.log(`  Created founder user: ${founderId}`);

    // Wait for the public.users trigger to complete
    const userCreated = await waitForUserRecord(supabase, founderId);
    if (!userCreated) {
      console.error(`  Timeout waiting for public.users record for ${founderId}`);
      continue;
    }

    // 2. Insert company with founder
    const { data: newCompany, error: companyError } = await supabase
      .from("companies")
      .insert({
        name: company.name,
        website: company.website,
        founder_id: founderId,
        founder_email: company.founderEmail,
        industry: company.industry,
        stage: company.stage,
        business_model: company.businessModel,
      })
      .select()
      .single();

    if (companyError) {
      console.error(`Error creating company ${company.name}:`, companyError);
      continue;
    }

    console.log(`  Created company: ${newCompany.id}`);

    // 3. Create investor relationship (approved)
    const { error: relError } = await supabase
      .from("investor_company_relationships")
      .insert({
        investor_id: INVESTOR_ID,
        company_id: newCompany.id,
        approval_status: "approved",
        is_inviting_investor: true,
      });

    if (relError) {
      console.error(
        `Error creating relationship for ${company.name}:`,
        relError,
      );
    } else {
      console.log(`  Created approved relationship`);
    }

    // 4. Create portfolio invitation (accepted)
    const { error: invError } = await supabase
      .from("portfolio_invitations")
      .insert({
        investor_id: INVESTOR_ID,
        company_id: newCompany.id,
        email: company.founderEmail,
        first_name: company.founderFirstName,
        last_name: company.founderLastName,
        status: "accepted",
      });

    if (invError) {
      console.error(`Error creating invitation for ${company.name}:`, invError);
    } else {
      console.log(`  Created accepted invitation`);
    }

    // 5. Insert metric values for each quarter (submitted by founder)
    const metricValues = [];
    for (const [metricName, config] of Object.entries(company.metrics)) {
      for (const quarter of quarters) {
        const progress = quarter.index / (quarters.length - 1);
        let value = interpolateValue(config.start, config.end, progress);

        // Round appropriately based on metric type
        if (
          metricName === "Take Rate" ||
          metricName === "Net Revenue Retention"
        ) {
          value = Math.round(value * 100) / 100; // 2 decimal places
        } else if (metricName === "ARPU") {
          value = Math.round(value * 100) / 100; // 2 decimal places
        } else if (config.unit === "M" || config.unit === "%") {
          value = Math.round(value);
        } else {
          value = Math.round(value);
        }

        metricValues.push({
          company_id: newCompany.id,
          metric_name: metricName,
          period_type: "quarterly",
          period_start: quarter.periodStart,
          period_end: quarter.periodEnd,
          value: value,
          submitted_by: founderId,
        });
      }
    }

    const { error: metricsError } = await supabase
      .from("company_metric_values")
      .insert(metricValues);

    if (metricsError) {
      console.error(
        `Error inserting metrics for ${company.name}:`,
        metricsError,
      );
    } else {
      console.log(`  Inserted ${metricValues.length} metric values`);
    }
  }

  console.log("\nDummy data seeding complete!");
}

async function cleanupData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log("Cleaning up dummy data...\n");

  const companyNames = COMPANIES.map((c) => c.name);
  const founderEmails = COMPANIES.map((c) => c.founderEmail);

  // Get company IDs and founder IDs
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, founder_id")
    .in("name", companyNames);

  if (!companies || companies.length === 0) {
    console.log("No dummy companies found to clean up.");
    return;
  }

  const companyIds = companies.map((c) => c.id);
  const founderIds = companies
    .map((c) => c.founder_id)
    .filter((id): id is string => id !== null);
  console.log(`Found ${companies.length} dummy companies to delete:`);
  companies.forEach((c) => console.log(`  - ${c.name}`));

  // Delete in order (cascade should handle most, but being explicit)

  // 1. Delete metric values
  const { error: metricsError } = await supabase
    .from("company_metric_values")
    .delete()
    .in("company_id", companyIds);

  if (metricsError) {
    console.error("Error deleting metrics:", metricsError);
  } else {
    console.log("\nDeleted company_metric_values");
  }

  // 2. Delete portfolio invitations
  const { error: invError } = await supabase
    .from("portfolio_invitations")
    .delete()
    .in("company_id", companyIds);

  if (invError) {
    console.error("Error deleting invitations:", invError);
  } else {
    console.log("Deleted portfolio_invitations");
  }

  // 3. Delete relationships
  const { error: relError } = await supabase
    .from("investor_company_relationships")
    .delete()
    .in("company_id", companyIds);

  if (relError) {
    console.error("Error deleting relationships:", relError);
  } else {
    console.log("Deleted investor_company_relationships");
  }

  // 4. Delete companies
  const { error: compError } = await supabase
    .from("companies")
    .delete()
    .in("id", companyIds);

  if (compError) {
    console.error("Error deleting companies:", compError);
  } else {
    console.log("Deleted companies");
  }

  // 5. Delete founder auth users
  if (founderIds.length > 0) {
    console.log(`\nDeleting ${founderIds.length} founder auth users...`);
    for (const founderId of founderIds) {
      const { error: authError } =
        await supabase.auth.admin.deleteUser(founderId);
      if (authError) {
        console.error(`Error deleting auth user ${founderId}:`, authError);
      }
    }
    console.log("Deleted founder auth users");
  }

  // Also try to delete any orphaned auth users by email
  for (const email of founderEmails) {
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users?.find((u) => u.email === email);
    if (user) {
      const { error: authError } =
        await supabase.auth.admin.deleteUser(user.id);
      if (authError) {
        console.error(`Error deleting orphaned auth user ${email}:`, authError);
      } else {
        console.log(`Deleted orphaned auth user: ${email}`);
      }
    }
  }

  console.log("\nCleanup complete!");
}

// Main
const args = process.argv.slice(2);
if (args.includes("--cleanup")) {
  cleanupData();
} else {
  seedData();
}
