import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";
import { createRequire } from "node:module";
const nodeRequire = createRequire(import.meta.url);
const { jsPDF } = nodeRequire("jspdf/dist/jspdf.node.js");

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

// Document seeding configuration
type DocumentPlan = {
  quarter: string; // e.g. "Q4 2024"
  periodStart: string;
  periodEnd: string;
  documentType: string;
  filename: string;
  linkedMetrics: string[];
};

// The 5 quarterly documents to create per company
function getDocumentPlans(quarters: ReturnType<typeof generateQuarters>): DocumentPlan[] {
  // Map quarter labels to quarters array entries
  const qMap = new Map(quarters.map((q) => [q.label, q]));

  return [
    {
      quarter: "Q4 2024",
      ...qMap.get("Q4 2024")!,
      documentType: "income_statement",
      filename: "Q4_2024_Income_Statement.pdf",
      linkedMetrics: ["Revenue", "Gross Margin", "Operating Expenses", "EBITDA"],
    },
    {
      quarter: "Q1 2025",
      ...qMap.get("Q1 2025")!,
      documentType: "income_statement",
      filename: "Q1_2025_Income_Statement.pdf",
      linkedMetrics: ["Revenue", "Gross Margin", "Operating Expenses", "EBITDA"],
    },
    {
      quarter: "Q2 2025",
      ...qMap.get("Q2 2025")!,
      documentType: "cash_flow_statement",
      filename: "Q2_2025_Cash_Flow_Statement.pdf",
      linkedMetrics: ["Burn Rate"],
    },
    {
      quarter: "Q3 2025",
      ...qMap.get("Q3 2025")!,
      documentType: "income_statement",
      filename: "Q3_2025_Income_Statement.pdf",
      linkedMetrics: ["Revenue", "Gross Margin", "Operating Expenses", "EBITDA"],
    },
    {
      quarter: "Q4 2025",
      ...qMap.get("Q4 2025")!,
      documentType: "consolidated_financial_statements",
      filename: "Q4_2025_Financial_Statements.pdf",
      linkedMetrics: ["Revenue", "Gross Margin", "Operating Expenses", "EBITDA", "Burn Rate"],
    },
  ];
}

// Format a number for display in the PDF
function formatPdfValue(value: number, unit: string): string {
  if (unit === "%") return `${value.toFixed(1)}%`;
  if (unit === "M") return `$${value.toLocaleString()}M`;
  return value.toLocaleString();
}

