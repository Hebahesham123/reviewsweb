-- ============================================================
--  Adds: required phone, optional typed order number, optional photo
--  Run this in the Supabase SQL Editor (Dashboard -> SQL Editor).
--  Safe to run more than once.
-- ============================================================

-- ---------- 1. columns ----------
alter table public.reviews add column if not exists phone     text;
alter table public.reviews add column if not exists image_url text;

create index if not exists reviews_phone_idx on public.reviews (phone);

-- ---------- 2. bucket for the uploaded photos ----------
-- file_size_limit and allowed_mime_types are enforced by Supabase itself.
-- That matters: the checks in the form's JavaScript can be bypassed by
-- anyone with dev tools, these cannot.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-images',
  'review-images',
  true,
  5242880,                                    -- 5 MB per file
  array[
    'image/jpeg', 'image/png', 'image/webp',
    'image/gif',  'image/heic', 'image/heif'  -- heic/heif = straight off an iPhone
  ]
)
on conflict (id) do update
  set public            = excluded.public,
      file_size_limit   = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------- 3. storage policies ----------
-- Customers are not logged in, so the anon role needs to be able to upload.
drop policy if exists "Anyone can upload a review photo" on storage.objects;
create policy "Anyone can upload a review photo"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'review-images');

-- ...and the photos must be readable for the dashboard to show them.
drop policy if exists "Review photos are public" on storage.objects;
create policy "Review photos are public"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'review-images');

-- Deliberately no update/delete policy: a visitor must not be able to
-- replace or remove a photo once it is uploaded. Clean up from the
-- Storage tab in the dashboard, which runs as the service role.

-- ---------- 4. check it worked ----------
-- select column_name from information_schema.columns
--   where table_name = 'reviews' and column_name in ('phone', 'image_url');
-- select id, public, file_size_limit from storage.buckets where id = 'review-images';
