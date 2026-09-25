-- ============================================================================
-- PPM migration — knowledge base
-- Run once in the Supabase SQL editor, in the SAME project as the rest of PPM.
-- Safe to re-run: every statement is idempotent and the seed is ON CONFLICT
-- DO NOTHING, so running it twice will not duplicate or overwrite edits made
-- in the admin centre.
-- ============================================================================

-- Categories are data, not code, because the team needs to add and rename them
-- without a deploy. `sort` orders them on the hub; `color` is the card colour
-- in the nav and the accent on the category page.
create table if not exists public.kb_categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  title      text not null,
  blurb      text,
  color      text not null default '#032C7C',
  sort       int  not null default 100,
  created_at timestamptz not null default now()
);

-- Topics are an optional second axis inside a category. A category with no
-- topics renders flat, which is what most of them will be.
create table if not exists public.kb_topics (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid references public.kb_categories(id) on delete cascade,
  slug        text not null,
  title       text not null,
  sort        int  not null default 100,
  unique (category_id, slug)
);

create table if not exists public.kb_articles (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid references public.kb_categories(id) on delete set null,
  topic_id    uuid references public.kb_topics(id) on delete set null,
  slug        text not null unique,
  title       text not null,
  summary     text,
  -- Markdown. Rendered server-side; raw HTML is not passed through.
  body        text not null default '',
  -- ready | draft | needed. A knowledge base that mixes settled procedure with
  -- plausible guesses is worse than an empty one, so every article says which
  -- it is and the UI shows it.
  status      text not null default 'draft' check (status in ('ready','draft','needed')),
  owner       text,
  -- Extra words people would search for, beyond title and summary.
  keywords    text,
  created_by  uuid references auth.users(id) on delete set null,
  updated_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists kb_articles_category_idx on public.kb_articles (category_id);
create index if not exists kb_articles_status_idx   on public.kb_articles (status);

-- Full-text search across everything that matters, so one box finds an article
-- by its title, its summary, its keywords or a phrase in the body.
alter table public.kb_articles
  add column if not exists search tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')),   'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(keywords, '')),'B') ||
    setweight(to_tsvector('english', coalesce(body, '')),    'C')
  ) stored;
create index if not exists kb_articles_search_idx on public.kb_articles using gin (search);

-- Row level security ---------------------------------------------------------
-- Reads: any internal PPM account. Writes: admins only, and they go through
-- the API with the service role anyway. Clients are already refused by the
-- app's middleware; this is the second lock, on the data itself.
alter table public.kb_categories enable row level security;
alter table public.kb_topics     enable row level security;
alter table public.kb_articles   enable row level security;

create or replace function public.is_ppm_user() returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('super_admin','admin','staff')
  );
$$;

drop policy if exists kb_cat_read on public.kb_categories;
create policy kb_cat_read on public.kb_categories for select using (public.is_ppm_user());
drop policy if exists kb_top_read on public.kb_topics;
create policy kb_top_read on public.kb_topics for select using (public.is_ppm_user());
drop policy if exists kb_art_read on public.kb_articles;
create policy kb_art_read on public.kb_articles for select using (public.is_ppm_user());


-- Seed: categories ------------------------------------------------------------
--
-- The shelves from the RTC Knowledge Base Categories document, in its order.
-- "Service Lines" and "Tools" are headings in that document rather than shelves
-- of their own: they carry no description, and their children are what articles
-- are filed under, so the children appear here and the headings do not.
--
-- do nothing on conflict, so re-running this never overwrites a title, blurb or
-- colour someone has since edited in the admin centre.

