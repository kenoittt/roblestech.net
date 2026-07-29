-- TrailMate — platform configuration (SDS §9.2)
--
-- The take rate lives in the database, not only in Edge Function env, because the ledger
-- and the refund math must agree with whatever Stripe was told at charge time. Edge
-- Functions read this row rather than their own env var so there is one source of truth.

create table public.platform_config (
  id                  boolean primary key default true,
  take_rate_bps       integer not null default 1300 check (take_rate_bps between 0 and 5000),
  hiker_fee_bps       integer not null default 0 check (hiker_fee_bps between 0 and 2000),
  payout_delay_hours  integer not null default 24 check (payout_delay_hours between 0 and 720),
  review_window_days  integer not null default 14 check (review_window_days between 1 and 90),
  chat_readonly_after_days integer not null default 7,
  waitlist_claim_hours integer not null default 6,
  min_age             integer not null default 18,
  updated_at          timestamptz not null default now(),
  constraint platform_config_singleton check (id)
);

comment on table public.platform_config is
  'Single-row settings table. SDS §9.2 opening position: 13% organizer commission, 0% '
  'hiker service fee, payouts released 24h after hike completion.';

insert into public.platform_config (id) values (true);

-- Read-only to clients: the app shows the fee breakdown at checkout, so it must be able
-- to read the rates, but only an admin (or an Edge Function) may change them.
alter table public.platform_config enable row level security;

create policy platform_config_read_all
  on public.platform_config for select
  to authenticated
  using (true);
