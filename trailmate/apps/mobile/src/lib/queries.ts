/**
 * Read queries (react-query + supabase-js).
 *
 * These are plain RLS-filtered reads — the pattern SDS §7 calls "Client → Supabase". Writes
 * that touch money or trust live in lib/functions.ts instead.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  BookingRow,
  ChatMessageRow,
  HikeDifficulty,
  HikeRow,
  NearbyHike,
  NotificationRow,
  OrganizerProfileRow,
  PlatformConfigRow,
  ReviewRow,
  UserRow,
} from "@/types/database";

export const queryKeys = {
  platformConfig: ["platform-config"] as const,
  nearby: (params: NearbyParams) => ["hikes-nearby", params] as const,
  hike: (id: string) => ["hike", id] as const,
  myBookings: ["my-bookings"] as const,
  roster: (hikeId: string) => ["roster", hikeId] as const,
  chat: (hikeId: string) => ["chat", hikeId] as const,
  reviews: (hikeId: string) => ["reviews", hikeId] as const,
  organizer: (userId: string) => ["organizer", userId] as const,
  feed: ["feed"] as const,
  notifications: ["notifications"] as const,
};

export interface NearbyParams {
  lat: number;
  lng: number;
  radiusKm?: number;
  from?: string;
  to?: string;
  difficulties?: HikeDifficulty[];
  maxPriceCents?: number;
  maxDurationMin?: number;
  minOrganizerRating?: number;
}

/** FR-4.1 / FR-4.2 — map and list discovery, both backed by the same PostGIS RPC. */
export function useNearbyHikes(params: NearbyParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.nearby(params),
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<NearbyHike[]> => {
      const { data, error } = await supabase.rpc("hikes_nearby", {
        p_lat: params.lat,
        p_lng: params.lng,
        p_radius_km: params.radiusKm ?? 50,
        p_from: params.from ?? new Date().toISOString(),
        p_to: params.to ?? null,
        p_difficulties: params.difficulties ?? null,
        p_max_price_cents: params.maxPriceCents ?? null,
        p_max_duration_min: params.maxDurationMin ?? null,
        p_min_organizer_rating: params.minOrganizerRating ?? null,
      });
      if (error) throw error;
      return (data ?? []) as NearbyHike[];
    },
  });
}

export interface HikeDetail extends HikeRow {
  organizer: Pick<UserRow, "id" | "display_name" | "avatar_url" | "bio"> & {
    organizer_profiles: OrganizerProfileRow | null;
  };
}

/** FR-4.3 — the hike detail page. */
export function useHike(hikeId: string) {
  return useQuery({
    queryKey: queryKeys.hike(hikeId),
    queryFn: async (): Promise<HikeDetail> => {
      const { data, error } = await supabase
        .from("hikes")
        .select(
          `*, organizer:users!hikes_organizer_id_fkey (
             id, display_name, avatar_url, bio,
             organizer_profiles ( * )
           )`,
        )
        .eq("id", hikeId)
        .single();
      if (error) throw error;
      return data as unknown as HikeDetail;
    },
  });
}

/** SDS §9.2 — the app shows the fee breakdown, so it reads the rates rather than hardcoding. */
export function usePlatformConfig() {
  return useQuery({
    queryKey: queryKeys.platformConfig,
    staleTime: 30 * 60_000,
    queryFn: async (): Promise<PlatformConfigRow> => {
      const { data, error } = await supabase.from("platform_config").select("*").single();
      if (error) throw error;
      return data as PlatformConfigRow;
    },
  });
}

export interface BookingWithHike extends BookingRow {
  hikes: Pick<
    HikeRow,
    | "id"
    | "title"
    | "start_at"
    | "status"
    | "difficulty"
    | "distance_km"
    | "photos"
    | "meeting_notes"
    | "cancellation_policy"
  >;
}

/** §8 "My Hikes" — upcoming and past, in one query. NFR-5 wants this cached offline. */
export function useMyBookings() {
  return useQuery({
    queryKey: queryKeys.myBookings,
    queryFn: async (): Promise<BookingWithHike[]> => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `*, hikes!inner (
             id, title, start_at, status, difficulty, distance_km, photos,
             meeting_notes, cancellation_policy
           )`,
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BookingWithHike[];
    },
  });
}

