# UX Competitive Review & Strategic Roadmap

**Date:** 2026-02-13
**Status:** Phase 1 approved for implementation. Phases 2-4 stored for future build.

## Competitive Context

| Platform | Relevance |
|---|---|
| **Visible.vc** | 540+ funds. AI Inbox, login-free submissions, 14+ integrations, MCP server. |
| **Standard Metrics** | 100+ VCs, 8K+ companies. Free founder tier, 10K+ benchmarking, report-once architecture. |
| **Vestberry** | Investee Portal, ILPA/InvestEurope LP reports, deep in-platform analytics. |
| **Chronograph** | $6T+ monitored. Template-free collection, real-time validation, Chrono AI. |

Velvet shares the same foundational architecture as Standard Metrics (company-level submissions, multi-investor, founder-controlled access). Gaps are in friction reduction, data ingestion breadth, and polish.

---

## Phase 1: UX Quick Wins (APPROVED)

### Investor Side

| # | Fix | Details |
|---|---|---|
| 1 | Persist dashboard grid/list view | Save to user preferences via `PUT /api/user/preferences`. |
| 2 | Surface remind button on collapsed campaign cards | Add inline remind action without requiring expand. |
| 3 | Add retry buttons on error states | Across dashboard, documents, campaigns, reports. |
| 4 | Campaign detail: skeleton instead of spinner | Replace loading spinner with skeleton cards matching expanded layout. |
| 5 | "Awaiting founder signup" — add actionable next step | Show "Copy invite link" or "Resend invitation" inline. |
| 6 | Metric request preview before sending | Show preview of what the founder will receive in the wizard before dispatch. |
| 7 | Historical upload: allow going back to Step 2 (company mapping) | Add back-navigation from Review step to Map Companies step. |
| 8 | Historical upload: draft/resume capability | Auto-save review progress so users can return later. |
| 9 | Reports: drill-down to company detail | Click company name in metric breakdown → navigate to `/dashboard/[companyId]`. |
| 10 | Documents: "open in new tab" action | Add icon button alongside preview and download. |
| 12 | Company detail: contextual message for pending approval | Show connection date, explain what "pending" means, and suggest actions. |

### Founder Side

| # | Fix | Details |
|---|---|---|
| 15 | Range validation on metric submission | Flag negative revenue, outlier values, obvious data entry errors. |
| 16 | Fix misleading empty state for new users | "No metric requests yet" with explainer instead of "You're all caught up!" |
| 17 | Fix checklist document upload link | Point to `/portal/documents` instead of portal tab. |
| 18 | Add bulk deny action for investors | Symmetry with existing bulk approve. |
| 19 | Sync runway card dismiss to DB | Use `PUT /api/user/preferences` instead of localStorage only. |

---

## Phase 2: Integration Framework + Google Sheets Connector (FUTURE)

### Integration Architecture

All connectors share a common pattern:

```
OAuth Flow -> Fetch Structured Data -> Normalize to ParsedWorkbook -> Existing Review Pipeline
```

The historical upload pipeline is the universal ingestion funnel. Every integration produces a `ParsedWorkbook`, and the review/approve/conflict-detect flow works unchanged.

### Database Schema

```sql
CREATE TABLE connected_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  organization_id uuid REFERENCES organizations,
  provider text NOT NULL, -- 'notion', 'airtable', 'asana', 'google_sheets', 'quickbooks', 'xero', 'stripe'
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  config jsonb DEFAULT '{}', -- provider-specific: database_id, base_id, spreadsheet_id, etc.
  field_mapping jsonb DEFAULT '{}', -- maps provider fields to Velvet metrics
  sync_schedule text DEFAULT 'manual', -- 'manual', 'daily', 'weekly', 'monthly'
  last_synced_at timestamptz,
  last_sync_error text,
  status text DEFAULT 'active', -- 'active', 'paused', 'error', 'revoked'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: user can only see their own integrations
ALTER TABLE connected_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own integrations" ON connected_integrations
  FOR ALL USING (user_id = auth.uid());
```

### Connector Interface

```typescript
interface DataConnector {
  name: string;
  provider: string;
  oauthConfig: OAuthConfig;
  fetchData(token: string, config: ConnectorConfig): Promise<ParsedWorkbook>;
  mapFields(schema: ProviderSchema): Promise<FieldMapping[]>;
  supportsIncremental: boolean;
  supportedMetrics: string[];
}
```

### Google Sheets Connector (Priority 1)

**User flow:**
1. "Connect Google Sheets" -> Google OAuth -> pick spreadsheet + tab
2. AI-assisted layout detection (reuses `EXCEL_STRUCTURE_ANALYSIS_PROMPT`)
3. Preview extracted values in review table
4. Optional: enable scheduled sync (daily/weekly)

**Technical:**
- Google Sheets API v4 with `spreadsheets.values.batchGet`
- OAuth 2.0 with refresh tokens
- Rate limit: 60 reads/min per user
- The existing AI analyzer maps 1:1 — a Google Sheet IS a spreadsheet

