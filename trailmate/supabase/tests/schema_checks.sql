-- TrailMate — behavioural checks for the schema, RLS policies and guard triggers.
--
-- Run with `bash supabase/tests/run.sh` against a freshly reset local stack. Every check
-- either prints PASS or aborts the script, so a non-zero exit means something regressed.
--
-- These are the assertions worth having in CI: the invariants that protect money and
-- privacy. Unit-testing a policy by reading it is not the same as proving an
-- `authenticated` role cannot read a row it should not see, which is what the RLS sections
-- below actually do — they switch role and try.
--
-- The script mutates data, so it must run after `supabase db reset`, not against anything
-- you care about.

\set ON_ERROR_STOP on
\pset pager off

-- Supabase grants these by default; repeated here so the file also runs against a bare
-- Postgres with an auth/storage shim.
grant all on all tables in schema public to authenticated, anon, service_role;
grant all on all sequences in schema public to authenticated, service_role;

create or replace function assert(p_ok boolean, p_label text) returns void
language plpgsql as $$
begin
  if p_ok then raise notice 'PASS  %', p_label;
  else raise exception 'FAIL  %', p_label; end if;
end $$;

create or replace function assert_raises(p_sql text, p_label text) returns void
language plpgsql as $$
begin
  execute p_sql;
  raise exception 'FAIL  % (expected an error, none raised)', p_label;
exception
  when others then
    if sqlerrm like 'FAIL %' then raise;
    else raise notice 'PASS  % — blocked with: %', p_label, left(sqlerrm, 90);
    end if;
end $$;

\echo '=== seed sanity ==='
select assert((select count(*) from public.users) = 5, 'five seeded users');
select assert((select count(*) from public.hikes where status = 'published') = 4, 'four published hikes');
select assert((select count(*) from public.hikes where status = 'draft') = 1, 'one draft hike');
select assert((select count(*) from public.waiver_templates) = 1, 'waiver template v1 present');
select assert(
  (select confirmed_spots from public.hikes where title = 'Mission Peak Night Ascent') = 1,
  'confirmed_spots trigger counted the seeded booking');

\echo ''
\echo '=== FR-4.1/4.2 discovery RPC ==='
select assert(
  (select count(*) from public.hikes_nearby(37.7749, -122.4194, 100)) >= 3,
  'hikes_nearby finds Bay Area hikes within 100km');
select assert(
  (select count(*) from public.hikes_nearby(37.7749, -122.4194, 1)) = 0,
  'hikes_nearby respects a 1km radius');
select assert(
  (select count(*) from public.hikes_nearby(37.7749, -122.4194, 200,
     p_difficulties => array['expert']::public.hike_difficulty[])) = 1,
  'hikes_nearby filters by difficulty');
select assert(
  (select count(*) from public.hikes_nearby(37.7749, -122.4194, 200, p_max_price_cents => 0)) = 1,
  'hikes_nearby filters by max price (free only)');
select assert(
  (select distance_from_me_km > 0 from public.hikes_nearby(37.7749, -122.4194, 200)
   order by distance_from_me_km limit 1),
  'hikes_nearby returns a positive distance');

\echo ''
\echo '=== FR-2.1/2.2 publish gate ==='
select assert_raises(
  $$update public.hikes set status = 'published', weather_checked_at = now()
    where title = 'Sam''s First Hike (draft)'$$,
  'unverified organizer cannot publish');

-- Use the *verified* organizer so this isolates the first-aid check rather than being
-- short-circuited by app.can_publish().
update public.organizer_profiles op set carries_first_aid_kit = false
from public.users u where u.id = op.user_id and u.display_name = 'Alex Chen';

select assert_raises(
  $$insert into public.hikes (organizer_id, title, description, status, start_at, duration_min,
      difficulty, distance_km, meeting_point, capacity_max, weather_checked_at)
    select u.id, 'No first aid kit', 'A description long enough to pass the check constraint.',
      'published', now() + interval '5 days', 120, 'easy', 5,
      extensions.ST_SetSRID(extensions.ST_MakePoint(-122.4, 37.8), 4326)::extensions.geography,
      8, now()
    from public.users u where u.display_name = 'Alex Chen'$$,
  'verified organizer without first-aid attestation is blocked (FR-10.4)');

