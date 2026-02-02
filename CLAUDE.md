# Velvet - Project Requirements & Preferences

> **Note:** Keep this file updated whenever there are architectural changes, new patterns, or important decisions. This serves as the source of truth for project conventions.

## Overview

Velvet is a portfolio metrics platform connecting investors with founders. Investors can import portfolio companies, invite founders, and request metrics. Founders can submit metrics and upload documents.

## Architecture

### User Roles
- **Investors** - Manage portfolio companies, send metric requests, invite founders
- **Founders** - Submit metrics, upload documents, respond to requests

### Route Structure
- Investors: `/dashboard`, `/dashboard/[companyId]`, `/dashboard/[companyId]/edit`, `/dashboard/[companyId]/metrics`, `/portfolio`, `/reports`, `/reports/compare`, `/reports/trends`, `/requests`, `/requests/new`, `/templates`, `/templates/new`, `/templates/[id]`, `/documents`
- Founders: `/portal`, `/portal/requests`, `/portal/metrics`, `/portal/investors`, `/portal/documents`
- Auth: `/login`, `/signup`, `/app` (redirects based on role)

### Key Principles
- **Every account is standalone.** Investors and founders have completely separate dashboards. Each founder has their own isolated account and data.
- **Multi-investor support.** Multiple investors can be linked to the same company. Companies are deduplicated by `founder_email` at import time.
- **Founder-controlled access.** Founders approve or deny each investor. The inviting investor is auto-approved on founder signup; others start as pending.
- **Company-level submissions.** Founders submit metrics once to `company_metric_values`. All approved investors see the same data. A DB trigger auto-fulfills matching `metric_requests`.

## Database

### Tables
- `users` - Linked to Supabase auth.users via trigger
- `companies` - Portfolio companies (founder_id nullable for investor imports, founder_email for dedup, stage/industry/business_model tags)
- `investor_company_relationships` - Maps investors to portfolio companies (approval_status: auto_approved/pending/approved/denied, is_inviting_investor flag, logo_url for per-investor logos)
- `portfolio_invitations` - Founder contacts with invitation status
- `metric_definitions` - Investor-defined metrics (personal catalog, reused via upsert)
- `metric_requests` - Requests from investors to founders (auto-fulfilled by DB trigger)
- `metric_submissions` - Legacy founder responses (no longer written to; kept for backward compatibility)
- `metric_templates` - Metric sets (name, description, is_system, target_industry). System templates have `investor_id = NULL`, user templates require `investor_id`
- `metric_template_items` - Individual metrics in a template (metric_name, period_type, data_type, sort_order)
- `company_metric_values` - Company-level shared submissions (unique per company+metric+period, auto-fulfills matching requests via trigger)
- `documents` - Uploaded files from founders (document_type enum, description)
- `dashboard_views` - Saved dashboard layouts per investor per company (name, is_default, layout JSON)
- `dashboard_templates` - System-wide dashboard presets (name, description, target_industry, layout JSON)
- `portfolio_reports` - Saved report configurations per investor (name, report_type, filters, company_ids, normalize, config, is_default)

### RLS Policies
- All tables have Row Level Security enabled
- Role-based access using `auth.uid()` and `current_user_role()` helper
- Investors can only access their own portfolio data
- Founders can only access their own company data
- `company_metric_values`: founders INSERT/UPDATE own company; approved investors SELECT only
- `metric_requests` SELECT: founders only see requests from approved investors
- `investor_company_relationships` UPDATE: founders can approve/deny for their company
- `metric_templates` + `metric_template_items`: investor CRUD own
- `documents`: founders INSERT/UPDATE own company; approved investors SELECT only
- `dashboard_views`: investors CRUD own views
- `dashboard_templates`: all authenticated users can SELECT system templates
- `portfolio_reports`: investors CRUD own reports

## Styling

### Theme
- Dark theme with zinc/black backgrounds
- Primary background: `bg-zinc-950`
- Card backgrounds: `bg-white/5` or `bg-black/30`
- Borders: `border-white/10`
- Text: `text-zinc-50` (primary), `text-white/70` or `text-white/60` (secondary)

