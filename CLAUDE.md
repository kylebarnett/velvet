# Velvet - Project Requirements & Preferences

> **Note:** Keep this file updated whenever there are architectural changes, new patterns, or important decisions. This serves as the source of truth for project conventions.

## Overview

Velvet is a portfolio metrics platform connecting investors with founders. Investors can import portfolio companies, invite founders, and request metrics. Founders can submit metrics and upload documents.

## Architecture

### User Roles
- **Investors** - Manage portfolio companies, send metric requests, invite founders
- **Founders** - Submit metrics, upload documents, respond to requests

### Route Structure
- Investors: `/dashboard`, `/portfolio`, `/requests`
- Founders: `/portal`, `/portal/requests`, `/portal/documents`
- Auth: `/login`, `/signup`, `/app` (redirects based on role)

### Key Principle
**Every account is standalone.** Investors and founders have completely separate dashboards. Even if multiple founders sign up, each has their own isolated account and data.

## Database

### Tables
- `users` - Linked to Supabase auth.users via trigger
- `companies` - Portfolio companies (founder_id nullable for investor imports)
- `investor_company_relationships` - Maps investors to portfolio companies
- `portfolio_invitations` - Founder contacts with invitation status
- `metric_definitions` - Investor-defined metrics
- `metric_requests` - Requests from investors to founders
- `metric_submissions` - Founder responses to requests
- `documents` - Uploaded files from founders

### RLS Policies
- All tables have Row Level Security enabled
- Role-based access using `auth.uid()` and user metadata
- Investors can only access their own portfolio data
- Founders can only access their own company data

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

## CSV Import

### Flexible Column Names
The CSV parser normalizes column names to handle variations:
- `Company Name`, `company_name`, `companyName` → all work
- `First Name`, `first_name`, `firstName` → all work

### Required Columns
- Company Name
- First Name
- Last Name
- Email

### Optional Columns
- Company Website

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
- **Contact deletion**: Deleting a portfolio contact removes the invitation and relationship, but preserves the company if a founder has already signed up (`founder_id` is set). This prevents investors from accidentally deleting a founder's data.

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

### Race Condition Handling
When creating users, wait for the `public.users` trigger to complete before updating related tables that reference it.
