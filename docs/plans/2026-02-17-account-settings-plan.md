# Account Settings Page — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dedicated account settings page with profile picture upload, name/email/password editing, theme toggle, and account deletion for both investor and founder roles.

**Architecture:** Shared `AccountSettings` client component rendered by thin page wrappers at `/settings` (investor) and `/portal/settings` (founder). API routes under `/api/user/` handle avatar upload, profile update, email change, and password change. Avatar images stored in existing `company-logos` Supabase Storage bucket under `{userId}/avatar.{ext}` path (matching existing RLS). New `avatar_url` column on `users` table.

**Tech Stack:** Next.js 15 App Router, Supabase Auth + Storage, Zod validation, Tailwind CSS with semantic theme variables, lucide-react icons.

---

### Task 1: Database Migration — Add `avatar_url` to users table

**Files:**
- Create: `supabase/migrations/0044_user_avatar.sql`

**Step 1: Write the migration**

```sql
-- Migration: Add avatar_url to users table for profile pictures
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url text;
```

**Step 2: Commit**

```bash
git add supabase/migrations/0044_user_avatar.sql
git commit -m "feat: add avatar_url column to users table"
```

---

### Task 2: Avatar Upload API Route

**Files:**
- Create: `src/app/api/user/avatar/route.ts`

**Step 1: Create the avatar upload + delete route**

Follow the exact pattern from `src/app/api/organizations/[id]/logo/route.ts`. Key details:

- `POST /api/user/avatar`: Auth check via `getApiUser()`. Rate limit 5/min. Validate MIME type (PNG, JPG, WebP only — no SVG). Validate file size (2MB max, check content-length header first). Upload to `company-logos` bucket at path `{userId}/avatar.{ext}` (this matches the existing RLS policy where first folder = auth.uid()). Get public URL with cache-busting `?v=${Date.now()}`. Update `users.avatar_url` via admin client (needed because users table UPDATE RLS may not cover avatar_url). Also update `auth.user_metadata.avatar_url` via admin client so it's available on the auth user object. Return `{ avatarUrl, ok: true }`.

- `DELETE /api/user/avatar`: Auth check. Get current `avatar_url` from users table. Extract storage path from URL (split on `/company-logos/`, take second part, strip query params). Delete from storage via `supabase.storage.from("company-logos").remove([path])`. Set `users.avatar_url` to null via admin client. Clear `auth.user_metadata.avatar_url` via admin. Return `{ ok: true }`.

**Step 2: Commit**

```bash
git add src/app/api/user/avatar/route.ts
git commit -m "feat: add avatar upload/delete API route"
```

---

### Task 3: Profile Update API Route

**Files:**
- Create: `src/app/api/user/profile/route.ts`

**Step 1: Create the profile update route**

`PUT /api/user/profile`:
- Auth check via `getApiUser()`
- Zod schema: `{ full_name: z.string().trim().min(1).max(100) }`
- Update `users.full_name` via supabase (RLS allows users to update own row)
- Update `auth.user_metadata.full_name` via admin client (`adminClient.auth.admin.updateUserById(user.id, { user_metadata: { ...existingMetadata, full_name } })`)
- Return `{ ok: true }`

**Step 2: Commit**

```bash
git add src/app/api/user/profile/route.ts
git commit -m "feat: add profile name update API route"
```

---

### Task 4: Email Change API Route

**Files:**
- Create: `src/app/api/user/email/route.ts`

**Step 1: Create the email change route**

`PUT /api/user/email`:
- Auth check via `getApiUser()`
- Rate limit 3/min (email change is sensitive)
- Zod schema: `{ email: z.string().email() }`
- Use the user's own supabase client (not admin) to call `supabase.auth.updateUser({ email: newEmail })` — Supabase sends a confirmation email to the new address
- Return `{ ok: true, message: "Confirmation email sent to new address." }`

**Step 2: Commit**

```bash
git add src/app/api/user/email/route.ts
git commit -m "feat: add email change API route"
```

---

### Task 5: Password Change API Route

**Files:**
- Create: `src/app/api/user/password/route.ts`

**Step 1: Create the password change route**

