-- ============================================================================
-- WanderWise upgrade 2 — run once in the Supabase SQL editor (after
-- schema.sql and add-sharing.sql). Idempotent.
--  1) Flight info on trip legs (status is deep-linked, not stored)
--  2) Booking link on lodging (trip.com / Airbnb / airline tickets…)
--  3) Travel checklist (packing list) per trip
--  4) Performance indexes for every hot query path (scalability audit)
--  5) One-statement expense recalculation (replaces per-row update loops)
-- ============================================================================

-- 1) Flights
alter table public.trip_legs add column if not exists airline   text;
alter table public.trip_legs add column if not exists flight_no text;

-- 2) Lodging booking link
alter table public.lodgings add column if not exists booking_url text;

-- 3) Travel checklist
create table if not exists public.trip_checklist (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  item       text not null,
  done       boolean not null default false,
  position   int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.trip_checklist enable row level security;
drop policy if exists trip_checklist_read on public.trip_checklist;
create policy trip_checklist_read on public.trip_checklist
  for select using (public.is_trip_member(trip_id));
drop policy if exists trip_checklist_write on public.trip_checklist;
create policy trip_checklist_write on public.trip_checklist
  for all using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id));
create index if not exists trip_checklist_trip_idx on public.trip_checklist (trip_id, position);

-- 4) Indexes on hot paths (Postgres does not auto-index FK columns)
create index if not exists trip_legs_trip_idx          on public.trip_legs (trip_id, position);
create index if not exists itinerary_items_trip_day_idx on public.itinerary_items (trip_id, day, time);
create index if not exists lodgings_trip_idx           on public.lodgings (trip_id, check_in_at);
create index if not exists trip_places_trip_idx        on public.trip_places (trip_id, created_at);
create index if not exists place_images_place_idx      on public.place_images (place_ref);
create index if not exists trips_owner_created_idx     on public.trips (owner_id, created_at desc);
create index if not exists trip_members_user_idx       on public.trip_members (user_id);

-- 5) Recalculate every budget row for a trip in ONE statement.
--    SECURITY INVOKER: runs as the caller, so RLS still gates who can do it.
create or replace function public.recalc_expenses(t uuid)
returns void language sql security invoker set search_path = public as $$
  update public.expenses e set
    amount_individual = case when e.entry_mode = 'group'
      then round(e.amount_group / greatest(coalesce(e.pax_override, tr.pax), 1)::numeric, 2)
      else e.amount_individual end,
    amount_group = case when e.entry_mode = 'individual'
      then round(e.amount_individual * greatest(coalesce(e.pax_override, tr.pax), 1)::numeric, 2)
      else e.amount_group end
  from public.trips tr
  where e.trip_id = t and tr.id = t;
$$;