### Components
- Inputs: `h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm`
- Buttons (primary): `bg-white text-black hover:bg-white/90`
- Buttons (secondary): `border border-white/10 bg-white/5 hover:bg-white/10`
- Cards: `rounded-xl border border-white/10 bg-white/5 p-4`

### Status Badges
- Pending: `bg-amber-500/20 text-amber-200`
- Sent: `bg-blue-500/20 text-blue-200`
- Accepted: `bg-emerald-500/20 text-emerald-200`

### Messages
- Error: `border-red-500/20 bg-red-500/10 text-red-200`
- Success: `border-emerald-500/20 bg-emerald-500/10 text-emerald-200`
- Info: `border-blue-500/20 bg-blue-500/10 text-blue-200`

## Forms

### Validation
- Use Zod for schema validation
- Use react-hook-form with zodResolver
- Display field errors in `text-xs text-red-300`

### Pattern
```tsx
const schema = z.object({ ... });
const form = useForm({ resolver: zodResolver(schema) });

async function onSubmit(values) {
  try {
    const res = await fetch("/api/...", { ... });
    if (!res.ok) throw new Error(json?.error);
    // success handling
  } catch (err) {
    setError(err.message);
  }
}
```

## API Routes

### Authentication
- Use `getApiUser()` from `@/lib/api/auth` for authentication
- Check `user.user_metadata?.role` for authorization
- Return `jsonError("Unauthorized.", 401)` if not authenticated
- Return `jsonError("Forbidden.", 403)` if wrong role

### Authorization Pattern
Always verify ownership before operations:
```typescript
// Investor: verify company is in portfolio
const { data: relationship } = await supabase
  .from("investor_company_relationships")
  .eq("investor_id", user.id)
  .eq("company_id", companyId)
  .single();
if (!relationship) return jsonError("Company not in portfolio.", 403);

// Founder: verify owns the company
const { data: company } = await supabase
  .from("companies")
  .eq("id", companyId)
  .eq("founder_id", user.id)
  .single();
if (!company) return jsonError("Not authorized.", 403);
```

### Response Format
- Success: `NextResponse.json({ id, ok: true, ... })`
- Error: `jsonError("Message", statusCode)`

## Invite Flow

### Process
1. Investor imports CSV or adds contact manually
2. Contact stored in `portfolio_invitations` with status "pending"
3. Investor sends invitation (email or copy link in dev mode)
4. Founder clicks link → `/signup?invite={token}`
5. Signup validates email matches invitation
6. Founder linked to company, invitation status → "accepted"

### Email Matching
Invite token signup requires the signup email to match the invitation email. This prevents account hijacking if someone intercepts the invite token.

### Auto-Approval on Signup
When a founder signs up via an invite link, the inviting investor's relationship is set to `auto_approved`. Other investors who later import the same founder email will get `pending` status and must be approved by the founder.

## Multi-Investor Company Dedup

### Import Logic
When an investor imports contacts via CSV:
1. Normalize email to lowercase
2. Check `companies.founder_email` for a match
3. If no match, check `users.email` → `companies.founder_id` for a signed-up founder
4. If match found: reuse existing company, add new relationship (approval_status = 'pending')
5. If no match: create new company with `founder_email` set

### Contact Deletion
When deleting a contact, the company is only deleted if:
- No founder has signed up (`founder_id` is null), AND
- No other investors are linked to it

## Founder Approval Model

### Approval Statuses
- `auto_approved` - The investor who invited the founder (set automatically on signup)
- `pending` - Other investors who imported the same founder email
- `approved` - Founder explicitly approved this investor
- `denied` - Founder explicitly denied this investor

### What Approval Controls
- Approved/auto-approved investors can see `company_metric_values` via RLS
- Founders only see `metric_requests` from approved investors
- The auto-fulfill trigger only marks requests from approved investors as "submitted"

### API Routes
- `GET /api/founder/investors` - List investors with approval status
- `PUT /api/founder/investors/[relationshipId]/approval` - Approve or deny (cannot change auto_approved)

## Metric Submission Model

### Company-Level Submissions
Founders submit to `company_metric_values` (not per-request). This means:
- One submission per metric + period + company
- All approved investors see the same value
- Upsert on conflict (company_id, metric_name, period_type, period_start, period_end)

