# Velvet - Project Requirements & Preferences

> **Note:** Keep this file updated whenever there are architectural changes, new patterns, or important decisions. This serves as the source of truth for project conventions.

## Overview

Velvet is a portfolio metrics platform connecting investors with founders. Investors can import portfolio companies, invite founders, and request metrics. Founders can submit metrics and upload documents.

## Architecture

### User Roles
- **Investors** - Manage portfolio companies, send metric requests, invite founders
- **Founders** - Submit metrics, upload documents, respond to requests

### Route Structure
**Investors:**
- `/dashboard` - Company search/browse with metric snapshots
- `/dashboard/[companyId]` - Company metrics dashboard view
- `/dashboard/[companyId]/edit` - Dashboard builder/editor
- `/dashboard/[companyId]/metrics` - Detailed metrics table view
- `/portfolio` - Portfolio company management
- `/portfolio/add` - Add single contact form
- `/portfolio/import` - CSV bulk import
- `/reports` - Portfolio summary with KPIs and distribution charts
- `/requests` - Metric requests list with tabs (Requests, Schedules)
- `/requests/new` - Unified request wizard (template selection, companies, period)
- `/requests/schedules/[id]` - Schedule detail and run history
- `/documents` - Cross-portfolio document browser with filters and bulk download
- `/lp-reports` - LP fund management with performance metrics (TVPI, DPI, IRR, MOIC)
- `/lp-reports/[fundId]` - Fund detail with investments and performance charts
- `/reports/compare` - Multi-company metric comparison (2-8 companies, normalization)
- `/reports/trends` - Portfolio growth distribution, YoY comparison, outlier detection
- `/reports/benchmarks` - Metric benchmarking with percentile rankings across portfolio
- `/query` - Natural language portfolio queries (AI-powered Q&A)
- `/team` - Team member management and invitations

**Founders:**
- `/portal` - Dashboard with tabs (Metrics, Documents, Tear Sheets)
- `/portal/requests` - Pending metric requests
- `/portal/investors` - Manage investor access (approve/deny)
- `/portal/documents` - Document upload and management
- `/portal/dashboard/edit` - Founder dashboard builder
- `/portal/tear-sheets` - Tear sheet list with filters
- `/portal/tear-sheets/new` - Create new tear sheet
- `/portal/tear-sheets/[id]` - Edit tear sheet with live preview
- `/portal/team` - Team member management

**Shared:**
- `/share/tear-sheet/[token]` - Public shareable tear sheet view

**Auth:**
- `/login`, `/signup` - Authentication pages
- `/app` - Redirects to appropriate dashboard based on role

**Not Yet Implemented:**
- `/templates`, `/templates/new`, `/templates/[id]` - Template management (currently via modals)

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
- `metric_request_schedules` - Recurring metric request configurations (cadence, day_of_month, company_ids, reminder settings)
- `scheduled_request_runs` - Audit log of schedule executions (requests_created, emails_sent, errors, status)
- `metric_request_reminders` - Pending reminder emails (scheduled_for, status, auto-cancelled on submission)
- `metric_value_history` - Audit trail for metric value changes (previous/new values, source, changed_by)
- `document_metric_mappings` - Links documents to extracted metric values (for AI extraction)
- `organizations` - Teams/organizations for collaboration (name, org_type, owner_id)
- `organization_members` - User memberships with roles (admin, member, viewer)
- `organization_invitations` - Pending team invitations with tokens
- `funds` - LP funds per investor (name, vintage_year, fund_size, currency)
- `fund_investments` - Individual fund investments linked to companies (invested_amount, current_value, realized_value)
- `lp_reports` - LP report documents per fund (report_date, report_type, title, content JSONB, status)
- `metric_benchmarks` - Anonymized percentile benchmarks (metric_name, period_type, industry, stage, p25/p50/p75/p90, sample_size)

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
- `metric_request_schedules`: investors CRUD own schedules
- `scheduled_request_runs`: investors SELECT runs for their schedules
- `metric_request_reminders`: investors SELECT reminders for their requests; founders SELECT reminders for requests to their company
- `funds`: investors CRUD own funds (investor_id = auth.uid())
- `fund_investments`: investors CRUD investments in own funds (fund_id scoped through funds)
- `lp_reports`: investors CRUD reports for own funds (fund_id scoped through funds)
- `metric_benchmarks`: authenticated users SELECT only (anonymized aggregates, no individual data)

## Styling

### Tailwind CSS v4
This project uses Tailwind CSS v4 with the new configuration format:
- Config in `globals.css` using `@theme` directive (not tailwind.config.js)
- CSS variables for colors: `--background`, `--foreground`
- Custom animations defined in `globals.css` with `@keyframes`
- PostCSS plugin: `@tailwindcss/postcss` (configured in `postcss.config.mjs`)

### Theme Provider
The app uses `next-themes` for theme management (`src/components/theme-provider.tsx`):
```tsx
<ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
  {children}
</ThemeProvider>
```
- `attribute="class"` - Uses `.dark` class on `<html>` element
- `defaultTheme="dark"` - Default to dark theme
- `enableSystem` - Respects system color scheme preference
- Access via `useTheme()` hook from `next-themes`

**Note:** The app is designed for dark theme only. Light mode may have styling issues.

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

### Form Components
Located in `src/components/forms/`:
- `metric-request-form.tsx` - Single metric request form
- `metric-submission-form.tsx` - Single metric submission form
- `document-upload-form.tsx` - Document upload with type selection
- `unified-request-wizard.tsx` - Multi-step wizard for creating metric requests:
  - Step 1: Select template or create custom
  - Step 2: Select companies
  - Step 3: Configure period and due date
  - Step 4: Review and send

### Portfolio Forms
Located in `src/components/portfolio/`:
- `add-contact-form.tsx` - Add single portfolio contact
- `csv-import-form.tsx` - Bulk CSV import wizard
- `contacts-table.tsx` - Contacts list with actions
- `download-csv-button.tsx` - Export portfolio as CSV

### File Upload Pattern (react-dropzone)
Used for CSV imports and document uploads:
```tsx
import { useDropzone } from "react-dropzone";

const { getRootProps, getInputProps, isDragActive } = useDropzone({
  accept: { "text/csv": [".csv"] },
  maxFiles: 1,
  onDrop: (acceptedFiles) => handleFile(acceptedFiles[0]),
});

<div
  {...getRootProps()}
  className={cn(
    "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
    isDragActive
      ? "border-white/40 bg-white/5"
      : "border-white/10 hover:border-white/20"
  )}
>
  <input {...getInputProps()} />
  {isDragActive ? "Drop file here" : "Drag & drop or click to select"}
</div>
```

### CSV Import Form Features
The CSV import (`csv-import-form.tsx`) includes:
- **Column normalization**: Accepts camelCase, snake_case, Title Case, spaces
  - `Company Name`, `company_name`, `companyName` all work
- **Alias mapping**: Common variations mapped to canonical names
- **Validation**: Required columns, email format, duplicate detection
- **Drag & drop**: File dropzone with visual feedback
  - Active state: `border-white/40 bg-white/5`
- **Preview table**: Shows parsed data with duplicate highlighting
- **Row-level errors**: Individual row validation feedback
- **Progress states**: Parsing → Preview → Import confirmation → Redirect

## API Routes

### Authentication Routes
- `POST /api/auth/login` - User login with email/password
- `POST /api/auth/signup` - User registration (supports invite tokens for founders, role selection)

### Pagination
API endpoints support pagination via query parameters:
- `?limit=50` - Number of items per page (default: 50, max: 100)
- `?offset=0` - Starting index for results

Use `parsePagination(url)` from `@/lib/api/pagination` to parse these safely:
```typescript
import { parsePagination, DEFAULT_LIMIT, MAX_LIMIT } from "@/lib/api/pagination";

const { limit, offset } = parsePagination(new URL(req.url));
// limit: clamped to 1-100, defaults to 50
// offset: minimum 0, defaults to 0

const { data } = await supabase.from("table").range(offset, offset + limit - 1);
```

### Authentication
- Use `getApiUser()` from `@/lib/api/auth` for authentication
- Check `user.user_metadata?.role` for authorization
- Return `jsonError("Unauthorized.", 401)` if not authenticated
- Return `jsonError("Forbidden.", 403)` if wrong role

### Server-Side Role Enforcement
For Server Components, use `@/lib/auth/require-role`:
```typescript
import { requireUser, requireRole } from "@/lib/auth/require-role";

// In Server Component:
const user = await requireUser(); // Redirects to /login if not authenticated
const user = await requireRole("investor"); // Redirects to /app if wrong role
```

### Middleware
Located at `src/middleware.ts`, handles session management and route protection:
- **Session Refresh**: Refreshes Supabase auth session on every request using `@supabase/ssr`
- **Cookie Sync**: Updates response cookies when session is refreshed
- **Protected Routes**: Validates session before allowing access to `/dashboard`, `/portal`, etc.

```typescript
// Middleware pattern:
const supabase = createServerClient(/* ... */);
const { data: { session } } = await supabase.auth.getSession();
// Session refreshed, cookies updated automatically
```

**Route Matching** (from `matcher` config):
- Runs on all routes except: `_next/static`, `_next/image`, `favicon.ico`, `.svg/.png/.jpg/.jpeg/.gif/.webp`

### Supabase Client Patterns
Multiple client types for different contexts (`src/lib/supabase/`):
| Client | File | Use Case |
|--------|------|----------|
| Server | `server.ts` | Server Components, uses cookies |
| Browser | `client.ts` | Client Components |
| Route Handler | `route-handler.ts` | API Routes |
| Admin | `admin.ts` | Bypasses RLS (use with caution, verify ownership first) |

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

### API Caching Strategy
Some read-heavy endpoints use Cache-Control headers for performance:

```typescript
// Template API example (src/app/api/investors/metric-templates/route.ts)
return NextResponse.json(data, {
  headers: {
    "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
  },
});
```

**Caching Guidelines:**
- **User-specific data**: Use `private` directive (never `public`)
- **Template/reference data**: 60s max-age, 120s stale-while-revalidate
- **Real-time data** (metrics, requests): No caching
- **Static reference data** (metric definitions): Longer max-age acceptable

