# Velvet - Project Requirements & Preferences

> **Note:** Keep this file updated whenever there are architectural changes, new patterns, or important decisions. This serves as the source of truth for project conventions.

## Overview

Velvet is a portfolio metrics platform connecting investors with founders. Investors can import portfolio companies, invite founders, and request metrics. Founders can submit metrics and upload documents.

## Architecture

### User Roles
- **Investors** - Manage portfolio companies, send metric requests, invite founders
- **Founders** - Submit metrics, upload documents, respond to requests

### Route Structure
- Investors: `/dashboard`, `/dashboard/[companyId]`, `/dashboard/[companyId]/metrics`, `/portfolio`, `/requests`, `/requests/new`, `/templates`, `/templates/new`, `/templates/[id]`
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
- `investor_company_relationships` - Maps investors to portfolio companies (approval_status: auto_approved/pending/approved/denied, is_inviting_investor flag)
- `portfolio_invitations` - Founder contacts with invitation status
- `metric_definitions` - Investor-defined metrics (personal catalog, reused via upsert)
- `metric_requests` - Requests from investors to founders (auto-fulfilled by DB trigger)
- `metric_submissions` - Legacy founder responses (no longer written to; kept for backward compatibility)
- `metric_templates` - Metric sets (name, description, is_system, target_industry). System templates have `investor_id = NULL`, user templates require `investor_id`
- `metric_template_items` - Individual metrics in a template (metric_name, period_type, data_type, sort_order)
- `company_metric_values` - Company-level shared submissions (unique per company+metric+period, auto-fulfills matching requests via trigger)
- `documents` - Uploaded files from founders

### RLS Policies
- All tables have Row Level Security enabled
- Role-based access using `auth.uid()` and `current_user_role()` helper
- Investors can only access their own portfolio data
- Founders can only access their own company data
- `company_metric_values`: founders INSERT/UPDATE own company; approved investors SELECT only
- `metric_requests` SELECT: founders only see requests from approved investors
- `investor_company_relationships` UPDATE: founders can approve/deny for their company
- `metric_templates` + `metric_template_items`: investor CRUD own

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
- `GET /api/investors/companies` - List companies with tags
- `PUT /api/investors/companies/[id]/tags` - Update company tags

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

## Security Requirements

### Authentication
- All API endpoints must verify authentication
- Never trust client-provided IDs without ownership verification
- Validate redirect URLs to prevent open redirects

### Data Access
- Investors can only see/modify their own portfolio
- Founders can only see/modify their own company data
- Cross-user data access must be prevented at both RLS and application level

### Data Ownership
- **Contact deletion**: Deleting a portfolio contact removes the invitation and relationship, but preserves the company if a founder has already signed up (`founder_id` is set) OR if other investors are linked to it.
- **Multi-investor isolation**: Each investor's metric definitions and requests are their own. Company metric values are shared across approved investors but only the founder can write them.

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

Migrations must be run manually in the Supabase SQL Editor (Dashboard > SQL Editor > paste and run).

## Production Checklist

- [ ] **Re-enable email confirmation** in Supabase (Authentication → Providers → Email → toggle on "Confirm email"). Currently disabled for development.
- [ ] Verify a custom domain in Resend (replace `onboarding@resend.dev`)
- [ ] Set `NEXT_PUBLIC_APP_URL` to the production domain
