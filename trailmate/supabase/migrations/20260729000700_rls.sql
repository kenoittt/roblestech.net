-- TrailMate — Row-Level Security (SDS §3.3, NFR-3: "RLS on every table")
--
-- Reading order: each table gets `enable row level security`, then policies scoped
-- `to authenticated`. Nothing is granted to `anon` — an unauthenticated client can read
-- nothing. `service_role` bypasses RLS by design; that is how Edge Functions do the
-- privileged writes listed in SDS §7.
--
-- Tables with RLS enabled and *no* policy are service-role-only on purpose
-- (stripe_webhook_events, payouts_ledger writes, waivers writes).

-- Distinguishes an Edge Function / migration context from an end user, for the
-- column-protection triggers below.
create or replace function app.is_privileged_context()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select
    coalesce(
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
      ''
    ) = 'service_role'
    or current_user in ('postgres', 'supabase_admin', 'service_role', 'supabase_auth_admin');
$$;

grant execute on function app.is_privileged_context() to authenticated, service_role;

-------------------------------------------------------------------------------
-- users (SDS §4.1)
-------------------------------------------------------------------------------

alter table public.users enable row level security;

-- Profiles are public to signed-in users (FR-4.3 shows attendee avatars, FR-7.1 shows
-- follower lists), minus anyone in a block relationship (FR-10.1).
create policy users_select_visible on public.users
  for select to authenticated
  using (
    id = app.current_user_id()
    or app.is_admin()
    or (deleted_at is null and not app.is_blocked_with(id))
  );

create policy users_update_self on public.users
  for update to authenticated
  using (id = app.current_user_id() or app.is_admin())
  with check (id = app.current_user_id() or app.is_admin());

-- No client INSERT: rows are provisioned by the on_auth_user_created trigger.
-- No client DELETE: FR-1.4 deletion runs through the delete-account Edge Function so the
-- financial record survives.

-- Privilege escalation guard: a user may edit their own bio, not their own role.
create or replace function app.tg_users_protect_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if app.is_admin() or app.is_privileged_context() then
    return new;
  end if;

  if new.role_flags is distinct from old.role_flags then
    raise exception 'role_flags cannot be changed by the account holder'
      using errcode = 'insufficient_privilege';
  end if;

  -- Stripe linkage and platform-maintained stats are server-owned.
  new.stripe_customer_id      := old.stripe_customer_id;
  new.hikes_completed         := old.hikes_completed;
  new.distance_completed_km   := old.distance_completed_km;
  new.deleted_at              := old.deleted_at;
  new.auth_id                 := old.auth_id;
  return new;
end;
$$;

create trigger users_protect_columns
  before update on public.users
  for each row execute function app.tg_users_protect_columns();

-------------------------------------------------------------------------------
-- user_emergency_contacts (FR-1.5)
-------------------------------------------------------------------------------

alter table public.user_emergency_contacts enable row level security;

-- Visible to the owner, to admins, and to the organizer of a hike this user has an
-- active booking on — and to nobody else.
create policy emergency_contacts_select on public.user_emergency_contacts
  for select to authenticated
  using (
    user_id = app.current_user_id()
    or app.is_admin()
    or exists (
      select 1
      from public.bookings b
      join public.hikes h on h.id = b.hike_id
      where b.hiker_id = user_emergency_contacts.user_id
        and b.status in ('confirmed', 'attended', 'no_show')
        and h.organizer_id = app.current_user_id()
        and h.start_at > now() - interval '30 days'
    )
  );

create policy emergency_contacts_write on public.user_emergency_contacts
  for all to authenticated
  using (user_id = app.current_user_id())
  with check (user_id = app.current_user_id());

-------------------------------------------------------------------------------
-- notification_prefs, push_tokens, notifications (SDS §4.9)
-------------------------------------------------------------------------------

alter table public.notification_prefs enable row level security;

create policy notification_prefs_own on public.notification_prefs
  for all to authenticated
  using (user_id = app.current_user_id())
  with check (user_id = app.current_user_id());

alter table public.push_tokens enable row level security;

create policy push_tokens_own on public.push_tokens
  for all to authenticated
  using (user_id = app.current_user_id())
  with check (user_id = app.current_user_id());

alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = app.current_user_id());

-- Only read_at is client-writable; everything else is written by the platform.
create policy notifications_mark_read on public.notifications
  for update to authenticated
  using (user_id = app.current_user_id())
  with check (user_id = app.current_user_id());

create or replace function app.tg_notifications_protect_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if app.is_privileged_context() then
    return new;
  end if;
  new.type    := old.type;
  new.payload := old.payload;
  new.user_id := old.user_id;
  new.sent_at := old.sent_at;
  return new;
end;
$$;

create trigger notifications_protect_columns
  before update on public.notifications
  for each row execute function app.tg_notifications_protect_columns();

-------------------------------------------------------------------------------
-- organizer_profiles (SDS §4.2)
-------------------------------------------------------------------------------

alter table public.organizer_profiles enable row level security;

-- FR-2.3 — organizer pages are public to signed-in users: badge, credentials, rating.
-- stripe_account_id / stripe_identity_session_id are Stripe *identifiers*, not
-- credentials; no secret material is ever stored in this table.
create policy organizer_profiles_select on public.organizer_profiles
  for select to authenticated
  using (user_id = app.current_user_id() or app.is_admin() or not app.is_blocked_with(user_id));

-- FR-1.3 "Become an organizer" creates the shell row; the Stripe fields are filled in by
-- the onboarding Edge Function.
create policy organizer_profiles_insert_self on public.organizer_profiles
  for insert to authenticated
  with check (user_id = app.current_user_id());

create policy organizer_profiles_update_self on public.organizer_profiles
  for update to authenticated
  using (user_id = app.current_user_id() or app.is_admin())
  with check (user_id = app.current_user_id() or app.is_admin());

-- An organizer may edit their credentials text and first-aid attestation. Verification
-- state, payout capability and ratings come from Stripe webhooks and review aggregates.
create or replace function app.tg_organizer_profiles_protect_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if app.is_admin() or app.is_privileged_context() then
    return new;
  end if;

  new.stripe_account_id          := old.stripe_account_id;
  new.charges_enabled            := old.charges_enabled;
  new.payouts_enabled            := old.payouts_enabled;
  new.details_submitted          := old.details_submitted;
  new.stripe_identity_session_id := old.stripe_identity_session_id;
  new.identity_status            := old.identity_status;
  new.verified_at                := old.verified_at;
  new.rating_avg                 := old.rating_avg;
  new.rating_count               := old.rating_count;
  new.status                     := old.status;
  new.suspended_reason           := old.suspended_reason;
  return new;
end;
$$;

create trigger organizer_profiles_protect_columns
  before update on public.organizer_profiles
  for each row execute function app.tg_organizer_profiles_protect_columns();

-- On insert, force a pending shell regardless of what the client sent.
create or replace function app.tg_organizer_profiles_force_pending()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if app.is_privileged_context() or app.is_admin() then
    return new;
  end if;
  new.stripe_account_id := null;
  new.charges_enabled   := false;
  new.payouts_enabled   := false;
  new.details_submitted := false;
  new.identity_status   := 'unstarted';
  new.status            := 'pending';
  new.verified_at       := null;
  new.rating_avg        := null;
  new.rating_count      := 0;
  return new;
end;
$$;

create trigger organizer_profiles_force_pending
  before insert on public.organizer_profiles
  for each row execute function app.tg_organizer_profiles_force_pending();

-------------------------------------------------------------------------------
-- hikes (SDS §4.3, §4.4)
-------------------------------------------------------------------------------

alter table public.hikes enable row level security;

create policy hikes_select on public.hikes
  for select to authenticated
  using (
    organizer_id = app.current_user_id()
    or app.is_admin()
    or (status <> 'draft' and not app.is_blocked_with(organizer_id))
  );

create policy hikes_insert_own on public.hikes
  for insert to authenticated
  with check (
    organizer_id = app.current_user_id()
    and exists (
      select 1 from public.users u
      where u.id = app.current_user_id() and 'organizer' = any (u.role_flags)
    )
  );

