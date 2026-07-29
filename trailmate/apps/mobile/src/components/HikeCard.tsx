/**
 * The listing card used by Explore, the feed, and My Hikes (FR-4.2, FR-4.4).
 *
 * Shows the four things that decide whether someone taps: when, how hard, how far from me,
 * and what it costs — plus scarcity, which is what actually drives the booking.
 */

import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import { DifficultyChip } from "@/components/ui";
import { distance, elevation, money, spotsLeft, startTime } from "@/lib/format";
import type { HikeDifficulty } from "@/types/database";

export interface HikeCardData {
  id: string;
  title: string;
  start_at: string;
  difficulty: HikeDifficulty;
  distance_km: number;
  elevation_gain_m: number;
  price_cents: number;
  currency: string;
  capacity_max: number;
  confirmed_spots: number;
  photos: string[];
  organizer_name?: string;
  organizer_rating?: number | null;
  distance_from_me_km?: number;
}

export function HikeCard({ hike, onPress }: { hike: HikeCardData; onPress: () => void }) {
  const cover = hike.photos?.[0];
  const left = hike.capacity_max - hike.confirmed_spots;
  const nearlyFull = left > 0 && left <= 3;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${hike.title}, ${hike.difficulty}, ${distance(hike.distance_km)}, ${money(hike.price_cents, hike.currency)}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {cover ? (
        <Image source={{ uri: cover }} style={styles.cover} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.cover, styles.coverFallback]} />
      )}

      <View style={styles.body}>
        <View style={styles.topRow}>
          <DifficultyChip difficulty={hike.difficulty} />
          {hike.distance_from_me_km !== undefined ? (
            <Text style={styles.meta}>{hike.distance_from_me_km.toFixed(0)} km away</Text>
          ) : null}
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {hike.title}
        </Text>

        <Text style={styles.meta}>
          {startTime(hike.start_at)} · {distance(hike.distance_km)} ·{" "}
          {elevation(hike.elevation_gain_m)}
        </Text>

        {hike.organizer_name ? (
          <Text style={styles.meta}>
            {hike.organizer_name}
            {hike.organizer_rating ? ` · ★ ${hike.organizer_rating.toFixed(1)}` : ""}
          </Text>
        ) : null}

        <View style={styles.bottomRow}>
          <Text style={styles.price}>{money(hike.price_cents, hike.currency)}</Text>
          <Text style={[styles.spots, nearlyFull && styles.spotsUrgent]}>
            {spotsLeft(hike.capacity_max, hike.confirmed_spots)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  pressed: { opacity: 0.9 },
  cover: { width: "100%", height: 150, backgroundColor: colors.surfaceAlt },
  coverFallback: { backgroundColor: colors.forestLight },
  body: { padding: spacing.lg, gap: spacing.xs },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { ...typography.heading, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  price: { ...typography.heading, color: colors.forest },
  spots: { ...typography.caption, color: colors.textMuted },
  spotsUrgent: { color: colors.clay, fontWeight: "600" },
});