### Auto-Fulfill Trigger
A DB trigger (`trg_auto_fulfill_metric_requests`) fires on INSERT/UPDATE to `company_metric_values` and:
- Matches by `lower(metric_name)` + `period_type` + `period_start` + `period_end`
- Only fulfills requests from investors with `approval_status IN ('auto_approved', 'approved')`
- Sets matching `metric_requests.status = 'submitted'`

### Founder Request View
The `GET /api/founder/metric-requests` endpoint returns a deduplicated view:
- Groups requests by metric_name + period
- Shows investor count per group (e.g., "2 investors want MRR for Jan 2025")
- Indicates whether a submission already exists

### API Routes
- `POST /api/metrics/submit` - Submit a metric value (founder, writes to company_metric_values)
- `GET /api/founder/metric-requests` - Deduplicated requests view
- `GET /api/founder/company-metrics` - Submission history

## Company Tags

### Tag Types
- **Stage**: seed, series_a, series_b, series_c, growth
- **Industry**: saas, fintech, healthcare, ecommerce, edtech, ai_ml, other
- **Business Model**: b2b, b2c, b2b2c, marketplace, other

### Usage
Tags are used for filtering portfolio companies and selecting companies for template assignment. Investors can edit tags via the portfolio page.

### API Routes
- `GET /api/investors/companies` - List companies with tags and logos
- `PUT /api/investors/companies/[id]/tags` - Update company tags
- `POST /api/investors/companies/[id]/logo` - Upload company logo (multipart/form-data)
- `DELETE /api/investors/companies/[id]/logo` - Remove custom logo

## Company Logos

### Overview
Investors can upload custom logos for portfolio companies. Logos are per-investor (not shared across investors viewing the same company). Upload is only available on the Portfolio page; Dashboard displays logos read-only.

### Fallback
- Custom uploaded logo (stored in Supabase Storage)
- Company initial letter (UI fallback if no logo uploaded)

### Storage
- Bucket: `company-logos`
- Path: `{investor_id}/{company_id}.{ext}`
- Allowed types: PNG, JPG, WebP (SVG excluded for security - can contain XSS)
- Max size: 2MB

### Components
- `src/components/investor/company-logo.tsx` - Reusable logo component with upload functionality (editable on Portfolio)
- `src/components/investor/dashboard-company-list.tsx` - Dashboard company list with logos (read-only)
- `src/lib/utils/logo.ts` - Logo URL utility `getCompanyLogoUrl()`

### UI Behavior (Portfolio page)
- Click logo placeholder to upload
- Hover shows camera icon overlay
- Click existing logo to show change/remove menu
- Loading spinner during upload
- Error tooltip auto-dismisses after 3s

### Setup
1. Run migration `0005_company_logos.sql` (adds `logo_url` column and RLS policy)
2. Create `company-logos` Supabase Storage bucket with public read access
3. Add storage policies (see migration file for SQL)

### Technical Notes
- Cache-busting: Logo URLs include `?v={timestamp}` to ensure updates display immediately
- RLS: Investors can only update their own relationships (including logo_url)

## Investor Documents

### Overview
Investors can view, search, filter, and bulk download documents uploaded by founders across their portfolio companies. Only documents from companies with approved relationships are visible.

### Document Types
| Type | Display Name | Description |
|------|--------------|-------------|
| `income_statement` | Income Statement | P&L / profit and loss statements |
| `balance_sheet` | Balance Sheet | Assets, liabilities, equity snapshots |
| `cash_flow_statement` | Cash Flow Statement | Operating, investing, financing cash flows |
| `consolidated_financial_statements` | Consolidated Financial Statements | Combined financial statements |
| `409a_valuation` | 409A Valuation | Fair market value assessments |
| `investor_update` | Investor Update | Monthly/quarterly investor communications |
| `board_deck` | Board Deck | Board meeting presentations |
| `cap_table` | Cap Table | Capitalization table documents |
| `other` | Other | Miscellaneous documents |

### Features
- **Search** - Filter by filename (case-insensitive substring)
- **Company Filter** - Dropdown of approved portfolio companies
- **Type Filter** - Dropdown of document types
- **Bulk Selection** - Checkboxes with select all
- **Bulk Download** - Download selected documents as ZIP
- **Individual Download** - Download icon per row
- **Company Download** - "Download all" button when company filter is active

