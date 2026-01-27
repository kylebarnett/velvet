# Velvet

A portfolio metrics platform connecting investors with their portfolio companies. Investors can request metrics from founders, and founders can submit data through a streamlined portal.

## Features

### For Investors
- **Dashboard**: View portfolio companies and their metrics at a glance
- **Metric Requests**: Create and manage metric requests for portfolio companies
- **Company Views**: Drill into individual company metrics and submissions

### For Founders
- **Portal**: Central hub for managing investor relationships
- **Requests**: View and respond to metric requests from investors
- **Documents**: Upload financial documents for metric extraction

### Authentication
- Role-based signup (Investor or Founder)
- Founders provide company name and website during signup
- Company logos automatically fetched via Clearbit API
- Secure session management with Supabase Auth

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with RLS policies
- **Styling**: Tailwind CSS 4
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Icons**: Lucide React

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login and signup pages
│   ├── (founder)/       # Founder portal (portal, requests, documents)
│   ├── (investor)/      # Investor dashboard (dashboard, requests)
│   ├── api/             # API routes (auth endpoints)
│   └── app/             # Entry point that redirects by role
├── components/
│   ├── auth/            # Authentication components
│   └── layouts/         # AppShell and layout components
└── lib/
    ├── api/             # API utilities
    ├── auth/            # Auth helpers (requireRole, requireUser)
    ├── supabase/        # Supabase clients (browser, server, admin)
    └── utils/           # Utilities (cn, logo)
```

## Database Schema

- **users**: App users linked to auth.users (id, email, role, full_name)
- **companies**: Startup companies (name, website, founder_id)
- **investor_company_relationships**: Portfolio links between investors and companies
- **metric_definitions**: Investor-defined metrics to track
- **metric_requests**: Requests sent to companies for specific metrics
- **metric_submissions**: Founder responses to metric requests
- **documents**: Uploaded files for metric extraction
- **document_metric_mappings**: AI-extracted mappings from documents to metrics

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project

### Environment Setup

Copy the example environment file:

```bash
cp env.example .env.local
```

Fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Database Setup

Run the migration against your Supabase database:

```bash
npx supabase db push
```

Or manually execute `supabase/migrations/0001_init.sql` in the Supabase SQL Editor.

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Deployment

Deploy to Vercel or any platform that supports Next.js:

```bash
npm run build
npm start
```

## License

Private - All rights reserved.