### Integration Priority

| Priority | Integration | Rationale |
|---|---|---|
| 1 | Google Sheets | Most founders already track here. Reuses AI analyzer. |
| 2 | QuickBooks + Xero | Pulls financials from source of truth. Highest data quality. |
| 3 | Stripe | Real-time SaaS metrics. High-value for SaaS portfolios. |
| 4 | Airtable | Clean typed data. Popular with ops-heavy founders. |
| 5 | Notion | High demand but messy data. Hardest to map reliably. |
| 6 | Zapier | Catch-all for 5000+ apps. Lower priority if native integrations exist. |
| 7 | Asana | Low overlap with financial metrics. Niche use case. |

### Notion Connector Details

**Flow:** OAuth -> select workspace + database -> map properties to metrics -> preview -> sync
**Challenges:**
- Properties are freeform (text, number, date, select, relation, rollup, formula)
- No native "updated since X" filter — must sort by `last_edited_time`
- Field mapping UI needs type coercion (text "50,000" -> number 50000)

### Airtable Connector Details

**Flow:** OAuth -> select base + table -> auto-suggest field mappings (typed fields) -> preview -> sync
**Advantages:**
- Strongly typed fields make auto-mapping reliable
- Supports `LAST_MODIFIED_TIME()` for clean incremental sync
- Webhooks available on paid plans for real-time sync

### Asana Connector Details

**Flow:** OAuth -> select workspace + project -> map custom fields to metrics -> preview -> sync
**Notes:**
- Best for operational milestones rather than financial metrics
- Custom fields exist but are awkward for structured metric tracking
- Lowest demand of all connectors

---

## Phase 3: Login-Free Metric Submission + AI Email Inbox (FUTURE)

### Login-Free Submission (Magic Links)

**What it solves:** The #1 barrier to founder adoption — forcing account creation.

**Architecture:**
1. When investor sends metric request, founders who haven't signed up get an email with a secure, time-limited link
2. Link opens a standalone submission form (no auth required)
3. Values go into `company_metric_values` with `source = 'magic_link'`
4. If founder later signs up, data links to their account via `founder_email`

**Database:**
```sql
CREATE TABLE magic_link_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  company_id uuid REFERENCES companies NOT NULL,
  metric_request_id uuid REFERENCES metric_requests,
  expires_at timestamptz NOT NULL,
  submitted_at timestamptz,
  submitted_values jsonb,
  created_at timestamptz DEFAULT now()
);
```

### AI Email Inbox

**What it solves:** Zero-effort data ingestion from unstructured founder update emails.

**Architecture:**
1. Unique ingest email per investor org (via Resend inbound webhooks)
2. Email body + attachments -> AI extraction pipeline (reuse `ai-analyzer.ts` patterns)
3. Extracted values -> `historical_upload_values` staging table
4. Investor reviews and approves in same UI as historical uploads

**New route:** `POST /api/webhooks/email-ingest` (Resend inbound webhook)

---

## Phase 4: Accounting & Revenue Connectors (FUTURE)

### QuickBooks Online

**Auto-mapped metrics:** Revenue, COGS, Cash Balance, Burn Rate, Net Income, Gross Margin
**API:** REST with OAuth 2.0, `ProfitAndLoss` and `BalanceSheet` report endpoints
**Sync:** Monthly pull of financial statements

### Xero

**Auto-mapped metrics:** Same as QuickBooks
**API:** REST with OAuth 2.0, `Reports/ProfitAndLoss` and `Reports/BalanceSheet`
**Sync:** Monthly pull

### Stripe

**Auto-mapped metrics:** MRR, ARR, Churn Rate, Customer Count, ARPU
**API:** REST with OAuth 2.0 (Stripe Connect)
**Sync:** Real-time via webhooks

### MCP Server (Forward-Looking)

Build an MCP server that lets AI agents (Claude, etc.) query Velvet portfolio data conversationally. Matches Visible.vc and Standard Metrics offerings.

---

## Competitive Feature Matrix

| Feature | Velvet (Current) | Velvet (After Phases 1-4) | Visible | Standard Metrics |
|---|---|---|---|---|
| Report-once architecture | Yes | Yes | No (per-investor) | Yes |
| Multi-investor access | Yes | Yes | Yes | Yes |
| Founder-controlled access | Yes | Yes | Partial | Partial |
| AI data parsing | Excel only | Excel + Email + Sheets | AI Inbox | AI + managed |
| Login-free submission | No | Yes (Phase 3) | Yes | No |
| Native integrations | 0 | 6+ (Phases 2,4) | 14+ | 3-4 |
| Benchmarking | Planned | Planned | Basic | 10K+ companies |
| LP Reporting | Yes | Yes | Yes | Yes |
| Tear Sheets | Yes | Yes | Yes | Yes |
| MCP Server | No | Phase 4 | Yes | Yes |
| Free founder tier | Implicit | Explicit | No | Yes |
| Light + Dark mode | Yes | Yes | Dark only | Dark only |