insert into public.kb_categories (slug, title, blurb, color, sort) values ('faq', 'FAQ', 'Quick answers to common questions from clients, prospects, and the team about RTC''s services, process, and reporting.', '#0464DD', 1) on conflict (slug) do nothing;
insert into public.kb_categories (slug, title, blurb, color, sort) values ('marketing-sales', 'Marketing & Sales', 'Outreach playbooks, cold email frameworks, talk tracks, objection handling, and positioning guidance for winning new clients.', '#032C7C', 2) on conflict (slug) do nothing;
insert into public.kb_categories (slug, title, blurb, color, sort) values ('cost-guidelines', 'Cost Guidelines', 'Current pricing, retainer tiers, discounts, referral fees, and approval rules for quotes and proposals.', '#0464DD', 3) on conflict (slug) do nothing;
insert into public.kb_categories (slug, title, blurb, color, sort) values ('standard-procedure', 'Standard Procedure', 'Step-by-step SOPs for recurring work, from prospecting and audits to content production and client delivery.', '#2F58A3', 4) on conflict (slug) do nothing;
insert into public.kb_categories (slug, title, blurb, color, sort) values ('seo-geo', 'SEO & GEO', 'Everything on improving client visibility in Google and AI answer engines like ChatGPT, Gemini, and Perplexity.', '#16305E', 5) on conflict (slug) do nothing;
insert into public.kb_categories (slug, title, blurb, color, sort) values ('smartsheet', 'Smartsheet', 'Implementation, consulting, and build guidance for Smartsheet solutions, especially construction and PMO environments.', '#3992FF', 6) on conflict (slug) do nothing;
insert into public.kb_categories (slug, title, blurb, color, sort) values ('automation', 'Automation', 'Workflow and AI-assisted automations that cut manual work across client operations and systems.', '#3992FF', 7) on conflict (slug) do nothing;
insert into public.kb_categories (slug, title, blurb, color, sort) values ('web-development', 'Web Development', 'Website builds, restructuring, and technical setup for client sites, including Shopify and standard hosting.', '#032C7C', 8) on conflict (slug) do nothing;
insert into public.kb_categories (slug, title, blurb, color, sort) values ('advisory', 'Advisory', 'Strategic consulting on digital operations, tools, and growth for clients who need guidance beyond a single service.', '#2F58A3', 9) on conflict (slug) do nothing;
insert into public.kb_categories (slug, title, blurb, color, sort) values ('claude', 'Claude', 'How RTC uses Claude across departments, covering Projects, skills, prompts, and workflows for marketing, finance, legal, and development work.', '#16305E', 10) on conflict (slug) do nothing;
insert into public.kb_categories (slug, title, blurb, color, sort) values ('salesforce', 'Salesforce', 'How RTC runs its CRM, covering pipelines, campaign lines, custom fields, imports, email outreach, and this knowledge base.', '#0464DD', 11) on conflict (slug) do nothing;
insert into public.kb_categories (slug, title, blurb, color, sort) values ('outlook', 'Outlook', 'How RTC uses Outlook for email and calendars, covering mailbox setup, shared inboxes, signatures, scheduling, and email etiquette for client and prospect communication.', '#2F58A3', 12) on conflict (slug) do nothing;
insert into public.kb_categories (slug, title, blurb, color, sort) values ('teams', 'Teams', 'How RTC uses Microsoft Teams for internal communication, covering channels, chats, meetings, file sharing, and guidelines for collaborating with the team and clients.', '#3992FF', 13) on conflict (slug) do nothing;

-- Topics are a second grouping inside a category. None are seeded: the handbook
-- files articles straight onto a shelf, and an unused sub-level only shows up
-- as stale options in the article editor.

-- Articles ---------------------------------------------------------------------
--
-- None are seeded, on purpose. The handbook's content is written and edited in
-- the admin centre by the people who keep it current, which is the whole reason
-- articles live in the database rather than in files. Seeding a set here would
-- mean a deploy could resurrect content someone had deliberately removed.
--
-- The live handbook's articles come from the RTC Knowledge Base document and
-- are authored at /admin/kb.

-- ────────────────────────────────────────────────────────────────────────────
-- Was this article helpful?
--
-- One row per person per article, so a second vote replaces the first rather
-- than stacking. The point is not a score: it is to surface which articles are
-- failing the people who actually had to use them, which is why the vote is
-- attributed rather than anonymous — an admin can go and ask.
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.kb_feedback (
  article_id uuid not null references public.kb_articles(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  helpful    boolean not null,
  created_at timestamptz not null default now(),
  primary key (article_id, user_id)
);

create index if not exists kb_feedback_article_idx on public.kb_feedback (article_id);

alter table public.kb_feedback enable row level security;

drop policy if exists kb_feedback_read on public.kb_feedback;
create policy kb_feedback_read on public.kb_feedback
  for select using (public.is_ppm_user());

-- You may only write your own vote, whatever the request body claims.
drop policy if exists kb_feedback_insert on public.kb_feedback;
create policy kb_feedback_insert on public.kb_feedback
  for insert with check (public.is_ppm_user() and user_id = auth.uid());

drop policy if exists kb_feedback_update on public.kb_feedback;
create policy kb_feedback_update on public.kb_feedback
  for update using (public.is_ppm_user() and user_id = auth.uid())
  with check (public.is_ppm_user() and user_id = auth.uid());
