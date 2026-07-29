-- TrailMate — security helpers, money math, and discovery RPCs
--
-- Everything in `app` is SECURITY DEFINER with a pinned search_path and is used from RLS
-- policies. Policy expressions run as the querying role, so `authenticated` needs EXECUTE;
-- the definer wrapper is what lets a policy on `bookings` consult `hikes` without
-- recursing into another policy.

-------------------------------------------------------------------------------
-- Identity helpers
-------------------------------------------------------------------------------

-- Maps the JWT subject to public.users.id. Returns null for anon.
create or replace function app.current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.id
  from public.users u
  where u.auth_id = auth.uid()
    and u.deleted_at is null;
$$;

create or replace function app.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select 'admin' = any (u.role_flags)
     from public.users u
     where u.auth_id = auth.uid()),
    false);
$$;

create or replace function app.is_organizer_of(p_hike_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.hikes h
    where h.id = p_hike_id
      and h.organizer_id = app.current_user_id()
  );
$$;

-- True for a booking that still entitles the hiker to hike resources (roster, chat).
create or replace function app.has_active_booking(p_hike_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.bookings b
    where b.hike_id = p_hike_id
      and b.hiker_id = app.current_user_id()
      and b.status in ('confirmed', 'attended', 'no_show')
  );
$$;

