-- TrailMate — local development seed.
--
-- Applied by `supabase db reset` after the migrations. Local only: it inserts into
-- auth.users directly and marks organizers payout-ready without touching Stripe, which is
-- the one shortcut that makes the publish gate testable offline.
--
-- Sign in as any of these with password: trailmate-dev-pw
--   alex@example.com    organizer, fully verified
--   sam@example.com     organizer, mid-onboarding (cannot publish — use this to test the gate)
--   jordan@example.com  hiker
--   riley@example.com   hiker
--   admin@example.com   admin

set search_path = public, extensions;

do $$
declare
  v_password text := extensions.crypt('trailmate-dev-pw', extensions.gen_salt('bf'));
  v_emails text[] := array[
    'alex@example.com', 'sam@example.com', 'jordan@example.com',
    'riley@example.com', 'admin@example.com'
  ];
  v_names text[] := array['Alex Chen', 'Sam Ortiz', 'Jordan Lee', 'Riley Nakamura', 'Ada Admin'];
  v_email text;
  i integer;
begin
  for i in 1 .. array_length(v_emails, 1) loop
    v_email := v_emails[i];

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated', v_email, v_password,
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('display_name', v_names[i])
    )
    on conflict (email) do nothing;
  end loop;
end $$;

-- Everyone in the seed has attested to being 18+ (NFR-4) so bookings are testable.
update public.users set adult_confirmed_at = now(), region = 'Bay Area, CA';

update public.users
set role_flags = array['hiker', 'organizer']::public.app_role[],
    bio = 'Wilderness First Responder. 12 years leading Bay Area ridge hikes.',
    experience_level = 'expert'
where display_name = 'Alex Chen';

update public.users
set role_flags = array['hiker', 'organizer']::public.app_role[],
    bio = 'Weekend trail leader, still getting set up.',
    experience_level = 'advanced'
where display_name = 'Sam Ortiz';

update public.users
set role_flags = array['hiker', 'admin']::public.app_role[]
where display_name = 'Ada Admin';

-- Alex: identity verified + Stripe reports charges and payouts enabled → can publish.
insert into public.organizer_profiles (
  user_id, stripe_account_id, charges_enabled, payouts_enabled, details_submitted,
  identity_status, credentials_text, carries_first_aid_kit, status, verified_at
)
select u.id, 'acct_seed_alex', true, true, true, 'verified',
       'WFR (NOLS), CA Guide License #12345', true, 'verified', now()
from public.users u where u.display_name = 'Alex Chen'
on conflict (user_id) do nothing;

-- Sam: onboarding started, payouts not enabled → publishing must fail.
insert into public.organizer_profiles (
  user_id, stripe_account_id, charges_enabled, payouts_enabled, details_submitted,
  identity_status, carries_first_aid_kit, status
)
select u.id, 'acct_seed_sam', false, false, true, 'processing', false, 'pending'
from public.users u where u.display_name = 'Sam Ortiz'
on conflict (user_id) do nothing;

-------------------------------------------------------------------------------
-- Listings — real Bay Area trailheads so the map view has something to cluster.
-------------------------------------------------------------------------------

with organizer as (
  select id from public.users where display_name = 'Alex Chen'
)
insert into public.hikes (
  organizer_id, title, description, status, start_at, timezone, duration_min,
  difficulty, distance_km, elevation_gain_m, meeting_point, meeting_notes, parking_notes,
  capacity_min, capacity_max, price_cents, cancellation_policy, guest_limit,
  whats_included, requirements, dogs_allowed, kids_allowed, weather_checked_at, published_at
)
select
  organizer.id, v.title, v.description, 'published', now() + v.starts_in, 'America/Los_Angeles',
  v.duration_min, v.difficulty::public.hike_difficulty, v.distance_km, v.elevation_gain_m,
  extensions.ST_SetSRID(extensions.ST_MakePoint(v.lng, v.lat), 4326)::extensions.geography,
  v.meeting_notes, v.parking_notes,
  v.capacity_min, v.capacity_max, v.price_cents,
  v.policy::public.cancellation_policy, v.guest_limit,
  v.whats_included, v.requirements::jsonb, v.dogs, v.kids, now(), now()
