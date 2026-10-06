-- =============================================================================
-- A colour for a time block (Kyan, 2026-10-06), so a day's plan can be read at
-- a glance: deep work in one colour, admin in another.
--
-- The colour is a name, not a value: each theme draws its own shade of it
-- (the tokens in src/app/globals.css). Empty means the usual blue. Green,
-- amber, red and orange are left out on purpose: in the PPM they mean done,
-- time and risk, errors and urgent. Meetings keep their own colour, so they
-- still read as meetings.
--
-- Templates keep a block's colour too. The team's view of the calendar returns
-- it, except where someone shares only that they're busy: there it stays
-- hidden, like the title.
-- =============================================================================

alter table public.cal_events add column if not exists color text;
alter table public.cal_events drop constraint if exists cal_events_color_check;
alter table public.cal_events add constraint cal_events_color_check
  check (color is null or color in ('teal', 'purple', 'pink', 'slate'));

alter table public.cal_event_templates add column if not exists color text;
alter table public.cal_event_templates drop constraint if exists cal_event_templates_color_check;
alter table public.cal_event_templates add constraint cal_event_templates_color_check
  check (color is null or color in ('teal', 'purple', 'pink', 'slate'));

-- The same function as in 20261002000200, with the colour added at the end.
-- Its result changes shape, which Postgres only allows by making it again.
drop function if exists public.cal_team_events(timestamptz, timestamptz);
create function public.cal_team_events(range_start timestamptz, range_end timestamptz)
returns table (
  id uuid, owner_id uuid, kind text, title text, notes text,
  starts_at timestamptz, ends_at timestamptz, all_day boolean, task_id uuid,
  visibility text, auto_complete boolean, completed_at timestamptz, location text,
  masked boolean, attendee_ids uuid[], color text
)
language sql stable security definer set search_path = public as $$
  with base as (
    select e.*,
           (e.owner_id = auth.uid()
            or exists (select 1 from public.cal_event_attendees a
                       where a.event_id = e.id and a.user_id = auth.uid())) as involved,
           coalesce((select max(case r.mode when 'private' then 2 else 1 end)
                     from public.cal_privacy_ranges r
                     join public.profiles p on p.id = e.owner_id
                     where r.user_id = e.owner_id
                       and (e.starts_at at time zone coalesce(p.timezone, 'Asia/Manila'))::date
                           between r.starts_on and r.ends_on), 0) as range_mode
    from public.cal_events e
    where e.starts_at < range_end and e.ends_at > range_start
  )
  select b.id, b.owner_id, b.kind,
         case when b.involved or (b.visibility = 'public' and b.range_mode = 0) then b.title else 'Busy' end,
         case when b.involved or (b.visibility = 'public' and b.range_mode = 0) then b.notes end,
         b.starts_at, b.ends_at, b.all_day,
         case when b.involved or (b.visibility = 'public' and b.range_mode = 0) then b.task_id end,
         b.visibility, b.auto_complete, b.completed_at,
         case when b.involved or (b.visibility = 'public' and b.range_mode = 0) then b.location end,
         not (b.involved or (b.visibility = 'public' and b.range_mode = 0)),
         coalesce((select array_agg(a.user_id) from public.cal_event_attendees a where a.event_id = b.id), '{}'),
         case when b.involved or (b.visibility = 'public' and b.range_mode = 0) then b.color end
  from base b
  where public.is_ppm_user()
    and (b.involved or (b.visibility <> 'private' and b.range_mode < 2));
$$;

-- The same callers as before it was made again.
grant execute on function public.cal_team_events(timestamptz, timestamptz) to anon, authenticated, service_role;