-- FR-7.2 — chat membership: organizer plus confirmed attendees.
create or replace function app.is_hike_participant(p_hike_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app.is_organizer_of(p_hike_id) or app.has_active_booking(p_hike_id);
$$;

-- FR-7.2 — chat goes read-only N days after the hike completes.
create or replace function app.chat_is_writable(p_hike_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.hikes h, public.platform_config c
    where h.id = p_hike_id
      and h.status <> 'cancelled'
      and (
        h.completed_at is null
        or now() < h.completed_at + make_interval(days => c.chat_readonly_after_days)
      )
  );
$$;

-- FR-10.1 — blocking hides content in both directions.
create or replace function app.is_blocked_with(p_other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.blocks b
    where (b.blocker_id = app.current_user_id() and b.blocked_id = p_other_user_id)
       or (b.blocker_id = p_other_user_id and b.blocked_id = app.current_user_id())
  );
$$;

-- FR-2.1 / FR-2.2 — the publish gate. A listing cannot leave `draft` until identity
-- verification passed and Stripe reports the Connect account can charge and pay out.
create or replace function app.can_publish(p_organizer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organizer_profiles op
    where op.user_id = p_organizer_id
      and op.status = 'verified'
      and op.identity_status = 'verified'
      and op.charges_enabled
      and op.payouts_enabled
  );
$$;

grant execute on function
  app.current_user_id(),
  app.is_admin(),
  app.is_organizer_of(uuid),
  app.has_active_booking(uuid),
  app.is_hike_participant(uuid),
  app.chat_is_writable(uuid),
  app.is_blocked_with(uuid),
  app.can_publish(uuid)
to authenticated, service_role;

-------------------------------------------------------------------------------
-- Money math (SDS §9.2, §9.3) — one implementation, called from SQL and Edge Functions
-------------------------------------------------------------------------------

-- Commission on a gross amount, rounded half-up to whole cents.
create or replace function public.commission_cents(p_gross_cents integer)
returns integer
language sql
stable
set search_path = public, pg_temp
as $$
  select floor((p_gross_cents * c.take_rate_bps)::numeric / 10000 + 0.5)::integer
  from public.platform_config c;
$$;

-- SDS §9.3 refund presets. Returns the refundable portion of `p_paid_cents` for a hiker
-- cancellation at `p_at`.
--   flexible — 100% at ≥ 24h
--   moderate — 100% at ≥ 72h, 50% at ≥ 24h
--   strict   — 100% at ≥ 7d,  50% at ≥ 72h
create or replace function public.refund_cents(
  p_policy     public.cancellation_policy,
  p_start_at   timestamptz,
  p_paid_cents integer,
  p_at         timestamptz default now()
)
returns integer
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when p_start_at <= p_at then 0
    when p_policy = 'flexible' then
      case when p_start_at - p_at >= interval '24 hours' then p_paid_cents else 0 end
    when p_policy = 'moderate' then
      case
        when p_start_at - p_at >= interval '72 hours' then p_paid_cents
        when p_start_at - p_at >= interval '24 hours' then (p_paid_cents / 2)
        else 0
      end
    when p_policy = 'strict' then
      case
        when p_start_at - p_at >= interval '7 days' then p_paid_cents
        when p_start_at - p_at >= interval '72 hours' then (p_paid_cents / 2)
        else 0
      end
    else 0
  end;
$$;

comment on function public.refund_cents is
  'SDS §9.3. Organizer- and weather-cancellations bypass this and always refund 100% '
  'with the commission returned — see the cancel-hike Edge Function.';

grant execute on function
  public.commission_cents(integer),
  public.refund_cents(public.cancellation_policy, timestamptz, integer, timestamptz)
to authenticated, service_role;

-------------------------------------------------------------------------------
-- Discovery (SDS §4.4)
-------------------------------------------------------------------------------

-- FR-4.1 / FR-4.2. SECURITY INVOKER on purpose: RLS on `hikes` still decides what the
-- caller may see, this only adds the geo predicate and the filter surface.
create or replace function public.hikes_nearby(
  p_lat            double precision,
  p_lng            double precision,
  p_radius_km      double precision default 50,
  p_from           timestamptz default now(),
  p_to             timestamptz default null,
  p_difficulties   public.hike_difficulty[] default null,
  p_max_price_cents integer default null,
  p_max_duration_min integer default null,
  p_min_organizer_rating numeric default null,
  p_include_full   boolean default true,
  p_limit          integer default 50,
  p_offset         integer default 0
)
returns table (
  id                 uuid,
  organizer_id       uuid,
  organizer_name     text,
  organizer_rating   numeric,
  title              text,
  status             public.hike_status,
  start_at           timestamptz,
  duration_min       integer,
  difficulty         public.hike_difficulty,
  distance_km        numeric,
  elevation_gain_m   integer,
  price_cents        integer,
  currency           char(3),
  capacity_max       integer,
  confirmed_spots    integer,
  rating_avg         numeric,
  rating_count       integer,
  photos             jsonb,
  meeting_lat        double precision,
  meeting_lng        double precision,
  distance_from_me_km double precision
)
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  with origin as (
    select extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography as g
  )
  select
    h.id,
    h.organizer_id,
    u.display_name,
    op.rating_avg,
    h.title,
    h.status,
    h.start_at,
    h.duration_min,
    h.difficulty,
    h.distance_km,
    h.elevation_gain_m,
    h.price_cents,
    h.currency,
    h.capacity_max,
    h.confirmed_spots,
    h.rating_avg,
    h.rating_count,
    h.photos,
    extensions.ST_Y(h.meeting_point::extensions.geometry),
    extensions.ST_X(h.meeting_point::extensions.geometry),
    -- ST_Distance returns double precision, and round(double precision, int) does not
    -- exist in Postgres — go through numeric.
    round((extensions.ST_Distance(h.meeting_point, o.g) / 1000.0)::numeric, 2)::double precision
  from public.hikes h
  join origin o on true
  join public.users u on u.id = h.organizer_id
  left join public.organizer_profiles op on op.user_id = h.organizer_id
  where (h.status = 'published' or (p_include_full and h.status = 'full'))
    and extensions.ST_DWithin(h.meeting_point, o.g, p_radius_km * 1000)
    and h.start_at >= p_from
    and (p_to is null or h.start_at <= p_to)
    and (p_difficulties is null or h.difficulty = any (p_difficulties))
    and (p_max_price_cents is null or h.price_cents <= p_max_price_cents)
    and (p_max_duration_min is null or h.duration_min <= p_max_duration_min)
    and (p_min_organizer_rating is null
         or coalesce(op.rating_avg, 0) >= p_min_organizer_rating)
  order by extensions.ST_Distance(h.meeting_point, o.g), h.start_at
  limit least(coalesce(p_limit, 50), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.hikes_nearby(
  double precision, double precision, double precision, timestamptz, timestamptz,
  public.hike_difficulty[], integer, integer, numeric, boolean, integer, integer
) to authenticated;

-------------------------------------------------------------------------------
-- Lifecycle helpers used by Edge Functions and cron
-------------------------------------------------------------------------------

-- Recomputes organizer_profiles.status from the Stripe-reported flags. Called from the
-- account.updated and identity.verification_session.* webhook handlers.
create or replace function app.refresh_organizer_status(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.organizer_profiles op
  set status = case
        when op.status in ('suspended', 'revoked') then op.status
        when op.identity_status = 'verified'
             and op.charges_enabled
             and op.payouts_enabled then 'verified'::public.organizer_status
        else 'pending'::public.organizer_status
      end,
      verified_at = case
        when op.verified_at is null
             and op.identity_status = 'verified'
             and op.charges_enabled
             and op.payouts_enabled then now()
        else op.verified_at
      end,
      updated_at = now()
  where op.user_id = p_user_id;
end;
$$;

-- Thin public wrapper so Edge Functions can reach the helper through PostgREST `.rpc()`,
-- which can only see the exposed schemas. Service-role only.
create or replace function public.refresh_organizer_status(p_user_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  select app.refresh_organizer_status(p_user_id);
$$;

revoke execute on function public.refresh_organizer_status(uuid) from public, anon, authenticated;
grant execute on function public.refresh_organizer_status(uuid) to service_role;

-- FR-1.4 — scrub PII, keep the financial trail. Reviews stay but lose authorship.
create or replace function app.anonymize_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.users
  set display_name = 'Deleted hiker',
      avatar_url = null,
      bio = null,
      region = null,
      feed_visible = false,
      deleted_at = coalesce(deleted_at, now()),
      updated_at = now()
  where id = p_user_id;

  delete from public.user_emergency_contacts where user_id = p_user_id;
  delete from public.push_tokens where user_id = p_user_id;
  delete from public.follows where follower_id = p_user_id or followee_id = p_user_id;
  delete from public.chat_reads where user_id = p_user_id;

  update public.reviews set author_id = null where author_id = p_user_id;
  update public.chat_messages set deleted_at = now() where sender_id = p_user_id;

  -- bookings, waivers and payouts_ledger are intentionally untouched: NFR-4 requires 7
  -- year retention of waiver and payment records.
end;
$$;

create or replace function public.anonymize_user(p_user_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  select app.anonymize_user(p_user_id);
$$;

revoke execute on function public.anonymize_user(uuid) from public, anon, authenticated;
grant execute on function public.anonymize_user(uuid) to service_role;

-- FR-3.5 — promote the head of the waitlist into a claim window. Returns the promoted row.
create or replace function app.offer_waitlist_spot(p_hike_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_entry_id uuid;
  v_hours integer;
begin
  select waitlist_claim_hours into v_hours from public.platform_config;

  update public.waitlist_entries w
  set status = 'offered',
      offered_at = now(),
      claim_expires_at = now() + make_interval(hours => v_hours)
  where w.id = (
    select w2.id
    from public.waitlist_entries w2
    join public.hikes h on h.id = w2.hike_id
    where w2.hike_id = p_hike_id
      and w2.status = 'waiting'
      and h.confirmed_spots + w2.qty <= h.capacity_max
    order by w2.created_at
    limit 1
    for update skip locked
  )
  returning w.id into v_entry_id;

  if v_entry_id is not null then
    insert into public.notifications (user_id, type, payload)
    select w.user_id, 'waitlist_promoted',
           jsonb_build_object('hike_id', p_hike_id, 'expires_at', w.claim_expires_at)
    from public.waitlist_entries w
    where w.id = v_entry_id;
  end if;

  return v_entry_id;
end;
$$;