**Cache-Control directives used:**
- `private` - Cache in browser only, not CDN
- `max-age=60` - Fresh for 60 seconds
- `stale-while-revalidate=120` - Serve stale while fetching fresh for 120s after max-age

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

### Batch Submission
The batch submission table (`src/components/founder/batch-submission-table.tsx`) provides a multi-period submission interface:
- Supports quarterly, monthly, and annual period types
- Generates last 8 quarters, 12 months, or 3 years dynamically
- Sticky table headers for large datasets
- Per-metric notes support
- Confirmation modal before bulk submission
- Smart state management (user entries persist across period type changes)
- Validation before submission

### API Routes
- `POST /api/metrics/submit` - Submit a single metric value (founder)
  - Supports `source` field: `manual`, `ai_extracted`, `override`
  - Supports `sourceDocumentId` for AI extraction linkage
  - Supports `changeReason` for audit trail
- `POST /api/metrics/submit-batch` - Submit multiple metrics at once (up to 100)
  - Supports `fulfillRequestIds` for direct request fulfillment
  - Returns `{ submitted, failed, errors }`
- `GET /api/metrics/detail` - Get detailed history for a specific metric
  - Query params: `companyId`, `metricName`
  - Returns all historical values with `metric_value_history` joined
  - Resolves `changed_by` UUIDs to user names
- `POST /api/metrics/request` - Create a metric request (investor)
- `GET /api/founder/metric-requests` - Deduplicated requests view
- `GET /api/founder/company-metrics` - Submission history
- `GET /api/founder/metrics/export` - Export metrics as CSV

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
- `GET/PUT /api/investors/companies/[id]/tile-metrics` - Get/set which metrics display on company cards

### Tile Metric Customization
Investors can customize which metrics appear on company cards in the dashboard:
- **Primary Metric**: Main metric displayed prominently (e.g., ARR)
- **Secondary Metric**: Additional metric shown below primary
- Stored per investor-company relationship in `tile_primary_metric` and `tile_secondary_metric` columns

**API:**
```typescript
// Get current tile metrics
GET /api/investors/companies/[id]/tile-metrics
// Response: { primaryMetric: "ARR", secondaryMetric: "Burn Rate" }

// Update tile metrics
PUT /api/investors/companies/[id]/tile-metrics
// Body: { primaryMetric: "MRR", secondaryMetric: "Runway" }
```

**Component**: Company cards in `/dashboard` use these preferences to display relevant metrics for each company.

## Company Logos

### Overview
Investors can upload custom logos for portfolio companies. Logos are per-investor (not shared across investors viewing the same company). Upload is only available on the Portfolio page; Dashboard displays logos read-only.

### Fallback
- Custom uploaded logo (stored in Supabase Storage)
- Company initial letter (UI fallback if no logo uploaded)

### Storage Buckets
**Company Logos** (`company-logos` bucket - public):
- Path: `{investor_id}/{company_id}.{ext}`
- Allowed types: PNG, JPG, WebP (SVG excluded for security - can contain XSS)
- Max size: 2MB

**Documents** (`documents` bucket - private):
- Path: `{company_id}/{document_id}.{ext}`
- Founders can upload; authenticated users can download
- RLS policies enforce company ownership

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
- **Date Filter** - Filter by upload date (7 days, 30 days, 90 days, all)
- **Bulk Selection** - Checkboxes with select all
- **Bulk Download** - Download selected documents as ZIP
- **Individual Download** - Download icon per row
- **Company Download** - "Download all" button when company filter is active
- **Responsive Views** - Card layout on mobile, table on desktop

### API Routes
- `GET /api/investors/documents` - List documents across portfolio (supports `companyId`, `type`, `search` query params)
- `GET /api/investors/documents/download` - Bulk download as ZIP (supports `ids`, `companyId`, `type` query params)

### Founder Upload
Founders select a document type when uploading files. The upload form includes:
- Document type selector (required)
- Description field (optional)
- Period label (optional, for financial period association)

### Founder Document Components
- `src/components/founder/documents-tab.tsx` - Container for document list and upload
- `src/components/founder/document-list.tsx` - Displays uploaded documents with actions
- `src/components/founder/document-upload-modal.tsx` - Modal wrapper for document upload form

### Founder Document API Routes
- `GET /api/founder/documents` - List documents for founder's company (supports pagination, type filter)
- `POST /api/documents/upload` - Upload document (multipart/form-data)
- `GET /api/documents/download` - Download single document by path
- `DELETE /api/documents/[id]` - Delete document (removes from storage and database)
- `DELETE /api/founder/documents/[id]` - Delete founder's document (alternate endpoint with ownership verification)

### Dependencies
- `archiver` package for ZIP file creation

### Setup
1. Run migration `0006_document_types.sql`
2. Install archiver: `npm install archiver @types/archiver`

## AI Document Extraction

### Overview
Founders can upload financial documents (PDFs, spreadsheets) and the system will automatically extract metric values using AI. Extracted values are reviewed before being saved.

### Source Tracking
All metric values track their source:
| Source | Description |
|--------|-------------|
| `manual` | Entered manually by founder |
| `ai_extracted` | Extracted from document by AI |
| `override` | Founder corrected an AI-extracted value |

### Extraction Flow
1. Founder uploads document
2. System triggers AI extraction (async background job)
3. AI identifies metrics, values, and periods from document
4. Results stored in `document_metric_mappings` with status `pending`
5. Founder reviews extractions - accept, reject, or edit
6. Accepted values saved to `company_metric_values` with `source = 'ai_extracted'`

### Value History
Changes to metric values are tracked in `metric_value_history`:
- Previous and new values
- Source changes (e.g., manual → ai_extracted → override)
- Who made the change
- Timestamp

### AI Providers
The system automatically selects the AI provider based on environment variables:
- **Google Gemini** (preferred) - Uses `gemini-2.5-flash` if `GOOGLE_AI_API_KEY` is set
- **OpenAI** (fallback) - Uses `gpt-4o-mini` if only `OPENAI_API_KEY` is set

**Provider-Specific Features:**
- **Gemini**: Uses File API for document upload (handles large files), includes exponential backoff retry for 429 rate limit errors
- **OpenAI**: Direct base64 inline upload

**Configuration in `src/lib/ai/`:**

| File | Purpose |
|------|---------|
| `extractor.ts` | Factory function `createExtractor()` - selects Gemini or OpenAI based on env vars |
| `prompts.ts` | `FINANCIAL_EXTRACTION_SYSTEM_PROMPT` and `buildUserPrompt()` for extraction |
| `types.ts` | `ExtractedMetric`, `ExtractionResult`, `MetricExtractor` interface |
| `providers/gemini.ts` | `GeminiExtractor` class - uses File API for large documents |
| `providers/openai.ts` | `OpenAIExtractor` class - uses base64 inline upload |

**Extractor Factory:**
```typescript
import { createExtractor } from "@/lib/ai/extractor";

const extractor = createExtractor();
// Returns GeminiExtractor if GOOGLE_AI_API_KEY set
// Returns OpenAIExtractor if only OPENAI_API_KEY set
// Throws if neither set

const result = await extractor.extract(fileBuffer, mimeType, targetMetrics);
// Returns: { provider, model, metrics: ExtractedMetric[], processingTimeMs }
```

**Extracted Metric Type:**
```typescript
type ExtractedMetric = {
  metric_name: string;
  value: number;
  period_type: "monthly" | "quarterly" | "annual";
  period_start: string;
  period_end: string;
  confidence: number; // 0-1
  context?: string;   // Source text from document
};
```

**Environment Variables:**
- `GOOGLE_AI_API_KEY` - Google AI API key (enables Gemini)
- `GEMINI_MODEL` - Override model (default: `gemini-2.5-flash`)
- `OPENAI_API_KEY` - OpenAI API key
- `OPENAI_EXTRACTION_MODEL` - Override model (default: `gpt-4o-mini`)

### Components
- `src/lib/ai/extractor.ts` - Main extraction orchestration
- `src/lib/ai/types.ts` - Type definitions
- `src/lib/ai/prompts.ts` - AI prompt templates
- `src/lib/ai/providers/` - Provider implementations
- `src/components/founder/extraction-status-badge.tsx` - Status indicator
- `src/components/founder/extraction-review-panel.tsx` - Review and accept/reject extractions
- `src/components/founder/extracted-metric-row.tsx` - Individual extraction row
- `src/components/metrics/source-badge.tsx` - Source indicator in tables

### Extraction Status Badge
Visual indicator for AI extraction status:
```tsx
<ExtractionStatusBadge status="pending" | "processing" | "completed" | "failed" />
```
- **Processing**: Blue with animated spinner (`animate-spin`)
- **Completed**: Emerald with CheckCircle2 icon
- **Failed**: Red with XCircle icon
- All include Sparkles icon (AI indicator)

### Source Badge
Shows metric value source in tables/cards:
```tsx
<SourceBadge source="manual" | "ai_extracted" | "override" confidence={0.95} />
```
- **manual**: PenLine icon, neutral
- **ai_extracted**: Sparkles icon, violet, shows confidence %
- **override**: RotateCcw icon, amber

### AI Email Parsing
Founders can paste investor update emails and extract metrics using AI:
- `src/lib/ai/prompts.ts` — `EMAIL_EXTRACTION_SYSTEM_PROMPT` and `buildEmailUserPrompt()` for email-specific extraction
- `src/app/api/founder/email-ingest/route.ts` — POST with AI extraction (Gemini preferred, OpenAI fallback)
- `src/components/founder/email-paste-modal.tsx` — 5-state flow: idle → extracting → reviewing → saving → done
- "Import from Email" button on founder dashboard (Metrics tab)
- Extracted metrics go through review flow, saved via batch submit with `source: "ai_extracted"`

### API Routes
- `POST /api/documents/upload` - Upload a document
- `GET /api/documents/download` - Download documents
- `POST /api/documents/[id]/ingest` - Trigger AI extraction for a document
- `GET /api/documents/[id]/extraction-status` - Check extraction progress
- `PUT /api/documents/[id]/extraction-review` - Accept/reject extracted values
- `POST /api/founder/email-ingest` - Extract metrics from pasted email content (founder only)