select assert_raises(
  $$insert into public.hikes (organizer_id, title, description, status, start_at, duration_min,
      difficulty, distance_km, meeting_point, capacity_max, weather_checked_at)
    select u.id, 'Stale weather', 'A description long enough to pass the check constraint.',
      'published', now() + interval '5 days', 120, 'easy', 5,
      extensions.ST_SetSRID(extensions.ST_MakePoint(-122.4, 37.8), 4326)::extensions.geography,
      8, now() - interval '30 days'
    from public.users u where u.display_name = 'Alex Chen'$$,
  'stale weather check is rejected (FR-10.4)');

select assert_raises(
  $$insert into public.hikes (organizer_id, title, description, status, start_at, duration_min,
      difficulty, distance_km, meeting_point, capacity_max, weather_checked_at)
    select u.id, 'Starts in the past', 'A description long enough to pass the check constraint.',
      'published', now() - interval '1 day', 120, 'easy', 5,
      extensions.ST_SetSRID(extensions.ST_MakePoint(-122.4, 37.8), 4326)::extensions.geography,
      8, now()
    from public.users u where u.display_name = 'Alex Chen'$$,
  'publishing a hike that already started is rejected');

update public.organizer_profiles op set carries_first_aid_kit = true
from public.users u where u.id = op.user_id and u.display_name = 'Alex Chen';

-- Alex is verified, so this must succeed.
insert into public.hikes (organizer_id, title, description, status, start_at, duration_min,
    difficulty, distance_km, meeting_point, capacity_min, capacity_max, price_cents,
    weather_checked_at)
select u.id, 'Capacity test hike', 'A description long enough to pass the check constraint.',
  'published', now() + interval '5 days', 120, 'easy', 5,
  extensions.ST_SetSRID(extensions.ST_MakePoint(-122.4, 37.8), 4326)::extensions.geography,
  1, 2, 3000, now()
from public.users u where u.display_name = 'Alex Chen';

select assert(
  (select published_at is not null from public.hikes where title = 'Capacity test hike'),
  'publishing stamps published_at');

-- A price change on a hike with confirmed bookings must be refused (organizers repost
-- instead, FR-3.4).
insert into public.hikes (organizer_id, title, description, status, start_at, duration_min,
    difficulty, distance_km, meeting_point, capacity_max, price_cents, weather_checked_at)
select u.id, 'Draft to publish', 'A description long enough to pass the check constraint.',
  'draft', now() + interval '9 days', 120, 'easy', 5,
  extensions.ST_SetSRID(extensions.ST_MakePoint(-122.4, 37.8), 4326)::extensions.geography,
  8, 4000, now()
from public.users u where u.display_name = 'Alex Chen';

update public.hikes set status = 'published' where title = 'Draft to publish';
select assert(
  (select status = 'published' and published_at is not null
   from public.hikes where title = 'Draft to publish'),
  'draft → published works for a fully verified organizer');

\echo ''
\echo '=== FR-5.1 oversell guard ==='
do $$
declare
  v_hike uuid;
  v_a uuid; v_b uuid; v_c uuid;
  v_w uuid;