`PUT /api/user/password`:
- Auth check via `getApiUser()`
- Rate limit 3/min
- Zod schema: `{ password: z.string().min(8), confirmPassword: z.string() }` with `.refine(d => d.password === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] })`
- Use the user's own supabase client: `supabase.auth.updateUser({ password: data.password })`
- Return `{ ok: true }`

**Step 2: Commit**

```bash
git add src/app/api/user/password/route.ts
git commit -m "feat: add password change API route"
```

---

### Task 6: Update AppShell — Avatar Support in UserInfo

**Files:**
- Modify: `src/components/layouts/app-shell.tsx`

**Step 1: Add avatarUrl to UserInfo type and render avatar images**

In `app-shell.tsx`:

1. Add `avatarUrl?: string | null` to the `UserInfo` type (line ~58-61).

2. Add `Settings` to the lucide-react import.

3. Add `"settings": Settings` to `ICON_MAP`.

4. In the collapsed sidebar avatar button (line ~333-342), replace the initials span with: if `user?.avatarUrl`, render `<Image src={user.avatarUrl} alt="" width={32} height={32} className="h-8 w-8 rounded-full object-cover" unoptimized />`, else render the existing initials span.

5. In the expanded sidebar user button (line ~458-460), same pattern: if `user?.avatarUrl`, show avatar image (32x32 rounded-full), else show initials.

Keep the `getInitials` function — it's the fallback.

**Step 2: Commit**

```bash
git add src/components/layouts/app-shell.tsx
git commit -m "feat: add avatar image support to AppShell sidebar"
```

---

### Task 7: Update Layouts — Fetch avatar_url and Pass to AppShell

**Files:**
- Modify: `src/app/(investor)/layout.tsx`
- Modify: `src/app/(founder)/layout.tsx`

**Step 1: Update investor layout**

In `src/app/(investor)/layout.tsx`:

1. Change the users query from `.select("preferences")` to `.select("preferences, avatar_url")` (line ~21-23).

2. Extract avatar_url: `const avatarUrl = userData?.avatar_url as string | null ?? null;`

3. Add `avatarUrl` to the `userInfo` object (line ~36-39):
```typescript
const userInfo = {
  fullName: freshUser?.user_metadata?.full_name ?? null,
  email: freshUser?.email ?? "",
  avatarUrl,
};
```

**Step 2: Update founder layout**

Same changes in `src/app/(founder)/layout.tsx`:

1. Change `.select("preferences")` to `.select("preferences, avatar_url")` (line ~22-24).

2. Extract `avatarUrl` from `userData`.

3. Add to `userInfo` object (line ~71-74).

**Step 3: Commit**

```bash
git add src/app/(investor)/layout.tsx src/app/(founder)/layout.tsx
git commit -m "feat: pass avatar_url from layouts to AppShell"
```

---

### Task 8: AccountSettings Shared Component

**Files:**
- Create: `src/components/settings/account-settings.tsx`

**Step 1: Build the AccountSettings client component**

This is the main settings page component, used by both investor and founder. Props:

```typescript
type AccountSettingsProps = {
  user: { fullName: string | null; email: string; avatarUrl: string | null };
  role: "investor" | "founder";
};
```

Structure the page as a single-column layout with card sections. Use semantic CSS variables throughout (bg-bg-primary, text-text-primary, border-border-default, etc).

**Section 1 — Profile Picture:**
- Large avatar circle (96x96) showing current avatar or initials fallback
- "Upload photo" button (triggers hidden file input, accept="image/png,image/jpeg,image/webp")
- "Remove" button (shown only when avatar exists)
- Client-side validation: check file type + 2MB size before uploading
- On upload: POST to `/api/user/avatar` with FormData, update local state with returned URL
- On remove: DELETE to `/api/user/avatar`, clear local state
- Loading spinner during upload

**Section 2 — Display Name:**
- Input field pre-filled with current name
- "Save" button
- On save: PUT to `/api/user/profile` with `{ full_name }`
- Success/error toast or inline message

**Section 3 — Email:**
- Input field showing current email
- "Update email" button
- On save: PUT to `/api/user/email` with `{ email }`
- Show info message: "A confirmation link will be sent to your new email address."

