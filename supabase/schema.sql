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
  created_at      timestamptz not null default now(),

  -- Filled in when the reviewer arrives via a personalised link sent by n8n
  -- (https://…/pages/reviews?cid=ORD-1042). Shown next to the name on the dashboard.
  customer_id     text,
  order_number    text,
  customer_email  text,

  -- Collected by the public form: phone is required, the photo is optional.
  -- See add-phone-order-photo.sql, which also creates the storage bucket.
  phone           text,
  image_url       text
);

-- If the table already exists, add the identity columns:
alter table public.reviews add column if not exists customer_id    text;
alter table public.reviews add column if not exists order_number   text;
alter table public.reviews add column if not exists customer_email text;
alter table public.reviews add column if not exists phone          text;
alter table public.reviews add column if not exists image_url      text;

create index if not exists reviews_customer_id_idx on public.reviews (customer_id);
create index if not exists reviews_phone_idx       on public.reviews (phone);

-- Enable Row Level Security
alter table public.reviews enable row level security;

-- Postgres has no "create policy if not exists", so drop first. This makes the
-- whole file safe to re-run — otherwise a second run fails with
-- "policy ... already exists" and rolls back everything above it.

-- Allow anyone (anon) to INSERT a review from the public form.
drop policy if exists "Anyone can submit a review" on public.reviews;
create policy "Anyone can submit a review"
  on public.reviews
  for insert
  to anon, authenticated
  with check (true);

-- Allow reading reviews (needed for the live dashboard).
-- NOTE: this makes reviews publicly readable. To lock the dashboard
-- behind login, change the role from `anon` to `authenticated`.
drop policy if exists "Reviews are viewable" on public.reviews;
create policy "Reviews are viewable"
  on public.reviews
  for select
  to anon, authenticated
  using (true);

-- There is deliberately NO update/delete policy: the anon key must not be able
-- to edit or wipe reviews. Delete test rows from the SQL Editor instead — it
-- runs as the service role and bypasses RLS:
--   delete from public.reviews where reviewer_name = '__CID_TEST__';

-- ------------------------------------------------------------
--  Realtime: let the dashboard receive live INSERTs
-- ------------------------------------------------------------
-- Also not idempotent on its own ("relation is already member of publication"),
-- so swallow that one error.
do $$
begin
  alter publication supabase_realtime add table public.reviews;
exception
  when duplicate_object then null;
end $$;
