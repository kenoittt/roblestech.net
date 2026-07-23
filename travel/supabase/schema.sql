-- ============================================================================
-- WanderWise — full schema per SRS v1.2 §5.3. Run once in the NEW dedicated
-- Supabase project's SQL editor. Later phases add content, not schema
-- (FR-DEX-01). RLS everywhere: trips are private to owner + members
-- (FR-USR-02); user writes run under the session so policies are enforced.
-- ============================================================================

-- Profiles (auto-created on signup via trigger) --------------------------------
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  display_name     text,
  email            text,
  passport_country text,
  home_currency    text not null default 'USD',
  created_at       timestamptz not null default now()
);
create unique index if not exists profiles_email_idx on public.profiles (lower(email));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, email, passport_country)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
          new.email,
          nullif(new.raw_user_meta_data->>'passport_country', ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trips ------------------------------------------------------------------------
create table if not exists public.trips (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  start_date    date,
  end_date      date,
  pax           int not null default 1 check (pax >= 1),
  base_currency text not null default 'USD',
  status        text not null default 'planning' check (status in ('planning', 'active', 'archived')),
  created_at    timestamptz not null default now()
);

create table if not exists public.trip_members (
  trip_id    uuid not null references public.trips(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'editor' check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create table if not exists public.trip_legs (
  id                   uuid primary key default gen_random_uuid(),
  trip_id              uuid not null references public.trips(id) on delete cascade,
  destination_name     text not null,
  arrival_airport      text,   -- legacy, unused by the UI (destination implies it)
  departure_airport    text,   -- legacy, unused by the UI
  airline              text,
  flight_no            text,
  has_connection       boolean not null default false,
  connection_airport   text,
  connection_airline   text,
  connection_flight_no text,
  start_date           date,
  end_date             date,
  position             int not null default 0
);
create index if not exists trip_legs_trip_idx on public.trip_legs (trip_id, position);

create table if not exists public.lodgings (
  id               uuid primary key default gen_random_uuid(),
  trip_id          uuid not null references public.trips(id) on delete cascade,
  name             text not null,
  address          text,
  lat              double precision,
  lng              double precision,
  check_in_at      timestamptz,
  check_out_at     timestamptz,
  cost             numeric(12,2),
  confirmation_ref text,
  booking_url      text,
  notes            text
);
create index if not exists lodgings_trip_idx on public.lodgings (trip_id, check_in_at);

create table if not exists public.itinerary_items (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  day        date,
  time       time,
  place_name text not null,
  lat        double precision,
  lng        double precision,
  category   text,
  notes      text,
  cost       numeric(12,2),
  source     text not null default 'user' check (source in ('user', 'ai'))
);

create table if not exists public.trip_places (
  id              uuid primary key default gen_random_uuid(),
  trip_id         uuid not null references public.trips(id) on delete cascade,
  place_name      text not null,
  google_place_id text,
  lat             double precision,
  lng             double precision,
  status          text not null default 'wishlist' check (status in ('wishlist', 'scheduled')),
  notes           text,
  created_at      timestamptz not null default now()
);

create table if not exists public.place_images (
  id          uuid primary key default gen_random_uuid(),
  place_ref   uuid not null references public.trip_places(id) on delete cascade,
  image_url   text not null,
  source      text not null check (source in ('places_api', 'search', 'user')),
  attribution text,
  fetched_at  timestamptz not null default now()
);

create table if not exists public.trip_checklist (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  item       text not null,
  done       boolean not null default false,
  position   int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists trip_checklist_trip_idx on public.trip_checklist (trip_id, position);

-- Reusable checklist presets ("occasions"), owned by a user, applied to trips.
create table if not exists public.checklist_presets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);
create index if not exists checklist_presets_user_idx on public.checklist_presets (user_id, created_at);

create table if not exists public.checklist_preset_items (
  id         uuid primary key default gen_random_uuid(),
  preset_id  uuid not null references public.checklist_presets(id) on delete cascade,
  item       text not null,
  done       boolean not null default false,
  position   int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists checklist_preset_items_preset_idx on public.checklist_preset_items (preset_id, position);

-- Expenses — bidirectional pax math (FR-BDG-01..08) ----------------------------
create table if not exists public.expenses (
  id                uuid primary key default gen_random_uuid(),
  trip_id           uuid not null references public.trips(id) on delete cascade,
  category          text not null default 'misc'
                    check (category in ('flights', 'lodging', 'food', 'activities', 'transport', 'misc')),
  description       text not null default '',
  amount_group      numeric(12,2) not null default 0,
  amount_individual numeric(12,2) not null default 0,
  entry_mode        text not null default 'group' check (entry_mode in ('group', 'individual')),
  pax_override      int check (pax_override >= 1),
  currency          text not null default 'USD',
  is_actual         boolean not null default false,
  paid              boolean not null default false,
  notes             text,
  position          int not null default 0,
  created_at        timestamptz not null default now()
);
create index if not exists expenses_trip_idx on public.expenses (trip_id, position);

-- Recalculate every budget row for a trip in one statement (RLS-gated: invoker)
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

-- Destination intelligence (Phase 2 content; schema fixed now, FR-DEX-01) -----
create table if not exists public.destinations (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  country   text not null,
  lat       double precision,
  lng       double precision,
  timezone  text,
  image_url text,
  active    boolean not null default true,
  unique (name, country)
);

create table if not exists public.destination_month_profiles (
  destination_id   uuid not null references public.destinations(id) on delete cascade,
  month            int not null check (month between 1 and 12),
  weather_json     jsonb not null default '{}'::jsonb,
  attire_json      jsonb not null default '{}'::jsonb,
  crowd_index      text,
  festivals_json   jsonb not null default '[]'::jsonb,
  hidden_gems_json jsonb not null default '[]'::jsonb,
  best_time_json   jsonb not null default '{}'::jsonb,
  hero_image_url   text,
  ai_model_version text,
  refreshed_at     timestamptz not null default now(),
  primary key (destination_id, month)
);

create table if not exists public.wishlists (
  user_id        uuid not null references auth.users(id) on delete cascade,
  destination_id uuid not null references public.destinations(id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (user_id, destination_id)
);

-- In-app notifications (trip membership changes, etc.) -------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  trip_id    uuid references public.trips(id) on delete set null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, read, created_at desc);

-- Audit trail (ISO 27001 evidence, NFR-10) -------------------------------------
create table if not exists public.audit_logs (
  id        uuid primary key default gen_random_uuid(),
  actor_id  uuid,
  action    text not null,
  entity    text,
  metadata  jsonb not null default '{}'::jsonb,
  timestamp timestamptz not null default now()
);
create index if not exists audit_logs_time_idx on public.audit_logs (timestamp desc);

-- ============================================================================
-- Row-Level Security
-- ============================================================================
create or replace function public.is_trip_member(t uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.trips where id = t and owner_id = auth.uid())
      or exists (select 1 from public.trip_members where trip_id = t and user_id = auth.uid());
$$;

create or replace function public.can_edit_trip(t uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.trips where id = t and owner_id = auth.uid())
      or exists (select 1 from public.trip_members
                 where trip_id = t and user_id = auth.uid() and role in ('owner', 'editor'));
$$;

-- Cycle-breakers: policies on trips/trip_members must not subquery each
-- other's tables directly (RLS would recurse). These run as definer (RLS
-- bypassed inside), and each touches only ONE table.
create or replace function public.is_member_of(t uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.trip_members where trip_id = t and user_id = auth.uid());
$$;

create or replace function public.owns_trip(t uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.trips where id = t and owner_id = auth.uid());
$$;

alter table public.profiles                   enable row level security;
alter table public.trips                      enable row level security;
alter table public.trip_members               enable row level security;
alter table public.trip_legs                  enable row level security;
alter table public.lodgings                   enable row level security;
alter table public.itinerary_items            enable row level security;
alter table public.trip_places                enable row level security;
alter table public.place_images               enable row level security;
alter table public.expenses                   enable row level security;
alter table public.destinations               enable row level security;
alter table public.destination_month_profiles enable row level security;
alter table public.wishlists                  enable row level security;
alter table public.audit_logs                 enable row level security;
alter table public.checklist_presets          enable row level security;
alter table public.checklist_preset_items     enable row level security;
alter table public.notifications              enable row level security;

-- notifications: recipient reads/marks/deletes own; inserts via service role
drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications for select using (user_id = auth.uid());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications for delete using (user_id = auth.uid());

-- checklist presets: user owns their own; items flow through the parent
drop policy if exists checklist_presets_own on public.checklist_presets;
create policy checklist_presets_own on public.checklist_presets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists checklist_preset_items_own on public.checklist_preset_items;
create policy checklist_preset_items_own on public.checklist_preset_items
  for all using (exists (select 1 from public.checklist_presets p where p.id = preset_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.checklist_presets p where p.id = preset_id and p.user_id = auth.uid()));

-- profiles: self read/update
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- trips: members read; owner writes; any authed user may create their own.
-- NOTE: the owner case checks the row's own column (not is_trip_member) so
-- INSERT ... RETURNING passes the SELECT policy — a same-statement insert is
-- not yet visible to a subquery on trips, which would wrongly reject it.
drop policy if exists trips_read on public.trips;
create policy trips_read on public.trips for select using (
  owner_id = auth.uid() or public.is_member_of(id)
);
drop policy if exists trips_insert on public.trips;
create policy trips_insert on public.trips for insert with check (owner_id = auth.uid());
drop policy if exists trips_update on public.trips;
create policy trips_update on public.trips for update using (public.can_edit_trip(id));
drop policy if exists trips_delete on public.trips;
create policy trips_delete on public.trips for delete using (owner_id = auth.uid());

-- trip_members: members read; owner manages
drop policy if exists members_read on public.trip_members;
create policy members_read on public.trip_members for select using (public.is_trip_member(trip_id));
drop policy if exists members_write on public.trip_members;
create policy members_write on public.trip_members
  for all using (public.owns_trip(trip_id))
  with check (public.owns_trip(trip_id));
-- members may remove THEMSELVES (leave a trip)
drop policy if exists members_leave on public.trip_members;
create policy members_leave on public.trip_members
  for delete using (user_id = auth.uid());

-- child tables: members read, editors write (one macro-policy per table)
do $$
declare t text;
begin
  foreach t in array array['trip_legs','lodgings','itinerary_items','trip_places','expenses','trip_checklist'] loop
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format('create policy %I_read on public.%I for select using (public.is_trip_member(trip_id))', t, t);
    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format('create policy %I_write on public.%I for all using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id))', t, t);
  end loop;
end $$;

-- place_images: via parent place
drop policy if exists place_images_rw on public.place_images;
create policy place_images_rw on public.place_images
  for all using (exists (select 1 from public.trip_places p where p.id = place_ref and public.is_trip_member(p.trip_id)))
  with check (exists (select 1 from public.trip_places p where p.id = place_ref and public.can_edit_trip(p.trip_id)));

-- destinations + month profiles: public read (content); writes via service role
drop policy if exists destinations_read on public.destinations;
create policy destinations_read on public.destinations for select using (true);
drop policy if exists dmp_read on public.destination_month_profiles;
create policy dmp_read on public.destination_month_profiles for select using (true);

-- wishlists: self
drop policy if exists wishlists_self on public.wishlists;
create policy wishlists_self on public.wishlists
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- audit_logs: no client access (service role only)