### Database Tables
- `document_metric_mappings` - Links documents to extracted values
- `metric_value_history` - Audit trail of value changes
- Extended `company_metric_values` with `source`, `source_document_id`, `ai_confidence` columns

### Setup
1. Run migration `0016_ai_extraction.sql`
2. Set `OPENAI_API_KEY` or `GOOGLE_AI_API_KEY` environment variable

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

### Metric Definitions Library
Located in `src/lib/metric-definitions.ts`:
- 50+ predefined metrics with descriptions and formulas
- Used for tooltip display in template cards and metric selection
- Categories: Revenue, Growth, Unit Economics, Retention, Operational, Financial
- Each definition includes: `name`, `description`, `formula` (optional), `unit` (optional)

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

### Onboarding Tooltip Auto-Positioning
The tooltip automatically positions itself relative to the target element:
- Calculates optimal position: top, bottom, left, right
- Viewport edge detection prevents off-screen placement
- 16px padding from viewport edges
- 8px arrow pointer follows position
- ResizeObserver + 100ms polling for real-time tracking
- Handles scroll and resize events

### Spotlight Overlay
SVG-based spotlight effect:
- Uses SVG mask with white rect cutout
- Target element highlighted with ring: `ring-2 ring-white/50 ring-offset-2`
- Rounded cutout corners match target element
- Smooth transition: `transition-all duration-200`
- Click-through for target element interaction

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
  - Barrel export: `import { LineChart, BarChart } from "@/components/charts"`
- `src/components/dashboard/` - Dashboard UI components (DashboardWidget, DashboardCanvas, WidgetLibrary, WidgetConfig, MetricCard, MetricsTable, PeriodSelector, DateRangeSelector, ViewSelector, ExportButton)
  - Barrel export: `import { MetricCard, MetricsTable } from "@/components/dashboard"`
- `src/components/reports/` - Report components
  - Barrel export: `import { ReportTabs, ReportFilters } from "@/components/reports"`

### Chart Styling Patterns
All charts use consistent Recharts styling:
- **Grid**: `strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"`
- **Axis ticks**: `fill="rgba(255,255,255,0.4)" fontSize={11}`
- **Tooltip**: Custom dark theme with `bg-zinc-900 border border-white/10`
- **Color palette** (via `getChartColor(index)`):
  - blue, emerald, amber, red, violet, pink, cyan, lime

### Value Formatting Utilities
Located in `src/components/charts/types.ts`:
```typescript
// Smart formatting based on metric name
formatValue(value, metricName)
  // Percentages: "rate", "margin", "churn" → "45.2%"
  // Currency: "revenue", "mrr", "burn" → "$1.5M"
  // Numbers: → "1,234" or "1.2K"

// Period formatting
formatPeriod(date, periodType)
  // monthly → "Jan '25"
  // quarterly → "Q1 '25"
  // yearly → "2025"
```

### Type Guards
Located in `src/components/dashboard/types.ts`:
```typescript
isChartConfig(config): config is ChartConfig
isMetricCardConfig(config): config is MetricCardConfig
isTableConfig(config): config is TableConfig
getNumericValue(value): number | null
```
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
- `@dnd-kit/core`, `@dnd-kit/sortable` - Modern drag-drop for table reordering
- `@tiptap/*` - Rich text editor (tear sheet content)
- `jspdf`, `html-to-image` - PDF export
- `react-dropzone` - File upload drag-and-drop
- `date-fns` - Date formatting and manipulation
- `dompurify` - HTML sanitization for rich text

### PDF Export
Tear sheets and reports can be exported as PDF:
```tsx
import { exportElementAsPdf } from "@/lib/utils/export-pdf";

// Basic usage
await exportElementAsPdf(elementRef.current, "report.pdf");

// Hide elements during export
<button data-no-print>Download PDF</button>  // Won't appear in PDF
```
- Uses html-to-image to capture DOM as PNG
- Uses jsPDF to create multi-page PDF
- Supports `data-no-print` attribute to hide elements during export
- Handles pagination for content taller than A4
- Compatible with Tailwind CSS v4 (handles CSS function syntax)

### Logo Utility
```tsx
import { getCompanyLogoUrl } from "@/lib/utils/logo";

const logoUrl = getCompanyLogoUrl(relationship.logo_url);
// Returns the custom logo URL or null
// UI components handle fallback to company initials
```

### Dashboard Canvas Grid System
The dashboard builder uses react-grid-layout:
- **Grid**: 12 columns, 100px row height, 8px margins
- **Drag handles**: `.drag-handle` class on handle elements
- **Resize**: Enabled with min/max constraints per widget type
- **Responsive**: Tracks container width via ResizeObserver
- **Selection**: Blue ring highlight on selected widget (`ring-1 ring-blue-500/30`)
- **Empty state**: Dashed border with centered prompt

Widget constraints:
| Type | Min Width | Min Height | Max Height |
|------|-----------|------------|------------|
| metric-card | 3 cols | 1 row | 2 rows |
| chart | 4 cols | 2 rows | 4 rows |
| table | 6 cols | 2 rows | 6 rows |

### Setup
1. Run migration `0007_dashboard_views.sql`
2. Install dependencies: `npm install recharts react-grid-layout @dnd-kit/core @dnd-kit/sortable`

### Founder Dashboard
Founders have their own customizable dashboard (mirrors investor dashboard):
- **Routes**: `/portal/dashboard`, `/portal/dashboard/edit`
- **Components**: `src/components/founder/founder-dashboard-client.tsx`, `src/components/founder/founder-dashboard-builder.tsx`
- **Migration**: `0012_founder_dashboard.sql`

**API Routes:**
- `GET /api/founder/dashboard-views` - List all dashboard views for founder's company
- `POST /api/founder/dashboard-views` - Create new dashboard view (name, layout, is_default)
- `GET /api/founder/dashboard-views/[id]` - Get specific view
- `PUT /api/founder/dashboard-views/[id]` - Update view layout/name
- `DELETE /api/founder/dashboard-views/[id]` - Delete view

### Metric Detail Panel
Click any metric cell to view detailed information:
- Full submission history with timeline
- Source tracking (manual, AI, override)
- Edit/override capability for founders
- **Components**: `src/components/metrics/metric-detail-panel.tsx`, `src/components/metrics/metric-history-timeline.tsx`, `src/components/metrics/source-badge.tsx`

### Metrics Table Features

#### Rolling Totals (TTM-Style Aggregation)
The metrics table displays a "Total" column that calculates rolling aggregations across visible periods:

| Metric Type | Aggregation | Examples |
|-------------|-------------|----------|
| **Flow Metrics** | Sum across visible periods | Revenue, Expenses, GMV, API Calls |
| **Point-in-Time Metrics** | Most recent value | ARR, MRR, Burn Rate, Headcount, Runway |

- Flow metrics represent cumulative values earned/spent over time
- Point-in-time metrics represent snapshots at a specific moment
- Total updates automatically as users paginate through periods
- Tooltip explains the aggregation method for each metric

**Implementation** (`src/lib/metrics/temporal-aggregation.ts`):
```typescript
import {
  getDefaultAggregationType,
  calculateRollingTotal,
  recommendAggregationType,
  getTotalColumnLabel,
  getAggregationIndicator,
  FLOW_METRICS,
  POINT_IN_TIME_METRICS
} from "@/lib/metrics/temporal-aggregation";

// Get aggregation type for a metric
const aggType = getDefaultAggregationType("Revenue"); // "sum"
const aggType = getDefaultAggregationType("ARR"); // "latest"

// Calculate rolling total
const total = calculateRollingTotal([100, 200, 300, 400], "sum"); // 1000
const total = calculateRollingTotal([100, 200, 300, 400], "latest"); // 400

// For new/custom metrics, get recommendation with confidence
const { recommended, confidence, reason } = recommendAggregationType("Custom Revenue");
// { recommended: "sum", confidence: "medium", reason: "Appears to be a revenue/sales metric (flow)" }

// UI helpers
getTotalColumnLabel("quarterly"); // "Total (TTM)"
getAggregationIndicator("sum"); // { symbol: "Σ", label: "Sum of visible periods" }
getAggregationIndicator("latest"); // { symbol: "●", label: "Most recent value" }
```

**Metric Sets:**
- `FLOW_METRICS` - 47+ metrics that should be summed (revenue, expenses, volumes)
- `POINT_IN_TIME_METRICS` - 87+ metrics that show latest value (rates, counts, ratios)

**Aggregation Indicators:**
- `Σ` - Sum of visible periods (flow metrics)
- `●` - Most recent value (point-in-time metrics)

#### Drag-and-Drop Reordering
Users can reorder metrics in the table via drag-and-drop:
- Click "Reorder" button to enter reorder mode
- Drag metrics using the grip handle
- Order persists to database (cross-device sync)
- Per-company, per-user ordering (investors see their own order)

#### Components
- `src/lib/metrics/temporal-aggregation.ts` - Aggregation logic and metric classification
- `src/components/dashboard/metrics-table.tsx` - Table with totals and reordering

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
- `GET /api/investors/portfolio/contacts` - List portfolio contacts
- `POST /api/investors/portfolio/import` - Import contacts from CSV data
- `GET /api/investors/portfolio/export` - Download contacts as CSV file
- `POST /api/investors/portfolio/invite` - Send invitation to founder

## Portfolio Reports

### Overview
Investors can view aggregated metrics across their entire portfolio, compare companies side-by-side, and save custom report configurations.

### Report Types
- **Summary** (`/reports`) - KPI cards, distribution charts by industry/stage, portfolio trend chart, top performers by growth
- **Comparison** (`/reports/compare`) - Multi-select 2-8 companies, side-by-side charts/tables, normalization options (absolute/indexed/percent change)
- **Trends** (`/reports/trends`) - Coming soon: growth distribution, YoY comparison, outlier detection

### Aggregation Logic
Located in `src/lib/reports/aggregation.ts`:

