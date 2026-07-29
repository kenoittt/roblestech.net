-- TrailMate — core tables (SDS §6)
--
-- Conventions
--   * All money is integer cents in `currency` (ISO-4217, lower-case, Stripe style).
--   * All timestamps are timestamptz; hike-local wall time is derived from hikes.timezone.
--   * Geography columns are SRID 4326 (WGS84) so ST_DWithin works in metres.
--   * Every table gets RLS in 000700_rls.sql. No table is left open.

-------------------------------------------------------------------------------
-- Users & profiles (SDS §4.1)
-------------------------------------------------------------------------------

create table public.users (
  id                     uuid primary key default gen_random_uuid(),
  auth_id                uuid not null unique references auth.users (id) on delete cascade,
  display_name           text not null check (char_length(display_name) between 2 and 60),
  avatar_url             text,
  bio                    text check (char_length(bio) <= 1000),
  region                 text,
  experience_level       public.experience_level not null default 'beginner',
  role_flags             public.app_role[] not null default array['hiker']::public.app_role[],

  -- Stripe customer for the hiker side. Organizer-side Connect account lives on
  -- organizer_profiles because the two are independent Stripe objects.
  stripe_customer_id     text unique,

  -- FR-1.2 hike stats, maintained by trigger on booking completion.
  hikes_completed        integer not null default 0 check (hikes_completed >= 0),
  distance_completed_km  numeric(10, 2) not null default 0 check (distance_completed_km >= 0),

  -- FR-7.3 — feed visibility of this user's completed hikes.
  feed_visible           boolean not null default true,

  -- NFR-4 / FR-1.4 — 18+ attestation captured at signup, and soft deletion so
  -- financial records survive while the profile is anonymised.
  adult_confirmed_at     timestamptz,
  deleted_at             timestamptz,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint users_role_flags_not_empty check (cardinality(role_flags) > 0)
);

comment on table public.users is
  'Application profile, 1:1 with auth.users. Created by the on_auth_user_created trigger.';
comment on column public.users.deleted_at is
  'FR-1.4 soft delete. app.anonymize_user() scrubs PII and detaches reviews; bookings, '
  'waivers and payouts_ledger rows are retained for 7 years (NFR-4).';

-- FR-1.5 — emergency contact is collected at first booking and is visible only to the
-- organizer of a hike this user has booked. Split out of `users` because RLS is
-- row-level: keeping it on the profile row would expose it to every profile reader.
create table public.user_emergency_contacts (
  user_id      uuid primary key references public.users (id) on delete cascade,
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  contact_phone text not null check (char_length(contact_phone) between 5 and 32),
  relationship text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- FR-9.2 — per-category notification preferences.
create table public.notification_prefs (
  user_id    uuid not null references public.users (id) on delete cascade,
  type       public.notification_type not null,
  push       boolean not null default true,
  email      boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, type)
);

-- Expo push targets (FR-9.1). One row per install.
create table public.push_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  token        text not null unique,
  platform     text not null check (platform in ('ios', 'android')),
  device_name  text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-------------------------------------------------------------------------------
-- Organizer verification & payouts (SDS §4.2)
-------------------------------------------------------------------------------

