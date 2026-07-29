-- TrailMate — enumerated types
-- Enums live in `public` so `supabase gen types typescript` emits them for the app.

-- SDS §2.1 — a single account may hold several roles (FR-1.3).
create type public.app_role as enum ('hiker', 'organizer', 'admin');

create type public.experience_level as enum ('beginner', 'intermediate', 'advanced', 'expert');

-- SDS §4.3 FR-3.1
create type public.hike_difficulty as enum ('easy', 'moderate', 'hard', 'expert');

-- SDS §4.3 FR-3.3 — draft → published → full → completed → cancelled
create type public.hike_status as enum ('draft', 'published', 'full', 'completed', 'cancelled');

-- SDS §9.3 refund presets
create type public.cancellation_policy as enum ('flexible', 'moderate', 'strict');

-- SDS §4.5 FR-5.6
create type public.booking_status as enum (
  'pending_payment',
  'confirmed',
  'attended',
  'no_show',
  'cancelled_by_hiker',
  'cancelled_by_organizer',
  'refunded'
);

-- SDS §4.2 — organizer lifecycle, incl. FR-2.4 revocation
create type public.organizer_status as enum ('pending', 'verified', 'suspended', 'revoked');

-- Mirrors Stripe Identity VerificationSession statuses
create type public.identity_status as enum (
  'unstarted',
  'processing',
  'requires_input',
  'verified',
  'canceled'
);

-- SDS §4.6 FR-6.6 — moderation outcome of a review
create type public.review_status as enum ('published', 'hidden', 'removed');

-- SDS §4.10 FR-10.1
create type public.report_target as enum ('user', 'hike', 'review', 'chat_message');

create type public.report_status as enum ('open', 'triaged', 'actioned', 'dismissed');

-- SDS §4.3 FR-3.5 — waitlist with a 6-hour claim window
create type public.waitlist_status as enum ('waiting', 'offered', 'claimed', 'expired', 'released');

-- SDS §4.9 FR-9.1 — one value per notifiable event; also keys notification_prefs.
create type public.notification_type as enum (
  'booking_confirmed',
  'hike_reminder_48h',
  'hike_reminder_3h',
  'chat_message',
  'hike_updated',
  'hike_cancelled',
  'refund_issued',
  'payout_sent',
  'review_prompt',
  'waitlist_promoted',
  'new_hike_from_followed_organizer',
  'verification_update'
);

-- SDS §9.1 — ledger row lifecycle
create type public.payout_status as enum ('held', 'released', 'reversed', 'failed');
