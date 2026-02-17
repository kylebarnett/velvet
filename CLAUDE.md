# Velvet - Project Conventions

## Overview

Velvet is a portfolio metrics platform connecting investors with founders. Investors import portfolio companies, invite founders, and request metrics. Founders submit metrics and upload documents.

## Tech Stack

- **Framework**: Next.js 15 (App Router, serverless API routes)
- **Language**: TypeScript with `@/*` path aliases
- **Frontend**: React with Tailwind CSS v4 (`@theme` directive in `globals.css`, not tailwind.config.js)
- **Theme**: Light and dark mode via `next-themes` (attribute="class", defaultTheme="dark")
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Auth**: Supabase Auth with `@supabase/ssr`
- **Deployment**: Vercel (with Vercel Cron for scheduled jobs)
- **Validation**: Zod schemas + react-hook-form with zodResolver
- **Dev port**: 3001 (`npm run dev`), build: `npm run build`, type check: `npx tsc --noEmit`

## Architecture Principles

- **Every account is standalone.** Investors and founders have completely separate dashboards and isolated data.
- **Multi-investor support.** Multiple investors can link to the same company. Companies are deduplicated by `founder_email` at import time.
- **Founder-controlled access.** Founders approve or deny each investor. The inviting investor is auto-approved on signup; others start as pending.
- **Company-level submissions.** Founders submit metrics once to `company_metric_values`. All approved investors see the same data. A DB trigger (`trg_auto_fulfill_metric_requests`) auto-fulfills matching requests.
- **User preferences in DB, never localStorage.** All preferences stored via `PUT /api/user/preferences` for cross-device sync.

## Key Gotchas

- **Next.js 15 params are Promises**: `const { id } = await params;` in both route handlers and page components
- **Supabase joins may return arrays**: Always handle both — `Array.isArray(raw) ? raw[0] : raw`
- **Middleware location**: `src/middleware.ts` (not root)
- **Supabase clients**: Server (`server.ts`), Browser (`client.ts`), Route Handler (`route-handler.ts`), Admin (`admin.ts` — bypasses RLS, verify ownership first)

## Security Requirements

> **IMPORTANT**: Production application. Always build with security as a first-class concern.

### Authentication & Authorization (Required for ALL API routes)

1. Authenticate with `getApiUser()` from `@/lib/api/auth`
2. Verify role: `user.user_metadata?.role`
3. Verify ownership BEFORE any data operations
4. Use `jsonError("Unauthorized.", 401)` for missing auth, `jsonError("Forbidden.", 403)` for wrong role

For Server Components: `requireUser()` / `requireRole("investor")` from `@/lib/auth/require-role`

### Admin Client Rules

When using `createSupabaseAdminClient()` (bypasses RLS):
- **Always verify ownership BEFORE** using admin client
- Add a comment explaining why admin client is needed

### Input Validation

- **Always use Zod** for request body validation
- Sanitize ILIKE search inputs: escape `%` and `_` wildcards, remove chars that break PostgREST
- Validate file uploads: check MIME type, file size, and file signatures

### File Upload Security

- **Never allow SVG uploads** — can contain embedded JavaScript (XSS)
- Allowed image types: PNG, JPG, WebP only
- Enforce file size limits
- Sanitize filenames: `filename.replace(/[^a-zA-Z0-9._-]/g, "_")`

### CSV Export Security

- **Prevent formula injection** — escape fields starting with `=`, `+`, `-`, `@`, tab, CR by prefixing with `'`

### Common Vulnerabilities to Avoid

| Vulnerability | Prevention |
|---|---|
| Missing auth/role check | Always check both `user` and `role` |
| SQL injection | Use Supabase query builder, never raw SQL with user input |
| XSS | Never use `dangerouslySetInnerHTML`, escape HTML in emails with `escapeHtml()` |
| SVG XSS | Don't allow SVG uploads |
| Open redirects | Only redirect to hardcoded paths |
| IDOR | Always verify ownership before operations |
| Enumeration attacks | Use consistent error messages |

### Security Vulnerability Policy

1. Flag immediately with `// WARNING: Security vulnerability` comment
2. Suggest a secure alternative alongside the warning
3. **Never implement insecure patterns**, even if requested

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

### Help Guide Maintenance (Required for ALL new features)

When adding or modifying any user-facing feature:

1. **Add or update help article** in `src/lib/help/content/` for the relevant role
2. **Update `relatedPages`** array if new routes are added
3. **Add keywords** for searchability
4. **Cross-reference** related articles in `relatedArticles`
5. **Update categories** in `src/lib/help/categories.ts` if adding a new feature area