| Category | Metrics | Aggregation |
|----------|---------|-------------|
| **Summable** | Revenue, MRR, ARR, Net Revenue, Gross Revenue, Total Revenue, Operating Expenses, R&D Spend, Marketing Spend, Sales Spend, COGS, Headcount, Customer Count, Active Users, API Calls, Transaction Volume, GMV | Sum or Average |
| **Average Only** | Gross Margin, Net Margin, NRR, GRR, Churn Rate, Retention Rate, Conversion Rate, Take Rate, Default Rate, Fraud Rate, Return Rate, ARPU, AOV, NPS, Model Accuracy | Average only |
| **Median Preferred** | Runway, CAC, LTV, LTV:CAC Ratio, Burn Rate, Cash Balance | Median (more robust to outliers) |

**Functions:**
- `aggregateMetricValues(values)` - Returns `{ sum, average, median, min, max, count, values }`
- `canSumMetric(name)` - Check if metric can be summed
- `prefersMedian(name)` - Check if metric prefers median over mean
- `extractNumericValue(value)` - Parse various value formats to number

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
  - `trends/` - Trends view components (TrendsClient, GrowthDistributionChart, YoYComparisonChart, OutlierTable)
  - `benchmarks/` - Benchmarking components (BenchmarksClient, BenchmarkChart, BenchmarkTable)
  - `metric-drilldown-panel.tsx` - Right-side sliding panel for metric breakdowns (see below)
- `src/lib/reports/aggregation.ts` - Aggregation utilities and metric type classifications

### Metric Drilldown Panel
Click a KPI card in the portfolio summary to open a detailed breakdown:
- Right-side sliding panel with smooth animation
- Shows all companies contributing to the metric
- Sortable by: Value (default), Growth, A-Z
- Each row shows: company logo, name, industry/stage tags, value, % of total, growth indicator
- Click company row to navigate to that company's dashboard
- Escape key or backdrop click to close

### API Routes
- `GET /api/investors/portfolio/metrics` - Aggregated metrics across portfolio (supports filters)
- `GET /api/investors/portfolio/distribution` - Portfolio breakdown by industry/stage/business model
- `GET /api/investors/portfolio/compare` - Side-by-side company comparison (companyIds, metrics, periodType, normalize)
- `GET /api/investors/portfolio/trends` - Growth distribution, YoY comparison, outlier detection
- `GET/POST /api/investors/portfolio/reports` - List/create saved report configurations
- `GET/PUT/DELETE /api/investors/portfolio/reports/[id]` - Read/update/delete saved report
- `POST /api/investors/portfolio/query` - Natural language portfolio query (rate-limited 20/min)
- `GET /api/investors/benchmarks` - Get benchmark data for metrics with company rankings
- `GET/POST /api/cron/calculate-benchmarks` - Cron: recalculate percentile benchmarks (daily 5 AM UTC)

### Setup
1. Run migration `0008_portfolio_reports.sql`

## LP Reporting Module

### Overview
Investors can manage LP funds, track investments, and calculate performance metrics (TVPI, DPI, RVPI, IRR, MOIC). Each fund contains investments linked to portfolio companies.

### Financial Calculations
Located in `src/lib/lp/calculations.ts`:
- `calculateTVPI(investments)` — (Unrealized + Realized) / Invested
- `calculateDPI(investments)` — Realized / Invested
- `calculateRVPI(investments)` — Unrealized / Invested
- `calculateIRR(cashFlows)` — Newton-Raphson method (100 iterations, 1e-8 tolerance)
- `calculateMOIC(investments)` — Multiple on Invested Capital

### Components
Located in `src/components/lp/`:
- `lp-reports-client.tsx` — Main page with fund cards and create fund modal
- `fund-card.tsx` — Fund summary card with TVPI/DPI/MOIC KPI row
- `fund-form-modal.tsx` — Create/edit fund with Zod + react-hook-form
- `fund-detail-client.tsx` — Fund detail with performance summary + investments table
- `performance-summary.tsx` — KPI cards (TVPI, DPI, RVPI, IRR, MOIC) with color coding
- `investment-table.tsx` — Editable investments table with per-row MOIC
- `investment-form-modal.tsx` — Add/edit investment with company dropdown
- `fund-performance-chart.tsx` — Recharts area chart for NAV over time

### API Routes
- `GET/POST /api/investors/funds` — List/create funds
- `GET/PUT/DELETE /api/investors/funds/[id]` — Read/update/delete fund
- `GET/POST /api/investors/funds/[id]/investments` — List/create fund investments
- `PUT/DELETE /api/investors/funds/[id]/investments/[investmentId]` — Update/delete investment
- `GET /api/investors/funds/[id]/performance` — Calculated TVPI/DPI/RVPI/MOIC
- `GET/POST /api/investors/funds/[id]/reports` — List/create LP reports

### Setup
1. Run migration `0022_lp_reporting.sql`

## Benchmarking Engine

### Overview
Anonymized percentile benchmarks calculated daily from portfolio metric data. Companies are ranked against peers filtered by metric, period type, industry, and stage.

### Calculations
Located in `src/lib/benchmarks/calculate.ts`:
- `calculatePercentiles(values)` — R-7 linear interpolation for p25/p50/p75/p90 (requires min 5 values)
- `getCompanyPercentile(value, benchmark)` — Estimates percentile rank 0-100
- `getPercentileColor(percentile)` — Tailwind text color (<25 red, 25-50 amber, 50-75 blue, >75 emerald)
- `getPercentileBgColor(percentile)` — Tailwind badge background classes

### Components
- `src/components/dashboard/benchmark-indicator.tsx` — Inline "P72" badge with 60s cache, hover tooltip
- `src/components/reports/benchmarks/benchmarks-client.tsx` — Full page with metric selector, filters, chart + table
- `src/components/reports/benchmarks/benchmark-chart.tsx` — Recharts BarChart with percentile reference lines
- `src/components/reports/benchmarks/benchmark-table.tsx` — Sortable table with percentile badges

### API Routes
- `GET /api/investors/benchmarks` — Benchmark data with company rankings (supports metric, periodType, industry, stage params)
- `GET/POST /api/cron/calculate-benchmarks` — Daily cron recalculates percentiles (min 5 companies per group)

### Setup
1. Run migration `0023_benchmarks.sql`
2. Cron job configured in `vercel.json` (daily at 5 AM UTC)

## Natural Language Portfolio Queries

### Overview
Investors can ask questions about their portfolio in natural language. AI parses the question into a structured query, executes it against the database, and returns a formatted answer.

### Query Types
- `metric_lookup` — "What is Company X's MRR?" → fetch specific metric
- `comparison` — "Compare revenue of A vs B" → multi-company comparison with chart data
- `aggregation` — "What's the average burn rate?" → portfolio-wide stats
- `ranking` — "Top 5 companies by revenue growth" → sorted ranking

### Architecture
Located in `src/lib/ai/portfolio-query.ts`:
- `PORTFOLIO_QUERY_SYSTEM_PROMPT` — Instructs AI to output structured JSON queries
- `parseNaturalLanguageQuery(query)` — Calls Gemini or OpenAI to parse NL to structured query
- `executeStructuredQuery(query, supabase, investorId)` — Executes against DB with RLS compliance
- `formatQueryResult(result)` — Extracts human-readable answer

### Components
- `src/components/investor/query-client.tsx` — Chat-style UI with user queries and AI responses
  - Inline Recharts BarChart when chartData returned
  - Right sidebar: 6 suggested queries + recent queries from localStorage
  - Auto-scroll to latest result

### API Routes
- `POST /api/investors/portfolio/query` — NL query (Zod: query 3-500 chars, rate-limited 20/min per user)

### Setup
1. Set `GOOGLE_AI_API_KEY` or `OPENAI_API_KEY` environment variable

## Scheduled Metric Requests

### Overview
Investors can schedule recurring metric requests that automatically go out to founders on a cadence (monthly, quarterly, annual). Founders receive email notifications, submit via portal, and reminders are automatically cancelled upon completion.

### Cadence Options
- **Monthly** - Request metrics every month for the previous month
- **Quarterly** - Request metrics every quarter for the previous quarter
- **Annual** - Request metrics every year for the previous year

### Schedule Configuration
- `cadence` - monthly/quarterly/annual
- `day_of_month` - Day (1-28) when requests are created
- `company_ids` - Specific companies or null for all portfolio
- `include_future_companies` - Auto-include new portfolio companies
- `due_days_offset` - Days until due date (default 7)
- `reminder_enabled` - Enable email reminders
- `reminder_days_before_due` - Array of days before due to send reminders (e.g., [3, 1])

### How It Works
1. Investor creates a schedule with a template, companies, and cadence
2. Cron job runs daily at 6 AM UTC to process due schedules
3. For each due schedule:
   - Calculate reporting period (previous month/quarter/year)
   - Create metric requests for each company × template metric
   - Send notification emails to founders
   - Create reminder records
4. Reminder cron runs hourly, sending due reminders
5. When founder submits a metric, the auto-fulfill trigger updates request status
6. A trigger cancels pending reminders when status changes to 'submitted'

### Components
- `src/components/investor/schedule-list.tsx` - List of schedules with actions
- `src/components/investor/schedule-card.tsx` - Individual schedule card
- `src/components/investor/schedule-wizard.tsx` - 4-step creation wizard
- `src/components/investor/cadence-selector.tsx` - Cadence picker
- `src/components/investor/schedule-run-history.tsx` - Run history display

### Schedule Utilities
**Period Calculation** (`src/lib/schedules/period.ts`):
```typescript
const period = calculateReportingPeriod(cadence); // Returns PREVIOUS period
// Monthly: previous calendar month
// Quarterly: previous calendar quarter
// Annual: previous calendar year
```
- `formatReportingPeriod()` - Human-readable labels
- `cadenceToPeriodType()` - Convert cadence to period type

**Next Run Calculation** (`src/lib/schedules/next-run.ts`):
```typescript
const nextRun = calculateNextRunDate(schedule); // Next run at 6 AM UTC
const isdue = isScheduleDue(schedule); // Check if should run now
const reminderDates = calculateReminderDates(dueDate, [3, 1]); // 3 days and 1 day before
```
- Day of month clamped to 1-28 (safe for all months)
- Reminders sent at 9 AM UTC