**Section 4 — Password:**
- Two password fields: "New password" and "Confirm password"
- "Update password" button
- Client-side: min 8 chars, must match
- On save: PUT to `/api/user/password`
- Clear fields on success

**Section 5 — Theme:**
- Use the existing `ThemeToggle` component from `@/components/ui/theme-toggle`
- Label: "Appearance"

**Section 6 — Danger Zone:**
- Red border card (`border-red-500/20`)
- Heading: "Delete account"
- Description: "Permanently delete your account and all associated data. This action cannot be undone."
- "Delete account" button opens a confirmation modal
- Modal asks user to type "DELETE MY ACCOUNT"
- On confirm: POST to `/api/user/delete` with `{ confirmation: "DELETE MY ACCOUNT" }`
- On success: redirect to `/login`

Use `h-11` for all inputs/selects per CLAUDE.md conventions. Use `border border-border-default bg-bg-input` for inputs. Use semantic text colors.

**Step 2: Commit**

```bash
git add src/components/settings/account-settings.tsx
git commit -m "feat: add AccountSettings shared component"
```

---

### Task 9: Settings Pages — Investor and Founder

**Files:**
- Create: `src/app/(investor)/settings/page.tsx`
- Create: `src/app/(founder)/portal/settings/page.tsx`

**Step 1: Create investor settings page**

Server component that fetches user data and renders `AccountSettings`:

```typescript
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AccountSettings } from "@/components/settings/account-settings";

export default async function InvestorSettingsPage() {
  const authUser = await requireRole("investor");
  const supabase = await createSupabaseServerClient();
  const { data: { user: freshUser } } = await supabase.auth.getUser();
  const { data: userData } = await supabase
    .from("users")
    .select("avatar_url")
    .eq("id", freshUser!.id)
    .single();

  return (
    <AccountSettings
      user={{
        fullName: freshUser?.user_metadata?.full_name ?? null,
        email: freshUser?.email ?? "",
        avatarUrl: userData?.avatar_url as string | null ?? null,
      }}
      role="investor"
    />
  );
}
```

**Step 2: Create founder settings page**

Same pattern but with `requireRole("founder")`.

**Step 3: Commit**

```bash
git add src/app/(investor)/settings/page.tsx src/app/(founder)/portal/settings/page.tsx
git commit -m "feat: add settings pages for investor and founder"
```

---

### Task 10: Add Settings Link to Sidebar Navigation

**Files:**
- Modify: `src/app/(investor)/layout.tsx`
- Modify: `src/app/(founder)/layout.tsx`

**Step 1: Add settings to profileLinks**

In the investor layout, update the `profileLinks` prop to include a Settings link:

```typescript
profileLinks={[
  { href: "/settings", label: "Settings", icon: "settings" },
  { href: "/historical-upload", label: "Import Data", icon: "upload" },
]}
```

In the founder layout:

```typescript
profileLinks={[
  { href: "/portal/settings", label: "Settings", icon: "settings" },
  { href: "/portal/historical-upload", label: "Import Data", icon: "upload" },
]}
```

**Step 2: Commit**

```bash
git add src/app/(investor)/layout.tsx src/app/(founder)/layout.tsx
git commit -m "feat: add Settings link to sidebar navigation"
```

---

### Task 11: Build Verification

**Step 1: Run type check**

```bash
npx tsc --noEmit
```

Fix any type errors.

**Step 2: Run build**

```bash
npm run build
```

Fix any build errors.

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build errors from account settings feature"
```

---

### Task 12: Help Article

**Files:**
- Create: `src/lib/help/content/shared-settings.ts`
- Modify: `src/lib/help/content/index.ts`

**Step 1: Add help article for account settings**

Create a help article covering: profile picture upload, name editing, email change, password change, theme preference, and account deletion. Follow the pattern in `src/lib/help/content/shared-account.ts`.

Set `relatedPages` to `["/settings", "/portal/settings"]`.

**Step 2: Register in index**

Import and add the article to `ALL_ARTICLES` in `src/lib/help/content/index.ts`.

**Step 3: Commit**

```bash
git add src/lib/help/content/shared-settings.ts src/lib/help/content/index.ts
git commit -m "docs: add help article for account settings page"
```
