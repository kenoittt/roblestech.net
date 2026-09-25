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

-- Seed: the articles written when the handbook was first built -----------------
insert into public.kb_articles (category_id, topic_id, slug, title, summary, body, status, owner, keywords)
select c.id, null, 'start-here', 'How This Handbook Works', 'Who can read it, what the status labels mean, and how to add an article.', '## Who can see this

Everyone signed in to PPM, and nobody else. PPM''s middleware refuses any account
whose role is not `super_admin`, `admin` or `staff` before a page renders, so a
client account cannot reach the handbook even with a direct link. Every page also
carries `noindex, nofollow`, so it never turns up in search.

That said: write as though a client could read it. Not because they can, but
because internal notes have a way of being pasted into an email eventually.

## What the status labels mean

A knowledge base that mixes settled procedure with plausible guesses is worse
than an empty one, because nobody can tell which is which and the guesses get
followed anyway. So every article says what it is.

| Label | What it means |
| --- | --- |
| **Ready** | Written from something verifiable: a shipped SOP, the brand voice guide, or how a tool actually behaves. Follow it. |
| **Draft — has gaps** | The structure and the parts we know. Gaps are marked inline with **[Needs input]**. Usable, but read the gaps first. |
| **Not written yet** | The article exists so the gap is visible instead of forgotten. |

If you follow an article and it turns out to be wrong, that is a bug in the
article. Fix it in the same sitting.

## Adding or editing an article

Two steps, both in the `ppm/` app:

1. Write or edit the markdown in `src/pages/kb/<slug>.md`. Keep the frontmatter
   that points at the layout.
2. Add or update the matching row in `src/lib/kb.ts`.

The row is what the hub, the search and the "more in this section" list all read
from, so an article without one will not be findable even though its URL works.
A row without a file gives a 404. Ship both.

## House style for these pages

Follow **How RTC Sounds** for anything a client will see. For the handbook
itself, three things matter more than polish:

- **Say what to do, in order.** A procedure is a list of steps, not a paragraph
  about the steps.
- **Mark what you do not know.** Start a new line with the marker, then the
  question: `**[Needs input]** — <the question>`. It has to open the line,
  because that is what the article-status check looks for. An honest gap gets
  filled; a confident guess gets followed off a cliff.
- **Name the source of truth.** If a number lives somewhere else, link to that
  place instead of copying it here. Copied numbers go stale, and the handbook
  is the last place anyone thinks to check.
', 'ready', 'Ops', 'intro onboarding new starter contribute edit add article status'
from public.kb_categories c
where c.slug = 'marketing-sales' on conflict (slug) do nothing;
insert into public.kb_articles (category_id, topic_id, slug, title, summary, body, status, owner, keywords)
select c.id, null, 'brand-voice', 'How RTC Sounds', 'The hard rules for anything written as the company. Applies to email, decks, captions and proposals.', 'These apply to everything published as the company: cold email, replies,
proposals, decks, captions, one-pagers, website copy. They are rules, not
preferences. If a draft breaks one, fix it before it goes out.

## The hard rules

1. **Speak as "we".** Company copy is never "I", unless the piece is explicitly
   signed by a named person.
2. **Never write "affordable" or "cheap".** The claim is enterprise quality with
   a smarter cost profile. Cost is a fact you state with a number, not an
   adjective you lean on.
3. **Never write "jack of all trades".** Say "one embedded partner, six service
   lines, real expertise in each".
4. **No em dashes or en dashes.** Restructure with a period, a comma or a colon.
5. **No invented numbers, clients or outcomes.** Every figure traces to the
   offer stack or the social proof reference. If it is not documented, do not
   write it, ask.
6. **No stacked buzzwords.** Banned: leverage synergies, best-in-class,
   cutting-edge, revolutionize, unlock, game-changer, move the needle, and
   "seamless" unless you mean a literal integration.
7. **Problem, then impact, then what we give them, then what to do next.** Open
   on the reader''s situation, never on a company introduction.
8. **Plain verbs.** Protect, reduce, remove, connect, build, scale, redesign,
   reinvent, refocus, prove, ship. Not facilitate, empower, optimize
   (unless literal) or transform (unless a concrete build is attached).