### Schedule Wizard UI Pattern
4-step wizard with progress indicator:
1. **Template selection**: System + user templates with expandable metrics
2. **Company selection**: All-companies toggle or multi-select with tags
3. **Cadence configuration**: Monthly/quarterly/annual with day picker
4. **Reminder settings**: Toggle + multi-day selection

Progress indicator styling:
- Completed steps: Green (emerald) circle with checkmark
- Current step: White circle
- Future steps: Muted/dimmed
- Connecting lines match completion status

### Cadence Selector Pattern
Visual card selection for cadence choice:
```tsx
<CadenceSelector
  value={cadence}
  onChange={setCadence}
  dayOfMonth={day}
  onDayChange={setDay}
/>
```
- Three option cards: Monthly, Quarterly, Annual
- Each card: Icon + label + description
- Selected state: `border-white/30 bg-white/10`
- Day picker: Dropdown with ordinal suffixes (1st, 2nd, etc.)

### API Routes
- `GET/POST /api/investors/schedules` - List/create schedules
- `GET/PUT/DELETE /api/investors/schedules/[id]` - Read/update/delete
- `POST /api/investors/schedules/[id]/pause` - Pause schedule
- `POST /api/investors/schedules/[id]/resume` - Resume schedule
- `POST /api/investors/schedules/[id]/run-now` - Manual trigger
- `POST /api/cron/process-schedules` - Cron: process due schedules
- `POST /api/cron/send-reminders` - Cron: send due reminders

### Cron Jobs (Vercel Cron)
Configured in `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/process-schedules", "schedule": "0 6 * * *" },
    { "path": "/api/cron/send-reminders", "schedule": "0 * * * *" },
    { "path": "/api/cron/calculate-benchmarks", "schedule": "0 5 * * *" }
  ]
}
```

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/cron/process-schedules` | Daily at 6 AM UTC | Creates metric requests from due schedules |
| `/api/cron/send-reminders` | Hourly | Sends reminder emails for approaching due dates |
| `/api/cron/calculate-benchmarks` | Daily at 5 AM UTC | Recalculates percentile benchmarks from anonymized metric data |

**Cron Authentication:**
```typescript
// Check CRON_SECRET if set (optional but recommended for production)
const cronSecret = process.env.CRON_SECRET;
const authHeader = req.headers.get("authorization");
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Testing Locally:**
- Call endpoints directly (no auth required when CRON_SECRET unset)
- Both routes support GET for easier browser testing

### Environment Variables
- `CRON_SECRET` - Secret for authenticating cron requests (optional, recommended for production)

### Setup
1. Run migration `0010_metric_request_schedules.sql`
2. Add `CRON_SECRET` to environment variables (optional)
3. Deploy to Vercel (cron jobs auto-configured from vercel.json)

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

### Security Vulnerability Policy
When a security vulnerability is discovered:
1. **Flag it immediately** with a `// WARNING: Security vulnerability` comment in the code
2. **Suggest a secure alternative** alongside the warning
3. **Never implement insecure patterns**, even if requested — always use the secure alternative
4. If asked to implement an insecure pattern, refer to this policy

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

### Security Best Practices From Audits

**Admin Client Usage:**
When using `createSupabaseAdminClient()`, always:
1. Verify ownership BEFORE using admin client
2. Add a comment explaining why admin client is needed
3. Log any errors appropriately

```typescript
// Good pattern:
// First verify ownership with regular client
const { data: company } = await supabase
  .from("companies")
  .eq("founder_id", user.id)
  .single();
if (!company) return jsonError("Not authorized.", 403);

// Admin client needed to bypass RLS for cross-table operations
const adminClient = createSupabaseAdminClient();
await adminClient.from("...").insert(...);
```

**Search Parameter Sanitization:**
When using ILIKE queries with user input:
```typescript
const escapedSearch = search
  .replace(/[%_]/g, "\\$&")  // Escape ILIKE wildcards
  .replace(/[(),.\"'\\]/g, ""); // Remove chars that could break PostgREST
```

**Cron Route Security:**
Cron endpoints should verify the secret:
```typescript
const cronSecret = process.env.CRON_SECRET;
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
// Note: If CRON_SECRET is not set, endpoint is accessible without auth (dev only)
```

## UI Patterns

### Modals
Use custom modal component with:
- Backdrop blur: `bg-black/60 backdrop-blur-sm`
- Modal: `rounded-xl border border-white/10 bg-zinc-900 p-6`
- Close on Escape key

### Slide-Out Panels
For detail panels that slide in from the right:
```tsx
// State for animation
const [isVisible, setIsVisible] = useState(false);
useEffect(() => {
  requestAnimationFrame(() => setIsVisible(true));
}, []);

// Animate out before closing
function handleClose() {
  setIsVisible(false);
  setTimeout(onClose, 200);
}

// Backdrop
<div className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
  isVisible ? "opacity-100" : "opacity-0"
}`} onClick={handleClose} />

// Panel
<div className={`fixed right-0 top-0 z-50 h-full w-full sm:w-[480px] border-l border-white/10 bg-zinc-900 transition-transform duration-200 ${
  isVisible ? "translate-x-0" : "translate-x-full"
}`}>
```
- Escape key to close
- Click backdrop to close
- Smooth slide + fade animation
- Mobile-responsive width (full on mobile, fixed on desktop)

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
- Every route has a `loading.tsx` file with skeleton UI
- Use `animate-pulse` with `bg-white/5` or `bg-white/10` for skeletons

### Loading.tsx Pattern
Each route directory has a loading.tsx for instant loading feedback:
```tsx
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-white/5" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Animation & Transition Patterns
Consistent animation patterns throughout the app:
- **Standard transitions**: `transition-colors duration-200`
- **Faster interactions**: `duration-150`
- **Complex animations**: `transition-all duration-300 ease-out`
- **Loading spinners**: `animate-spin` with border effect
- **Skeleton loading**: `animate-pulse` with `bg-white/5` or `bg-white/10`
- **Hover effects**: Color/opacity shifts (not scale)
  - `hover:bg-white/5` → `hover:bg-white/10`
  - `hover:text-white/80`

**Custom CSS Animations** (defined in `globals.css`):
- `animate-fade-in` - Fade in with subtle upward slide (used for tab content transitions)
  - Opacity: 0 → 1
  - Transform: translateY(4px) → translateY(0)
  - Duration: 200ms ease-out

### Accessibility Patterns
The app follows accessibility best practices:
- **Keyboard navigation**: Enter/Space handling on interactive elements
- **Role attributes**: `role="button"` for clickable divs
- **ARIA labels**: `aria-label="Close menu"`, `aria-hidden="true"` for decorative icons
- **Focus management**: `tabIndex={onClick ? 0 : undefined}`
- **Alert roles**: `role="alert"` for error/success messages
- **Semantic HTML**: Proper heading hierarchy, button types, form labels
- **Touch targets**: Min 44px height on mobile for tappable elements

### Mobile Responsiveness
The app is fully mobile-responsive using Tailwind breakpoints:
- `sm:` (640px) - Small tablets
- `md:` (768px) - Tablets/small laptops
- `lg:` (1024px) - Desktops

**Key Patterns:**
- Sidebar collapses to hamburger menu on mobile
- Grids stack to single column: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Tables become cards on mobile or use horizontal scroll
- Touch-friendly tap targets (min 44px height on mobile)
- Padding adjusts: `p-4 md:p-6`
- Modal widths: `max-w-md` with padding for edges

### Shared UI Components
Located in `src/components/ui/`:

**SlidingTabs** (`sliding-tabs.tsx`)
Animated tab switcher with multiple visual variants:
```tsx
<SlidingTabs
  tabs={[{ value: "metrics", label: "Metrics", icon: BarChart3, badge: 12 }]}
  value={activeTab}
  onChange={setActiveTab}
  size="sm" | "md"
  showIcons={true}
  variant="underline" | "pill"
/>
```

**Variants:**
- `underline` (default) - Clean underline indicator with subtle glow effect
  - Animated underline follows active tab
  - Icon scales up (110%) when active
  - Hover shows subtle background highlight
  - Border bottom with `border-white/[0.06]`
- `pill` - Background pill indicator
  - Animated background follows active tab
  - Subtle glow effect under active tab

**Tab Badge Support:**
- Add `badge` property to TabItem for count indicators
- Badges show in rounded pill next to label
- Active state: `bg-white/20`, inactive: `bg-white/10`
- Numbers > 99 display as "99+"

**Props:**
- `tabs` - Array of `{ value, label, icon?, badge? }`
- `value` - Currently selected tab
- `onChange` - Callback when tab changes
- `size` - "sm" or "md" (affects padding/text size)
- `showIcons` - Whether to display icons (default: true)
- `variant` - Visual style: "underline" or "pill"

Also exports `SlidingIconTabs` for compact icon-only toggles

**ConfirmModal** (`confirm-modal.tsx`)
Confirmation dialog with variant support:
```tsx
<ConfirmModal
  open={showDelete}
  title="Delete Item"
  message="This action cannot be undone."
  variant="danger" | "warning" | "default"
  confirmLabel="Delete"
  onConfirm={handleDelete}
  onCancel={() => setShowDelete(false)}
/>
```

**Skeleton Components** (`skeleton.tsx`)
Loading placeholders:
- `<Skeleton className="h-4 w-32" />` - Basic skeleton
- `<SkeletonText lines={3} />` - Multi-line text placeholder
- `<SkeletonCard />` - Card placeholder
- `<SkeletonTable rows={5} columns={4} />` - Table placeholder

**StatusBadge** (`status-badge.tsx`)
Flexible status indicator with color variants:
```tsx
<StatusBadge variant="success" | "warning" | "error" | "info" | "neutral" size="sm" | "md">
  Active
</StatusBadge>
```
Color mapping:
- `success`: `bg-emerald-500/20 text-emerald-200`
- `warning`: `bg-amber-500/20 text-amber-200`
- `error`: `bg-red-500/20 text-red-200`
- `info`: `bg-blue-500/20 text-blue-200`
- `neutral`: `bg-white/10 text-white/70`