// Generate a multi-page financial statement PDF
function generateFinancialStatementPdf(
  companyName: string,
  documentType: string,
  quarter: string,
  periodStart: string,
  periodEnd: string,
  capturedValues: Map<string, Map<string, number>>,
  companyMetrics: Record<string, { start: number; end: number; unit: string }>,
): Buffer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = new (jsPDF as any)({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 60;

  // --- Page 1: Cover page ---
  const typeLabel =
    documentType === "income_statement"
      ? "Income Statement"
      : documentType === "cash_flow_statement"
        ? "Cash Flow Statement"
        : "Consolidated Financial Statements";

  doc.setFontSize(28);
  doc.text(companyName, pageWidth / 2, 200, { align: "center" });

  doc.setFontSize(18);
  doc.text(typeLabel, pageWidth / 2, 250, { align: "center" });

  doc.setFontSize(14);
  doc.text(quarter, pageWidth / 2, 290, { align: "center" });

  doc.setFontSize(11);
  doc.text(
    `Period: ${periodStart} to ${periodEnd}`,
    pageWidth / 2,
    330,
    { align: "center" },
  );

  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text("CONFIDENTIAL", pageWidth / 2, pageHeight - 80, { align: "center" });
  doc.text(
    `Prepared for internal use — ${new Date().getFullYear()}`,
    pageWidth / 2,
    pageHeight - 60,
    { align: "center" },
  );
  doc.setTextColor(0);

  // --- Page 2+: Financial table ---
  doc.addPage();

  let y = margin + 20;

  doc.setFontSize(14);
  doc.text(typeLabel, margin, y);
  y += 10;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`${companyName} — ${quarter} (${periodStart} to ${periodEnd})`, margin, y + 12);
  doc.setTextColor(0);
  y += 35;

  // Table header
  const col1 = margin;
  const col2 = 320;
  const col3 = 430;
  const rowHeight = 22;

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Line Item", col1, y);
  doc.text("Current Quarter", col2, y, { align: "right" });
  doc.text("Unit", col3, y, { align: "right" });
  doc.setTextColor(0);
  y += 8;
  doc.setDrawColor(200);
  doc.line(col1, y, col3 + 20, y);
  y += rowHeight * 0.7;

  // Build line items based on document type
  type LineItem = { label: string; metricName: string; indent?: boolean };
  const lineItems: LineItem[] = [];

  if (documentType === "income_statement" || documentType === "consolidated_financial_statements") {
    lineItems.push(
      { label: "Revenue", metricName: "Revenue" },
      { label: "Gross Margin", metricName: "Gross Margin" },
      { label: "Operating Expenses", metricName: "Operating Expenses" },
      { label: "EBITDA", metricName: "EBITDA" },
    );
  }
  if (documentType === "cash_flow_statement" || documentType === "consolidated_financial_statements") {
    if (documentType === "consolidated_financial_statements") {
      // Add separator
      lineItems.push({ label: "", metricName: "" });
      lineItems.push({ label: "Cash Flow Summary", metricName: "" });
    }
    lineItems.push({ label: "Monthly Burn Rate", metricName: "Burn Rate" });
  }

  doc.setFontSize(10);
  for (const item of lineItems) {
    if (!item.metricName && !item.label) {
      // Blank separator
      y += rowHeight * 0.5;
      continue;
    }
    if (!item.metricName && item.label) {
      // Section header
      doc.setFontSize(11);
      doc.text(item.label, col1, y);
      doc.setFontSize(10);
      y += 6;
      doc.line(col1, y, col3 + 20, y);
      y += rowHeight * 0.7;
      continue;
    }

    // Check if we need a new page
    if (y > pageHeight - margin - 40) {
      doc.addPage();
      y = margin + 20;
    }

    const metricValues = capturedValues.get(item.metricName);
    const value = metricValues?.get(periodStart);
    const unit = companyMetrics[item.metricName]?.unit ?? "";

    doc.text(item.indent ? `  ${item.label}` : item.label, col1, y);
    if (value != null) {
      doc.text(formatPdfValue(value, unit), col2, y, { align: "right" });
      doc.text(unit || "—", col3, y, { align: "right" });
    } else {
      doc.text("N/A", col2, y, { align: "right" });
    }
    y += rowHeight;
  }

  // Footer line
  y += 10;
  doc.setDrawColor(200);
  doc.line(col1, y, col3 + 20, y);
  y += 16;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("This document was generated for demonstration purposes.", col1, y);
  doc.setTextColor(0);

  // Return as Buffer
  const arrayBuf = doc.output("arraybuffer");
  return Buffer.from(arrayBuf);
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
    // Also capture computed values for PDF generation (Step 1 of plan)
    const capturedValues = new Map<string, Map<string, number>>();
    const metricValues = [];
    for (const [metricName, config] of Object.entries(company.metrics)) {
      const metricMap = new Map<string, number>();
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

        metricMap.set(quarter.periodStart, value);
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
      capturedValues.set(metricName, metricMap);
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

    // 6. Generate and seed financial statement documents
    const docPlans = getDocumentPlans(quarters);
    let docsCreated = 0;
    let mappingsCreated = 0;

    for (const plan of docPlans) {
      // Generate PDF with captured metric values
      const pdfBuffer = generateFinancialStatementPdf(
        company.name,
        plan.documentType,
        plan.quarter,
        plan.periodStart,
        plan.periodEnd,
        capturedValues,
        company.metrics as unknown as Record<string, { start: number; end: number; unit: string }>,
      );

      // Upload to Supabase Storage
      const storagePath = `${newCompany.id}/${Date.now()}-${plan.filename}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, pdfBuffer, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        console.error(`  Error uploading ${plan.filename}:`, uploadError);
        continue;
      }

      // Insert document row
      const { data: docRow, error: docError } = await supabase
        .from("documents")
        .insert({
          company_id: newCompany.id,
          uploaded_by: founderId,
          file_name: plan.filename,
          file_path: storagePath,
          file_type: "application/pdf",
          file_size: pdfBuffer.length,
          document_type: plan.documentType,
          description: `${plan.quarter} ${plan.documentType.replace(/_/g, " ")} for ${company.name}`,
          ingestion_status: "completed",
        })
        .select("id")
        .single();

      if (docError || !docRow) {
        console.error(`  Error inserting document ${plan.filename}:`, docError);
        continue;
      }

      docsCreated++;

      // Update matching company_metric_values with source_document_id
      // and insert document_metric_mappings
      const availableMetrics = plan.linkedMetrics.filter(
        (m) => capturedValues.has(m),
      );

      for (const metricName of availableMetrics) {
        // Update the metric value row for this quarter
        const { data: updatedRows } = await supabase
          .from("company_metric_values")
          .update({
            source: "ai_extracted",
            source_document_id: docRow.id,
            ai_confidence: 0.95,
          })
          .eq("company_id", newCompany.id)
          .eq("metric_name", metricName)
          .eq("period_start", plan.periodStart)
          .select("id, value");

        const metricValueId = updatedRows?.[0]?.id;
        const metricValue = updatedRows?.[0]?.value;

        // Insert document_metric_mapping
        if (metricValueId) {
          const { error: mappingError } = await supabase
            .from("document_metric_mappings")
            .insert({
              document_id: docRow.id,
              metric_value_id: metricValueId,
              extracted_metric_name: metricName,
              extracted_value: metricValue,
              extracted_period_start: plan.periodStart,
              extracted_period_end: plan.periodEnd,
              extracted_period_type: "quarterly",
              confidence_score: 0.95,
              status: "accepted",
            });

          if (!mappingError) mappingsCreated++;
        }
      }
    }

    console.log(`  Created ${docsCreated} documents, ${mappingsCreated} metric mappings`);
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

  // 0a. Delete document_metric_mappings and storage files for documents
  const { data: docs } = await supabase
    .from("documents")
    .select("id, file_path")
    .in("company_id", companyIds);

  if (docs && docs.length > 0) {
    const docIds = docs.map((d) => d.id);

    // Delete document_metric_mappings (FK cascade from documents would handle this,
    // but being explicit for clean ordering)
    const { error: mappingsError } = await supabase
      .from("document_metric_mappings")
      .delete()
      .in("document_id", docIds);

    if (mappingsError) {
      console.error("Error deleting document_metric_mappings:", mappingsError);
    } else {
      console.log("\nDeleted document_metric_mappings");
    }

    // Delete storage files
    const storagePaths = docs.map((d) => d.file_path).filter(Boolean);
    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("documents")
        .remove(storagePaths);

      if (storageError) {
        console.error("Error deleting storage files:", storageError);
      } else {
        console.log(`Deleted ${storagePaths.length} storage files`);
      }
    }

    // 0b. Delete document rows
    const { error: docsError } = await supabase
      .from("documents")
      .delete()
      .in("id", docIds);

    if (docsError) {
      console.error("Error deleting documents:", docsError);
    } else {
      console.log(`Deleted ${docs.length} documents`);
    }
  }

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

// Add documents to existing seed companies without touching metrics/settings
async function addDocuments() {
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

  console.log("Adding documents to existing seed companies...\n");

  const companyNames = COMPANIES.map((c) => c.name);
  const quarters = generateQuarters();
  const docPlans = getDocumentPlans(quarters);

  // Look up existing companies
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, founder_id")
    .in("name", companyNames);

  if (!companies || companies.length === 0) {
    console.error("No seed companies found. Run the seed script first.");
    process.exit(1);
  }

  console.log(`Found ${companies.length} seed companies.`);

  // Clean up any existing documents first (idempotent)
  const companyIds = companies.map((c) => c.id);
  const { data: existingDocs } = await supabase
    .from("documents")
    .select("id, file_path")
    .in("company_id", companyIds);

  if (existingDocs && existingDocs.length > 0) {
    console.log(`Cleaning up ${existingDocs.length} existing documents first...`);
    const existingDocIds = existingDocs.map((d) => d.id);

    // Clear source_document_id references on metric values before deleting docs
    await supabase
      .from("company_metric_values")
      .update({ source_document_id: null, source: "manual", ai_confidence: null })
      .in("source_document_id", existingDocIds);

    await supabase
      .from("document_metric_mappings")
      .delete()
      .in("document_id", existingDocIds);

    const storagePaths = existingDocs.map((d) => d.file_path).filter(Boolean);
    if (storagePaths.length > 0) {
      await supabase.storage.from("documents").remove(storagePaths);
    }

    await supabase
      .from("documents")
      .delete()
      .in("id", existingDocIds);

    console.log("  Cleaned up existing documents.\n");
  }

  for (const dbCompany of companies) {
    const companyDef = COMPANIES.find((c) => c.name === dbCompany.name);
    if (!companyDef) continue;

    console.log(`\n${dbCompany.name}:`);

    // Read existing metric values from DB for this company
    const { data: metricRows } = await supabase
      .from("company_metric_values")
      .select("id, metric_name, period_start, period_end, value")
      .eq("company_id", dbCompany.id);

    if (!metricRows || metricRows.length === 0) {
      console.log("  No metric values found, skipping.");
      continue;
    }

    // Build capturedValues map from existing DB data
    const capturedValues = new Map<string, Map<string, number>>();
    for (const row of metricRows) {
      if (!capturedValues.has(row.metric_name)) {
        capturedValues.set(row.metric_name, new Map());
      }
      // Extract numeric value from DB (stored as number or {raw: "..."})
      let num: number | null = null;
      if (typeof row.value === "number") {
        num = row.value;
      } else if (row.value && typeof row.value === "object") {
        const obj = row.value as Record<string, unknown>;
        const raw = obj.raw ?? obj.value;
        if (raw != null) num = Number(raw);
      }
      if (num != null && !isNaN(num)) {
        capturedValues.get(row.metric_name)!.set(row.period_start, num);
      }
    }

    let docsCreated = 0;
    let mappingsCreated = 0;

    for (const plan of docPlans) {
      // Generate PDF with existing metric values
      const pdfBuffer = generateFinancialStatementPdf(
        dbCompany.name,
        plan.documentType,
        plan.quarter,
        plan.periodStart,
        plan.periodEnd,
        capturedValues,
        companyDef.metrics as unknown as Record<string, { start: number; end: number; unit: string }>,
      );

      // Upload to Supabase Storage
      const storagePath = `${dbCompany.id}/${Date.now()}-${plan.filename}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, pdfBuffer, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        console.error(`  Error uploading ${plan.filename}:`, uploadError);
        continue;
      }

      // Insert document row
      const { data: docRow, error: docError } = await supabase
        .from("documents")
        .insert({
          company_id: dbCompany.id,
          uploaded_by: dbCompany.founder_id,
          file_name: plan.filename,
          file_path: storagePath,
          file_type: "application/pdf",
          file_size: pdfBuffer.length,
          document_type: plan.documentType,
          description: `${plan.quarter} ${plan.documentType.replace(/_/g, " ")} for ${dbCompany.name}`,
          ingestion_status: "completed",
        })
        .select("id")
        .single();

      if (docError || !docRow) {
        console.error(`  Error inserting document ${plan.filename}:`, docError);
        continue;
      }

      docsCreated++;

      // Link matching metric values
      const availableMetrics = plan.linkedMetrics.filter(
        (m) => capturedValues.has(m),
      );

      for (const metricName of availableMetrics) {
        const { data: updatedRows } = await supabase
          .from("company_metric_values")
          .update({
            source: "ai_extracted",
            source_document_id: docRow.id,
            ai_confidence: 0.95,
          })
          .eq("company_id", dbCompany.id)
          .eq("metric_name", metricName)
          .eq("period_start", plan.periodStart)
          .select("id, value");

        const metricValueId = updatedRows?.[0]?.id;
        const metricValue = updatedRows?.[0]?.value;

        if (metricValueId) {
          const { error: mappingError } = await supabase
            .from("document_metric_mappings")
            .insert({
              document_id: docRow.id,
              metric_value_id: metricValueId,
              extracted_metric_name: metricName,
              extracted_value: metricValue,
              extracted_period_start: plan.periodStart,
              extracted_period_end: plan.periodEnd,
              extracted_period_type: "quarterly",
              confidence_score: 0.95,
              status: "accepted",
            });

          if (!mappingError) mappingsCreated++;
        }
      }
    }

    console.log(`  Created ${docsCreated} documents, ${mappingsCreated} metric mappings`);
  }

  console.log("\nDocument seeding complete!");
}

// Main
const args = process.argv.slice(2);
if (args.includes("--cleanup")) {
  cleanupData();
} else if (args.includes("--add-documents")) {
  addDocuments();
} else {
  seedData();
}
