# Reviews + Live Dashboard

A Next.js (App Router) + Supabase app. Customers submit a styled review form;
submissions appear **instantly** on a live dashboard via Supabase Realtime.

```
app/
  page.tsx              → live dashboard, table view + CSV export  (/)
  layout.tsx            → shared layout
  globals.css           → all styling (orange theme)
lib/supabaseClient.ts   → Supabase browser client + Review type
supabase/schema.sql     → table + RLS policies + realtime
public/review-form.html → standalone form (host anywhere)
shopify/                → Shopify section + custom-liquid versions of the form
```

The **form** is the standalone file in `public/review-form.html` (or the Shopify
versions in `shopify/`). The Next.js app is now purely the **dashboard**.

## 1. Create a Supabase project

1. Go to https://supabase.com and create a free project.
2. Open **SQL Editor**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql),
   and run it. This creates the `reviews` table, security policies, and enables realtime.

## 2. Configure environment variables

Copy the example file and fill in your values from
**Supabase → Project Settings → API**:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

## 3. Install & run

```bash
npm install
npm run dev
```

- Dashboard: http://localhost:3000

Submit a review from `public/review-form.html` (or your Shopify form) and it
shows up in the dashboard live, no refresh needed.

## How it works

- **Submit:** the form inserts a row into `reviews` using the Supabase anon key.
  Row Level Security allows anonymous `INSERT` only.
- **Live dashboard:** loads existing reviews, then subscribes to
  `postgres_changes` (INSERT) so new rows are prepended in real time.

## Security notes

- The dashboard is **public** by default (anon can `SELECT`). To restrict it,
  edit `supabase/schema.sql`: change the SELECT policy role from `anon` to
  `authenticated`, then add Supabase Auth and gate the `/dashboard` route.
- The anon key is safe to expose in the browser — RLS policies are what protect
  your data, so keep them tight.
- Never put the **service_role** key in `NEXT_PUBLIC_*` vars or client code.