create policy hikes_update_own on public.hikes
  for update to authenticated
  using (organizer_id = app.current_user_id() or app.is_admin())
  with check (organizer_id = app.current_user_id() or app.is_admin());

-- Drafts can be thrown away; anything published must be cancelled so attendees get
-- refunded and notified (FR-5.5).
create policy hikes_delete_draft on public.hikes
  for delete to authenticated
  using (
    (organizer_id = app.current_user_id() and status = 'draft')
    or app.is_admin()
  );

create or replace function app.tg_hikes_protect_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if app.is_admin() or app.is_privileged_context() then
    return new;
  end if;
  new.organizer_id    := old.organizer_id;
  new.confirmed_spots := old.confirmed_spots;
  new.rating_avg      := old.rating_avg;
  new.rating_count    := old.rating_count;
  return new;
end;
$$;

create trigger hikes_protect_columns
  before update on public.hikes
  for each row execute function app.tg_hikes_protect_columns();

-------------------------------------------------------------------------------
-- waiver_templates & waivers (FR-5.2)
-------------------------------------------------------------------------------

alter table public.waiver_templates enable row level security;

-- Everyone must be able to read the text they are about to sign.
create policy waiver_templates_select on public.waiver_templates
  for select to authenticated
  using (true);

create policy waiver_templates_admin_write on public.waiver_templates
  for all to authenticated
  using (app.is_admin())
  with check (app.is_admin());

alter table public.waivers enable row level security;

-- FR-5.7 — the organizer's roster shows waiver status for their own hike's attendees.
create policy waivers_select on public.waivers
  for select to authenticated
  using (
    user_id = app.current_user_id()
    or app.is_admin()
    or app.is_organizer_of(hike_id)
  );

-- No client INSERT/UPDATE/DELETE. ip_hash, document_hash and the PDF are produced by the
-- sign-waiver Edge Function; a signed record is immutable afterwards.

-------------------------------------------------------------------------------
-- bookings (SDS §4.5)
-------------------------------------------------------------------------------

alter table public.bookings enable row level security;

create policy bookings_select on public.bookings
  for select to authenticated
  using (
    hiker_id = app.current_user_id()
    or app.is_admin()
    or app.is_organizer_of(hike_id)
  );

-- No client INSERT: create-booking-checkout owns booking creation so capacity, waiver and
-- PaymentIntent stay in one transaction-shaped flow (SDS §3.3).
-- No client cancel: cancel-booking computes the refund. The one client-side mutation is
-- the organizer's day-of check-in.
create policy bookings_update_by_organizer on public.bookings
  for update to authenticated
  using (app.is_organizer_of(hike_id) or app.is_admin())
  with check (app.is_organizer_of(hike_id) or app.is_admin());

create or replace function app.tg_bookings_protect_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if app.is_admin() or app.is_privileged_context() then
    return new;
  end if;

  -- FR-5.7 headcount check-in: an organizer may only move a confirmed booking to
  -- attended / no_show and stamp checked_in_at. Nothing financial.
  if new.status is distinct from old.status
     and not (old.status = 'confirmed' and new.status in ('attended', 'no_show')) then
    raise exception 'organizers may only mark a confirmed booking attended or no_show'
      using errcode = 'insufficient_privilege';
  end if;

  new.hike_id                  := old.hike_id;
  new.hiker_id                 := old.hiker_id;
  new.qty                      := old.qty;
  new.unit_price_cents         := old.unit_price_cents;
  new.amount_cents             := old.amount_cents;
  new.hiker_fee_cents          := old.hiker_fee_cents;
  new.platform_fee_cents       := old.platform_fee_cents;
  new.currency                 := old.currency;
  new.refunded_amount_cents    := old.refunded_amount_cents;
  new.stripe_payment_intent_id := old.stripe_payment_intent_id;
  new.stripe_charge_id         := old.stripe_charge_id;
  new.waiver_id                := old.waiver_id;
  return new;
end;
$$;

create trigger bookings_protect_columns
  before update on public.bookings
  for each row execute function app.tg_bookings_protect_columns();

-------------------------------------------------------------------------------
-- waitlist_entries (FR-3.5)
-------------------------------------------------------------------------------

alter table public.waitlist_entries enable row level security;