from organizer, (values
  (
    'Mount Tamalpais Sunrise Ridge',
    'A pre-dawn start up the Matt Davis trail to catch sunrise over the fog layer, then a '
    'loop back via Steep Ravine. Steady climbing, no scrambling. We move at a conversational '
    'pace and regroup at every junction.',
    interval '6 days', 300, 'moderate', 12.4, 780, 37.9235, -122.5965,
    'Pantoll Ranger Station, upper lot. Look for the green pack.',
    '$8 day-use fee, cash or card at the kiosk. Lot fills by 7am on weekends.',
    4, 12, 4500, 'moderate', 1,
    'Route leadership, first-aid kit, hot coffee at the summit',
    '{"fitness":"Comfortable with 800m of gain","gear":["Headlamp","2L water","Windshell","Trail shoes"]}',
    false, false
  ),
  (
    'Point Reyes Coastal Traverse',
    'Bluff-top walking from Bear Valley out to Arch Rock and back along the Coast Trail. '
    'Mostly flat with big exposure to wind. Elephant seals are usually visible from the '
    'overlook in season.',
    interval '13 days', 360, 'easy', 15.1, 320, 38.0400, -122.7996,
    'Bear Valley Visitor Center trailhead board.',
    'Free parking, arrive before 9am. No fuel for 20 minutes in any direction.',
    6, 16, 3800, 'flexible', 2,
    'Route leadership, wildlife spotting scope, first-aid kit',
    '{"fitness":"Able to walk 15km on flat terrain","gear":["Layers","2L water","Sun protection"]}',
    true, true
  ),
  (
    'Mission Peak Night Ascent',
    'A steep evening push to the summit pole for city lights over the South Bay. Relentless '
    'grade with almost no shade or flat recovery — this one earns its Hard rating.',
    interval '3 days', 210, 'hard', 9.7, 640, 37.5225, -121.9130,
    'Stanford Avenue staging area, by the restrooms.',
    'Neighborhood lot closes at 10pm — we are back before then.',
    4, 10, 0, 'flexible', 0,
    'Route leadership, spare headlamp, first-aid kit',
    '{"fitness":"Sustained steep climbing for 90 minutes","gear":["Headlamp (required)","2L water","Warm layer"]}',
    false, false
  ),
  (
    'Henry Coe Backcountry Loop',
    'A long day in the least-visited big park in the Bay Area. Multiple creek crossings, '
    'significant cumulative gain, and genuinely remote terrain with no mobile coverage for '
    'most of the route. Prior long-day experience required.',
    interval '20 days', 600, 'expert', 27.5, 1450, 37.1866, -121.5453,
    'Coe Ranch entrance, main lot by the visitor center.',
    '$6 day-use. Last reliable water is at the trailhead.',
    3, 8, 9500, 'strict', 0,
    'Route leadership, satellite communicator, first-aid kit, water treatment',
    '{"fitness":"Previous 25km+ day with 1200m gain","gear":["3L water capacity","Water filter","Sturdy boots","Headlamp","Emergency layer"]}',
    false, false
  )
) as v(
  title, description, starts_in, duration_min, difficulty, distance_km, elevation_gain_m,
  lat, lng, meeting_notes, parking_notes, capacity_min, capacity_max, price_cents,
  policy, guest_limit, whats_included, requirements, dogs, kids
);

-- A draft, to exercise the organizer dashboard and the publish gate.
insert into public.hikes (
  organizer_id, title, description, status, start_at, duration_min, difficulty,
  distance_km, elevation_gain_m, meeting_point, capacity_max, price_cents
)
select u.id, 'Sam''s First Hike (draft)',
       'Not published yet — Sam still needs to finish identity verification and payout onboarding.',
       'draft', now() + interval '30 days', 180, 'easy', 8.0, 200,
       extensions.ST_SetSRID(extensions.ST_MakePoint(-122.2711, 37.8044), 4326)::extensions.geography,
       10, 2500
from public.users u where u.display_name = 'Sam Ortiz';

-------------------------------------------------------------------------------
-- Social graph
-------------------------------------------------------------------------------

insert into public.follows (follower_id, followee_id)
select h.id, o.id
from public.users h, public.users o
where h.display_name in ('Jordan Lee', 'Riley Nakamura')
  and o.display_name = 'Alex Chen'
on conflict do nothing;

insert into public.user_emergency_contacts (user_id, contact_name, contact_phone, relationship)
select id, 'Casey Lee', '+14155550123', 'sibling'
from public.users where display_name = 'Jordan Lee'
on conflict (user_id) do nothing;

-- A confirmed booking on the free hike, so My Hikes, the roster and the chat all have data.
-- Free RSVPs still need a waiver, so one is recorded here the same way sign-waiver would.
do $$
declare
  v_hike_id uuid;
  v_hiker_id uuid;
  v_booking_id uuid;
  v_waiver_id uuid := gen_random_uuid();
begin
  select id into v_hike_id from public.hikes where title = 'Mission Peak Night Ascent';
  select id into v_hiker_id from public.users where display_name = 'Jordan Lee';
  if v_hike_id is null or v_hiker_id is null then return; end if;

  insert into public.bookings (
    hike_id, hiker_id, qty, status, unit_price_cents, amount_cents
  )
  values (v_hike_id, v_hiker_id, 1, 'pending_payment', 0, 0)
  returning id into v_booking_id;

  insert into public.waivers (
    id, booking_id, user_id, hike_id, template_version, signed_name, ip_hash, document_hash
  )
  values (
    v_waiver_id, v_booking_id, v_hiker_id, v_hike_id, 1, 'Jordan Lee',
    encode(extensions.digest('seed-pepper 127.0.0.1', 'sha256'), 'hex'),
    encode(extensions.digest('seed-document', 'sha256'), 'hex')
  );

  update public.bookings set waiver_id = v_waiver_id, status = 'confirmed' where id = v_booking_id;

  insert into public.chat_messages (hike_id, sender_id, body, pinned)
  select v_hike_id, h.organizer_id,
         'Meeting at the Stanford Ave lot at 18:30. Headlamps are mandatory — I have one spare.',
         true
  from public.hikes h where h.id = v_hike_id;

  insert into public.chat_messages (hike_id, sender_id, body)
  values (v_hike_id, v_hiker_id, 'Got mine, see you there.');
end $$;
