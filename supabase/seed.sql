-- =============================================================================
-- Sample data for the local database. LOCAL ONLY: never run this against the
-- live project. Every date is relative to "today" in Manila, so the demo always
-- looks current. Sign in as any person below with the password rtc-demo-2026.
--
-- The people are RTC's real team; the tasks, comments and calendar entries are
-- made up to show how the PPM works.
-- =============================================================================

create or replace function pg_temp.d(n int) returns date
language sql as $$ select (now() at time zone 'Asia/Manila')::date + n $$;

create or replace function pg_temp.at(n int, t text) returns timestamptz
language sql as $$ select (((now() at time zone 'Asia/Manila')::date + n) + t::time) at time zone 'Asia/Manila' $$;

-- The app's triggers write history and notifications for live changes. The
-- seed writes its own, with past timestamps, so they stay off while it runs.
alter table public.ppm_tasks          disable trigger user;
alter table public.ppm_projects       disable trigger user;
alter table public.ppm_task_comments  disable trigger user;
alter table public.cal_events         disable trigger user;
alter table public.cal_event_attendees disable trigger user;

-- -----------------------------------------------------------------------------
-- People
-- -----------------------------------------------------------------------------
create temp table seed_people (id uuid, email text, name text, role text, title text, seen interval, joined int);
insert into seed_people values
  ('00000000-0000-4000-a000-000000000001', 'kenneth@rtc.test',   'Kenneth Robles',  'super_admin', 'Co-founder and CEO', '25 minutes', -400),
  ('00000000-0000-4000-a000-000000000002', 'christian@rtc.test', 'Christian Panes', 'super_admin', 'Co-founder and COO', '2 hours',    -400),
  ('00000000-0000-4000-a000-000000000003', 'kyan@rtc.test',      'Kyan Lumanog',    'admin',       'Developer',          '5 minutes',  -45),
  ('00000000-0000-4000-a000-000000000004', 'andrei@rtc.test',    'Andrei',          'admin',       null,                 '1 day',      -200),
  ('00000000-0000-4000-a000-000000000005', 'carl@rtc.test',      'Carl',            'staff',       null,                 '3 hours',    -120);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, last_sign_in_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select '00000000-0000-0000-0000-000000000000', p.id, 'authenticated', 'authenticated', p.email,
       extensions.crypt('rtc-demo-2026', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_build_object('full_name', p.name),
       pg_temp.at(p.joined, '09:00'), now(), now() - p.seen,
       '', '', '', '', '', '', '', ''
from seed_people p;

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select p.id::text, p.id,
       jsonb_build_object('sub', p.id::text, 'email', p.email, 'email_verified', true),
       'email', now() - p.seen, pg_temp.at(p.joined, '09:00'), now()
from seed_people p;

insert into public.profiles (id, role, full_name, email, title, timezone, created_at, last_seen_at)
select p.id, p.role, p.name, p.email, p.title, 'Asia/Manila', pg_temp.at(p.joined, '09:00'), now() - p.seen
from seed_people p
on conflict (id) do update set role = excluded.role, full_name = excluded.full_name,
  email = excluded.email, title = excluded.title, last_seen_at = excluded.last_seen_at;

-- -----------------------------------------------------------------------------
-- Projects
-- -----------------------------------------------------------------------------
insert into public.ppm_projects
  (id, name, color, archived, created_by, created_at, description, owner_id, status, kind, client_name, start_date, target_date, default_view)
values
  ('20000000-0000-4000-a000-000000000001', 'Promix Nutrition', '#3992FF', false,
   '00000000-0000-4000-a000-000000000002', pg_temp.at(-62, '10:00'),
   'SEO and GEO for promixnutrition.com, Operator tier. Monthly posts, reporting, and visibility in AI answers.',
   '00000000-0000-4000-a000-000000000002', 'active', 'client', 'Promix Nutrition', pg_temp.d(-62), pg_temp.d(120), 'board'),
  ('20000000-0000-4000-a000-000000000002', 'PPM Revamp', '#5864FF', false,
   '00000000-0000-4000-a000-000000000003', pg_temp.at(-2, '09:00'),
   'Replace the old PPM with a real workspace: tasks people can find, a team calendar, and clear accountability.',
   '00000000-0000-4000-a000-000000000003', 'active', 'internal', null, pg_temp.d(-2), pg_temp.d(28), 'list'),
  ('20000000-0000-4000-a000-000000000003', 'RTC Website', '#0464DD', false,
   '00000000-0000-4000-a000-000000000001', pg_temp.at(-150, '09:00'),
   'roblestech.net, the client portal and their content.',
   '00000000-0000-4000-a000-000000000001', 'active', 'internal', null, pg_temp.d(-150), null, 'list'),
  ('20000000-0000-4000-a000-000000000004', 'Smartsheet Practice', '#2F58A3', false,
   '00000000-0000-4000-a000-000000000001', pg_temp.at(-40, '09:00'),
   'Package Project Management Optimization as a service: the offer, templates and a demo workspace.',
   '00000000-0000-4000-a000-000000000001', 'active', 'internal', null, pg_temp.d(-40), pg_temp.d(45), 'board'),
  ('20000000-0000-4000-a000-000000000005', 'Sales and Outreach', '#16305E', false,
   '00000000-0000-4000-a000-000000000004', pg_temp.at(-90, '09:00'),
   'Pipeline, outreach and proposals.',
   '00000000-0000-4000-a000-000000000004', 'active', 'internal', null, pg_temp.d(-90), null, 'list'),
  ('20000000-0000-4000-a000-000000000006', 'Handbook', '#7C8CA8', false,
   '00000000-0000-4000-a000-000000000002', pg_temp.at(-30, '09:00'),
   'Write and maintain the team handbook.',
   '00000000-0000-4000-a000-000000000002', 'paused', 'internal', null, pg_temp.d(-30), null, 'list'),
  ('20000000-0000-4000-a000-000000000007', 'Q3 Brand Refresh', '#AEE37B', false,
   '00000000-0000-4000-a000-000000000002', pg_temp.at(-80, '09:00'),
   'New colour tokens and social assets for the third quarter.',
   '00000000-0000-4000-a000-000000000002', 'closed', 'internal', null, pg_temp.d(-80), pg_temp.d(-15), 'list');

insert into public.ppm_project_members (project_id, user_id, role, added_by, added_at) values
  ('20000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000002', 'owner',  '00000000-0000-4000-a000-000000000002', pg_temp.at(-62, '10:00')),
  ('20000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000003', 'member', '00000000-0000-4000-a000-000000000002', pg_temp.at(-40, '10:00')),
  ('20000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000003', 'owner',  '00000000-0000-4000-a000-000000000003', pg_temp.at(-2, '09:00')),
  ('20000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000001', 'member', '00000000-0000-4000-a000-000000000003', pg_temp.at(-2, '09:00')),
  ('20000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000001', 'owner',  '00000000-0000-4000-a000-000000000001', pg_temp.at(-150, '09:00')),
  ('20000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000002', 'member', '00000000-0000-4000-a000-000000000001', pg_temp.at(-150, '09:00')),
  ('20000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000003', 'member', '00000000-0000-4000-a000-000000000001', pg_temp.at(-40, '09:00')),
  ('20000000-0000-4000-a000-000000000004', '00000000-0000-4000-a000-000000000001', 'owner',  '00000000-0000-4000-a000-000000000001', pg_temp.at(-40, '09:00')),
  ('20000000-0000-4000-a000-000000000004', '00000000-0000-4000-a000-000000000004', 'member', '00000000-0000-4000-a000-000000000001', pg_temp.at(-40, '09:00')),
  ('20000000-0000-4000-a000-000000000004', '00000000-0000-4000-a000-000000000005', 'member', '00000000-0000-4000-a000-000000000001', pg_temp.at(-40, '09:00')),
  ('20000000-0000-4000-a000-000000000005', '00000000-0000-4000-a000-000000000004', 'owner',  '00000000-0000-4000-a000-000000000004', pg_temp.at(-90, '09:00')),
  ('20000000-0000-4000-a000-000000000005', '00000000-0000-4000-a000-000000000005', 'member', '00000000-0000-4000-a000-000000000004', pg_temp.at(-90, '09:00')),
  ('20000000-0000-4000-a000-000000000005', '00000000-0000-4000-a000-000000000001', 'member', '00000000-0000-4000-a000-000000000004', pg_temp.at(-90, '09:00')),
  ('20000000-0000-4000-a000-000000000006', '00000000-0000-4000-a000-000000000002', 'owner',  '00000000-0000-4000-a000-000000000002', pg_temp.at(-30, '09:00')),
  ('20000000-0000-4000-a000-000000000006', '00000000-0000-4000-a000-000000000001', 'member', '00000000-0000-4000-a000-000000000002', pg_temp.at(-30, '09:00')),
  ('20000000-0000-4000-a000-000000000006', '00000000-0000-4000-a000-000000000004', 'member', '00000000-0000-4000-a000-000000000002', pg_temp.at(-30, '09:00')),
  ('20000000-0000-4000-a000-000000000007', '00000000-0000-4000-a000-000000000002', 'owner',  '00000000-0000-4000-a000-000000000002', pg_temp.at(-80, '09:00')),
  ('20000000-0000-4000-a000-000000000007', '00000000-0000-4000-a000-000000000005', 'member', '00000000-0000-4000-a000-000000000002', pg_temp.at(-80, '09:00'));

-- -----------------------------------------------------------------------------
-- Tasks
-- p: project (1 to 7, 0 = none). a, c, r: assignee, creator, reviewer (1 to 5).
-- due and made: days from today. done: days ago it was finished.
-- -----------------------------------------------------------------------------
create temp table seed_tasks (
  n int, title text, p int, a int, c int, status text, priority text,
  due int, made int, done int, r int, policy text, approvers int[], private boolean, description text
);

insert into seed_tasks values
  (1,  'Post 7: research brief', 1, 2, 2, 'done', 'high', -6, -12, 7, null, 'anyone', null, false,
       'Questions people ask about protein timing, with the sources we trust. Feeds the draft.'),
  (2,  'Post 7: first draft', 1, 2, 2, 'done', 'high', -3, -10, 4, null, 'anyone', null, false, null),
  (3,  'Post 7: fact check and sources', 1, 3, 2, 'in_review', 'high', 0, -6, null, 2, 'reviewer', null, false,
       E'Check every claim in the draft against its source.\n\n- Each statistic links to the original study\n- No claim stronger than its evidence\n- Flag anything Sierra should look at'),
  (4,  'Post 7: convert to Liquid and package', 1, 3, 2, 'todo', 'high', 2, -5, null, null, 'assigner', null, false,
       'Turn the approved HTML into the blog template, run the checks, and package it for Sonny.'),
  (5,  'Post 8: keyword and question research', 1, 2, 2, 'in_progress', 'medium', 3, -4, null, null, 'anyone', null, false, null),
  (6,  'Post 8: outline', 1, 2, 2, 'todo', 'medium', 6, -4, null, null, 'anyone', null, false, null),
  (7,  'September SEO and GEO report', 1, 2, 1, 'in_progress', 'urgent', -1, -9, null, 1, 'specific', array[1], false,
       E'Monthly report for Promix.\n\n1. Search Console numbers for September\n2. AI answer visibility for the 20 priority questions\n3. What we shipped, and what is next'),
  (8,  'Check AI answer visibility for 20 priority questions', 1, 3, 2, 'todo', 'medium', 4, -3, null, null, 'anyone', null, false, null),
  (9,  'Fix missing alt text on Post 5 images', 1, 3, 2, 'done', 'low', -1, -8, 2, null, 'anyone', null, false, null),
  (10, 'Update schema markup for blog posts', 1, 3, 3, 'backlog', 'low', null, -20, null, null, 'anyone', null, false, null),
  (11, 'Prepare the monthly call agenda', 1, 2, 2, 'todo', 'medium', 1, -2, null, null, 'anyone', null, false, null),
  (12, 'Sitemap and indexing check', 1, 3, 2, 'done', 'medium', -8, -14, 9, null, 'anyone', null, false, null),
  (13, 'Theme drift check before handoff', 1, 3, 2, 'done', 'medium', -4, -11, 5, null, 'anyone', null, false, null),
  (14, 'Design system: tokens, type and colour', 2, 3, 3, 'done', 'high', 0, -2, 0, null, 'anyone', null, false, null),
  (15, 'App shell with sidebar and command menu', 2, 3, 3, 'done', 'high', 0, -2, 0, null, 'anyone', null, false, null),
  (16, 'Task views: list, board and calendar', 2, 3, 3, 'in_progress', 'urgent', 0, -2, null, null, 'anyone', null, false,
       E'Every view reads the same tasks, so switching is instant.\n\n- List grouped by status\n- Board with drag and drop\n- Calendar by due date'),
  (17, 'User management: invite, roles, deactivate', 2, 3, 3, 'in_progress', 'high', 1, -2, null, null, 'anyone', null, false, null),
  (18, 'Team calendar with privacy', 2, 3, 3, 'todo', 'high', 3, -2, null, null, 'anyone', null, false, null),
  (19, 'Import data from the old PPM', 2, 3, 3, 'backlog', 'medium', null, -2, null, null, 'anyone', null, false, null),
  (20, 'Demo the new PPM to the team', 2, 3, 1, 'todo', 'urgent', 0, -1, null, 1, 'assigner', null, false,
       'Friday, 2 PM. Show assigning, the task views, the dashboard and the calendar.'),
  (21, 'Decide on Vercel Pro', 2, 1, 3, 'todo', 'medium', 7, -1, null, null, 'anyone', null, false, null),
  (22, 'Make type errors block pull requests', 2, 3, 3, 'backlog', 'low', null, -1, null, null, 'anyone', null, false, null),
  (23, 'Show every date in Manila time', 2, 3, 3, 'done', 'medium', 0, -2, 1, null, 'anyone', null, false, null),
  (24, 'Publish two posts on roblestech.net', 3, 2, 1, 'todo', 'medium', 5, -6, null, null, 'anyone', null, false, null),
  (25, 'Refresh the Services page copy', 3, 2, 1, 'backlog', 'low', null, -25, null, null, 'anyone', null, false, null),
  (26, 'Fix the portal sign-in timeout', 3, 1, 1, 'done', 'high', -9, -16, 10, null, 'anyone', null, false, null),
  (27, 'Upgrade the site to Astro 7', 3, 1, 3, 'done', 'medium', -1, -3, 1, null, 'anyone', null, false, null),
  (28, 'Run the PPM in Singapore', 3, 1, 3, 'done', 'high', -1, -2, 1, null, 'anyone', null, false, null),
  (29, 'Structured data for case studies', 3, 3, 1, 'todo', 'medium', 9, -7, null, null, 'anyone', null, false, null),
  (30, 'Mobile Lighthouse pass', 3, 3, 1, 'in_review', 'medium', -2, -9, null, 1, 'reviewer', null, false, null),
  (31, 'Construction PMO demo workspace', 4, 4, 1, 'in_progress', 'high', 2, -8, null, null, 'anyone', null, false,
       'One realistic project with dates, resources and a status dashboard, so prospects see a working PMO.'),
  (32, 'Resource management template', 4, 5, 1, 'todo', 'medium', 6, -8, null, null, 'anyone', null, false, null),
  (33, 'Smartsheet offer one-pager', 4, 4, 1, 'in_review', 'medium', 1, -6, null, 1, 'reviewer', null, false, null),
  (34, 'Record a five-minute walkthrough', 4, 5, 1, 'backlog', 'low', null, -6, null, null, 'anyone', null, false, null),
  (35, 'Price the implementation package', 4, 1, 1, 'todo', 'high', -2, -10, null, null, 'anyone', null, false, null),
  (36, 'Dashboard template for portfolio status', 4, 4, 1, 'done', 'medium', -3, -12, 3, null, 'anyone', null, false, null),
  (37, 'Collect three PMO case examples', 4, 5, 1, 'done', 'low', -5, -13, 6, null, 'anyone', null, false, null),
  (38, 'Follow up with 15 warm leads', 5, 5, 4, 'in_progress', 'high', 0, -5, null, null, 'not_assignee', null, false,
       'Start with the three from the expo. Log every reply in Salesforce.'),
  (39, 'Cold email sequence for construction firms', 5, 4, 4, 'todo', 'medium', 4, -5, null, null, 'anyone', null, false, null),
  (40, 'Update Salesforce pipeline stages', 5, 4, 4, 'done', 'medium', -2, -9, 2, null, 'anyone', null, false, null),
  (41, 'Refresh the proposal template', 5, 5, 4, 'todo', 'medium', 8, -3, null, null, 'anyone', null, false, null),
  (42, 'Clean up duplicate contacts', 5, 5, 4, 'done', 'low', -1, -6, 1, null, 'anyone', null, false, null),
  (43, 'October outreach report', 5, 4, 4, 'todo', 'medium', 11, -1, null, null, 'anyone', null, false, null),
  (44, 'LinkedIn content calendar for October', 5, 5, 4, 'cancelled', 'low', null, -12, null, null, 'anyone', null, false, null),
  (45, 'Write: monthly client report procedure', 6, 2, 2, 'backlog', 'medium', null, -28, null, null, 'anyone', null, false, null),
  (46, 'Write: onboarding a new client', 6, 1, 2, 'backlog', 'medium', null, -28, null, null, 'anyone', null, false, null),
  (47, 'Review the FAQ answers', 6, 4, 2, 'todo', 'low', 14, -20, null, null, 'anyone', null, false, null),
  (48, 'Submit September timesheet', 0, 5, 5, 'done', 'medium', -1, -3, 1, null, 'anyone', null, false, null),
  (49, 'Renew the roblestech.net domain', 0, 1, 1, 'todo', 'high', 10, -4, null, null, 'anyone', null, false, null),
  (50, 'Book the team offsite venue', 0, 2, 1, 'cancelled', 'low', null, -15, null, null, 'anyone', null, false, null),
  (51, 'Set up Kyan''s GitHub access', 0, 1, 3, 'done', 'medium', -2, -4, 2, null, 'anyone', null, false, null),
  (52, 'Renew passport', 0, 3, 3, 'todo', 'medium', 12, -1, null, null, 'anyone', null, true, null),
  (53, 'Quarterly tax filing documents', 0, 1, 1, 'in_progress', 'high', 3, -7, null, null, 'anyone', null, false, null),
  (54, 'New brand colour tokens', 7, 2, 2, 'done', 'medium', -22, -35, 20, null, 'anyone', null, false, null),
  (55, 'Update social banners', 7, 5, 2, 'done', 'low', -19, -30, 18, null, 'anyone', null, false, null);

create or replace function pg_temp.person(i int) returns uuid language sql as $$
  select case when i is null then null else ('00000000-0000-4000-a000-00000000000' || i)::uuid end $$;
create or replace function pg_temp.task(i int) returns uuid language sql as $$
  select ('10000000-0000-4000-a000-' || lpad(i::text, 12, '0'))::uuid $$;
create or replace function pg_temp.project(i int) returns uuid language sql as $$
  select case when i = 0 then null else ('20000000-0000-4000-a000-00000000000' || i)::uuid end $$;

insert into public.ppm_tasks (
  id, project_id, title, description, status, priority, due_date, assignee_id, created_by,
  created_at, updated_at, completed_at, completed_by, assigned_by, reviewer_id,
  completion_policy, completion_approvers, is_private, sort_order
)
select pg_temp.task(s.n), pg_temp.project(s.p), s.title, s.description, s.status, s.priority,
       case when s.due is null then null else pg_temp.d(s.due) end,
       pg_temp.person(s.a), pg_temp.person(s.c),
       pg_temp.at(s.made, '10:00') + (s.n * interval '7 minutes'),
       case when s.done is null then now() - (s.n * interval '9 minutes')
            when s.done = 0 then now() - (s.n * interval '6 minutes')
            else pg_temp.at(-s.done, '15:00') + (s.n * interval '11 minutes') end,
       case when s.done is null then null
            when s.done = 0 then now() - (s.n * interval '6 minutes')
            else pg_temp.at(-s.done, '15:00') + (s.n * interval '11 minutes') end,
       case when s.status = 'done' then coalesce(pg_temp.person(s.r), pg_temp.person(s.a)) end,
       pg_temp.person(s.c),
       pg_temp.person(s.r),
       s.policy,
       coalesce((select array_agg(pg_temp.person(x)) from unnest(s.approvers) x), '{}'),
       s.private,
       -extract(epoch from pg_temp.at(s.made, '10:00'))
from seed_tasks s
order by s.made, s.n;

-- History, written as it would have happened.
insert into public.ppm_task_events (task_id, actor_id, type, to_status, meta, created_at)
select t.id, t.created_by, 'created', 'todo', jsonb_build_object('title', t.title), t.created_at
from public.ppm_tasks t;

insert into public.ppm_task_events (task_id, actor_id, type, meta, created_at)
select t.id, t.created_by, 'assigned', jsonb_build_object('assignee_id', t.assignee_id), t.created_at + interval '1 minute'
from public.ppm_tasks t where t.assignee_id is not null;

insert into public.ppm_task_events (task_id, actor_id, type, from_status, to_status, created_at)
select t.id, t.created_by, 'status_changed', 'todo', 'backlog', t.created_at + interval '2 minutes'
from public.ppm_tasks t where t.status = 'backlog';

insert into public.ppm_task_events (task_id, actor_id, type, from_status, to_status, created_at)
select t.id, t.assignee_id, 'status_changed', 'todo', 'in_progress',
       t.created_at + (coalesce(t.completed_at, now()) - t.created_at) * 0.35
from public.ppm_tasks t where t.status in ('in_progress', 'in_review', 'done');

insert into public.ppm_task_events (task_id, actor_id, type, from_status, to_status, created_at)
select t.id, t.assignee_id, 'status_changed', 'in_progress', 'in_review',
       t.created_at + (coalesce(t.completed_at, now()) - t.created_at) * 0.7
from public.ppm_tasks t where t.status = 'in_review' or (t.status = 'done' and t.reviewer_id is not null);

insert into public.ppm_task_events (task_id, actor_id, type, from_status, to_status, created_at)
select t.id, t.completed_by,
       'status_changed', case when t.reviewer_id is not null then 'in_review' else 'in_progress' end, 'done', t.completed_at
from public.ppm_tasks t where t.status = 'done';

insert into public.ppm_task_events (task_id, actor_id, type, from_status, to_status, created_at)
select t.id, t.created_by, 'status_changed', 'todo', 'cancelled', t.created_at + interval '3 days'
from public.ppm_tasks t where t.status = 'cancelled';

-- -----------------------------------------------------------------------------
-- Comments and checklists
-- -----------------------------------------------------------------------------
insert into public.ppm_task_comments (task_id, author_id, body, created_at) values
  (pg_temp.task(3),  pg_temp.person(2), 'I added two sources to the draft. Can you check the absorption claim against the study?', now() - interval '5 hours'),
  (pg_temp.task(3),  pg_temp.person(3), 'Checked. The study supports it for whey, not casein, so I narrowed the sentence. Ready for your review.', now() - interval '3 hours'),
  (pg_temp.task(7),  pg_temp.person(1), 'Please include the AI answer numbers this time. Promix asked about them on the last call.', now() - interval '26 hours'),
  (pg_temp.task(7),  pg_temp.person(2), 'Will do. I''m waiting on the last two queries, then it''s ready for you.', now() - interval '20 hours'),
  (pg_temp.task(16), pg_temp.person(1), 'Dragging on the board is the first thing everyone will try.', now() - interval '2 hours'),
  (pg_temp.task(20), pg_temp.person(1), '2 PM works. Show assigning and the calendar first.', now() - interval '3 hours'),
  (pg_temp.task(31), pg_temp.person(1), 'Keep it to one project with realistic dates, so it looks like a real site.', now() - interval '28 hours'),
  (pg_temp.task(33), pg_temp.person(1), 'Looks good. One question on the pricing line, see my note in the doc.', now() - interval '35 minutes'),
  (pg_temp.task(38), pg_temp.person(4), 'Do the three from the expo first. They''re the warmest.', now() - interval '4 hours'),
  (pg_temp.task(35), pg_temp.person(4), 'Two prospects asked for a number this week. Can we have a range by Monday?', now() - interval '30 hours');

insert into public.ppm_task_checklist (task_id, title, done, sort, created_by, created_at) values
  (pg_temp.task(4),  'Convert the HTML to the blog template', true,  1, pg_temp.person(3), now() - interval '2 days'),
  (pg_temp.task(4),  'Check images and alt text',             false, 2, pg_temp.person(3), now() - interval '2 days'),
  (pg_temp.task(4),  'Validate the schema markup',            false, 3, pg_temp.person(3), now() - interval '2 days'),
  (pg_temp.task(4),  'Run the theme check',                   false, 4, pg_temp.person(3), now() - interval '2 days'),
  (pg_temp.task(4),  'Package and send to Sonny',             false, 5, pg_temp.person(3), now() - interval '2 days'),
  (pg_temp.task(17), 'Invite by email',                       true,  1, pg_temp.person(3), now() - interval '1 day'),
  (pg_temp.task(17), 'Change a role',                         true,  2, pg_temp.person(3), now() - interval '1 day'),
  (pg_temp.task(17), 'Deactivate and hand over open tasks',   false, 3, pg_temp.person(3), now() - interval '1 day'),
  (pg_temp.task(17), 'Password reset by email',               false, 4, pg_temp.person(3), now() - interval '1 day'),
  (pg_temp.task(31), 'Project plan sheet',                    true,  1, pg_temp.person(4), now() - interval '5 days'),
  (pg_temp.task(31), 'Resource view',                         true,  2, pg_temp.person(4), now() - interval '5 days'),
  (pg_temp.task(31), 'Status dashboard',                      false, 3, pg_temp.person(4), now() - interval '5 days');

-- -----------------------------------------------------------------------------
-- Calendar: this week's plans
-- -----------------------------------------------------------------------------
create temp table seed_cal (
  id int, owner int, kind text, title text, day int, s text, e text, task int,
  visibility text, auto boolean, completed boolean, attendees int[]
);
insert into seed_cal values
  -- yesterday, ticked off
  (1,  3, 'block',   'Design system tokens',               -1, '09:00', '11:30', 14, 'public',  false, true,  null),
  (2,  3, 'block',   'App shell',                          -1, '13:00', '17:00', 15, 'public',  false, true,  null),
  (3,  2, 'block',   'Post 7 draft edits',                 -1, '09:30', '12:00', 2,  'public',  true,  true,  null),
  (4,  1, 'block',   'Astro 7 upgrade review',             -1, '10:00', '11:00', 27, 'public',  false, true,  null),
  (5,  5, 'block',   'Duplicate contacts clean-up',        -1, '14:00', '16:00', 42, 'public',  true,  true,  null),
  -- today
  (10, 3, 'block',   'Task views: list and board',          0, '09:00', '11:30', 16, 'public',  true,  false, null),
  (11, 3, 'block',   'Prepare the demo',                    0, '13:00', '14:00', 20, 'public',  false, false, null),
  (12, 1, 'meeting', 'RTC meeting: the new PPM',            0, '14:00', '15:00', null, 'public', false, false, array[1,2,3,4,5]),
  (13, 3, 'block',   'User management',                     0, '15:30', '17:30', 17, 'public',  false, false, null),
  (14, 2, 'block',   'September report',                    0, '08:30', '10:00', 7,  'public',  false, false, null),
  (15, 2, 'block',   'Doctor''s appointment',               0, '10:30', '11:30', null, 'busy',  false, false, null),
  (16, 2, 'block',   'Post 8 research',                     0, '16:00', '17:30', 5,  'public',  true,  false, null),
  (17, 1, 'block',   'Price the implementation package',    0, '09:00', '10:00', 35, 'public',  false, false, null),
  (18, 1, 'meeting', 'Smartsheet offer review',             0, '11:00', '12:00', null, 'public', false, false, array[1,4]),
  (19, 4, 'block',   'Construction PMO demo workspace',     0, '09:30', '11:00', 31, 'public',  false, false, null),
  (20, 5, 'block',   'Lead follow-ups',                     0, '10:00', '12:00', 38, 'public',  true,  false, null),
  (21, 5, 'block',   'Personal errand',                     0, '16:00', '17:00', null, 'private', false, false, null),
  -- the rest of the week
  (30, 3, 'block',   'Team calendar',                       1, '10:00', '12:30', 18, 'public',  false, false, null),
  (31, 2, 'block',   'Post 8 outline',                      1, '09:00', '11:00', 6,  'public',  false, false, null),
  (32, 4, 'block',   'Cold email sequence',                 1, '13:00', '15:00', 39, 'public',  false, false, null),
  (33, 3, 'block',   'Convert Post 7 to Liquid',            2, '09:00', '12:00', 4,  'public',  false, false, null),
  (34, 1, 'meeting', 'Weekly planning',                     3, '09:00', '09:45', null, 'public', false, false, array[1,2,3,4,5]),
  (35, 5, 'block',   'Resource management template',        3, '13:00', '16:00', 32, 'public',  false, false, null),
  (36, 2, 'meeting', 'Promix monthly call',                 4, '21:00', '22:00', null, 'public', false, false, array[2,3]);

insert into public.cal_events (id, owner_id, kind, title, starts_at, ends_at, task_id, visibility, auto_complete, completed_at, created_at)
select ('30000000-0000-4000-a000-' || lpad(c.id::text, 12, '0'))::uuid,
       pg_temp.person(c.owner), c.kind, c.title,
       pg_temp.at(c.day, c.s), pg_temp.at(c.day, c.e),
       case when c.task is null then null else pg_temp.task(c.task) end,
       c.visibility, c.auto,
       case when c.completed then pg_temp.at(c.day, c.e) end,
       pg_temp.at(least(c.day, 0) - 1, '18:00')
from seed_cal c;

insert into public.cal_event_attendees (event_id, user_id, response)
select ('30000000-0000-4000-a000-' || lpad(c.id::text, 12, '0'))::uuid, pg_temp.person(x), 'accepted'
from seed_cal c, unnest(c.attendees) x;

-- Kenneth keeps Monday to himself: others see that he's busy, nothing more.
insert into public.cal_privacy_ranges (user_id, starts_on, ends_on, mode)
values (pg_temp.person(1), pg_temp.d(3), pg_temp.d(3), 'busy');

-- -----------------------------------------------------------------------------
-- Inbox
-- -----------------------------------------------------------------------------
insert into public.ppm_notifications (user_id, actor_id, type, task_id, event_id, meta, read_at, created_at) values
  (pg_temp.person(3), pg_temp.person(1), 'comment',  pg_temp.task(16), null, jsonb_build_object('excerpt', 'Dragging on the board is the first thing everyone will try.'), null, now() - interval '2 hours'),
  (pg_temp.person(3), pg_temp.person(1), 'comment',  pg_temp.task(20), null, jsonb_build_object('excerpt', '2 PM works. Show assigning and the calendar first.'), null, now() - interval '3 hours'),
  (pg_temp.person(3), pg_temp.person(1), 'assigned', pg_temp.task(20), null, '{}', null, now() - interval '20 hours'),
  (pg_temp.person(3), pg_temp.person(1), 'meeting',  null, '30000000-0000-4000-a000-000000000012', jsonb_build_object('title', 'RTC meeting: the new PPM'), null, now() - interval '21 hours'),
  (pg_temp.person(3), pg_temp.person(2), 'comment',  pg_temp.task(3),  null, jsonb_build_object('excerpt', 'I added two sources to the draft. Can you check the absorption claim against the study?'), now() - interval '4 hours', now() - interval '5 hours'),
  (pg_temp.person(3), pg_temp.person(2), 'assigned', pg_temp.task(4),  null, '{}', now() - interval '4 days', now() - interval '5 days'),
  (pg_temp.person(3), pg_temp.person(2), 'completed', pg_temp.task(13), null, '{}', now() - interval '5 days', now() - interval '5 days'),
  (pg_temp.person(2), pg_temp.person(3), 'review',   pg_temp.task(3),  null, '{}', null, now() - interval '3 hours'),
  (pg_temp.person(1), pg_temp.person(3), 'review',   pg_temp.task(30), null, '{}', null, now() - interval '1 day'),
  (pg_temp.person(1), pg_temp.person(4), 'review',   pg_temp.task(33), null, '{}', null, now() - interval '2 days'),
  (pg_temp.person(1), pg_temp.person(4), 'comment',  pg_temp.task(35), null, jsonb_build_object('excerpt', 'Two prospects asked for a number this week. Can we have a range by Monday?'), null, now() - interval '30 hours'),
  (pg_temp.person(2), pg_temp.person(1), 'comment',  pg_temp.task(7),  null, jsonb_build_object('excerpt', 'Please include the AI answer numbers this time.'), now() - interval '22 hours', now() - interval '26 hours'),
  (pg_temp.person(5), pg_temp.person(4), 'comment',  pg_temp.task(38), null, jsonb_build_object('excerpt', 'Do the three from the expo first.'), null, now() - interval '4 hours'),
  (pg_temp.person(4), pg_temp.person(1), 'comment',  pg_temp.task(33), null, jsonb_build_object('excerpt', 'Looks good. One question on the pricing line.'), null, now() - interval '35 minutes');

-- Sample notifications are history, not news: nothing to email.
update public.ppm_notifications set emailed_at = created_at;

-- -----------------------------------------------------------------------------
-- Handbook: how to use the new PPM, plus a few shelves still to write
-- -----------------------------------------------------------------------------
insert into public.kb_categories (slug, title, blurb, color, sort)
values ('using-the-ppm', 'Using the PPM', 'How we plan, assign and finish work in the PPM.', '#3992FF', 0)
on conflict (slug) do nothing;

insert into public.kb_articles (category_id, slug, title, summary, body, status, owner, keywords, created_by, updated_by, created_at, updated_at)
select c.id, a.slug, a.title, a.summary, a.body, a.status, a.owner, a.keywords,
       pg_temp.person(3), pg_temp.person(3), now() - interval '1 day', now() - (a.age * interval '1 hour')
from (values
  ('using-the-ppm', 'statuses', 'What each status means', 'Six statuses, one rule each, so everyone reads a board the same way.',
E'Every task has one status. Each one answers a single question: where is this work right now?\n\n| Status | Means | Move it here when |\n|---|---|---|\n| **Backlog** | Worth doing, not planned yet | You capture an idea or a request |\n| **Todo** | Planned and ready to start | It has an owner and you mean to do it soon |\n| **In progress** | Someone is working on it | You start |\n| **In review** | Done, waiting for a check | You need someone to look before it counts |\n| **Done** | Finished and accepted | The work is complete |\n| **Cancelled** | Not doing it | Plans changed; the history stays |\n\n## A few habits that keep the board honest\n\n- Keep **In progress** small. If you have more than three, finish one first.\n- Move a task to **In review** when someone else signs it off. Their name goes in the Reviewer field, and they get a notification.\n- Never delete work you did. Cancel it instead, so the history stays.',
   'ready', 'Kyan', 'status board kanban backlog todo review done cancelled', 2),
  ('using-the-ppm', 'assigning-work', 'Assigning work', 'Give every task one owner, and see who has room before you do.',
E'A task has exactly one assignee: the person who will move it to done. If two people share the work, split it into two tasks.\n\n## How to assign\n\n1. Open the task, or hover over it in a list.\n2. Choose **Assignee**. The list shows how many open and overdue tasks each person has, so you can see who has room.\n3. The person gets a notification in their inbox straight away.\n\nIn a list, move to a task with **J** and **K** and press **I** to assign it to yourself.\n\n## When the work changes hands\n\nReassign the task. The history keeps who had it before, and both people are notified.',
   'ready', 'Kyan', 'assign assignee owner workload reassign', 3),
  ('using-the-ppm', 'who-can-mark-done', 'Who can mark a task done', 'Each task can say who signs it off: anyone, someone other than the assignee, the assigner, the reviewer, or chosen people.',
E'Some work is finished when the person doing it says so. Some needs a second pair of eyes. Each task carries its own rule, under **Sign-off** in the task panel.\n\n| Rule | Who can mark it done |\n|---|---|\n| Anyone | Anyone on the team, including the assignee. This is the default |\n| Not the assignee | Anyone except the person doing the work |\n| The assigner | Only the person who assigned it |\n| The reviewer | Only the person named as reviewer |\n| Chosen people | Only the people you pick |\n\nAdmins can always sign a task off, so nothing gets stuck when someone is away.\n\nIf you can''t mark a task done, move it to **In review**. The right person is notified.',
   'ready', 'Kyan', 'done complete sign off review approval accountability', 4),
  ('using-the-ppm', 'planning-your-day', 'Planning your day on the calendar', 'Block time for your tasks, see the team''s day, and keep private things private.',
E'The calendar replaces the schedule we used to post in the group chat.\n\n## Plan your day\n\n- Drag across the day to block time. Link the block to a task, or just give it a name.\n- Tasks with a due date appear at the top of that day. Nothing else appears unless you put it there.\n- Meetings you''re invited to appear on your calendar automatically.\n\n## Who sees what\n\nEach block has a visibility:\n\n- **Public:** the team sees the title and the time.\n- **Busy:** the team sees that you''re busy, not what it is.\n- **Private:** only you see it.\n\nYou can also hide a whole day or week, as busy or private.\n\n## Ticking it off\n\nTick a block when you''ve done it. Or turn on **Tick off automatically** and it marks itself done when its time has passed.',
   'ready', 'Kyan', 'calendar schedule block meeting privacy busy private', 5),
  ('using-the-ppm', 'keyboard-shortcuts', 'Keyboard shortcuts', 'Everything you do often has a key.',
E'| Key | Does |\n|---|---|\n| **Cmd K** or **Ctrl K** | Search and run any command |\n| **C** | Create a task |\n| **G** then **H** | Go home |\n| **G** then **T** | Go to tasks |\n| **G** then **P** | Go to projects |\n| **G** then **C** | Go to the calendar |\n| **J** and **K** | Move down and up a list |\n| **Enter** | Open the selected task |\n| **Esc** | Close the panel |\n\nPress **?** anywhere to see this list.',
   'ready', 'Kyan', 'keyboard shortcuts keys hotkeys command', 6),
  ('using-the-ppm', 'private-tasks', 'Private tasks', 'Use the PPM as your own to-do list too.',
E'Turn on **Private** when you create a task, and only you and its assignee can see it. It still shows on your dashboard and calendar.\n\nOnly the person who created a task can make it private or public again.',
   'ready', 'Kyan', 'private personal todo hidden', 7),
  ('standard-procedure', 'monthly-client-report', 'Monthly client report', 'How we put together and send each client''s monthly report.', '', 'needed', 'Christian', 'report monthly client', 30),
  ('standard-procedure', 'onboarding-a-new-client', 'Onboarding a new client', 'From signed contract to first deliverable.', '', 'needed', 'Kenneth', 'onboarding client kickoff', 30),
  ('seo-geo', 'blog-post-production', 'Producing a blog post', 'Research, writing, checks and publishing, step by step.', '', 'draft', 'Christian', 'blog post seo geo writing', 40),
  ('smartsheet', 'pmo-demo-workspace', 'The PMO demo workspace', 'What''s in the demo and how to walk a prospect through it.', '', 'needed', 'Andrei', 'smartsheet pmo demo', 50)
) as a(cat, slug, title, summary, body, status, owner, keywords, age)
join public.kb_categories c on c.slug = a.cat
on conflict (slug) do nothing;

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public) values ('avatars', 'avatars', false) on conflict (id) do nothing;
  end if;
end $$;

-- Two that repeat: the Promix AI check every week, the call agenda every month.
update public.ppm_tasks set repeat = 'weekly'  where title = 'Check AI answer visibility for 20 priority questions';
update public.ppm_tasks set repeat = 'monthly' where title = 'Prepare the monthly call agenda';

alter table public.ppm_tasks          enable trigger user;
alter table public.ppm_projects       enable trigger user;
alter table public.ppm_task_comments  enable trigger user;
alter table public.cal_events         enable trigger user;
alter table public.cal_event_attendees enable trigger user;