create policy waitlist_select on public.waitlist_entries
  for select to authenticated
  using (
    user_id = app.current_user_id()
    or app.is_admin()
    or app.is_organizer_of(hike_id)
  );

create policy waitlist_join on public.waitlist_entries
  for insert to authenticated
  with check (user_id = app.current_user_id() and status = 'waiting');

create policy waitlist_leave on public.waitlist_entries
  for delete to authenticated
  using (user_id = app.current_user_id());

-- Promotion (waiting → offered → claimed) is driven by app.offer_waitlist_spot() and the
-- claim flow in create-booking-checkout, never by the client.

-------------------------------------------------------------------------------
-- reviews (SDS §4.6)
-------------------------------------------------------------------------------

alter table public.reviews enable row level security;

create policy reviews_select_published on public.reviews
  for select to authenticated
  using (
    (status = 'published' and not app.is_blocked_with(coalesce(author_id, organizer_id)))
    or author_id = app.current_user_id()
    or organizer_id = app.current_user_id()
    or app.is_admin()
  );

-- FR-6.2 — insert requires owning a booking on the hike. The reviews_guard trigger
-- re-checks attendance, hike completion and the 14-day window.
create policy reviews_insert_by_attendee on public.reviews
  for insert to authenticated
  with check (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.hiker_id = app.current_user_id()
    )
  );

create policy reviews_update_author on public.reviews
  for update to authenticated
  using (author_id = app.current_user_id())
  with check (author_id = app.current_user_id());

-- FR-6.3 — the organizer gets exactly one public response.
create policy reviews_respond_organizer on public.reviews
  for update to authenticated
  using (organizer_id = app.current_user_id())
  with check (organizer_id = app.current_user_id());

create policy reviews_moderate_admin on public.reviews
  for all to authenticated
  using (app.is_admin())
  with check (app.is_admin());

create or replace function app.tg_reviews_protect_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_me uuid := app.current_user_id();
begin
  if app.is_admin() or app.is_privileged_context() then
    return new;
  end if;

  new.booking_id   := old.booking_id;
  new.hike_id      := old.hike_id;
  new.organizer_id := old.organizer_id;
  new.author_id    := old.author_id;
  new.status       := old.status;

  if v_me = old.organizer_id and v_me is distinct from old.author_id then
    -- Organizer path: response only, and only once.
    if old.organizer_response is not null
       and new.organizer_response is distinct from old.organizer_response then
      raise exception 'an organizer response can only be posted once'
        using errcode = 'insufficient_privilege';
    end if;
    new.hike_rating      := old.hike_rating;
    new.organizer_rating := old.organizer_rating;
    new.body             := old.body;
    new.photos           := old.photos;
  else
    -- Author path: their own content, never the organizer's reply.
    new.organizer_response     := old.organizer_response;
    new.organizer_responded_at := old.organizer_responded_at;
  end if;

  return new;
end;
$$;

create trigger reviews_protect_columns
  before update on public.reviews
  for each row execute function app.tg_reviews_protect_columns();

-------------------------------------------------------------------------------
-- attendee_flags (FR-6.5) — organizer → admin only, never visible to the hiker
-------------------------------------------------------------------------------

alter table public.attendee_flags enable row level security;

create policy attendee_flags_select on public.attendee_flags
  for select to authenticated
  using (organizer_id = app.current_user_id() or app.is_admin());

create policy attendee_flags_insert on public.attendee_flags
  for insert to authenticated
  with check (
    organizer_id = app.current_user_id()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.hiker_id = attendee_flags.hiker_id
        and app.is_organizer_of(b.hike_id)
    )
  );

-------------------------------------------------------------------------------
-- follows & blocks (SDS §4.7, FR-10.1)
-------------------------------------------------------------------------------

alter table public.follows enable row level security;

create policy follows_select on public.follows
  for select to authenticated
  using (not app.is_blocked_with(follower_id) and not app.is_blocked_with(followee_id));

create policy follows_insert_own on public.follows
  for insert to authenticated
  with check (
    follower_id = app.current_user_id()
    and not app.is_blocked_with(followee_id)
  );

create policy follows_delete_own on public.follows
  for delete to authenticated
  using (follower_id = app.current_user_id());

