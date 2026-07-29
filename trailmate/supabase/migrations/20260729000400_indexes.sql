-- TrailMate — indexes
-- Sized against the NFR-1 budget: search results < 800 ms p95, map view interactive < 2 s.

-- Discovery: the hot query is "published hikes near me, starting soon" (FR-4.1, FR-4.2).
create index hikes_meeting_point_gist on public.hikes using gist (meeting_point);
create index hikes_route_gist on public.hikes using gist (route);

-- Partial index keeps the discovery index small — drafts, completed and cancelled hikes
-- are never in an explore result.
create index hikes_open_by_start on public.hikes (start_at)
  where status in ('published', 'full');

create index hikes_organizer_start on public.hikes (organizer_id, start_at desc);
create index hikes_status_start on public.hikes (status, start_at);
create index hikes_difficulty_price on public.hikes (difficulty, price_cents)
  where status in ('published', 'full');

-- Roster and "my hikes" (FR-5.7, §8).
create index bookings_hike_status on public.bookings (hike_id, status);
create index bookings_hiker_created on public.bookings (hiker_id, created_at desc);
create index bookings_payment_intent on public.bookings (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- Review prompts and aggregates (FR-6.1, FR-6.4).
create index reviews_organizer_status on public.reviews (organizer_id, status);
create index reviews_hike_status on public.reviews (hike_id, status);

-- Chat pagination is always "latest first within a hike" (FR-7.2).
create index chat_messages_hike_created on public.chat_messages (hike_id, created_at desc);
create index chat_messages_pinned on public.chat_messages (hike_id)
  where pinned and deleted_at is null;

-- Feed fan-out (FR-7.3): "hikes from organizers I follow".
create index follows_followee on public.follows (followee_id);

create index waivers_booking on public.waivers (booking_id);
create index waivers_user on public.waivers (user_id);

create index notifications_user_unread on public.notifications (user_id, created_at desc)
  where read_at is null;

create index push_tokens_user on public.push_tokens (user_id);

-- Cron sweep: rows that are due for release (SDS §7 release-payouts).
create index payouts_ledger_due on public.payouts_ledger (releasable_at)
  where status = 'held';

-- Webhook idempotency: a retried payment_intent.succeeded must not double-credit the
-- organizer. The insert relies on this constraint failing with 23505.
create unique index payouts_ledger_one_per_booking on public.payouts_ledger (booking_id)
  where booking_id is not null;
create index payouts_ledger_organizer on public.payouts_ledger (organizer_id, created_at desc);

-- Admin report queue with SLAs (FR-10.2).
create index reports_open_created on public.reports (created_at)
  where status = 'open';
create index reports_target on public.reports (target_type, target_id);

-- Waitlist promotion order (FR-3.5).
create index waitlist_hike_position on public.waitlist_entries (hike_id, created_at)
  where status = 'waiting';
create index waitlist_claim_expiry on public.waitlist_entries (claim_expires_at)
  where status = 'offered';

-- Webhook replay lookups.
create index stripe_webhook_events_unprocessed on public.stripe_webhook_events (received_at)
  where processed_at is null;
