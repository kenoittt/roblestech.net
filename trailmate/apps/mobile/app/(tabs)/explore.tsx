/**
 * Explore — map/list toggle with filters (FR-4.1, FR-4.2).
 *
 * Both views read the same public.hikes_nearby() RPC, so the list and the map can never
 * disagree about what is in range. The map itself needs @rnmapbox/maps native code, so in
 * Expo Go the toggle falls back to the list with a note rather than crashing.
 */

import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { useQuery } from "@tanstack/react-query";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Badge, Button, EmptyState, Screen } from "@/components/ui";
import { HikeCard } from "@/components/HikeCard";
import { useNearbyHikes } from "@/lib/queries";
import { features } from "@/lib/env";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import type { HikeDifficulty } from "@/types/database";

// SDS §13 Q1 — single launch market in v1. Used until the user grants location access.
const FALLBACK_CENTER = { lat: 37.7749, lng: -122.4194 };

const DIFFICULTIES: HikeDifficulty[] = ["easy", "moderate", "hard", "expert"];
const RADII = [10, 25, 50, 100];

export default function ExploreScreen() {
  const router = useRouter();
  const [view, setView] = useState<"list" | "map">("list");
  const [radiusKm, setRadiusKm] = useState(50);
  const [selected, setSelected] = useState<HikeDifficulty[]>([]);

  const location = useQuery({
    queryKey: ["device-location"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return FALLBACK_CENTER;
      const position = await Location.getLastKnownPositionAsync();
      const fix = position ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      return { lat: fix.coords.latitude, lng: fix.coords.longitude };
    },
  });

  const center = location.data ?? FALLBACK_CENTER;

  const params = useMemo(
    () => ({
      lat: center.lat,
      lng: center.lng,
      radiusKm,
      difficulties: selected.length > 0 ? selected : undefined,
    }),
    [center.lat, center.lng, radiusKm, selected],
  );

  const hikes = useNearbyHikes(params, !location.isLoading);

  function toggleDifficulty(value: HikeDifficulty) {
    setSelected((current) =>
      current.includes(value) ? current.filter((d) => d !== value) : [...current, value],
    );
  }

  return (
    <Screen loading={location.isLoading} error={hikes.error} onRetry={() => hikes.refetch()}>
      <View style={styles.toggleRow}>
        <Toggle label="List" active={view === "list"} onPress={() => setView("list")} />
        <Toggle
          label="Map"
          active={view === "map"}
          onPress={() => setView("map")}
          disabled={!features.maps}
        />
      </View>

      <View style={styles.filterRow}>
        {DIFFICULTIES.map((difficulty) => (
          <Pressable
            key={difficulty}
            onPress={() => toggleDifficulty(difficulty)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected.includes(difficulty) }}
            style={[styles.filterChip, selected.includes(difficulty) && styles.filterChipActive]}
          >
            <Text
              style={[
                styles.filterChipLabel,
                selected.includes(difficulty) && styles.filterChipLabelActive,
              ]}
            >
              {difficulty}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.filterRow}>
        {RADII.map((value) => (
          <Pressable
            key={value}
            onPress={() => setRadiusKm(value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: radiusKm === value }}
            style={[styles.filterChip, radiusKm === value && styles.filterChipActive]}
          >
            <Text
              style={[styles.filterChipLabel, radiusKm === value && styles.filterChipLabelActive]}
            >
              {value} km
            </Text>
          </Pressable>
        ))}
      </View>

      {view === "map" ? (
        <View style={styles.mapPlaceholder}>
          <Badge label="Development build required" tone="info" />
          <Text style={styles.mapNote}>
            The Mapbox view with clustering (FR-4.1) needs native code. Run{" "}
            <Text style={styles.mono}>npm run mobile:build:dev</Text> and open the development
            build.
          </Text>
          <Button label="Back to list" variant="secondary" onPress={() => setView("list")} />
        </View>
      ) : (hikes.data ?? []).length === 0 ? (
        <EmptyState
          title="No hikes in range"
          body={`Nothing published within ${radiusKm} km yet. Try a wider radius, or clear the difficulty filters.`}
        />
      ) : (
        (hikes.data ?? []).map((hike) => (
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
              organizer_name: hike.organizer_name,
              organizer_rating: hike.organizer_rating,
              distance_from_me_km: hike.distance_from_me_km,
            }}
            onPress={() => router.push(`/hike/${hike.id}`)}
          />
        ))
      )}

      {/* TODO(FR-4.2): date range, price and duration filters, plus organizer rating —
          hikes_nearby() already accepts all four parameters. */}
    </Screen>
  );
}

function Toggle({
  label,
  active,
  onPress,
  disabled,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="tab"
      accessibilityState={{ selected: active, disabled: Boolean(disabled) }}
      style={[styles.toggle, active && styles.toggleActive, disabled && styles.toggleDisabled]}
    >
      <Text style={[styles.toggleLabel, active && styles.toggleLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: "row", gap: spacing.sm },
  toggle: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  toggleActive: { backgroundColor: colors.forest, borderColor: colors.forest },
  toggleDisabled: { opacity: 0.4 },
  toggleLabel: { ...typography.heading, color: colors.forest },
  toggleLabelActive: { color: colors.textInverse },

  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: { backgroundColor: colors.moss, borderColor: colors.moss },
  filterChipLabel: { ...typography.caption, color: colors.textMuted, textTransform: "capitalize" },
  filterChipLabelActive: { color: colors.textInverse, fontWeight: "600" },

  mapPlaceholder: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  mapNote: { ...typography.body, color: colors.textMuted },
  mono: { fontFamily: "monospace" },
});