begin
  select id into v_hike from public.hikes where title = 'Capacity test hike';
  select id into v_a from public.users where display_name = 'Jordan Lee';
  select id into v_b from public.users where display_name = 'Riley Nakamura';
  select id into v_c from public.users where display_name = 'Ada Admin';

  insert into public.bookings (hike_id, hiker_id, qty, status, unit_price_cents, amount_cents)
  values (v_hike, v_a, 1, 'pending_payment', 3000, 3000);
  insert into public.bookings (hike_id, hiker_id, qty, status, unit_price_cents, amount_cents)
  values (v_hike, v_b, 1, 'pending_payment', 3000, 3000);

  perform assert(
    (select status from public.hikes where id = v_hike) = 'full',
    'hike flips to full at capacity');

  begin
    insert into public.bookings (hike_id, hiker_id, qty, status, unit_price_cents, amount_cents)
    values (v_hike, v_c, 1, 'pending_payment', 3000, 3000);
    raise exception 'FAIL  third booking oversold the hike';
  exception when check_violation then
    raise notice 'PASS  third booking rejected — capacity guard held';
  end;

  -- FR-5.2: a booking cannot reach `confirmed` without a signed waiver.
  begin
    update public.bookings set status = 'confirmed'
    where hike_id = v_hike and hiker_id = v_a;
    raise exception 'FAIL  booking confirmed without a waiver';
  exception when check_violation then
    raise notice 'PASS  confirming without a waiver is blocked';
  end;

  -- With a waiver, confirmation works.
  insert into public.waivers (booking_id, user_id, hike_id, template_version, signed_name,
      ip_hash, document_hash)
  select b.id, v_a, v_hike, 1, 'Jordan Lee', 'hash', 'hash'
  from public.bookings b where b.hike_id = v_hike and b.hiker_id = v_a
  returning id into v_w;

  update public.bookings set waiver_id = v_w, status = 'confirmed'
  where hike_id = v_hike and hiker_id = v_a;

  perform assert(
    (select confirmed_at is not null from public.bookings
     where hike_id = v_hike and hiker_id = v_a),
    'confirming stamps confirmed_at');

  -- Cancelling frees the spot and the listing reopens.
  update public.bookings set status = 'cancelled_by_hiker'
  where hike_id = v_hike and hiker_id = v_b;

  perform assert(
    (select status from public.hikes where id = v_hike) = 'published',
    'cancellation reopens a full hike');
  perform assert(
    (select confirmed_spots from public.hikes where id = v_hike) = 1,
    'confirmed_spots decremented on cancellation');

  -- An organizer cannot book their own hike.
  begin
    insert into public.bookings (hike_id, hiker_id, qty, status, unit_price_cents, amount_cents)
    select v_hike, h.organizer_id, 1, 'pending_payment', 3000, 3000
    from public.hikes h where h.id = v_hike;
    raise exception 'FAIL  organizer booked their own hike';
  exception when check_violation then
    raise notice 'PASS  organizer cannot book their own hike';
  end;
end $$;

\echo ''
\echo '=== SDS §9.3 refund maths ==='
select assert(public.refund_cents('flexible', now() + interval '48 hours', 5000) = 5000,
  'flexible: full refund at 48h');
select assert(public.refund_cents('flexible', now() + interval '12 hours', 5000) = 0,
  'flexible: nothing at 12h');
select assert(public.refund_cents('moderate', now() + interval '96 hours', 5000) = 5000,
  'moderate: full refund at 96h');
select assert(public.refund_cents('moderate', now() + interval '48 hours', 5000) = 2500,
  'moderate: half at 48h');
select assert(public.refund_cents('moderate', now() + interval '12 hours', 5000) = 0,
  'moderate: nothing at 12h');
select assert(public.refund_cents('strict', now() + interval '8 days', 5000) = 5000,
  'strict: full refund at 8 days');
select assert(public.refund_cents('strict', now() + interval '96 hours', 5000) = 2500,
  'strict: half at 96h');
select assert(public.refund_cents('strict', now() + interval '48 hours', 5000) = 0,
  'strict: nothing at 48h');
select assert(public.refund_cents('flexible', now() - interval '1 hour', 5000) = 0,
  'no refund once the hike has started');

\echo ''
\echo '=== SDS §9.2 commission ==='
select assert(public.commission_cents(5000) = 650, '13% of $50.00 is $6.50');
select assert(public.commission_cents(0) = 0, 'commission on a free hike is zero');
select assert(public.commission_cents(999) = 130, '13% of $9.99 rounds half-up to $1.30');

\echo ''
\echo '=== FR-6.2/6.3 review eligibility ==='
do $$
declare
  v_booking uuid;
