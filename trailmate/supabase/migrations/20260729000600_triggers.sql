-- TrailMate — triggers
--
-- These enforce the invariants that must hold no matter which path wrote the row: a
-- booking can never oversell a hike, a listing cannot be published by an unverified
-- organizer, and rating aggregates always match the reviews behind them.

-------------------------------------------------------------------------------
-- updated_at
-------------------------------------------------------------------------------

create or replace function app.tg_set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.users
  for each row execute function app.tg_set_updated_at();
create trigger set_updated_at before update on public.user_emergency_contacts
  for each row execute function app.tg_set_updated_at();
create trigger set_updated_at before update on public.organizer_profiles
  for each row execute function app.tg_set_updated_at();
create trigger set_updated_at before update on public.hikes
  for each row execute function app.tg_set_updated_at();
create trigger set_updated_at before update on public.bookings
  for each row execute function app.tg_set_updated_at();
create trigger set_updated_at before update on public.reviews
  for each row execute function app.tg_set_updated_at();

-------------------------------------------------------------------------------
-- Auth → profile provisioning (FR-1.1)
-------------------------------------------------------------------------------

create or replace function app.tg_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_name text;
begin
  -- Apple and Google hand us different metadata keys; fall back to the email local part.
  v_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Hiker'
  );

  insert into public.users (auth_id, display_name, avatar_url)
  values (new.id, left(v_name, 60), new.raw_user_meta_data ->> 'avatar_url')
  on conflict (auth_id) do nothing
  returning id into v_user_id;

  if v_user_id is null then
    select id into v_user_id from public.users where auth_id = new.id;
  end if;

  -- FR-9.2 — start every category opted in; the user tunes them in Settings.
  insert into public.notification_prefs (user_id, type)
  select v_user_id, t
  from unnest(enum_range(null::public.notification_type)) as t
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.tg_handle_new_auth_user();

-------------------------------------------------------------------------------
-- Listing publish gate (FR-2.2, FR-3.3, FR-10.4)
-------------------------------------------------------------------------------

create or replace function app.tg_hikes_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status <> 'draft' and (tg_op = 'INSERT' or old.status = 'draft') then
    -- FR-2.1 / FR-2.2: verified identity + charges_enabled + payouts_enabled.
    if not app.can_publish(new.organizer_id) then
      raise exception
        'organizer % is not cleared to publish: identity verification and Stripe payout onboarding must both be complete',
        new.organizer_id
        using errcode = 'check_violation';
    end if;

    -- FR-10.4: first-aid kit and weather attestation.
    if not exists (
      select 1 from public.organizer_profiles op
      where op.user_id = new.organizer_id and op.carries_first_aid_kit
    ) then
      raise exception 'organizer must confirm they carry a first-aid kit before publishing'
        using errcode = 'check_violation';
    end if;

    if new.weather_checked_at is null
       or new.weather_checked_at < now() - interval '7 days' then
      raise exception 'weather must be checked within 7 days of publishing'
        using errcode = 'check_violation';
    end if;

    if new.start_at <= now() then
      raise exception 'cannot publish a hike that starts in the past'
        using errcode = 'check_violation';
    end if;

    new.published_at := coalesce(new.published_at, now());
  end if;

  -- A hike with paid bookings cannot silently change price or currency; the organizer
  -- must cancel and repost (FR-3.4 makes that cheap).
  if tg_op = 'UPDATE'
     and (new.price_cents <> old.price_cents or new.currency <> old.currency)
     and exists (
       select 1 from public.bookings b
       where b.hike_id = new.id and b.status in ('confirmed', 'attended')
     ) then
    raise exception 'price cannot change once the hike has confirmed bookings'
      using errcode = 'check_violation';
  end if;

  if new.status = 'cancelled' and (tg_op = 'INSERT' or old.status <> 'cancelled') then
    new.cancelled_at := coalesce(new.cancelled_at, now());
  end if;

  if new.status = 'completed' and (tg_op = 'INSERT' or old.status <> 'completed') then
    new.completed_at := coalesce(new.completed_at, now());
  end if;

  return new;
end;
$$;

create trigger hikes_guard
  before insert or update on public.hikes
  for each row execute function app.tg_hikes_guard();

-------------------------------------------------------------------------------
-- Booking invariants (FR-5.1, FR-5.6) — the oversell guard
-------------------------------------------------------------------------------