export interface RosterEntry extends BookingRow {
  users: Pick<UserRow, "id" | "display_name" | "avatar_url" | "experience_level">;
  waivers: { id: string; signed_at: string; signed_name: string }[] | null;
}

/** FR-5.7 — organizer roster with waiver status. Emergency contacts are a separate,
 *  more tightly scoped read (see useEmergencyContacts). */
export function useRoster(hikeId: string) {
  return useQuery({
    queryKey: queryKeys.roster(hikeId),
    queryFn: async (): Promise<RosterEntry[]> => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `*, users!bookings_hiker_id_fkey ( id, display_name, avatar_url, experience_level ),
             waivers!waivers_booking_id_fkey ( id, signed_at, signed_name )`,
        )
        .eq("hike_id", hikeId)
        .in("status", ["confirmed", "attended", "no_show"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as RosterEntry[];
    },
  });
}

/** FR-1.5 — only readable by the organizer of a hike the user has booked; RLS enforces it. */
export function useEmergencyContacts(hikeId: string, hikerIds: string[]) {
  return useQuery({
    queryKey: ["emergency-contacts", hikeId, hikerIds],
    enabled: hikerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_emergency_contacts")
        .select("user_id, contact_name, contact_phone, relationship")
        .in("user_id", hikerIds);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface ChatMessageWithSender extends ChatMessageRow {
  users: Pick<UserRow, "id" | "display_name" | "avatar_url">;
}

/** FR-7.2 — group chat history. Live updates come from the Realtime subscription in the screen. */
export function useChatMessages(hikeId: string) {
  return useQuery({
    queryKey: queryKeys.chat(hikeId),
    queryFn: async (): Promise<ChatMessageWithSender[]> => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select(`*, users!chat_messages_sender_id_fkey ( id, display_name, avatar_url )`)
        .eq("hike_id", hikeId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as ChatMessageWithSender[];
    },
  });
}

export function useSendChatMessage(hikeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { senderId: string; body: string }) => {
      const { error } = await supabase.from("chat_messages").insert({
        hike_id: hikeId,
        sender_id: input.senderId,
        body: input.body,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.chat(hikeId) }),
  });
}

export interface ReviewWithAuthor extends ReviewRow {
  users: Pick<UserRow, "id" | "display_name" | "avatar_url"> | null;
}

/** FR-4.3 / FR-6.x — reviews on the hike detail page. */
export function useHikeReviews(hikeId: string) {
  return useQuery({
    queryKey: queryKeys.reviews(hikeId),
    queryFn: async (): Promise<ReviewWithAuthor[]> => {
      const { data, error } = await supabase
        .from("reviews")
        .select(`*, users!reviews_author_id_fkey ( id, display_name, avatar_url )`)
        .eq("hike_id", hikeId)
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ReviewWithAuthor[];
    },
  });
}

/** FR-6.1 — the review a hiker leaves after a completed hike. */
export function useSubmitReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      bookingId: string;
      hikeRating: number;
      organizerRating: number;
      body?: string;
    }) => {
      // hike_id, organizer_id and author_id are set by the reviews_guard trigger, which also
      // re-checks attendance and the 14-day window.
      const { error } = await supabase.from("reviews").insert({
        booking_id: input.bookingId,
        hike_rating: input.hikeRating,
        organizer_rating: input.organizerRating,
        body: input.body ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myBookings });
    },
  });
}

/** FR-7.3 — activity feed: new hikes from organizers the user follows. */
export function useFeed() {
  return useQuery({
    queryKey: queryKeys.feed,
    queryFn: async () => {
      const { data: follows, error: followsError } = await supabase
        .from("follows")
        .select("followee_id");
      if (followsError) throw followsError;

      const followeeIds = (follows ?? []).map((f) => f.followee_id as string);
      if (followeeIds.length === 0) return [] as HikeRow[];

      const { data, error } = await supabase
        .from("hikes")
        .select("*")
        .in("organizer_id", followeeIds)
        .in("status", ["published", "full"])
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as HikeRow[];
    },
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async (): Promise<NotificationRow[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
  });
}

/** FR-7.1 — follow / unfollow an organizer. */
export function useToggleFollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { followerId: string; followeeId: string; following: boolean }) => {
      if (input.following) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", input.followerId)
          .eq("followee_id", input.followeeId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({ follower_id: input.followerId, followee_id: input.followeeId });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.feed }),
  });
}