alter table public.blocks enable row level security;

create policy blocks_own on public.blocks
  for all to authenticated
  using (blocker_id = app.current_user_id() or app.is_admin())
  with check (blocker_id = app.current_user_id());

-------------------------------------------------------------------------------
-- chat (FR-7.2)
-------------------------------------------------------------------------------

alter table public.chat_messages enable row level security;

create policy chat_select_participants on public.chat_messages
  for select to authenticated
  using (
    (app.is_hike_participant(hike_id)
      and (deleted_at is null or sender_id = app.current_user_id())
      and not app.is_blocked_with(sender_id))
    or app.is_admin()
  );

create policy chat_insert_participants on public.chat_messages
  for insert to authenticated
  with check (
    sender_id = app.current_user_id()
    and app.is_hike_participant(hike_id)
    and app.chat_is_writable(hike_id)
    and not pinned
  );

-- Sender may retract their own message; the organizer may pin and moderate.
create policy chat_update_own_or_organizer on public.chat_messages
  for update to authenticated
  using (
    sender_id = app.current_user_id()
    or app.is_organizer_of(hike_id)
    or app.is_admin()
  )
  with check (
    sender_id = app.current_user_id()
    or app.is_organizer_of(hike_id)
    or app.is_admin()
  );

create or replace function app.tg_chat_protect_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if app.is_admin() or app.is_privileged_context() then
    return new;
  end if;

  new.hike_id   := old.hike_id;
  new.sender_id := old.sender_id;
  new.body      := old.body;
  new.created_at := old.created_at;

  -- FR-7.2 — only the organizer pins announcements.
  if new.pinned is distinct from old.pinned and not app.is_organizer_of(old.hike_id) then
    new.pinned := old.pinned;
  end if;

  -- deleted_at is one-way: retract, never un-retract.
  if old.deleted_at is not null then
    new.deleted_at := old.deleted_at;
  end if;

  return new;
end;
$$;

create trigger chat_protect_columns
  before update on public.chat_messages
  for each row execute function app.tg_chat_protect_columns();

alter table public.chat_reads enable row level security;

create policy chat_reads_own on public.chat_reads
  for all to authenticated
  using (user_id = app.current_user_id())
  with check (user_id = app.current_user_id() and app.is_hike_participant(hike_id));

-------------------------------------------------------------------------------
-- reports & admin actions (SDS §4.10)
-------------------------------------------------------------------------------

alter table public.reports enable row level security;

create policy reports_insert_any on public.reports
  for insert to authenticated
  with check (reporter_id = app.current_user_id());

create policy reports_select_own_or_admin on public.reports
  for select to authenticated
  using (reporter_id = app.current_user_id() or app.is_admin());

create policy reports_admin_manage on public.reports
  for update to authenticated
  using (app.is_admin())
  with check (app.is_admin());

alter table public.admin_actions enable row level security;

create policy admin_actions_admin_only on public.admin_actions
  for all to authenticated
  using (app.is_admin())
  with check (app.is_admin() and admin_id = app.current_user_id());

-------------------------------------------------------------------------------
-- money tables (SDS §9)
-------------------------------------------------------------------------------

alter table public.payouts_ledger enable row level security;

-- An organizer sees their own earnings (§8 organizer dashboard). Writes are
-- service-role-only: the ledger is written from Stripe webhooks and the payout cron.
create policy payouts_ledger_select_own on public.payouts_ledger
  for select to authenticated
  using (organizer_id = app.current_user_id() or app.is_admin());

alter table public.stripe_webhook_events enable row level security;
-- No policies at all: raw Stripe payloads are never client-readable.

-------------------------------------------------------------------------------
-- Realtime publication (FR-7.2 chat, FR-7.3 feed, FR-9.1 notifications)
-------------------------------------------------------------------------------
-- Realtime respects RLS, so subscribers only receive rows their policies allow.

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
  alter publication supabase_realtime add table public.notifications;
  alter publication supabase_realtime add table public.bookings;
exception
  when undefined_object then
    raise notice 'supabase_realtime publication not present — skipping';
  when duplicate_object then
    null;
end $$;
