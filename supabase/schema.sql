-- ============================================================
--  Reviews table + security policies
--  Run this in the Supabase SQL Editor (Dashboard -> SQL Editor)
-- ============================================================

create table if not exists public.reviews (
  id              uuid primary key default gen_random_uuid(),
  reviewer_name   text not null,
  product_rating  smallint check (product_rating between 1 and 5),
  shipping_rating smallint check (shipping_rating between 1 and 5),
  support_rating  smallint check (support_rating between 1 and 5),
  experience_level text check (experience_level in ('Easy', 'Medium', 'Hard')),
  review_comment  text,
  created_at      timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.reviews enable row level security;

-- Allow anyone (anon) to INSERT a review from the public form.
create policy "Anyone can submit a review"
  on public.reviews
  for insert
  to anon, authenticated
  with check (true);

-- Allow reading reviews (needed for the live dashboard).
-- NOTE: this makes reviews publicly readable. To lock the dashboard
-- behind login, change the role from `anon` to `authenticated`.
create policy "Reviews are viewable"
  on public.reviews
  for select
  to anon, authenticated
  using (true);

-- ------------------------------------------------------------
--  Realtime: let the dashboard receive live INSERTs
-- ------------------------------------------------------------
alter publication supabase_realtime add table public.reviews;
