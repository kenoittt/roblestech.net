/**
 * Home feed (FR-4.4, FR-7.3).
 *
 * Blends three things, in priority order: hikes you have booked and are about to do, new
 * hikes from organizers you follow, and popular hikes nearby. The first section is the one
 * that matters on the morning of a hike, so it stays pinned at the top.
 */

import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { EmptyState, Screen } from "@/components/ui";
import { HikeCard } from "@/components/HikeCard";
import { useFeed, useMyBookings } from "@/lib/queries";
import { colors, spacing, typography } from "@/theme/tokens";

export default function HomeScreen() {
  const router = useRouter();
  const bookings = useMyBookings();
  const feed = useFeed();

  const upcoming = (bookings.data ?? [])
    .filter(
      (b) =>
        ["confirmed", "pending_payment"].includes(b.status) &&
        new Date(b.hikes.start_at) > new Date(),
    )
    .sort((a, b) => a.hikes.start_at.localeCompare(b.hikes.start_at));

  return (
    <Screen loading={bookings.isLoading} error={bookings.error} onRetry={() => bookings.refetch()}>
      {upcoming.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coming up</Text>
          {upcoming.map((booking) => (
            <HikeCard
              key={booking.id}
              hike={{
                id: booking.hikes.id,
                title: booking.hikes.title,
                start_at: booking.hikes.start_at,
                difficulty: booking.hikes.difficulty,
                distance_km: booking.hikes.distance_km,
                elevation_gain_m: 0,
                price_cents: booking.amount_cents,
                currency: booking.currency,
                capacity_max: 0,
                confirmed_spots: 0,
                photos: booking.hikes.photos ?? [],
              }}
              onPress={() => router.push(`/hike/${booking.hikes.id}`)}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>From organizers you follow</Text>
        {feed.isLoading ? null : (feed.data ?? []).length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            body="Follow an organizer and their new hikes will show up here first."
          />
        ) : (
          (feed.data ?? []).map((hike) => (
            <HikeCard
              key={hike.id}
              hike={{
                id: hike.id,
                title: hike.title,
                start_at: hike.start_at,
                difficulty: hike.difficulty,
                distance_km: hike.distance_km,
                elevation_gain_m: hike.elevation_gain_m,
                price_cents: hike.price_cents,
                currency: hike.currency,
                capacity_max: hike.capacity_max,
                confirmed_spots: hike.confirmed_spots,
                photos: hike.photos ?? [],
              }}
              onPress={() => router.push(`/hike/${hike.id}`)}
            />
          ))
        )}
      </View>

      {/* TODO(FR-4.4): "popular nearby" section — ranked by fill rate and organizer rating.
          Needs the ranking work in FR-4.5 to be worth showing. */}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  sectionTitle: { ...typography.title, color: colors.text, marginTop: spacing.sm },
});