create table public.organizer_profiles (
  user_id                   uuid primary key references public.users (id) on delete cascade,

  -- FR-2.2 Stripe Connect Express. Publishing is gated on both flags below.
  stripe_account_id         text unique,
  charges_enabled           boolean not null default false,
  payouts_enabled           boolean not null default false,
  details_submitted         boolean not null default false,

  -- FR-2.1 Stripe Identity (document + selfie).
  stripe_identity_session_id text,
  identity_status            public.identity_status not null default 'unstarted',

  credentials_text          text check (char_length(credentials_text) <= 2000),

  -- FR-10.4 — publishing requires attesting to first-aid kit and weather check.
  carries_first_aid_kit     boolean not null default false,

  verified_at               timestamptz,
  rating_avg                numeric(3, 2) check (rating_avg between 1 and 5),
  rating_count              integer not null default 0 check (rating_count >= 0),
  status                    public.organizer_status not null default 'pending',
  suspended_reason          text,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

comment on column public.organizer_profiles.status is
  'Set to verified only when identity_status = verified AND charges_enabled AND '
  'payouts_enabled — see app.refresh_organizer_status().';

-------------------------------------------------------------------------------
-- Listings (SDS §4.3)
-------------------------------------------------------------------------------

create table public.hikes (
  id                  uuid primary key default gen_random_uuid(),
  organizer_id        uuid not null references public.users (id) on delete restrict,

  title               text not null check (char_length(title) between 4 and 120),
  description         text not null check (char_length(description) between 20 and 8000),
  status              public.hike_status not null default 'draft',

  start_at            timestamptz not null,
  timezone            text not null default 'America/Los_Angeles',
  duration_min        integer not null check (duration_min between 15 and 2880),

  difficulty          public.hike_difficulty not null,
  distance_km         numeric(6, 2) not null check (distance_km > 0),
  elevation_gain_m    integer not null default 0 check (elevation_gain_m >= 0),

  -- FR-3.1 meeting point, FR-8.2 directions handoff, FR-8.3 parking notes.
  meeting_point       extensions.geography(Point, 4326) not null,
  meeting_notes       text,
  parking_notes       text,

  -- FR-3.2 route: GPX upload or map-drawn polyline, plus derived elevation series.
  route               extensions.geography(LineString, 4326),
  gpx_url             text,
  elevation_profile   jsonb,

  capacity_min        integer not null default 1 check (capacity_min >= 1),
  capacity_max        integer not null check (capacity_max >= 1),
  confirmed_spots     integer not null default 0 check (confirmed_spots >= 0),

  -- FR-3.6 free hikes are price_cents = 0 (RSVP, waiver still required).
  price_cents         integer not null default 0 check (price_cents >= 0),
  currency            char(3) not null default 'usd',
  cancellation_policy public.cancellation_policy not null default 'moderate',

  -- FR-5.1 — how many extra people one hiker may bring on a single booking.
  guest_limit         integer not null default 0 check (guest_limit between 0 and 10),

  whats_included      text,
  requirements        jsonb not null default '{}'::jsonb,
  dogs_allowed        boolean not null default false,
  kids_allowed        boolean not null default false,
  photos              jsonb not null default '[]'::jsonb,

  -- FR-10.4 publish gate.
  weather_checked_at  timestamptz,

  rating_avg          numeric(3, 2) check (rating_avg between 1 and 5),
  rating_count        integer not null default 0 check (rating_count >= 0),

  -- FR-3.4 duplicate/repost lineage.
  duplicated_from_id  uuid references public.hikes (id) on delete set null,

  published_at        timestamptz,
  completed_at        timestamptz,
  cancelled_at        timestamptz,
  cancellation_reason text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint hikes_capacity_range check (capacity_max >= capacity_min),
  constraint hikes_spots_within_capacity check (confirmed_spots <= capacity_max),
  constraint hikes_published_has_timestamp
    check (status = 'draft' or published_at is not null)
);

comment on column public.hikes.confirmed_spots is
  'Denormalised sum of bookings.qty for confirmed/attended bookings. Maintained by '
  'app.tg_bookings_sync_spots() so capacity checks and the `full` transition never '
  'require a table scan.';

-------------------------------------------------------------------------------
-- Waivers (SDS §4.5 FR-5.2)
-------------------------------------------------------------------------------

create table public.waiver_templates (
  version        integer primary key,
  body_md        text not null,
  jurisdiction   text not null default 'US',
  effective_from timestamptz not null default now(),
  retired_at     timestamptz,
  created_at     timestamptz not null default now()
);

comment on table public.waiver_templates is
  'Versioned waiver text. Never edit a published row — insert a new version. Signed '
  'records reference the exact version the hiker agreed to.';

create table public.waivers (
  id               uuid primary key default gen_random_uuid(),
  booking_id       uuid not null,
  user_id          uuid not null references public.users (id) on delete restrict,
  hike_id          uuid not null references public.hikes (id) on delete restrict,
  template_version integer not null references public.waiver_templates (version),
  signed_name      text not null check (char_length(signed_name) between 2 and 120),
  signed_at        timestamptz not null default now(),
  ip_hash          text not null,
  user_agent       text,
  document_hash    text not null,
  pdf_url          text,
  created_at       timestamptz not null default now()
);

comment on column public.waivers.ip_hash is
  'SHA-256 of the signing IP with a server-side pepper. The raw IP is never stored.';
comment on column public.waivers.document_hash is
  'SHA-256 over template body + signed_name + signed_at, so a stored record can be '
  'proven unmodified without keeping the rendered PDF as the source of truth.';

-------------------------------------------------------------------------------
-- Bookings (SDS §4.5)
-------------------------------------------------------------------------------

create table public.bookings (
  id                        uuid primary key default gen_random_uuid(),
  hike_id                   uuid not null references public.hikes (id) on delete restrict,
  hiker_id                  uuid not null references public.users (id) on delete restrict,
  qty                       integer not null default 1 check (qty between 1 and 11),
  status                    public.booking_status not null default 'pending_payment',

  -- Price breakdown captured at checkout so later listing edits never rewrite history.
  unit_price_cents          integer not null check (unit_price_cents >= 0),
  amount_cents              integer not null check (amount_cents >= 0),
  hiker_fee_cents           integer not null default 0 check (hiker_fee_cents >= 0),
  platform_fee_cents        integer not null default 0 check (platform_fee_cents >= 0),
  currency                  char(3) not null default 'usd',
  refunded_amount_cents     integer not null default 0 check (refunded_amount_cents >= 0),

  stripe_payment_intent_id  text unique,
  stripe_charge_id          text,

  waiver_id                 uuid references public.waivers (id) on delete set null,

  checked_in_at             timestamptz,
  confirmed_at              timestamptz,
  cancelled_at              timestamptz,
  cancellation_reason       text,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  constraint bookings_refund_within_total
    check (refunded_amount_cents <= amount_cents + hiker_fee_cents)
);

alter table public.waivers
  add constraint waivers_booking_id_fkey
  foreign key (booking_id) references public.bookings (id) on delete cascade;

-- One live booking per hiker per hike; cancelled/refunded rows may repeat so a hiker can
-- rebook after cancelling.
create unique index bookings_one_active_per_hiker
  on public.bookings (hike_id, hiker_id)
  where status in ('pending_payment', 'confirmed', 'attended', 'no_show');

-- FR-3.5 — waitlist with a claim window.
create table public.waitlist_entries (
  id            uuid primary key default gen_random_uuid(),
  hike_id       uuid not null references public.hikes (id) on delete cascade,
  user_id       uuid not null references public.users (id) on delete cascade,
  qty           integer not null default 1 check (qty between 1 and 11),
  status        public.waitlist_status not null default 'waiting',
  offered_at    timestamptz,
  claim_expires_at timestamptz,
  created_at    timestamptz not null default now(),
  unique (hike_id, user_id)
);

-------------------------------------------------------------------------------
-- Reviews (SDS §4.6)
-------------------------------------------------------------------------------

create table public.reviews (
  id                 uuid primary key default gen_random_uuid(),
  booking_id         uuid not null unique references public.bookings (id) on delete cascade,
  hike_id            uuid not null references public.hikes (id) on delete cascade,
  organizer_id       uuid not null references public.users (id) on delete cascade,
  author_id          uuid references public.users (id) on delete set null,

  hike_rating        smallint not null check (hike_rating between 1 and 5),
  organizer_rating   smallint not null check (organizer_rating between 1 and 5),
  body               text check (char_length(body) <= 4000),
  photos             jsonb not null default '[]'::jsonb,

  organizer_response text check (char_length(organizer_response) <= 2000),
  organizer_responded_at timestamptz,

  status             public.review_status not null default 'published',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on column public.reviews.author_id is
  'Nullable so FR-1.4 account deletion can anonymise authorship while the rating stays '
  'in the organizer aggregate.';

-- FR-6.5 — organizers privately flag problem attendees. Admin-visible only; no public
-- hiker ratings in v1.
create table public.attendee_flags (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.bookings (id) on delete cascade,
  organizer_id uuid not null references public.users (id) on delete cascade,
  hiker_id     uuid not null references public.users (id) on delete cascade,
  reason       text not null check (char_length(reason) between 5 and 2000),
  created_at   timestamptz not null default now(),
  unique (booking_id, organizer_id)
);

-------------------------------------------------------------------------------
-- Social (SDS §4.7)
-------------------------------------------------------------------------------

create table public.follows (
  follower_id uuid not null references public.users (id) on delete cascade,
  followee_id uuid not null references public.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_no_self check (follower_id <> followee_id)
);

-- FR-10.1 — blocking hides content bidirectionally.
create table public.blocks (
  blocker_id uuid not null references public.users (id) on delete cascade,
  blocked_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_no_self check (blocker_id <> blocked_id)
);

-- FR-7.2 — per-hike group chat, open to organizer + confirmed attendees, read-only
-- 7 days after completion.
create table public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  hike_id    uuid not null references public.hikes (id) on delete cascade,
  sender_id  uuid not null references public.users (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 4000),
  pinned     boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.chat_reads (
  hike_id      uuid not null references public.hikes (id) on delete cascade,
  user_id      uuid not null references public.users (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (hike_id, user_id)
);

-------------------------------------------------------------------------------
-- Trust & safety (SDS §4.10)
-------------------------------------------------------------------------------

create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid references public.users (id) on delete set null,
  target_type  public.report_target not null,
  target_id    uuid not null,
  reason       text not null check (char_length(reason) between 3 and 2000),
  status       public.report_status not null default 'open',
  resolution_note text,
  resolved_by  uuid references public.users (id) on delete set null,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- FR-10.2 — every privileged admin action is recorded.
create table public.admin_actions (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null references public.users (id) on delete restrict,
  action      text not null,
  target_type text not null,
  target_id   uuid,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-------------------------------------------------------------------------------
-- Money (SDS §9)
-------------------------------------------------------------------------------

create table public.payouts_ledger (
  id                 uuid primary key default gen_random_uuid(),
  organizer_id       uuid not null references public.users (id) on delete restrict,
  hike_id            uuid not null references public.hikes (id) on delete restrict,
  booking_id         uuid references public.bookings (id) on delete set null,
  gross_cents        integer not null check (gross_cents >= 0),
  commission_cents   integer not null check (commission_cents >= 0),
  net_cents          integer not null check (net_cents >= 0),
  currency           char(3) not null default 'usd',
  status             public.payout_status not null default 'held',
  stripe_transfer_id text unique,
  releasable_at      timestamptz not null,
  released_at        timestamptz,
  failure_reason     text,
  created_at         timestamptz not null default now(),

  constraint payouts_ledger_splits_add_up
    check (gross_cents = commission_cents + net_cents)
);

comment on table public.payouts_ledger is
  'One row per booking''s organizer earnings. Written when a payment succeeds (status '
  'held, releasable_at = hike end + 24h) and settled by the release-payouts cron.';

-- Stripe webhook idempotency (SDS §3.3: money moves only on webhooks, and a webhook may
-- be delivered more than once).
create table public.stripe_webhook_events (
  id            text primary key,
  type          text not null,
  payload       jsonb not null,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz,
  error         text,
  attempts      integer not null default 0
);

-------------------------------------------------------------------------------
-- Notifications (SDS §4.9)
-------------------------------------------------------------------------------

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  type       public.notification_type not null,
  payload    jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  sent_at    timestamptz,
  created_at timestamptz not null default now()
);