**Alert** (`alert.tsx`)
Alert message box with icon and variant support:
```tsx
<Alert variant="error" | "success" | "warning" | "info">
  Something went wrong.
</Alert>
```
- Includes appropriate icon (AlertCircle, CheckCircle2, AlertTriangle, Info)
- Uses `role="alert"` for accessibility

**EmptyState** (`empty-state.tsx`)
Placeholder for empty data states:
```tsx
<EmptyState
  icon={<FolderOpen />}
  title="No documents"
  description="Upload your first document to get started."
  action={<Button>Upload</Button>}
/>
```

**Select** (`select.tsx`)
Radix UI-based select dropdown with dark theme styling:
```tsx
<Select value={value} onValueChange={setValue}>
  <SelectTrigger size="sm" | "default">
    <SelectValue placeholder="Choose..." />
  </SelectTrigger>
  <SelectContent>
    <SelectLabel>Options</SelectLabel>
    <SelectItem value="a">Option A</SelectItem>
    <SelectSeparator />
    <SelectItem value="b">Option B</SelectItem>
  </SelectContent>
</Select>
```
- Supports size variants on trigger
- Portal-based (renders at body root)
- Smooth animations on open/close
- Max height 300px with scrolling

### Tab Navigation Components

**FounderPortalTabs** (`src/components/founder/founder-portal-tabs.tsx`)
Main tab navigation for founder portal:
```tsx
<FounderPortalTabs
  companyId={company.id}
  companyName={company.name}
  companyIndustry={company.industry}
  metrics={metricValues}
  views={dashboardViews}
  templates={dashboardTemplates}
  documentCount={12}
  tearSheetCount={3}
/>
```
- Tabs: Metrics, Documents, Tear Sheets
- Uses SlidingTabs with underline variant
- Badge counts on each tab
- Manages URL query param `?tab=documents`

**CompanyDashboardTabs** (`src/components/investor/company-dashboard-tabs.tsx`)
Tab navigation for investor company dashboard:
```tsx
<CompanyDashboardTabs companyId={companyId} />
```
- Tabs: Metrics, Documents, Tear Sheets
- URL-based tab state (`?tab=documents`)

**RequestsTabs** (`src/components/investor/requests-tabs.tsx`)
Tab navigation for requests section:
- Tabs: Requests, Templates, Schedules
- Coordinates three tab content components
- Props: requests array, companies array

**Tab Content Components:**
- `RequestsTabContent` - List of sent metric requests with status indicators
- `TemplatesTabContent` - System and user metric templates with create/clone/hide actions
- `SchedulesTabContent` - Scheduled recurring requests with run history

### Layout Components

**InvestorLayoutClient** (`src/components/investor/investor-layout-client.tsx`)
Client-side layout wrapper for investor routes:
- Wraps children with OnboardingContext provider
- Handles investor-specific client state
- Includes OnboardingOverlay component

**InvestorAppShell** (`src/components/investor/investor-app-shell.tsx`)
Investor-specific app shell with navigation:
- Integrates with onboarding tour (`startTour` callback)
- Notification badge support
- Investor-specific navigation items

**AppShell** (`src/components/layouts/app-shell.tsx`)
Responsive app layout with sidebar navigation:
- Desktop: Fixed sidebar (260-280px) with main content area
- Mobile: Hamburger menu with slide-out drawer
- Supports nested navigation (expandable sections)
- Company logo/name in header
- Badge support for notification counts
- "Take tour" button integration for onboarding
```tsx
<AppShell
  title="Investor Portal"
  nav={[{ href: "/dashboard", label: "Dashboard", badge: 3 }]}
  company={{ name: "Acme", logoUrl: "...", website: "..." }}
  showTakeTour={true}
  onTakeTour={() => startTour()}
>
  {children}
</AppShell>
```

### Rich Text Editor

**RichTextEditor** (`src/components/founder/rich-text-editor.tsx`)
TipTap-based WYSIWYG editor for tear sheet content:
- Bold, italic, lists (bullet/numbered), links
- Placeholder text support
- Dark theme styling with prose classes
- HTML output for storage
```tsx
<RichTextEditor
  content={htmlContent}
  onChange={setHtmlContent}
  placeholder="Write your update..."
/>
```

**TipTap Configuration:**
- Uses StarterKit with headings, code blocks, and blockquotes disabled
- Link extension requires http/https protocol validation
- Placeholder extension for empty state
- Toolbar: Bold (⌘B), Italic (⌘I), Bullet List, Ordered List, Link
- Active button state: `bg-white/15`, inactive: `text-white/50`

**RichTextDisplay** (`src/components/founder/rich-text-display.tsx`)
Renders stored HTML safely using DOMPurify for XSS prevention.

### Company Switcher
**CompanySwitcher** (`src/components/investor/company-switcher.tsx`)
Dropdown for switching between portfolio companies in investor dashboard:
- Searchable company list
- Shows company logos, industry, and stage tags
- Used in company dashboard header

### Template Management Components
**TemplateForm** (`src/components/investor/template-form.tsx`)
Form for creating/editing metric templates:
```tsx
<TemplateForm
  mode="create" | "edit"
  templateId={id}
  initialName="SaaS Metrics"
  initialDescription="Core SaaS metrics"
  initialItems={[{ metric_name: "MRR", period_type: "monthly", data_type: "currency" }]}
  onSaved={() => refresh()}
  onCancel={() => close()}
/>
```
- Add/remove metric items with name, period type, data type
- Validation for required fields

**TemplateFormModal** (`src/components/investor/template-form-modal.tsx`)
Modal wrapper for TemplateForm with backdrop and close handling.

**TemplateAssignModal** (`src/components/investor/template-assign-modal.tsx`)
Modal for bulk-assigning templates to companies:
- Company multi-select
- Period/date range selection
- Due date configuration
- Calls `POST /api/investors/metric-templates/assign`

### Dashboard Tile Configuration
**TileMetricConfig** (`src/components/investor/tile-metric-config.tsx`)
Modal for configuring which metrics appear on company dashboard cards:
```tsx
<TileMetricConfig
  open={isOpen}
  companyId={id}
  companyName="Acme Inc"
  availableMetrics={["ARR", "MRR", "Burn Rate"]}
  initialPrimary="ARR"
  initialSecondary="Burn Rate"
  onClose={() => setOpen(false)}
  onSave={handleSave}
/>
```

**TileSettingsMenu/Button** (`src/components/investor/tile-settings-*.tsx`)
Dropdown menu and trigger button for tile actions (configure, delete, reset).

### Founder Approval
**InvestorApprovalCard** (`src/components/founder/investor-approval-card.tsx`)
Card for founders to approve/deny investor access:
```tsx
<InvestorApprovalCard
  investor={{
    id: relationshipId,
    approval_status: "pending",
    is_inviting_investor: false,
    users: { email: "investor@example.com", full_name: "John Doe" }
  }}
  onStatusChange={refresh}
/>
```
- Shows investor name/email
- Approve/Deny buttons
- Cannot change `auto_approved` status
- Calls `PUT /api/founder/investors/[id]/approval`

### Company Detail Tabs (Investor View)
**CompanyDocumentsTab** (`src/components/investor/company-documents-tab.tsx`)
Documents tab for company dashboard:
- Search by filename
- Filter by document type (dropdown)
- Filter by date range (7d, 30d, 90d, all)
- Individual and bulk download
- Card layout on mobile, table on desktop

**CompanyTearSheetsTab** (`src/components/investor/company-tear-sheets-tab.tsx`)
Tear sheets tab for company dashboard:
- Lists published tear sheets for the company
- Quarter/year display
- Click to view full tear sheet

### Portfolio Components
**PortfolioCompanies** (`src/components/investor/portfolio-companies.tsx`)
Main portfolio company list/grid:
```tsx
<PortfolioCompanies companies={companies} />
```
- Filter by stage, industry, business model
- Inline tag editing via CompanyTagEditor
- Company logo display
- Edit mode toggle

**CompanyTagEditor** (`src/components/investor/company-tag-editor.tsx`)
Inline editor for company tags (stage, industry, business model):
- Dropdown selectors for each tag type
- Optimistic updates with rollback on error
- Clear option for each tag
- Calls `PUT /api/investors/companies/[id]/tags`

### Inline Editable Components

**InlineTag** (`src/components/investor/inline-tag.tsx`)
Inline-editable tag selector with optimistic updates:
```tsx
<InlineTags
  companyId={id}
  stage="series_a"
  industry="saas"
  businessModel="b2b"
/>
```
- Three tag types: stage (violet), industry (blue), businessModel (emerald)
- Dropdown selector with clear option
- Optimistic update with rollback on error
- Escape key or click outside to close
- Uses `/api/investors/companies/[id]/tags` endpoint

**InlineWebsite** (`src/components/investor/inline-website.tsx`)
Inline-editable website URL field:
- Click to edit, blur to save
- Validates URL format
- Optimistic updates with rollback

### Auth Card
**AuthCard** (`src/components/auth/auth-card.tsx`)
Combined login/signup form component:
- Supports login and signup modes
- Handles invite token flows for founders
- Role-based field display (founder shows company fields)
- Zod validation with react-hook-form

### Notification Badge
Founders see pending request count in navigation:
- `GET /api/founder/notifications/count` - Returns count of pending metric requests
- Badge displays in sidebar/header when count > 0

**NotificationList** (`src/components/founder/notification-list.tsx`)
Displays alerts and notifications for founders (metric requests, approvals, etc.).

## GDPR & Privacy Compliance

### Data Export
Users can export all their data (GDPR data portability):
- `POST /api/user/export` - Returns JSON with all user-owned data
- Includes: profile, relationships, invitations, metric definitions, requests, submissions, documents, etc.

### Account Deletion
Users can delete their account (GDPR right to erasure):
- `POST /api/user/delete` - Requires `{ "confirmation": "DELETE MY ACCOUNT" }`
- Cascades deletion through all user-owned data
- Removes auth user from Supabase
- Irreversible action

### Data Cascade
When deleting:
- **Investors**: Removes schedules, reminders, requests, definitions, relationships, invitations, reports, views
- **Founders**: Removes company data, metric values, documents (if no other investors linked)

## Hooks

