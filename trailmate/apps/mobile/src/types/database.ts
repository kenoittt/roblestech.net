/**
 * Database types.
 *
 * This file is hand-maintained for now and covers the tables the app actually reads.
 * Regenerate the complete, authoritative version from the live schema with:
 *
 *     npm run db:types            # supabase gen types typescript --local
 *
 * Keep the shape below in sync with supabase/migrations — a mismatch here is a silent
 * runtime bug, since supabase-js trusts these types without checking them.
 */

export type AppRole = "hiker" | "organizer" | "admin";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced" | "expert";
export type HikeDifficulty = "easy" | "moderate" | "hard" | "expert";
export type HikeStatus = "draft" | "published" | "full" | "completed" | "cancelled";
export type CancellationPolicy = "flexible" | "moderate" | "strict";
export type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "attended"
  | "no_show"
  | "cancelled_by_hiker"
  | "cancelled_by_organizer"
  | "refunded";
export type OrganizerStatus = "pending" | "verified" | "suspended" | "revoked";
export type IdentityStatus =
  | "unstarted"
  | "processing"
  | "requires_input"
  | "verified"
  | "canceled";
export type NotificationType =
  | "booking_confirmed"
  | "hike_reminder_48h"
  | "hike_reminder_3h"
  | "chat_message"
  | "hike_updated"
  | "hike_cancelled"
  | "refund_issued"
  | "payout_sent"
  | "review_prompt"
  | "waitlist_promoted"
  | "new_hike_from_followed_organizer"
  | "verification_update";

export interface UserRow {
  id: string;
  auth_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  region: string | null;
  experience_level: ExperienceLevel;
  role_flags: AppRole[];
  hikes_completed: number;
  distance_completed_km: number;
  feed_visible: boolean;
  adult_confirmed_at: string | null;
  created_at: string;
}

export interface OrganizerProfileRow {
  user_id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  identity_status: IdentityStatus;
  credentials_text: string | null;
  carries_first_aid_kit: boolean;
  verified_at: string | null;
  rating_avg: number | null;
  rating_count: number;
  status: OrganizerStatus;
}

export interface HikeRow {
  id: string;
  organizer_id: string;
  title: string;
  description: string;
  status: HikeStatus;
  start_at: string;
  timezone: string;
  duration_min: number;
  difficulty: HikeDifficulty;
  distance_km: number;
  elevation_gain_m: number;
  meeting_notes: string | null;
  parking_notes: string | null;
  gpx_url: string | null;
  elevation_profile: { distance_km: number; elevation_m: number }[] | null;
  capacity_min: number;
  capacity_max: number;
  confirmed_spots: number;
  price_cents: number;
  currency: string;
  cancellation_policy: CancellationPolicy;
  guest_limit: number;
  whats_included: string | null;
  requirements: { fitness?: string; gear?: string[] } | null;
  dogs_allowed: boolean;
  kids_allowed: boolean;
  photos: string[];
  rating_avg: number | null;
  rating_count: number;
  published_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
}

export interface BookingRow {
  id: string;
  hike_id: string;
  hiker_id: string;
  qty: number;
  status: BookingStatus;
  unit_price_cents: number;
  amount_cents: number;
  hiker_fee_cents: number;
  currency: string;
  refunded_amount_cents: number;
  waiver_id: string | null;
  checked_in_at: string | null;
  confirmed_at: string | null;
  created_at: string;
}

export interface ReviewRow {
  id: string;
  booking_id: string;
  hike_id: string;
  organizer_id: string;
  author_id: string | null;
  hike_rating: number;
  organizer_rating: number;
  body: string | null;
  photos: string[];
  organizer_response: string | null;
  created_at: string;
}

export interface ChatMessageRow {
  id: string;
  hike_id: string;
  sender_id: string;
  body: string;
  pinned: boolean;
  deleted_at: string | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface PlatformConfigRow {
  take_rate_bps: number;
  hiker_fee_bps: number;
  payout_delay_hours: number;
  review_window_days: number;
  waitlist_claim_hours: number;
  min_age: number;
}

/** Return shape of the public.hikes_nearby() RPC (FR-4.1, FR-4.2). */
export interface NearbyHike {
  id: string;
  organizer_id: string;
  organizer_name: string;
  organizer_rating: number | null;
  title: string;
  status: HikeStatus;
  start_at: string;
  duration_min: number;
  difficulty: HikeDifficulty;
  distance_km: number;
  elevation_gain_m: number;
  price_cents: number;
  currency: string;
  capacity_max: number;
  confirmed_spots: number;
  rating_avg: number | null;
  rating_count: number;
  photos: string[];
  meeting_lat: number;
  meeting_lng: number;
  distance_from_me_km: number;
}