create or replace function app.tg_bookings_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hike public.hikes;
  v_taken integer;
begin
  -- Lock the listing row so two concurrent checkouts cannot both see the last spot.
  select * into v_hike from public.hikes where id = new.hike_id for update;

  if v_hike is null then
    raise exception 'hike % not found', new.hike_id using errcode = 'foreign_key_violation';
  end if;

  if tg_op = 'INSERT' then
    if v_hike.organizer_id = new.hiker_id then
      raise exception 'an organizer cannot book their own hike'
        using errcode = 'check_violation';
    end if;

    if v_hike.status not in ('published', 'full') then
      raise exception 'hike is not open for booking (status %)', v_hike.status
        using errcode = 'check_violation';
    end if;

    if v_hike.start_at <= now() then
      raise exception 'hike has already started'
        using errcode = 'check_violation';
    end if;

    -- FR-5.1 — self plus guests, capped by the listing's guest policy.
    if new.qty > 1 + v_hike.guest_limit then
      raise exception 'this hike allows at most % guest(s) per booking', v_hike.guest_limit
        using errcode = 'check_violation';
    end if;
  end if;

  -- Capacity is only consumed by bookings that count as taken. pending_payment holds a
  -- spot too, otherwise a slow card would let someone else take it mid-checkout.
  if new.status in ('pending_payment', 'confirmed', 'attended', 'no_show') then
    select coalesce(sum(b.qty), 0) into v_taken
    from public.bookings b
    where b.hike_id = new.hike_id
      and b.id <> new.id
      and b.status in ('pending_payment', 'confirmed', 'attended', 'no_show');

    if v_taken + new.qty > v_hike.capacity_max then
      raise exception 'hike is full: % of % spots taken', v_taken, v_hike.capacity_max
        using errcode = 'check_violation';
    end if;
  end if;

  -- FR-5.2 — a confirmed booking must carry a signed waiver, free hikes included.
  if new.status = 'confirmed' and new.waiver_id is null then
    raise exception 'a signed waiver is required before a booking can be confirmed'
      using errcode = 'check_violation';
  end if;

  if new.status = 'confirmed' and (tg_op = 'INSERT' or old.status <> 'confirmed') then
    new.confirmed_at := coalesce(new.confirmed_at, now());
  end if;

  if new.status in ('cancelled_by_hiker', 'cancelled_by_organizer', 'refunded')
     and (tg_op = 'INSERT' or old.status <> new.status) then
    new.cancelled_at := coalesce(new.cancelled_at, now());
  end if;

  return new;
end;
$$;

create trigger bookings_guard
  before insert or update on public.bookings
  for each row execute function app.tg_bookings_guard();

-- Keeps hikes.confirmed_spots and the published/full transition in sync, and opens a
-- waitlist claim window when a spot frees up (FR-3.3, FR-3.5).
create or replace function app.tg_bookings_sync_spots()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hike_id uuid;
  v_taken integer;
  v_hike public.hikes;
  v_freed boolean := false;
begin
  v_hike_id := case when tg_op = 'DELETE' then old.hike_id else new.hike_id end;

  select coalesce(sum(b.qty), 0) into v_taken
  from public.bookings b
  where b.hike_id = v_hike_id
    and b.status in ('pending_payment', 'confirmed', 'attended', 'no_show');

  select * into v_hike from public.hikes where id = v_hike_id for update;
  v_freed := v_taken < v_hike.confirmed_spots;

  update public.hikes h
  set confirmed_spots = v_taken,
      status = case
        when h.status = 'published' and v_taken >= h.capacity_max then 'full'::public.hike_status
        when h.status = 'full' and v_taken < h.capacity_max then 'published'::public.hike_status
        else h.status
      end
  where h.id = v_hike_id;

  -- FR-3.5 — auto-promote on cancellation.
  if v_freed and v_hike.status in ('published', 'full') and v_hike.start_at > now() then
    perform app.offer_waitlist_spot(v_hike_id);
  end if;

  return null;
end;
$$;

create trigger bookings_sync_spots
  after insert or update of status, qty or delete on public.bookings
  for each row execute function app.tg_bookings_sync_spots();

-- FR-1.2 — hike stats on the hiker's profile.
create or replace function app.tg_bookings_sync_hiker_stats()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'attended' and old.status <> 'attended' then
    update public.users u
    set hikes_completed = u.hikes_completed + 1,
        distance_completed_km = u.distance_completed_km
          + coalesce((select h.distance_km from public.hikes h where h.id = new.hike_id), 0)
    where u.id = new.hiker_id;
  end if;
  return null;