9. **One idea per sentence.** Break anything running past two clauses.
10. **A price is always paired with what it buys.** Never introduce a number
    with "cost", "expense" or an apology like "it''s only".
11. **CTAs are specific and low pressure.** "Book a free 30-minute discovery
    call." Never "act now" or "limited spots".
12. **Title Case every subject line, document title and section header.**

## The register

The bar: an RTC document should sit next to a Deloitte brief without looking out
of place. Declarative, evidence-led, restrained.

- Subject lines state the finding. *"AI Visibility Gap Report: What We Found"*,
  not *"You Won''t Believe What We Found"*.
- No emoji and no exclamation points above the level of a social caption.
- Long-form gets structure: a short summary up top, clear headings, a close with
  next steps. A reader should follow the argument from the headings alone.

## The two audiences

| | Their pain | Open with |
| --- | --- | --- |
| **DTC brands** (primary) | Invisibility in AI answers | "When your customers ask ChatGPT which brand to buy, are you the answer they get?" |
| **B2B SaaS / ops teams** | Manual work, disconnected tools, no real-time visibility | "Your team spends hours re-keying data that should flow automatically." |

Different entry pain, same closing promise.

## Where the current numbers live

Do not copy prices into emails from memory or from here. The live figures are
defined once, in `src/data/offers.ts` on the website repo, and every public page
renders from it. Check the service page you are quoting:

- GEO + SEO: <https://roblestech.net/services/geo>
- Smartsheet: <https://roblestech.net/services/smartsheet>
- Everything else: <https://roblestech.net/services>
', 'ready', 'Marketing', 'voice tone writing style rules em dash affordable buzzwords title case'
from public.kb_categories c
where c.slug = 'marketing-sales' on conflict (slug) do nothing;
insert into public.kb_articles (category_id, topic_id, slug, title, summary, body, status, owner, keywords)
select c.id, null, 'cold-outreach', 'Cold Outreach', 'The shape of a first-touch email, what goes in the subject line, and what never does.', 'Follow [How RTC Sounds](/kb/brand-voice) first. Everything below assumes it.

## The shape

Under 150 words. One CTA. Open on their situation, never on us.

1. **Their problem**, named specifically enough that it could not be a mail merge.
2. **The impact** of that problem on their business.
3. **What we give them**, in one sentence.
4. **One next step**, low pressure.

## Subject lines

Title Case, declarative, no curiosity gap. Firm-grade, not hooky.

| Not this | This |
| --- | --- |
| quick question about your seo | A Question About Your AI Search Visibility |
| you won''t believe this stat | What 20 AI Search Queries Revealed About [Category] |
| new: the gap report is here!! | Introducing the AI Visibility Gap Report |

## The two openers

- **DTC brand:** "When your customers ask ChatGPT which brand to buy, are you the answer they get?"
- **B2B SaaS / ops:** "Your team spends hours re-keying data that should flow automatically."

## The offer to lead with

For DTC, lead with the [Gap Report](/kb/gap-report-call): free, ten queries,
three engines, theirs to keep, walked through on a 20-minute call. It is the
lowest-risk thing we have and it is the reason the page exists.

