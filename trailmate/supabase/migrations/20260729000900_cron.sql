-- TrailMate — scheduled jobs (SDS §6: pg_cron; §7: release-payouts, review reminders)
--
-- Two kinds of job:
--   1. Pure SQL state transitions — run in the database.
--   2. Anything that has to talk to Stripe or Expo — pg_net posts to an Edge Function so
--      the secret keys stay in the function runtime (SDS §3.3).
--
-- The function URL and CRON_SECRET are read from Vault so this migration contains no
-- credentials. Seed them once per environment:
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1', 'functions_base_url');
--   select vault.create_secret('<random>', 'cron_secret');

-------------------------------------------------------------------------------
-- SQL-only transitions
-------------------------------------------------------------------------------

-- FR-3.3 — auto-complete a hike 24 h after its start time.
create or replace function app.job_complete_finished_hikes()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  with done as (
    update public.hikes h
    set status = 'completed', completed_at = now()
    where h.status in ('published', 'full')
      and h.start_at < now() - interval '24 hours'
    returning h.id
  )
  select count(*) into v_count from done;

  -- Any booking that was never checked in is recorded as attended, so the review prompt
  -- and the hiker's stats still fire. Organizers who use check-in override this on the day.
  update public.bookings b
  set status = 'attended'
  where b.status = 'confirmed'
    and exists (
      select 1 from public.hikes h
      where h.id = b.hike_id and h.status = 'completed'
    );

  return v_count;
end;
$$;

-- FR-6.1 — prompt attendees to review once the hike is complete.
create or replace function app.job_queue_review_prompts()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  with queued as (
    insert into public.notifications (user_id, type, payload)
    select b.hiker_id, 'review_prompt',
           jsonb_build_object('hike_id', h.id, 'booking_id', b.id, 'title', h.title)
    from public.bookings b
    join public.hikes h on h.id = b.hike_id
    join public.notification_prefs p
      on p.user_id = b.hiker_id and p.type = 'review_prompt'
    where h.status = 'completed'
      and h.completed_at between now() - interval '25 hours' and now()
      and b.status = 'attended'
      and (p.push or p.email)
      and not exists (select 1 from public.reviews r where r.booking_id = b.id)
      and not exists (
        select 1 from public.notifications n
        where n.user_id = b.hiker_id
          and n.type = 'review_prompt'
          and n.payload ->> 'booking_id' = b.id::text
      )
    returning 1
  )
  select count(*) into v_count from queued;
  return v_count;
end;
$$;

-- FR-9.1 — 48 h and 3 h reminders.
create or replace function app.job_queue_hike_reminders()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer := 0;
  v_window record;
begin
  for v_window in
    select * from (values
      ('hike_reminder_48h'::public.notification_type, interval '48 hours'),
      ('hike_reminder_3h'::public.notification_type,  interval '3 hours')
    ) as t(kind, lead_time)
  loop
    with queued as (
      insert into public.notifications (user_id, type, payload)
      select b.hiker_id, v_window.kind,
             jsonb_build_object('hike_id', h.id, 'title', h.title, 'start_at', h.start_at)
      from public.bookings b
      join public.hikes h on h.id = b.hike_id
      join public.notification_prefs p
        on p.user_id = b.hiker_id and p.type = v_window.kind
      where h.status in ('published', 'full')
        and b.status = 'confirmed'
        and (p.push or p.email)
        and h.start_at between now() + v_window.lead_time - interval '30 minutes'
                           and now() + v_window.lead_time + interval '30 minutes'
        and not exists (
          select 1 from public.notifications n
          where n.user_id = b.hiker_id
            and n.type = v_window.kind
            and n.payload ->> 'hike_id' = h.id::text
        )
      returning 1
    )
    select v_count + count(*) into v_count from queued;
  end loop;
  return v_count;
end;
$$;

-- FR-3.5 — expire unclaimed waitlist offers and pass the spot along.
create or replace function app.job_expire_waitlist_offers()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hike_id uuid;
  v_count integer := 0;
begin
  for v_hike_id in
    update public.waitlist_entries w
    set status = 'expired'
    where w.status = 'offered' and w.claim_expires_at < now()
    returning w.hike_id
  loop
    v_count := v_count + 1;
    perform app.offer_waitlist_spot(v_hike_id);
  end loop;
  return v_count;
end;
$$;

-------------------------------------------------------------------------------
-- Edge Function invocation helper
-------------------------------------------------------------------------------

create or replace function app.invoke_edge_function(p_name text, p_body jsonb default '{}'::jsonb)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_base_url text;
  v_secret text;
  v_request_id bigint;
begin
  select decrypted_secret into v_base_url
  from vault.decrypted_secrets where name = 'functions_base_url';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'cron_secret';

  if v_base_url is null or v_secret is null then
    raise notice 'vault secrets functions_base_url / cron_secret not set — skipping %', p_name;
    return null;
  end if;

  select net.http_post(
    url := v_base_url || '/' || p_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', v_secret
    ),
    body := p_body,
    timeout_milliseconds := 25000
  ) into v_request_id;

  return v_request_id;
end;
$$;

-------------------------------------------------------------------------------
-- Schedules
-------------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron not installed — enable it, then re-run this migration';
    return;
  end if;

  -- Every 15 minutes: listing/booking state transitions.
  perform cron.schedule('trailmate-complete-hikes', '*/15 * * * *',
    $job$ select app.job_complete_finished_hikes(); $job$);

  -- Hourly: review prompts and waitlist expiry.
  perform cron.schedule('trailmate-review-prompts', '7 * * * *',
    $job$ select app.job_queue_review_prompts(); $job$);

  perform cron.schedule('trailmate-waitlist-expiry', '*/10 * * * *',
    $job$ select app.job_expire_waitlist_offers(); $job$);

  -- Every 30 minutes: reminder windows (48 h / 3 h before start).
  perform cron.schedule('trailmate-hike-reminders', '*/30 * * * *',
    $job$ select app.job_queue_hike_reminders(); $job$);

  -- Hourly: release held transfers whose dispute window has closed (SDS §7).
  perform cron.schedule('trailmate-release-payouts', '17 * * * *',
    $job$ select app.invoke_edge_function('release-payouts'); $job$);

  -- Every 5 minutes: flush queued notifications to Expo Push / email.
  perform cron.schedule('trailmate-send-notifications', '*/5 * * * *',
    $job$ select app.invoke_edge_function('send-notifications'); $job$);
exception when others then
  raise notice 'cron scheduling skipped: %', sqlerrm;
end $$;
