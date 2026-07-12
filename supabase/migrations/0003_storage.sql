-- ============================================================================
-- 0003_storage.sql
--
-- Creates the two Storage buckets used for uploaded content and their
-- access policies. Buckets are public (readable by anyone with the URL,
-- no auth check) -- acceptable because this app never stores PHI, and it's
-- what lets <img>/PDF requests (and the offline service worker caching
-- them) skip passing auth tokens. Only admins can write to them.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('pdfs', 'pdfs', true)
on conflict (id) do nothing;

create policy "images: public read" on storage.objects
  for select using (bucket_id = 'images');
create policy "images: admin write" on storage.objects
  for insert to authenticated with check (bucket_id = 'images' and public.is_admin());
create policy "images: admin update" on storage.objects
  for update to authenticated using (bucket_id = 'images' and public.is_admin());
create policy "images: admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'images' and public.is_admin());

create policy "pdfs: public read" on storage.objects
  for select using (bucket_id = 'pdfs');
create policy "pdfs: admin write" on storage.objects
  for insert to authenticated with check (bucket_id = 'pdfs' and public.is_admin());
create policy "pdfs: admin update" on storage.objects
  for update to authenticated using (bucket_id = 'pdfs' and public.is_admin());
create policy "pdfs: admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'pdfs' and public.is_admin());
