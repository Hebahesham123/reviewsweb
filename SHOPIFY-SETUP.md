# Shopify form → live dashboard

Flow: customer submits the form on your Shopify store → row is inserted into
Supabase → your deployed dashboard shows it live (realtime).

```
Shopify page (shopify/review-form.liquid)
        │  insert
        ▼
   Supabase  ──realtime──►  Dashboard (/dashboard, deployed)
```

## Part A — Put the form on Shopify

The reliable place is a **Custom Liquid** section (the rich-text editor strips
`<script>`, so don't paste it there).

1. Shopify admin → **Online Store → Themes → Customize**.
2. Navigate to the page where you want the form (e.g. create a page "Reviews"
   under **Online Store → Pages**, then select its template in the customizer).
3. **Add section** → search **Custom Liquid** → add it.
4. Open [`shopify/review-form.liquid`](shopify/review-form.liquid), copy the
   **entire** file, paste it into the Custom Liquid box.
5. **Save**. Submit a test review — it should show the "Thank You" screen.

Notes:
- All CSS is scoped under `#rvw-app`, so it won't fight your theme styles.
- The anon key in the file is **public by design** — safe to expose. Your data
  is protected by the Row Level Security policies (anon can only insert/read the
  `reviews` table).

## Part B — Deploy the dashboard (so you can view it anywhere)

The dashboard is the Next.js app in this repo. Deploy it once (Vercel is easiest
and free):

1. Push this folder to a GitHub repo.
2. Go to https://vercel.com → **New Project** → import the repo.
3. In **Environment Variables**, add (same values as your `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://vumykpkjirjhdtwlpzwe.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = *(your anon key)*
4. **Deploy**. Your dashboard will be at
   `https://your-project.vercel.app/dashboard`.

Open that dashboard URL, then submit the Shopify form → the review appears live,
no refresh.

### Don't want to deploy? Run it locally
```bash
npm run dev
```
Open http://localhost:3000/dashboard. Reviews submitted from Shopify still show
up live, because the data lives in Supabase (the dashboard just reads it).

## Optional hardening
- **Lock the dashboard** so it's not public: switch the SELECT policy in
  `supabase/schema.sql` from `anon` to `authenticated` and add Supabase Auth.
- **Spam protection:** add a honeypot field or Cloudflare Turnstile to the form,
  or add a Supabase Edge Function / rate limit if you get abuse.