Help content lives in `src/lib/help/content/` as typed TypeScript objects. See `src/lib/help/types.ts` for the schema. Every page in the app should have at least one help article linked to it via `relatedPages`.

### Cron Route Security

Cron endpoints require `CRON_SECRET` via Bearer token. Endpoints reject all requests when the secret is not configured.

## Styling Rules

### Theme (MUST follow)

- **Always build for BOTH light and dark mode**
- Use semantic CSS variables (`bg-bg-primary`, `text-text-secondary`, `border-border-default`) — never hardcode colors
- Charts must use `useChartTheme()` hook from `@/hooks/use-chart-theme` — never hardcode rgba values
- Tag/badge colors use CSS variables: `--tag-blue-bg`/`--tag-blue-text`, `--tag-violet-*`, `--tag-amber-*`, `--tag-emerald-*`, `--tag-pink-*`
- Semantic data colors (emerald-400/red-400 for positive/negative growth) can remain hardcoded

### Component Classes

- **Inputs/Selects**: `h-11 rounded-md border border-border-default bg-bg-input px-3 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-[var(--ring-focus)]`
- **Never** use `h-9` for inputs/selects — always `h-11`
- **Never** use hardcoded `border-white/10 bg-black/30 text-white` for form elements — always use semantic variables for theme compatibility
- **Buttons**: Use the shared `<Button>` component from `@/components/ui/button` with variants (`primary`, `secondary`, `danger`, `warning`, `ghost`) and sizes (`sm`, `md`, `lg`, `icon-sm`, `icon`, `icon-lg`). For link-styled buttons, use `<ButtonLink>` from the same module. Do **not** create inline-styled `<button>` elements — always use the component.
  - Icon-only buttons: `<Button variant="ghost" size="icon-sm">` (or `icon` / `icon-lg`)
  - Destructive actions: `<Button variant="danger">`
  - Cancel/dismiss: `<Button variant="ghost">`
  - Exceptions (keep inline): dropdown menu items, sidebar nav items, tab/toggle groups, filter chips, rich text toolbar toggles
- **Cards**: `rounded-xl border border-white/10 bg-white/5 p-4`
- **Modals**: Backdrop `bg-black/60 backdrop-blur-sm`, modal `rounded-xl border border-white/10 bg-zinc-900 p-6`
- **Skeletons**: `animate-pulse` with `bg-white/5` or `bg-white/10`
- **Dropdown menus** (custom popups, listboxes, context menus — NOT native `<select>`):
  - Container: `absolute z-50 mt-1 overflow-hidden rounded-lg border border-border-default bg-bg-secondary py-1 shadow-xl backdrop-blur-sm`
  - Add `overflow-y-auto max-h-[Xpx]` when list can be long
  - Items: `flex w-full items-center gap-2 px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary`
  - Active/highlighted item: `bg-bg-elevated text-text-primary`
  - **Never** use `shadow-lg`, `bg-bg-raised`, or `bg-bg-hover` for the container — always `shadow-xl` and `bg-bg-secondary`
- **Disabled state**: `disabled:opacity-60`
- **Low contrast text**: minimum `text-white/60` (never `text-white/40`)
- **Field errors**: `text-xs text-red-300`

### Status Colors

- Pending/Warning: `bg-amber-500/20 text-amber-200`
- Sent/Info: `bg-blue-500/20 text-blue-200`
- Success: `bg-emerald-500/20 text-emerald-200`
- Error: `border-red-500/20 bg-red-500/10 text-red-200`

### Accessibility

- Keyboard navigation: Enter/Space on interactive elements
- `role="button"` for clickable divs, `role="alert"` for messages
- ARIA labels on icon buttons, `aria-hidden="true"` on decorative icons
- Min 44px touch targets on mobile
- `prefers-reduced-motion` respected

## Response Format

- Success: `NextResponse.json({ id, ok: true, ... })`
- Error: `jsonError("Message", statusCode)` from `@/lib/api/auth`
- Pagination: `parsePagination(url)` from `@/lib/api/pagination` (default 50, max 100)
- API caching: user-specific data uses `private`, never `public`

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3001
RESEND_API_KEY=
RESEND_FROM_DOMAIN=
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=
CRON_SECRET=
```

## Production Checklist

- [ ] Re-enable email confirmation in Supabase Auth settings
- [ ] Configure email sending domain (verify in Resend)
- [ ] Set `NEXT_PUBLIC_APP_URL` to production domain