### API Routes
- `GET /api/investors/documents` - List documents across portfolio (supports `companyId`, `type`, `search` query params)
- `GET /api/investors/documents/download` - Bulk download as ZIP (supports `ids`, `companyId`, `type` query params)

### Founder Upload
Founders select a document type when uploading files. The upload form includes:
- Document type selector (required)
- Description field (optional)

### Dependencies
- `archiver` package for ZIP file creation

### Setup
1. Run migration `0006_document_types.sql`
2. Install archiver: `npm install archiver @types/archiver`

## Metric Templates

### Overview
Investors create reusable metric templates (e.g., "SaaS Metrics" with MRR, ARR, Burn Rate) and bulk-assign them to portfolio companies.

### Template Structure
- `metric_templates` - Name, description, is_system, target_industry. System templates have `investor_id = NULL`, user templates require `investor_id`
- `metric_template_items` - Ordered list of metrics (metric_name, period_type, data_type, sort_order)

### Bulk Assignment
When assigning a template to companies:
1. For each company x template item: create a `metric_definition` and `metric_request`
2. Skip if a matching request already exists (same investor + company + metric + period)
3. Returns count of created vs skipped requests

### API Routes
- `GET/POST /api/investors/metric-templates` - List/create templates
- `GET/PUT/DELETE /api/investors/metric-templates/[id]` - Read/update/delete
- `POST /api/investors/metric-templates/assign` - Bulk assign to companies (requires templateId, companyIds[], periodStart, periodEnd, optional dueDate)
- `POST /api/investors/metric-templates/clone` - Clone a template to user's personal templates

## System Templates

### Overview
Pre-built, read-only metric templates organized by industry. All investors can view and assign system templates, but cannot edit or delete them. Investors can clone system templates to create customizable copies.

### Industries
- **SaaS**: MRR, ARR, Net Revenue Retention, Gross Revenue Retention, Customer Churn Rate, CAC, LTV, LTV:CAC Ratio, Burn Rate, Runway, Gross Margin, Active Users
- **Fintech**: Total Transaction Volume, Net Revenue, Take Rate, Default Rate, Active Accounts, CAC, ARPU, Fraud Rate, Regulatory Capital Ratio, Net Interest Margin
- **Healthcare**: Monthly Active Patients, Revenue, Cost Per Patient, Patient Retention Rate, Clinical Outcomes Score, Provider Utilization Rate, Claims Processing Time, NPS, HIPAA Compliance Score, Gross Margin
- **E-commerce**: GMV, Net Revenue, AOV, CAC, LTV, Conversion Rate, Return Rate, Cart Abandonment Rate, Inventory Turnover, Repeat Purchase Rate
- **EdTech**: Monthly Active Learners, Course Completion Rate, Revenue, CAC, Student Retention Rate, NPS, ARPU, Content Engagement Time, Instructor Satisfaction, Learning Outcome Improvement
- **AI/ML**: Monthly Active Users, API Calls, Revenue, Compute Costs, Gross Margin, Model Accuracy, Inference Latency, Customer Churn Rate, Usage Growth Rate, Data Processing Volume
- **General**: Revenue, Gross Margin, Operating Expenses, Burn Rate, Runway, Headcount, Customer Count, CAC

### Data Model
- `is_system` boolean: `true` for system templates, `false` for user templates
- `target_industry` text: Industry category (saas, fintech, healthcare, ecommerce, edtech, ai_ml, other)
- `investor_id`: `NULL` for system templates, required for user templates
- Constraint ensures `(is_system = true AND investor_id IS NULL) OR (is_system = false AND investor_id IS NOT NULL)`

### RLS Policies
- All investors can SELECT system templates (`is_system = true`)
- Investors can only CRUD their own templates (`investor_id = auth.uid()`)
- System templates cannot be edited or deleted (enforced at API level)
- Template item updates use admin client to bypass RLS after ownership verification

### Clone Flow
1. Investor clicks "Clone" on a system template
2. API creates new template with `is_system = false`, `investor_id = user.id`
3. All template items are copied to the new template
4. Page refreshes and scrolls to "My Templates" section to show the clone
5. User can then edit the cloned template from "My Templates"