begin
  select b.id into v_booking
  from public.bookings b
  join public.hikes h on h.id = b.hike_id
  where h.title = 'Mission Peak Night Ascent';

  -- The hike has not completed, so a review must be refused.
  begin
    insert into public.reviews (booking_id, hike_rating, organizer_rating, body)
    values (v_booking, 5, 5, 'Great hike');
    raise exception 'FAIL  review accepted before the hike completed';
  exception when check_violation or insufficient_privilege then
    raise notice 'PASS  review before completion is blocked';
  end;

  -- Complete it, mark the booking attended, then a review must land and aggregate.
  update public.hikes set status = 'completed', completed_at = now()
  where title = 'Mission Peak Night Ascent';
  update public.bookings set status = 'attended' where id = v_booking;

  insert into public.reviews (booking_id, hike_rating, organizer_rating, body)
  values (v_booking, 5, 4, 'Steep but worth it.');

  perform assert(
    (select rating_avg from public.hikes where title = 'Mission Peak Night Ascent') = 5.00,
    'hike rating aggregate updated');
  perform assert(
    (select rating_avg from public.organizer_profiles op
     join public.users u on u.id = op.user_id where u.display_name = 'Alex Chen') = 4.00,
    'organizer rating aggregate updated (FR-6.4)');
  perform assert(
    (select hikes_completed from public.users where display_name = 'Jordan Lee') = 1,
    'hiker stats incremented on attendance (FR-1.2)');
end $$;

\echo ''
\echo '=== RLS: FR-1.5 emergency contacts ==='
do $$
declare
  v_jordan_auth uuid;
  v_riley_auth uuid;
  v_alex_auth uuid;
  v_count integer;
begin
  select auth_id into v_jordan_auth from public.users where display_name = 'Jordan Lee';
  select auth_id into v_riley_auth from public.users where display_name = 'Riley Nakamura';
  select auth_id into v_alex_auth from public.users where display_name = 'Alex Chen';

  -- Owner sees their own.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', v_jordan_auth::text, true);
  select count(*) into v_count from public.user_emergency_contacts;
  perform assert(v_count = 1, 'owner reads their own emergency contact');

  -- An unrelated hiker sees nothing.
  perform set_config('request.jwt.claim.sub', v_riley_auth::text, true);
  select count(*) into v_count from public.user_emergency_contacts;
  perform assert(v_count = 0, 'unrelated hiker cannot read an emergency contact');

  -- The organizer of a hike Jordan booked can.
  perform set_config('request.jwt.claim.sub', v_alex_auth::text, true);
  select count(*) into v_count from public.user_emergency_contacts;
  perform assert(v_count = 1, 'organizer of a booked hike reads the emergency contact');

  reset role;
end $$;

\echo ''
\echo '=== RLS: privilege escalation and money columns ==='
do $$
declare
  v_riley_auth uuid;
  v_riley uuid;
  v_flags public.app_role[];
  v_booking uuid;
  v_amount integer;
begin
  select auth_id, id into v_riley_auth, v_riley
  from public.users where display_name = 'Riley Nakamura';

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', v_riley_auth::text, true);

  -- Bio is editable.
  update public.users set bio = 'Weekend hiker' where id = v_riley;
  perform assert(
    (select bio from public.users where id = v_riley) = 'Weekend hiker',
    'user can edit their own bio');

  -- role_flags is not.
  begin
    update public.users set role_flags = array['hiker','admin']::public.app_role[]
    where id = v_riley;
    raise exception 'FAIL  user granted themselves admin';
  exception when insufficient_privilege then
    raise notice 'PASS  self-granting admin is blocked';
  end;

  -- Platform-maintained stats are silently reverted rather than accepted.
  update public.users set hikes_completed = 999 where id = v_riley;
  perform assert(
    (select hikes_completed from public.users where id = v_riley) = 0,
    'hikes_completed cannot be inflated by the account holder');

  -- Bookings: no client INSERT policy at all. Use an otherwise-valid pending_payment row so
  -- the guard trigger passes and it is RLS that does the rejecting.
  begin
    insert into public.bookings (hike_id, hiker_id, qty, status, unit_price_cents, amount_cents)
    select h.id, v_riley, 1, 'pending_payment', h.price_cents, h.price_cents
    from public.hikes h where h.title = 'Draft to publish';
    raise exception 'FAIL  client inserted a booking directly';
  exception when insufficient_privilege then
    raise notice 'PASS  direct booking insert is blocked (no INSERT policy)';
  end;

  reset role;

  -- An organizer may check a booking in, but not touch the money.
  select b.id into v_booking from public.bookings b
  join public.hikes h on h.id = b.hike_id
  where h.title = 'Capacity test hike' and b.status = 'confirmed';

  set local role authenticated;
  perform set_config('request.jwt.claim.sub',
    (select auth_id from public.users where display_name = 'Alex Chen')::text, true);

  update public.bookings set status = 'attended', checked_in_at = now() where id = v_booking;
  perform assert(
    (select status from public.bookings where id = v_booking) = 'attended',
    'organizer can check an attendee in (FR-5.7)');

  select amount_cents into v_amount from public.bookings where id = v_booking;
  update public.bookings set amount_cents = 1 where id = v_booking;
  perform assert(
    (select amount_cents from public.bookings where id = v_booking) = v_amount,
    'organizer cannot rewrite a booking amount');

  reset role;
