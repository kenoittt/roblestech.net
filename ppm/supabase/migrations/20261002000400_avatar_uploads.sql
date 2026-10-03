-- =============================================================================
-- Profile photos: each person uploads their own picture to the private
-- "avatars" bucket (created by the baseline), as one file named after their id.
-- The app streams it to signed-in team members; the bucket stays private.
-- =============================================================================
do $$
begin
  if to_regclass('storage.objects') is null then return; end if;

  insert into storage.buckets (id, name, public) values ('avatars', 'avatars', false)
  on conflict (id) do nothing;

  drop policy if exists "avatars: upload your own" on storage.objects;
  create policy "avatars: upload your own" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'avatars' and name = auth.uid()::text and public.is_ppm_user());

  drop policy if exists "avatars: replace your own" on storage.objects;
  create policy "avatars: replace your own" on storage.objects
    for update to authenticated
    using (bucket_id = 'avatars' and name = auth.uid()::text)
    with check (bucket_id = 'avatars' and name = auth.uid()::text);

  drop policy if exists "avatars: remove your own" on storage.objects;
  create policy "avatars: remove your own" on storage.objects
    for delete to authenticated
    using (bucket_id = 'avatars' and name = auth.uid()::text);

  drop policy if exists "avatars: read your own" on storage.objects;
  create policy "avatars: read your own" on storage.objects
    for select to authenticated
    using (bucket_id = 'avatars' and name = auth.uid()::text);
end $$;
