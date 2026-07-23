-- ============================================================================
-- WanderWise upgrade 4 — in-app notifications (trip membership changes, etc.)
-- Run once in the WanderWise Supabase SQL editor (after upgrade-3.sql).
-- Recipients read/mark their own; inserts are done server-side (service role).
-- ============================================================================

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,                 -- trip_added | trip_removed | role_changed | info
  title      text not null,
  body       text,
  trip_id    uuid references public.trips(id) on delete set null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, read, created_at desc);

alter table public.notifications enable row level security;
-- Recipients may read their own and mark them read/delete; no client inserts.
drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications
  for select using (user_id = auth.uid());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications
  for delete using (user_id = auth.uid());

notify pgrst, 'reload schema';