### useDashboardPreferences
Manages dashboard display preferences (periodType, dateRange) with database persistence:
```tsx
const { periodType, setPeriodType, dateRange, setDateRange, isLoaded } = useDashboardPreferences();
```
- Loads preferences from API on mount
- Saves changes to database (debounced)
- Syncs across devices automatically
- Location: `src/hooks/use-dashboard-preferences.ts`

### useDebounce
Debounces value changes, commonly used for search inputs:
```tsx
import { useDebounce } from "@/lib/hooks/use-debounce";

function SearchComponent() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300); // 300ms delay

  useEffect(() => {
    if (debouncedSearch) {
      // Only fires 300ms after user stops typing
      fetchResults(debouncedSearch);
    }
  }, [debouncedSearch]);

  return <input value={search} onChange={(e) => setSearch(e.target.value)} />;
}
```
- Location: `src/lib/hooks/use-debounce.ts`
- Generic type: `useDebounce<T>(value: T, delay: number): T`

## Types & Constants

### Dashboard Types (`src/components/dashboard/types.ts`)
```typescript
type ChartType = "line" | "bar" | "area" | "pie";
type WidgetType = "chart" | "metric-card" | "table";
type PeriodType = "monthly" | "quarterly" | "yearly";

// Type guards
isChartConfig(config): config is ChartConfig
isMetricCardConfig(config): config is MetricCardConfig
isTableConfig(config): config is TableConfig
getNumericValue(value): number | null
```

### Chart Constants (`src/components/charts/types.ts`)
```typescript
// 8-color palette for multi-metric charts
const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

// Formatting utilities
formatValue(value, metricName)  // Smart formatting based on metric type
formatPeriod(date, periodType)  // Period label formatting
```

### Widget Templates (`src/components/dashboard/widget-library.tsx`)
Default grid sizes for dashboard widgets:
| Widget Type | Width | Height |
|-------------|-------|--------|
| Line/Bar/Area Chart | 6 cols | 2 rows |
| Pie Chart | 4 cols | 2 rows |
| Metric Card | 3 cols | 1 row |
| Table | 12 cols | 2 rows |

### Status Enums
Used across the application for consistent status handling:

| Type | Values | Location |
|------|--------|----------|
| Metric Request Status | `pending`, `submitted`, `fulfilled` | API/DB |
| Approval Status | `auto_approved`, `pending`, `approved`, `denied` | investor_company_relationships |
| Invitation Status | `pending`, `sent`, `accepted` | portfolio_invitations |
| Extraction Status | `pending`, `processing`, `completed`, `failed` | document_metric_mappings |
| Metric Source | `manual`, `ai_extracted`, `override` | company_metric_values |
| Organization Role | `admin`, `member`, `viewer` | organization_members |
| Schedule Cadence | `monthly`, `quarterly`, `annual` | metric_request_schedules |

### Tag Colors (`src/components/investor/inline-tag.tsx`)
Company tags use consistent color coding:
- **Stage** (violet): `bg-violet-500/20 text-violet-200`
- **Industry** (blue): `bg-blue-500/20 text-blue-200`
- **Business Model** (emerald): `bg-emerald-500/20 text-emerald-200`

### Date Range Options
Standard date filter presets used in document lists and metrics:
- `"1y"` - Last 1 year
- `"2y"` - Last 2 years
- `"all"` - All time

### Pagination Constants (`src/lib/api/pagination.ts`)
- `MAX_LIMIT`: 100 (maximum items per page)
- `DEFAULT_LIMIT`: 50 (default items per page)

## Utility Functions

### Class Name Merging
```tsx
import { cn } from "@/lib/utils/cn";

// Basic usage - combines clsx + tailwind-merge
<div className={cn("base-class", isActive && "active-class", className)} />

// Handles Tailwind conflicts correctly
cn("p-4", "p-2") // Returns "p-2" (later value wins)
cn("text-red-500", condition && "text-blue-500") // Properly merges

// Common patterns
cn(
  "rounded-md border",
  variant === "primary" ? "bg-white text-black" : "bg-white/5 text-white",
  disabled && "opacity-50 cursor-not-allowed",
  className
)
```
- Combines clsx + tailwind-merge for conditional class composition
- Properly handles Tailwind class conflicts (padding, margin, colors, etc.)

### HTML Escape
```tsx
import { escapeHtml } from "@/lib/utils/html";
const safe = escapeHtml(userInput);
```
- Escapes `<`, `>`, `&`, `"`, `'` to prevent XSS
- Use when embedding user content in HTML

### Period Calculation
```tsx
import {
  calculatePeriodDates,
  getPeriodLabel,
  getAvailableQuarters,
  getAvailableYears,
  isValidQuarter,
  isValidYear
} from "@/lib/utils/period";

// Calculate dates for a period
const { periodStart, periodEnd } = calculatePeriodDates({ type: "quarterly", year: 2024, quarter: 1 });
// periodStart: "2024-01-01", periodEnd: "2024-03-31"

// Get human-readable label
getPeriodLabel({ type: "quarterly", year: 2024, quarter: 1 }); // "Q1 2024"
getPeriodLabel({ type: "annual", year: 2024 }); // "2024"

// Get available periods for dropdowns
getAvailableQuarters(); // Current year + 2 past years of quarters
getAvailableYears(); // Past 6 completed years (excluding current)

// Validation
isValidQuarter(1); // true (1-4 valid)
isValidYear(2024); // true (2000 to current year + 1)
```
- Quarterly: Q1 (Jan-Mar), Q2 (Apr-Jun), Q3 (Jul-Sep), Q4 (Oct-Dec)
- Annual: Jan 1 - Dec 31

### Period Normalization (AI Extraction)
```tsx
import {
  normalizePeriod,
  normalizeMetricPeriods,
  isPeriodAligned,
  getPeriodKey
} from "@/lib/utils/period-normalization";

// Normalize a single period
const normalized = normalizePeriod("2024-01-15", "2024-03-20", "quarterly");
// Returns: {
//   period_start: "2024-01-01",
//   period_end: "2024-03-31",
//   period_type: "quarterly",
//   was_adjusted: true,
//   period_label: "Q1 2024"
// }

// Batch normalize extracted metrics
const normalizedMetrics = normalizeMetricPeriods(extractedMetrics);

// Check if date aligns with period boundary
isPeriodAligned("2024-01-01", "quarterly"); // true
isPeriodAligned("2024-01-15", "quarterly"); // false

// Generate deduplication key
getPeriodKey("Revenue", "2024-01-01", "2024-03-31", "quarterly");
// "revenue|2024-01-01|2024-03-31|quarterly"
```
Used to normalize AI-extracted dates to canonical period boundaries:
- Quarterly: First day of quarter (Jan 1, Apr 1, Jul 1, Oct 1)
- Monthly: First day of month
- Annual: Jan 1 of year
- Handles timezone issues with explicit UTC parsing
- `was_adjusted` flag tracks if AI extraction modified dates

## Utility API Routes

- `GET /api/health` - Health check endpoint (returns `{ ok: true, timestamp }` with DB connectivity check)
- `POST /api/notifications/send` - Send notification emails (internal use)
- `GET /api/founder/notifications/count` - Returns `{ count: number }` of pending metric requests for founders

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Email (Resend)
RESEND_API_KEY=
RESEND_FROM_DOMAIN=              # Production email domain (e.g., velvet.com)

# AI Document Extraction
OPENAI_API_KEY=                  # OpenAI API key
OPENAI_EXTRACTION_MODEL=         # Override model (default: gpt-4o-mini)
GOOGLE_AI_API_KEY=               # Google AI API key (enables Gemini, preferred)
GEMINI_MODEL=                    # Override model (default: gemini-2.5-flash)

# Cron
CRON_SECRET=                     # Secret for authenticating cron requests (optional but recommended)
```

## Development Notes

### Local Development Port
The app runs on port 3001 by default (configured in `package.json`):
```json
"scripts": {
  "dev": "next dev -p 3001",
  "build": "next build",
  "start": "next start",
  "lint": "eslint"
}
```
Set `NEXT_PUBLIC_APP_URL=http://localhost:3001` in `.env.local`.

### TypeScript Path Alias
The project uses `@/*` as a path alias for `./src/*`:
```typescript
// Instead of relative paths:
import { Button } from "../../../components/ui/button";

// Use the alias:
import { Button } from "@/components/ui/button";
```
Configured in `tsconfig.json`.

### Email Testing
- Resend test domain (`onboarding@resend.dev`) only sends to account owner's email
- Use "Dev Mode: Invite Links" in UI to copy invite URLs for testing
- For production: verify a domain in Resend

### User Deletion (Testing)
```sql
SELECT delete_user_by_email('user@example.com');
```

### Seed Scripts
Located in `scripts/` for development/testing:

**seed-dummy-data.ts** - Creates realistic investor portfolio data:
- Creates 10 founder accounts (SpaceX, Stripe, Databricks, Canva, Discord, Figma, Instacart, Plaid, Notion, Airtable)
- Links to hardcoded investor ID: `8047b3eb-4b06-4b69-b677-bcd4131c795c`
- Generates 10+ metrics per company with quarterly values (Q1 2023 - Q4 2025)
- Test founder password: `DummyFounder123!`
- Run: `npx tsx scripts/seed-dummy-data.ts`
- Cleanup: `npx tsx scripts/seed-dummy-data.ts --cleanup`

**seed-founder-data.ts** - Seeds founder-specific data:
- Quarterly metrics for test account (Q1 2024 - Q4 2025)
- Tear sheets for multiple founders with content (highlights, milestones, challenges)
- Test metric requests (pending status)
- Run: `npx tsx scripts/seed-founder-data.ts`
- Cleanup: `npx tsx scripts/seed-founder-data.ts --cleanup`

