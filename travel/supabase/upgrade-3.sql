-- ============================================================================
-- WanderWise upgrade 3 — reusable checklist presets ("occasions").
-- Run once in the Supabase SQL editor (after upgrade-2.sql). Idempotent.
--   checklist_presets       : a named, reusable packing list per user
--   checklist_preset_items  : the items inside a preset
-- Trips keep their own trip_checklist; a preset can be APPLIED to a trip,
-- copying its items in (see /api/checklist-save op=apply-preset).
-- ============================================================================

create table if not exists public.checklist_presets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);
alter table public.checklist_presets enable row level security;
drop policy if exists checklist_presets_own on public.checklist_presets;
create policy checklist_presets_own on public.checklist_presets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists checklist_presets_user_idx on public.checklist_presets (user_id, created_at);

create table if not exists public.checklist_preset_items (
  id         uuid primary key default gen_random_uuid(),
  preset_id  uuid not null references public.checklist_presets(id) on delete cascade,
  item       text not null,
  position   int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.checklist_preset_items enable row level security;
-- Ownership flows through the parent preset (subquery touches ONE table).
drop policy if exists checklist_preset_items_own on public.checklist_preset_items;
create policy checklist_preset_items_own on public.checklist_preset_items
  for all using (exists (select 1 from public.checklist_presets p where p.id = preset_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.checklist_presets p where p.id = preset_id and p.user_id = auth.uid()));
create index if not exists checklist_preset_items_preset_idx on public.checklist_preset_items (preset_id, position);