end;
$$;

create trigger bookings_sync_hiker_stats
  after update of status on public.bookings
  for each row execute function app.tg_bookings_sync_hiker_stats();

-------------------------------------------------------------------------------
-- Review eligibility and aggregates (FR-6.2, FR-6.3, FR-6.4)
-------------------------------------------------------------------------------

create or replace function app.tg_reviews_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking public.bookings;
  v_hike public.hikes;
  v_window_days integer;
begin
  select review_window_days into v_window_days from public.platform_config;
  select * into v_booking from public.bookings where id = new.booking_id;
  select * into v_hike from public.hikes where id = v_booking.hike_id;

  if tg_op = 'INSERT' then
    -- FR-6.2 — verified attendee only.
    if v_booking.status not in ('confirmed', 'attended') then
      raise exception 'only an attended booking can be reviewed'
        using errcode = 'check_violation';
    end if;

    if v_booking.hiker_id <> app.current_user_id() and not app.is_admin() then
      raise exception 'a review must be written by the booking holder'
        using errcode = 'insufficient_privilege';
    end if;

    if v_hike.status <> 'completed' then
      raise exception 'the hike has not completed yet'
        using errcode = 'check_violation';
    end if;

    -- FR-6.3 — 14 day window.
    if now() > v_hike.completed_at + make_interval(days => v_window_days) then
      raise exception 'the % day review window has closed', v_window_days
        using errcode = 'check_violation';
    end if;

    new.hike_id := v_hike.id;
    new.organizer_id := v_hike.organizer_id;
    new.author_id := v_booking.hiker_id;
  end if;

  if new.organizer_response is not null
     and (tg_op = 'INSERT' or old.organizer_response is null) then
    new.organizer_responded_at := now();
  end if;

  return new;
end;
$$;

create trigger reviews_guard
  before insert or update on public.reviews
  for each row execute function app.tg_reviews_guard();

create or replace function app.tg_reviews_recalc()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hike_id uuid;
  v_organizer_id uuid;
begin
  v_hike_id := case when tg_op = 'DELETE' then old.hike_id else new.hike_id end;
  v_organizer_id := case when tg_op = 'DELETE' then old.organizer_id else new.organizer_id end;

  update public.hikes h
  set rating_avg = agg.avg_rating, rating_count = agg.n
  from (
    select round(avg(r.hike_rating)::numeric, 2) as avg_rating, count(*) as n
    from public.reviews r
    where r.hike_id = v_hike_id and r.status = 'published'
  ) agg
  where h.id = v_hike_id;

  -- FR-6.4 — organizer rating aggregates across every hike they have run.
  update public.organizer_profiles op
  set rating_avg = agg.avg_rating, rating_count = agg.n
  from (
    select round(avg(r.organizer_rating)::numeric, 2) as avg_rating, count(*) as n
    from public.reviews r
    where r.organizer_id = v_organizer_id and r.status = 'published'
  ) agg
  where op.user_id = v_organizer_id;

  return null;
end;
$$;

create trigger reviews_recalc
  after insert or update of hike_rating, organizer_rating, status or delete
  on public.reviews
  for each row execute function app.tg_reviews_recalc();

-------------------------------------------------------------------------------
-- Feed fan-out (FR-7.3, FR-9.1)
-------------------------------------------------------------------------------

-- Followers get told when an organizer they follow publishes something new.
create or replace function app.tg_hikes_notify_followers()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status = 'draft') then
    insert into public.notifications (user_id, type, payload)
    select f.follower_id,
           'new_hike_from_followed_organizer',
           jsonb_build_object('hike_id', new.id, 'title', new.title,
                              'organizer_id', new.organizer_id)
    from public.follows f
    join public.notification_prefs p
      on p.user_id = f.follower_id
     and p.type = 'new_hike_from_followed_organizer'
    where f.followee_id = new.organizer_id
      and (p.push or p.email)
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = f.follower_id and b.blocked_id = new.organizer_id)
           or (b.blocker_id = new.organizer_id and b.blocked_id = f.follower_id)
      );
  end if;
  return null;
end;
$$;

create trigger hikes_notify_followers
  after insert or update of status on public.hikes
  for each row execute function app.tg_hikes_notify_followers();