Both require `SUPABASE_SERVICE_ROLE_KEY` environment variable.

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
- `0009_pagination_indexes.sql` - Performance indexes for pagination
- `0010_metric_request_schedules.sql` - Scheduled metric requests: metric_request_schedules, scheduled_request_runs, metric_request_reminders tables, RLS policies, auto-cancel reminders trigger, period calculation functions
- `0011_tile_metric_preferences.sql` - Adds `tile_primary_metric` and `tile_secondary_metric` columns to investor_company_relationships for dashboard card customization
- `0012_founder_dashboard.sql` - Creates `tear_sheets` table (quarterly company summaries with sharing), extends `dashboard_views` with `founder_id` column for founder dashboards
- `0013_security_hardening.sql` - Tightens RLS policies: scoped portfolio_invitations access, founder relationship update restrictions, `enforce_founder_relationship_update()` trigger
- `0014_performance_indexes.sql` - Composite indexes for metric_requests, company_metric_values, metric_definitions, schedules, reminders
- `0015_storage_buckets.sql` - Creates `company-logos` (public) and `documents` (private) storage buckets with RLS policies
- `0016_ai_extraction.sql` - AI extraction: adds `source`, `source_document_id`, `ai_confidence` to company_metric_values; creates `metric_value_history` audit table; extends document_metric_mappings with extraction fields
- `0017_organizations.sql` - Creates `organizations`, `organization_members`, `organization_invitations` tables with `org_role` enum (admin/member/viewer); adds `organization_id` to companies and relationships
- `0018_org_rls.sql` - Organization-aware RLS policies with `user_org_members()` helper function for team data sharing
- `0019_fix_org_members_rls.sql` - Fixes RLS circular dependency with `user_organization_ids()` helper function
- `0020_users_org_visibility.sql` - Updates users RLS policy for org member profile visibility
- `0021_user_preferences.sql` - Adds `preferences` JSONB column to users table with GIN index for cross-device user preferences
- `0022_lp_reporting.sql` - Creates `funds`, `fund_investments`, `lp_reports` tables with RLS for investor-scoped LP fund management
- `0023_benchmarks.sql` - Creates `metric_benchmarks` table with UNIQUE(metric_name, period_type, industry, stage) and authenticated read RLS

Migrations must be run manually in the Supabase SQL Editor (Dashboard > SQL Editor > paste and run).

### Supabase Edge Functions
Located in `supabase/functions/`:

| Function | Purpose | Trigger |
|----------|---------|---------|
| `send-metric-request-notification` | Sends email when metric request created | DB webhook (optional) |
| `process-document-ingestion` | Triggers AI extraction for uploaded documents | Manual/API call |
| `_shared/cors.ts` | Shared CORS headers for edge functions | Import |

**Deployment:**
```bash
supabase functions deploy <function-name>
```

**Local Testing:**
```bash
supabase functions serve
```

**Note:** Edge functions are optional - the app also has equivalent functionality in Next.js API routes. Edge functions are useful for DB-triggered webhooks or Deno-specific requirements.

## User Preferences

### Overview
User preferences are stored in a `preferences` JSONB column on the `users` table. This enables cross-device sync - preferences set on one device are available on all devices the user logs into.

### Storage Policy
**Never use localStorage for user preferences.** All user preferences must be stored in the database via the preferences API. This ensures:
- Cross-device sync
- Data persistence across browser clears
- Consistent experience across devices

### API Endpoints
- `GET /api/user/preferences` - Get all preferences or a specific key (`?key=metric_order.company-123`)
- `PUT /api/user/preferences` - Update preferences (`{ key, value }` or `{ preferences: {...} }`)

### Current Preferences
| Key Pattern | Description |
|-------------|-------------|
| `metric_order.{companyId}-{widgetId}` | Custom metric order in table widgets |
| `dashboard.preferences` | Dashboard settings: `{ periodType, dateRange }` |

### Adding New Preferences
1. Choose a descriptive key pattern (e.g., `feature_name.context`)
2. Use the preferences API to read/write
3. Document the key pattern in this table

## Tear Sheets

### Overview
Tear sheets are quarterly company summaries that founders create to share with investors. They provide a snapshot of key metrics and company updates for a specific period.

### Features
- **Quarterly Summaries**: Create summaries for each quarter (Q1, Q2, Q3, Q4)
- **Draft/Published Status**: Work on drafts before publishing
- **Shareable Links**: Generate public links with tokens for external sharing
- **Metric Selection**: Choose which metrics to include in the summary
- **Investor Access**: Investors can view tear sheets for their portfolio companies

### Data Model
- `title` - Summary title (e.g., "Q4 2024 Update")
- `quarter` - Q1, Q2, Q3, or Q4
- `year` - Year (e.g., 2024)
- `status` - draft or published
- `share_enabled` - Whether public sharing is enabled
- `share_token` - Unique token for public access

### Routes
- `/portal/tear-sheets` - List all tear sheets
- `/portal/tear-sheets/new` - Create new tear sheet
- `/portal/tear-sheets/[id]` - Edit tear sheet
- `/share/tear-sheet/[token]` - Public shareable view

### Components
- `src/components/founder/tear-sheet-editor.tsx` - Editor for creating/editing
- `src/components/founder/tear-sheet-preview.tsx` - Preview component
- `src/components/founder/tear-sheet-card.tsx` - Card display in list
- `src/components/founder/tear-sheets-tab.tsx` - Tab for investor dashboard

### API Routes
- `GET/POST /api/founder/tear-sheets` - List/create tear sheets
- `GET/PUT/DELETE /api/founder/tear-sheets/[id]` - Read/update/delete
- `POST /api/founder/tear-sheets/[id]/share` - Enable/disable sharing
- `GET /api/founder/tear-sheets/[id]/metrics` - Get metrics for tear sheet quarter
- `GET /api/public/tear-sheets/[token]` - Public access via share token
- `GET /api/investors/companies/[id]/tear-sheets` - Investor view of company tear sheets
- `GET /api/investors/companies/[id]/tear-sheets/[tearSheetId]/metrics` - Get metrics for specific tear sheet (investor view)

## Organizations & Teams

### Overview
Users can create organizations (teams) to collaborate with colleagues. Organizations share portfolio access and can have multiple members with different roles.

### Organization Roles
| Role | Permissions |
|------|-------------|
| `admin` | Full access: invite members, manage roles, delete org |
| `member` | Read/write access to shared portfolio and metrics |
| `viewer` | Read-only access to shared portfolio and metrics |

### How It Works
1. User creates an organization (becomes owner/admin)
2. Admin invites team members via email
3. Invited users receive link, sign up or log in
4. Members see shared portfolio companies and metrics
5. Each organization has a `org_type` matching the user role (investor or founder)

### Invitation Flow
1. Admin creates invitation with email and role
2. System generates unique token (expires in 7 days)
3. Invitee receives email with link
4. On accept, user added to `organization_members`
5. Invitation status updated to `accepted`

### Data Sharing
- Companies can be linked to organizations via `organization_id`
- Investor-company relationships can be shared via `organization_id`
- Members see all data linked to their organization

### Database Tables
- `organizations` - Team/org metadata (name, type, owner)
- `organization_members` - User memberships and roles
- `organization_invitations` - Pending invites with tokens

### API Routes
- `GET/POST /api/organizations` - List/create organizations
- `GET/PUT/DELETE /api/organizations/[id]` - Read/update/delete org
- `GET/POST /api/organizations/[id]/members` - List/add members
- `DELETE /api/organizations/[id]/members/[userId]` - Remove member
- `POST /api/organizations/[id]/invitations` - Create invitation
- `POST /api/organizations/join` - Join organization via invitation token
- `DELETE /api/organizations/[id]/invitations/[invId]` - Cancel invitation

### Team Components
Located in `src/components/team/`:

| Component | Purpose |
|-----------|---------|
| `team-settings.tsx` | Main team management interface (create org, invite, manage) |
| `member-list.tsx` | Displays team members with email, name, role, join date |
| `pending-invitations.tsx` | Shows pending invites with resend/cancel actions |
| `invite-member-modal.tsx` | Modal for inviting new team members |
| `member-role-selector.tsx` | Dropdown for role selection (admin/member/viewer) |

**TeamSettings Props:**
```tsx
<TeamSettings currentUserId={user.id} />
```
- Loads organization and members from API
- Supports creating new organization if none exists
- Shows member list and pending invitations

### Setup
1. Run migrations: `0017_organizations.sql`, `0018_org_rls.sql`, `0019_fix_org_members_rls.sql`, `0020_users_org_visibility.sql`

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

### Email System Architecture

**Email Templates:**
Email HTML is built inline in API routes using template literals. Key patterns:
- Use `escapeHtml()` from `@/lib/utils/html` for ALL user-provided content
- Dark theme styling matching app design
- Responsive tables with inline CSS (email clients don't support external CSS)

```typescript
// Example from cron/process-schedules/route.ts
const html = `
  <div style="background: #18181b; padding: 24px;">
    <h1 style="color: #fff;">${escapeHtml(companyName)} Metrics Request</h1>
    <p style="color: rgba(255,255,255,0.7);">
      ${escapeHtml(investorName)} is requesting metrics...
    </p>
  </div>
`;
```

**Development Mode Behavior:**
When `RESEND_API_KEY` is not set:
- Emails are logged to console with `[DEV]` prefix
- Database records are still marked as "sent" to test flows
- Invite links are copied to clipboard instead of emailed

**Email Types:**
| Type | Triggered By | Route/File |
|------|--------------|------------|
| Founder Invitation | Investor invites founder | `/api/investors/portfolio/invite` |
| Metric Request Notification | Schedule runs | `/api/cron/process-schedules` |
| Metric Reminder | Approaching due date | `/api/cron/send-reminders` |
| Org Team Invitation | Admin invites member | `/api/organizations/[id]/invitations` |

### Email Retry System
Batch email sending with exponential backoff (`src/lib/email/retry.ts`):
```typescript
const { sent, failed } = await sendEmailBatchWithRetry(emails);
```
- MAX_RETRIES = 3 with exponential backoff (1s, 2s, 4s delays)
- Distinguishes 4xx (non-retryable) from 5xx (retryable) errors
- Uses Resend batch API endpoint

## Production Checklist

- [ ] **Re-enable email confirmation** in Supabase (Authentication → Providers → Email → toggle on "Confirm email"). Currently disabled for development.
- [ ] **Configure email sending domain** (see Email Configuration section above)
- [ ] Set `NEXT_PUBLIC_APP_URL` to the production domain