end $$;

\echo ''
\echo '=== RLS: drafts, chat, webhook events ==='
do $$
declare
  v_riley_auth uuid;
  v_count integer;
begin
  select auth_id into v_riley_auth from public.users where display_name = 'Riley Nakamura';

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', v_riley_auth::text, true);

  select count(*) into v_count from public.hikes where status = 'draft';
  perform assert(v_count = 0, 'another organizer''s draft is invisible');

  -- Riley has no booking on the Mission Peak hike, so the chat must be empty for them.
  select count(*) into v_count from public.chat_messages;
  perform assert(v_count = 0, 'non-participant sees no chat messages (FR-7.2)');

  begin
    select count(*) into v_count from public.stripe_webhook_events;
    perform assert(v_count = 0, 'stripe_webhook_events is unreadable by clients');
  exception when insufficient_privilege then
    raise notice 'PASS  stripe_webhook_events is unreadable by clients';
  end;

  reset role;
end $$;

\echo ''
\echo '=== cron jobs ==='
do $$
declare
  v_completed integer;
begin
  -- Publish legitimately (the gate forbids a past start time), then wind the clock back so
  -- the hike looks finished to the cron job.
  insert into public.hikes (organizer_id, title, description, status, start_at, duration_min,
      difficulty, distance_km, meeting_point, capacity_max, price_cents, weather_checked_at)
  select u.id, 'Past hike', 'A description long enough to pass the check constraint.',
    'published', now() + interval '1 day', 120, 'easy', 5,
    extensions.ST_SetSRID(extensions.ST_MakePoint(-122.4, 37.8), 4326)::extensions.geography,
    8, 1000, now()
  from public.users u where u.display_name = 'Alex Chen';

  update public.hikes set start_at = now() - interval '30 hours' where title = 'Past hike';

  select app.job_complete_finished_hikes() into v_completed;
  perform assert(v_completed >= 1, 'job_complete_finished_hikes completed a finished hike');
  perform assert(
    (select status from public.hikes where title = 'Past hike') = 'completed',
    'the past hike is now completed');

  perform app.job_queue_review_prompts();
  perform app.job_queue_hike_reminders();
  perform app.job_expire_waitlist_offers();
  raise notice 'PASS  all cron job functions execute without error';
end $$;

\echo ''
\echo '=== storage buckets ==='
select assert((select count(*) from storage.buckets) = 4, 'four storage buckets created');
select assert((select not public from storage.buckets where id = 'waivers'),
  'the waivers bucket is private');

\echo ''
\echo '=== RLS coverage: every public table ==='
select assert(
  not exists (
    select 1 from pg_tables t
    where t.schemaname = 'public' and not t.rowsecurity
  ),
  'RLS is enabled on every table in public (NFR-3)');

select assert(
  not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'app')
      and p.prosecdef
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, array[]::text[])) c
        where c like 'search_path=%'
      )
  ),
  'every security definer function pins search_path');

\echo ''
\echo 'ALL CHECKS PASSED'