Do not quote retainer prices in a first touch. If they ask, send the
[service page](https://roblestech.net/services/geo).

**[Needs input]** — The sequence: how many touches, how many days apart, and
when a prospect goes back in the pool.

**[Needs input]** — Which sending tool and mailbox, and the daily send cap.

**[Needs input]** — How a reply gets logged in Salesforce, and by whom.
', 'draft', 'Sales', 'cold email outbound prospecting first touch subject line sequence'
from public.kb_categories c
where c.slug = 'marketing-sales' on conflict (slug) do nothing;
insert into public.kb_articles (category_id, topic_id, slug, title, summary, body, status, owner, keywords)
select c.id, null, 'replies-and-followups', 'Replies and Follow-ups', 'Answering an inbound, chasing a quiet thread, and handling the four objections we actually get.', '## Answering an inbound

Match their length. A three-line enquiry gets a three-line answer, not a
brochure. Never re-pitch what they have already read.

One concrete next step at the end. Not two.

## Chasing a quiet thread

**[Needs input]** — Cadence and how many attempts before we stop. Write down
what we actually do, not what we intend to do.

Whatever the cadence is, each follow-up has to carry something new: a finding, a
relevant example, a change on their site. A follow-up whose only content is
"just bumping this" teaches people to ignore us.

## The objections we actually get

**[Needs input]** — This is the section worth the most and I do not have it.
Whoever is on the phone: write the four or five you hear repeatedly and the
answer that has worked. Keep the answer to three sentences.

Two that the website already answers, so the reply is a link and a line:

- **"Can you guarantee we''ll get cited?"** No, and we say so publicly. Nobody can.
  What we guarantee is the tracking, so you see exactly when and where movement
  happens.
- **"What happens after the minimum term?"** Month to month. Stay because the
  citations are moving, not because a contract says so.

## What never goes in a reply

- A price from memory. Open the [service page](https://roblestech.net/services).
- A promise about ranking or citation outcomes.
- Urgency language. We do not close that way.
', 'draft', 'Sales', 'reply follow up objection handling nurture inbound response'
from public.kb_categories c
where c.slug = 'marketing-sales' on conflict (slug) do nothing;
insert into public.kb_articles (category_id, topic_id, slug, title, summary, body, status, owner, keywords)
select c.id, null, 'gap-report-call', 'The 20-Minute Gap Report Call', 'What we promise on the website, what the call covers, and what has to be true before you book it.', '## What the website promises

Read this first, because it is what the prospect has already been told and we
have to match it. From `/services/geo` and the request modal:

> A 10-query diagnostic across ChatGPT, Gemini and Perplexity, with a screenshot
> of every place your brand goes invisible and a clear roadmap if you decide to
> fix it. We walk you through it on a 20-minute call. The report is yours to keep
> either way.

Four commitments in that paragraph, and all four are load-bearing:

1. **Free.** No card, no trial, no "free for qualified brands".
2. **10 queries, three engines.** Not "up to". Ten.
3. **20 minutes.** A cap, not an estimate. Ending early is fine; running to 45 is
   a broken promise.
4. **Yours to keep either way.** They get the report whether or not they buy,
   and whether or not they take the call.

The page used to say "no sales call required to receive it". It no longer does,
because the call is now part of the offer. Do not reintroduce that line anywhere.

## Where the request arrives

Both routes create the same Salesforce lead, tagged `lead_source = Gap Report`:

- **The modal** on `/services/geo` (all four CTAs open it).
- **The contact form** at `/contact?request=gap-report`, which is what the same
  CTAs fall back to without JavaScript.

The lead''s description carries the website and what they sell, in this shape:

```
I''d like the free AI Visibility Gap Report.

Website: examplebrand.com
What we sell: Creatine and protein
```

## Before you book the call

The report has to exist first. The call is a walkthrough, not a discovery
session, and turning up without the findings wastes the one commitment we made.

- [ ] Run the 10 queries across ChatGPT, Gemini and Perplexity
- [ ] Screenshot every answer, including the ones where they do appear
- [ ] Note which competitors are being named instead
- [ ] Write the roadmap: what we would fix, in what order
- [ ] Send the report **before** the call, not on it

**[Needs input]** — Which 10 queries, and how we choose them per brand. There is
a method here and it is not written down. Whoever runs these, write it up.

**[Needs input]** — Where the finished reports are stored, and under what naming
convention.

## Running the 20 minutes

A suggested shape, to be replaced once we have run enough of these to know
better:

| Minutes | What |
| --- | --- |
| 0–2 | What the report is, and that it is theirs regardless |
| 2–10 | The findings. Screenshots, not summary. Let the gaps speak. |
| 10–15 | Who is being cited instead, and why |
| 15–18 | The roadmap, in order, with what each step buys |
| 18–20 | One next step, offered once |

**[Needs input]** — Confirm this shape, or replace it with what actually works.

## What not to do

- Do not extend past 20 minutes without asking. "We''re at time, do you want to
  keep going or shall I follow up?" is the whole move.
- Do not gate the report on the call. They keep it either way, and we said so.
- Do not quote a retainer price from memory. Open the
  [service page](https://roblestech.net/services/geo) if it comes up.
- Do not promise citations. The site is explicit that nobody can guarantee them.

## After the call

**[Needs input]** — The follow-up: what gets sent, when, and what the lead
status becomes in Salesforce.
', 'draft', 'Sales', 'gap report call walkthrough 20 minutes ai visibility diagnostic booking'
from public.kb_categories c
where c.slug = 'marketing-sales' on conflict (slug) do nothing;
insert into public.kb_articles (category_id, topic_id, slug, title, summary, body, status, owner, keywords)
select c.id, null, 'discovery-calls', 'Discovery Calls', 'The 30-minute discovery call: agenda, what to capture, and what happens in the 48 hours after.', '**[Needs input]** — This whole article.

What it needs to cover, so whoever writes it knows the shape:

- The booking link, and what the prospect sees when they book.
- How long the call is, and what we open with.
- What has to be captured during it, and where it gets written down.
- How the call ends: what we commit to, and by when.
- The 48-hour fixed-price proposal we advertise. What produces it, and who sends it.
- When a discovery call is the wrong call, and the
  [Gap Report walkthrough](/kb/gap-report-call) is the right one instead.

Until this exists, the Gap Report call is the only call flow that is written
down, and it is a different thing: a walkthrough of findings we have already
sent, capped at 20 minutes.
', 'needed', 'Sales', 'discovery call agenda qualification notes proposal 48 hours calendly'
from public.kb_categories c
where c.slug = 'marketing-sales' on conflict (slug) do nothing;
insert into public.kb_articles (category_id, topic_id, slug, title, summary, body, status, owner, keywords)
select c.id, null, 'ops-content-pipeline', 'Per-Post Production', 'The ten gated steps from keyword brief to publish, and who signs off on each.', 'Ten steps, run **one at a time**, each one stopping for approval before the next
begins. The gate is the point: a draft that skips the evidence map produces a
post nobody can defend, and by then the work is done.

## The ten steps

1. **Keyword brief**
2. **Evidence map** — every claim traced to a raw source
3. **Outline**
4. **Draft**
5. **Citation structuring**
6. **Schema markup**
7. **Internal links**
8. **QA report**
9. **Client review** — the document they sign off on
10. **Publish**

Steps 1 to 8 are ours. Step 9 is the client''s. Step 10 happens only after 9.

## What each tier gets

This differs by tier, and the [service page](https://roblestech.net/services/geo)
is the source of truth. In outline: Foundation gets the brief, evidence map and
QA report; Engine adds the client review document for sign-off; Operator adds a
priority queue.

Do not quote volumes or prices from memory. The comparison matrix on that page
is the current answer.

## Then what

Publishing is not the end. The moment it is live, run the
[Post-Publish SOP](/kb/ops-post-publish). Live and found are different things.

**[Needs input]** — Where the per-post artefacts are stored (brief, evidence
map, QA report, review document) and the naming convention.

**[Needs input]** — Who approves each gate for each client.
', 'draft', 'Delivery', 'content pipeline sop per post production brief evidence map draft qa review publish'
from public.kb_categories c
where c.slug = 'marketing-sales' on conflict (slug) do nothing;
insert into public.kb_articles (category_id, topic_id, slug, title, summary, body, status, owner, keywords)
select c.id, null, 'ops-post-publish', 'Post-Publish SOP', 'The seven checks that run the moment a post goes live. Live is not the same as found.', 'Run this the moment a post goes live. A post being *live* is not the same as
being *found*. The order matters: conversion before SEO, discovery before
tracking. Tag each item **[Confirmed]** or **[Verify in source]**.

## The seven steps

1. **Confirm it is live and correct, from View Source.** Title, a single H1,
   meta description, every internal link resolving, images and alt text. **The
   Book a Call CTA has a real `href`** — not empty, not `#`. Conversion check
   first, SEO second.
2. **Wire it into the cluster.** Homepage and blog index to the new post; the
   new post to Services and Book a Call; the new post and its siblings linked
   both ways. Push live.
3. **Add it to `sitemap.xml`** with `lastmod` set to today, and commit. URLs
   must match the canonical.
4. **Request indexing in GSC.** URL Inspection, then Request Indexing.
5. **Validate the schema** at validator.schema.org. Zero errors. Skip only if
   the post has no schema by design.
6. **Run the GEO checks.** Confirm `robots.txt` is not blocking the path and AI
   crawlers are allowed. Capture the AI-visibility baseline: ask ChatGPT, Claude,
   Perplexity and Gemini the post''s core question and log the honest "before".
7. **Register the post for tracking.** Add it to the client''s dashboard
   (pipeline entry plus the URL for GSC tracking) and record the AI baseline
   across all four engines.

## Done means

The CTA works, the schema validates or there is none by design, and the post is
registered in the dashboard with its AI baseline captured.

Anything less is not done, including "it is live and looks fine".

## Where this connects

Step 7 is the one that touches another tool. Adding the URL to the pipeline in
the client portal is what makes the post appear on the **Blog performance** tab;
until it has a URL there, it is listed as untracked. See
[Client Portal](/kb/tools-portal).

The numbers will read zero for a few days after registering. Search Console lags
two to three days and a new post takes longer than that to pick up impressions.
That is expected and the dashboard says so; it is not a tracking fault.

## Source

The framework version lives at `portal/docs/post-publish-sop.md`. The full
version is `post-publish-sop.pdf`. Save each run as its own checklist file.
', 'ready', 'Delivery', 'post publish sop indexing sitemap schema gsc cluster wiring ai baseline'
from public.kb_categories c
where c.slug = 'marketing-sales' on conflict (slug) do nothing;
insert into public.kb_articles (category_id, topic_id, slug, title, summary, body, status, owner, keywords)
select c.id, null, 'ops-reporting', 'Client Reporting', 'What lands in a client dashboard, when it refreshes, and what to do when a number looks wrong.', '## What a client sees

Their dashboard at `portal.roblestech.net`, which is a live page, not a PDF sent
monthly. Tabs: Overview, Baseline, Performance, Blog performance, Trends and
log, SOP status, AI visibility, Open items. Some clients also get a Service
pages tab.

Which tabs a client gets depends on their tier. Foundation is a monthly
scorecard PDF rather than live access; Engine and Operator get the live
dashboard, and Operator adds an executive summary. Check the
[service page](https://roblestech.net/services/geo) rather than promising from
memory.

## When the numbers refresh

- **Automatically, once a day**, at 11:00 UTC.
- **On demand** via the refresh endpoint for a single client, when you need it
  sooner.

Search Console itself lags two to three days, and the pull deliberately ends its
window two days back so it is not reading half-finalised data.

## "This number looks wrong"

Work through it in this order before escalating:

1. **Is the post registered?** A pipeline row with no URL cannot be matched
   against Search Console and is listed as untracked, not as zero.
2. **How new is it?** A post published this week reads zero. That is expected
   and the dashboard says so on the page.
3. **When was the last pull?** The dashboard shows the pull date. If it is
   stale, the refresh failed rather than the numbers being wrong.
4. **Does the path match?** Matching is on path only, and it is exact. A
   trailing slash difference is fine; a different slug is not.

**[Needs input]** — Who to escalate to when all four check out.

**[Needs input]** — The monthly rhythm: what we send, on what day, and who
writes the commentary that goes with it.
', 'draft', 'Delivery', 'reporting dashboard gsc refresh monthly scorecard cadence numbers wrong'
from public.kb_categories c
where c.slug = 'marketing-sales' on conflict (slug) do nothing;
insert into public.kb_articles (category_id, topic_id, slug, title, summary, body, status, owner, keywords)
select c.id, null, 'tools-ppm', 'PPM (This Tool)', 'Board, tasks, calendar and activity. What each view is for and who can see what.', 'Project management and this handbook, in one place, at `ppm.roblestech.net`.

## Who can get in

Only `super_admin`, `admin` and `staff`. The check runs in middleware before any
page renders, so a client account is refused everywhere, including here. That is
why the handbook lives in PPM rather than in the client portal: the portal is
somewhere clients legitimately sign in, and internal notes there would be one
misconfigured route away from being readable.

## The views

| View | What it is for |
| --- | --- |
| **Dashboard** | Counts by status, and what is due this week. |
| **Tracker board** | Kanban. Drag a task between columns to change its status. |
| **To do** | The flat, filterable, sortable list. Faster than the board for bulk edits. |
| **Calendar** | Tasks by due date. Add one directly to a day. |
| **Activity** | Who changed what, and when. |
| **Team** | Admins only: accounts, roles, invitations. |

Board and To do are the same tasks. Use whichever fits what you are doing.

## Theme

The Account card in the nav has a light and dark switch. The choice is stored in
your browser, so it stays put per device; with no choice stored, it follows your
operating system.

**[Needs input]** — What we actually track in here: which projects, whether
client work gets a task per post, and who assigns.

**[Needs input]** — Task naming convention, if there is one.
', 'draft', 'Ops', 'ppm board tasks calendar activity project management kanban assignment'
from public.kb_categories c
where c.slug = 'marketing-sales' on conflict (slug) do nothing;
insert into public.kb_articles (category_id, topic_id, slug, title, summary, body, status, owner, keywords)
select c.id, null, 'tools-portal', 'Client Portal', 'Client dashboards, the admin panel, the approval gate, and how GSC data gets in.', '`portal.roblestech.net`. Separate app from PPM, separate login list, and clients
have accounts here.

## The two sides

**Clients** see one thing: their own dashboard. Row-level security in the
database means a client''s data cannot be returned to another client''s session
even if a URL is guessed, and the page is served only after a server-side
authorization check.

**Admins** see the client list and the admin panel, and can preview any client''s
dashboard.

## Admin, in the order you will use it

1. **Clients** — create a client, set their Search Console property, link their
   user accounts.
2. **Content** — per client: the baseline, the content pipeline, the service
   pages to track, and open items. This is where a post gets its URL, which is
   what makes it appear on the client''s Blog performance tab.
3. **AI Visibility Audit** — upload the monthly report. An HTML audit is parsed
   on the way in: round, dates and check counts are read out of it and drive the
   dashboard''s AI visibility figures.

## The approval gate

A regular admin''s changes do not apply immediately. They queue for a super admin
to approve, and the admin is prompted for a note explaining the request. Super
admins apply directly.

If a change you made has not shown up, it is probably waiting on approval rather
than lost.

## Where Search Console data comes from

A nightly job pulls per-client data using a stored Google refresh token and
writes it back onto the client row. Tracked post URLs and tracked service page
URLs each get their own query. Nothing is entered by hand.

See [Client Reporting](/kb/ops-reporting) for the refresh timing and what to
check when a number looks wrong.
', 'ready', 'Ops', 'portal dashboard admin client config pipeline approvals gsc refresh super admin'
from public.kb_categories c
where c.slug = 'marketing-sales' on conflict (slug) do nothing;
insert into public.kb_articles (category_id, topic_id, slug, title, summary, body, status, owner, keywords)
select c.id, null, 'tools-stack', 'The Rest of the Stack', 'Salesforce, Calendly, Search Console, Semrush and Smartsheet: what each is the source of truth for.', 'What each tool is the source of truth for. When two disagree, the one named here
wins.

| Tool | Source of truth for | Notes |
| --- | --- | --- |
| **Salesforce** | Leads and their status | Every website form creates a lead here. Gap Report requests arrive tagged `lead_source = Gap Report`. |
| **Google Search Console** | Clicks, impressions, CTR, position | Lags 2–3 days. Feeds the client dashboards automatically. |
| **Semrush** | Rank tracking, backlinks, competitor gaps | We are a listed Agency Partner. |
| **Calendly** | Bookings | The Book a Call buttons open it as a popup. |
| **Smartsheet** | Client delivery, on Smartsheet engagements | The client''s own subscription, billed by Smartsheet to them, not through us. |
| **Supabase** | Accounts, roles, client records, task data | Behind both the portal and PPM. |
| **Vercel** | Hosting for the portal and PPM | The marketing site is separate: GitHub Pages, deployed on push to `main`. |

## Two things worth knowing

**The marketing site and the apps deploy differently.** Pushing to `main`
rebuilds and publishes roblestech.net. The portal and PPM are Vercel projects.
A change to one does not deploy the other.

**Prices live in one file.** `src/data/offers.ts` in the website repo defines
every price that appears in more than one place, and the pages render from it.
The FAQ page and the service pages had drifted a full price generation apart
before that existed. Do not reintroduce a hardcoded price anywhere, including in
an email template.

**[Needs input]** — Who holds the admin account for each of these, and how a new
starter gets access.

**[Needs input]** — Where credentials are stored. If the answer is "in a
message somewhere", that is the thing to fix first.
', 'draft', 'Ops', 'salesforce calendly search console gsc semrush smartsheet supabase vercel tools access'
from public.kb_categories c
where c.slug = 'marketing-sales' on conflict (slug) do nothing;

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
