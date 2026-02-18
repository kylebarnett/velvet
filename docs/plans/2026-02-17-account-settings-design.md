# Account Settings Page — Design

## Overview

Add a dedicated `/settings` account settings page with profile picture upload, name editing, email/password change, theme preference, and account deletion. Available to both investor and founder roles.

## Sections

### 1. Profile Picture
- Upload/change/remove avatar (PNG, JPG, WebP only, 2MB max)
- Displays current avatar or initials fallback
- Storage: `company-logos` bucket, path `users/{userId}.{ext}`
- URL saved as `avatar_url` column on `users` table
- Cache-busting timestamp appended to URL

### 2. Display Name
- Editable full name field
- Updates both `users.full_name` and `auth.user_metadata.full_name`
- Validated with Zod (non-empty, max 100 chars)

### 3. Email
- Display current email
- Supabase Auth `updateUser({ email })` sends confirmation link
- Show pending confirmation state after change

### 4. Password
- New password + confirmation fields
- Supabase Auth `updateUser({ password })` — session is proof of identity
- Min 8 characters validation

### 5. Theme
- Theme toggle (same as sidebar, duplicated here for discoverability)

### 6. Danger Zone
- Account deletion with `DELETE MY ACCOUNT` typed confirmation
- Reuses existing `POST /api/user/delete` endpoint
- Red bordered section at bottom

## Data Model

### Migration
- Add `avatar_url TEXT` column to `users` table

### Storage
- Reuse `company-logos` Supabase Storage bucket
- Path format: `users/{userId}.{ext}`
- Same RLS: authenticated users can upload to their own path

## API Routes

### `POST /api/user/avatar` — Upload avatar
- Auth required, rate limited
- MIME validation (PNG, JPG, WebP), 2MB max
- Upload to storage, save URL to `users.avatar_url`

### `DELETE /api/user/avatar` — Remove avatar
- Auth required
- Delete from storage, null out `users.avatar_url`

### `PUT /api/user/profile` — Update name
- Auth required, Zod validated
- Updates `users.full_name` + `auth.user_metadata.full_name`

### `PUT /api/user/email` — Change email
- Auth required, Zod validated
- Calls Supabase Auth `updateUser({ email })`

### `PUT /api/user/password` — Change password
- Auth required, Zod validated (min 8 chars, must match confirmation)
- Calls Supabase Auth `updateUser({ password })`

## Frontend

### Page
- `/settings` (investor), `/portal/settings` (founder)
- Shared `AccountSettings` component used by both
- Card-based layout, one card per section

### AppShell Changes
- `UserInfo` type gets optional `avatarUrl` field
- Avatar image shown where initials currently display (with initials fallback)
- "Settings" link added to sidebar settings panel for both roles

### Layout Changes
- Investor/founder layouts fetch `avatar_url` from `users` table
- Pass to AppShell via `userInfo.avatarUrl`

## Navigation
- Settings gear icon link in sidebar settings panel → `/settings` or `/portal/settings`
- Breadcrumbs: Home > Settings