### Hide/Restore
Investors can hide system templates they don't want to see:
- Hidden template IDs stored in `user_metadata.hidden_templates` array
- Hidden templates shown in a collapsible section with "Restore" button
- Hiding is per-investor (doesn't affect other users)

### Template Card UI
- **Expandable metrics**: Cards show first 6 metrics by default, click "Show all X metrics" to expand
- **Metric tooltips**: Hover over any metric to see its definition and calculation formula
- **Metric definitions**: Stored in `src/lib/metric-definitions.ts` with descriptions and formulas for 50+ metrics
- **Skeleton loading**: Animated placeholder cards shown while data loads for better perceived performance
- **API caching**: Templates API uses `Cache-Control: private, max-age=60, stale-while-revalidate=120`

### API Routes
- `GET /api/user/hidden-templates` - Get list of hidden template IDs
- `PUT /api/user/hidden-templates` - Hide or restore a template (`{ templateId, action: "hide" | "show" }`)

## Investor Onboarding

### Overview
A guided 7-step tour for new investors using a spotlight/tooltip pattern. Walks through: Portfolio (import or add contacts) → Templates (create metric templates) → Requests (send metric requests).

### Behavior
- **Auto-start**: Tour automatically starts for new investors on first login
- **Persistence**: Progress saved to `user_metadata.onboarding_step` and `user_metadata.onboarding_complete`
- **Skippable**: Users can skip at any step; won't auto-start again after skip/completion
- **Restartable**: "Take tour" button in sidebar allows restarting anytime

### Components
- `src/lib/onboarding/steps.ts` - Step definitions (id, page, target selector, title, message)
- `src/contexts/onboarding-context.tsx` - React context for state management
- `src/components/onboarding/spotlight-overlay.tsx` - SVG mask cutout overlay
- `src/components/onboarding/onboarding-tooltip.tsx` - Positioned tooltip with auto-positioning
- `src/components/onboarding/onboarding-provider.tsx` - Renders overlay when tour active
- `src/components/onboarding/completion-modal.tsx` - Celebration modal on tour completion

### Adding Target Elements
Add `data-onboarding` attributes to elements you want to highlight:
```tsx
<div data-onboarding="portfolio-title">...</div>
<button data-onboarding="import-csv">Import CSV</button>
```

### Step Definition
```typescript
{
  id: "import-csv",
  page: "/portfolio",
  target: '[data-onboarding="import-csv"]',
  title: "Import CSV",
  message: "You can bulk import companies from a CSV file.",
}
```

### API Routes
- `GET /api/user/onboarding` - Get current onboarding state
- `PUT /api/user/onboarding` - Update step or mark complete

## Company Dashboard Builder

### Overview
Investors can visualize historical metrics from portfolio companies with customizable dashboards. Features include drag-drop dashboard builder, multiple chart types, saved views, and CSV export.

### Dashboard Routes
- `/dashboard` - Company search/browse with metric snapshots
- `/dashboard/[companyId]` - Company metrics dashboard view
- `/dashboard/[companyId]/edit` - Dashboard builder/editor mode

### Widget Types
- **Metric Card** - Single metric with trend indicator
- **Line Chart** - Time series visualization
- **Bar Chart** - Categorical comparisons
- **Area Chart** - Cumulative trends
- **Pie Chart** - Proportional breakdowns
- **Table** - Tabular metric display

### Dashboard Layout JSON Schema
```typescript
type Widget = {
  id: string;
  type: 'chart' | 'metric-card' | 'table';
  x: number;      // Grid column (0-11)
  y: number;      // Grid row
  w: number;      // Width in columns (1-12)
  h: number;      // Height in rows (1-4)
  config: ChartConfig | MetricCardConfig | TableConfig;
};
```

### Dashboard Templates
Pre-built layouts by industry:
- SaaS Overview (MRR, ARR, Burn Rate, Runway)
- Fintech Overview (TPV, Net Revenue, Take Rate)
- Healthcare Overview (Patients, Revenue, Retention)
- E-commerce Overview (GMV, AOV, Conversion Rate)
- EdTech Overview (Learners, Completion Rate)
- AI/ML Overview (API Calls, Compute Costs)
- Financial Overview (General, any industry)

### Components
- `src/components/charts/` - Recharts-based chart components (LineChart, BarChart, AreaChart, PieChart)
- `src/components/dashboard/` - Dashboard UI components (DashboardWidget, DashboardCanvas, WidgetLibrary, WidgetConfig, MetricCard, MetricsTable, PeriodSelector, ViewSelector, ExportButton)
- `src/components/investor/company-card.tsx` - Company card with metric snapshot
- `src/components/investor/company-search.tsx` - Search input component

### API Routes
- `GET /api/investors/companies/[id]/metrics` - Get all metric values for a company
- `GET /api/investors/companies/[id]/metrics/export` - Export metrics as CSV
- `GET /api/investors/dashboard-views?companyId=` - List saved views for a company
- `POST /api/investors/dashboard-views` - Create new view
- `GET/PUT/DELETE /api/investors/dashboard-views/[id]` - Read/update/delete view
- `GET /api/investors/dashboard-templates` - List system dashboard templates

### Dependencies
- `recharts` - React charting library
- `react-grid-layout` - Drag-drop grid with resize
- `@dnd-kit/core`, `@dnd-kit/sortable` - Modern drag-drop

### Setup
1. Run migration `0007_dashboard_views.sql`
2. Install dependencies: `npm install recharts react-grid-layout @dnd-kit/core @dnd-kit/sortable`

## CSV Import/Export

### Import - Flexible Column Names
The CSV parser normalizes column names to handle variations:
- `Company Name`, `company_name`, `companyName` → all work
- `First Name`, `first_name`, `firstName` → all work

### Import - Required Columns
- Company Name
- First Name
- Last Name
- Email

### Import - Optional Columns
- Company Website

### Export
Investors can download their existing portfolio contacts as CSV via the "Export CSV" button on the import page.

### API Routes
- `POST /api/investors/portfolio/import` - Import contacts from CSV data
- `GET /api/investors/portfolio/export` - Download contacts as CSV file

## Portfolio Reports

### Overview
Investors can view aggregated metrics across their entire portfolio, compare companies side-by-side, and save custom report configurations.

### Report Types
- **Summary** (`/reports`) - KPI cards, distribution charts by industry/stage, portfolio trend chart, top performers by growth
- **Comparison** (`/reports/compare`) - Multi-select 2-8 companies, side-by-side charts/tables, normalization options (absolute/indexed/percent change)
- **Trends** (`/reports/trends`) - Coming soon: growth distribution, YoY comparison, outlier detection

### Aggregation Logic
| Metric Type | Can Sum? | Aggregation Method |
|-------------|----------|-------------------|
| Revenue, ARR, MRR, Burn Rate, Headcount | Yes | Sum for portfolio total, Average for comparison |
| Gross Margin, NRR, Churn Rate | No | Average (weighted by revenue for accuracy) |
| Runway, CAC, LTV | No | Average or Median only |

### Saved Reports
- Investors can save report configurations with filters, selected companies, and display settings
- Reports can be marked as default for their type
- Saved reports store: name, description, report_type, filters (JSON), company_ids, normalize setting, config (JSON)

### Components
- `src/components/reports/` - Report components directory
  - `report-tabs.tsx` - Tab navigation between Summary/Compare/Trends
  - `report-filters.tsx` - Filter bar (industry, stage, period, date range)
  - `report-header.tsx` - Save/load report controls
  - `saved-reports-dropdown.tsx` - Dropdown to load saved reports
  - `save-report-modal.tsx` - Modal to save current report
  - `portfolio-summary/` - Summary view components (KPICards, DistributionCharts, TopPerformers, AggregateTrend)
  - `company-comparison/` - Comparison view components (CompanyMultiSelect, ComparisonChart, ComparisonTable, NormalizationToggle)
- `src/lib/reports/aggregation.ts` - Aggregation utilities and metric type classifications

### API Routes
- `GET /api/investors/portfolio/metrics` - Aggregated metrics across portfolio (supports filters)
- `GET /api/investors/portfolio/distribution` - Portfolio breakdown by industry/stage/business model
- `GET /api/investors/portfolio/compare` - Side-by-side comparison for selected companies
- `GET/POST /api/investors/portfolio/reports` - List/create saved reports
- `GET/PUT/DELETE /api/investors/portfolio/reports/[id]` - Read/update/delete saved report

### Setup
1. Run migration `0008_portfolio_reports.sql`

## Security Requirements

> **IMPORTANT**: This is a production application used by thousands of users. Always build with security as a first-class concern. When in doubt, be more restrictive.

### Authentication & Authorization
- All API endpoints must verify authentication using `getApiUser()`
- **Always verify role** after authentication: `user.user_metadata?.role`
- Never trust client-provided IDs without ownership verification
- Validate redirect URLs to prevent open redirects
- Use `jsonError("Unauthorized.", 401)` for missing auth, `jsonError("Forbidden.", 403)` for wrong role/ownership

### Authorization Pattern (Required for all API routes)
```typescript
// 1. Authenticate
const { supabase, user } = await getApiUser();
if (!user) return jsonError("Unauthorized.", 401);

// 2. Verify role
const role = user.user_metadata?.role;
if (role !== "investor") return jsonError("Forbidden.", 403);

// 3. Verify ownership BEFORE any data operations
const { data: relationship } = await supabase
  .from("investor_company_relationships")
  .select("id")
  .eq("investor_id", user.id)
  .eq("company_id", companyId)
  .single();
if (!relationship) return jsonError("Company not in portfolio.", 403);

// 4. THEN perform the operation (optionally with admin client)
```

### Input Validation
- **Always use Zod** for request body validation
- Validate query parameters before use (especially dates, IDs, enums)
- Sanitize search inputs - be wary of SQL wildcards in LIKE queries
- Validate file uploads: check MIME type, file size, and ideally file signatures

### File Upload Security
- **Never allow SVG uploads** - they can contain embedded JavaScript (XSS)
- Allowed image types: PNG, JPG, WebP only
- Enforce file size limits (check both header and actual file size)
- Sanitize filenames: `filename.replace(/[^a-zA-Z0-9._-]/g, "_")`
- Store files with generated paths, not user-provided names

### CSV Export Security
- **Prevent formula injection** - escape fields starting with `=`, `+`, `-`, `@`, tab, CR:
```typescript
function escapeCsvField(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) {
    value = "'" + value;  // Prefix with single quote
  }
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
```

### Supabase & RLS
- All tables must have RLS enabled
- RLS policies should be as restrictive as possible
- When using `createSupabaseAdminClient()` (bypasses RLS):
  - **Always verify ownership BEFORE** using admin client
  - Document why admin client is needed
- Avoid `using (true)` in RLS policies - be explicit about access rules

### Data Access
- Investors can only see/modify their own portfolio
- Founders can only see/modify their own company data
- Cross-user data access must be prevented at both RLS and application level

### Data Ownership
- **Contact deletion**: Deleting a portfolio contact removes the invitation and relationship, but preserves the company if a founder has already signed up (`founder_id` is set) OR if other investors are linked to it.
- **Multi-investor isolation**: Each investor's metric definitions and requests are their own. Company metric values are shared across approved investors but only the founder can write them.

### Common Vulnerabilities to Avoid
| Vulnerability | Prevention |
|--------------|------------|
| Missing auth/role check | Always check both `user` and `role` |
| SQL injection | Use Supabase query builder, never raw SQL with user input |
| XSS | Never use `dangerouslySetInnerHTML`, escape HTML in emails |
| CSV formula injection | Prefix dangerous chars with `'` |
| SVG XSS | Don't allow SVG uploads |
| Open redirects | Only redirect to hardcoded paths |
| IDOR (insecure direct object reference) | Always verify ownership before operations |
| Enumeration attacks | Use consistent error messages, verify ownership before fetch |

### Security Checklist for New Features
- [ ] Authentication required (`getApiUser()`)
- [ ] Role verified (`user.user_metadata?.role`)
- [ ] Ownership verified before data access
- [ ] Input validated with Zod
- [ ] File uploads restricted (no SVG, size limits)
- [ ] CSV exports escape formula chars
- [ ] RLS policies reviewed
- [ ] No sensitive data in client-side code
- [ ] Error messages don't leak system info

## UI Patterns

### Modals
Use custom modal component with:
- Backdrop blur: `bg-black/60 backdrop-blur-sm`
- Modal: `rounded-xl border border-white/10 bg-zinc-900 p-6`
- Close on Escape key

### Auto-dismiss Messages
Success messages should auto-dismiss after 4 seconds:
```tsx
useEffect(() => {
  if (success) {
    const timer = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(timer);
  }
}, [success]);
```

### Loading States
- Disable buttons during submission
- Show "Please wait..." or action-specific text
- Use `disabled:opacity-60` for disabled state

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

## Development Notes

### Email Testing
- Resend test domain (`onboarding@resend.dev`) only sends to account owner's email
- Use "Dev Mode: Invite Links" in UI to copy invite URLs for testing
- For production: verify a domain in Resend

### User Deletion (Testing)
```sql
SELECT delete_user_by_email('user@example.com');
```

### Next.js 15 Params Pattern
Route handler and page component params are `Promise`-wrapped in Next.js 15:
```typescript
// API route handler
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // ...
}

// Page component
export default async function Page({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  // ...
}
```

### Supabase Join Type Handling
Supabase `.select()` with joins may return arrays. Always handle both:
```typescript
const defRaw = row.metric_definitions;
const def = (Array.isArray(defRaw) ? defRaw[0] : defRaw) as { name: string } | null;
```

### Race Condition Handling
When creating users, wait for the `public.users` trigger to complete before updating related tables that reference it.

## Database Migrations

Migration files in `supabase/migrations/`:
- `0001_init.sql` - Core schema: users, companies, relationships, metric_definitions, metric_requests, metric_submissions, documents, RLS policies
- `0002_portfolio_invitations.sql` - Portfolio invitations table, investor company insert/update policies
- `0003_metric_system.sql` - Multi-investor support (approval_status, founder_email dedup), company tags, metric_templates, company_metric_values, auto-fulfill trigger, updated RLS policies
- `0004_system_templates.sql` - System templates (is_system, target_industry columns), seeds 7 industry templates with metrics, updated RLS policies for shared read access
- `0005_company_logos.sql` - Adds logo_url column to investor_company_relationships for per-investor logos
- `0006_document_types.sql` - Adds document_type enum and description column to documents table, RLS policy for investor read access
- `0007_dashboard_views.sql` - Dashboard views and templates tables with RLS policies, seeds industry-specific dashboard templates
- `0008_portfolio_reports.sql` - Portfolio reports table for saved report configurations with RLS policies

Migrations must be run manually in the Supabase SQL Editor (Dashboard > SQL Editor > paste and run).

## Email Configuration

### Current Limitation
The app uses Resend for sending founder invitation emails. Currently configured with `onboarding@resend.dev` (Resend's test domain), which **only delivers to the Resend account owner's email**. To send invitations to any recipient, a verified sending domain is required.

### Setup Steps (When Ready)
1. **Register a domain** (~$10-15/year)
   - Namecheap, Cloudflare Registrar, or Squarespace (formerly Google Domains)
   - Example: `tryvelvet.com`, `velvetmetrics.com`, `getvelvet.io`

2. **Add domain in Resend Dashboard**
   - Go to https://resend.com/domains
   - Click "Add Domain" and enter your domain
   - Add the DNS records Resend provides (DKIM, SPF, Return-Path)
   - Click "Verify" (usually takes a few minutes)

3. **Update code**
   - File: `src/app/api/investors/portfolio/invite/route.ts` line 144
   - Change: `from: "Velvet <onboarding@resend.dev>"`
   - To: ``from: `Velvet <invites@${process.env.RESEND_FROM_DOMAIN}>` ``
   - Add `RESEND_FROM_DOMAIN=yourdomain.com` to `.env`

### Pricing
- Resend: 3,000 free emails/month, then ~$20/month for 50k
- Expected volume: 1,000-10,000 emails/month

### Multi-Investor Behavior
All invitation emails are sent from the Velvet domain (e.g., `invites@velvet.com`), regardless of which investor sends them. The investor's name appears in the email body, not the from address.

## Production Checklist

- [ ] **Re-enable email confirmation** in Supabase (Authentication → Providers → Email → toggle on "Confirm email"). Currently disabled for development.
- [ ] **Configure email sending domain** (see Email Configuration section above)
- [ ] Set `NEXT_PUBLIC_APP_URL` to the production domain
