/**
 * Hike detail (FR-4.3, FR-8.1, FR-8.2).
 *
 * The page a booking decision is made on, so it carries everything from FR-3.1 plus the
 * organizer's verification badge and rating — trust signals are what convert here.
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, DifficultyChip, Screen } from "@/components/ui";
import { useHike, useHikeReviews } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import {
  distance,
  duration,
  elevation,
  money,
  policyLabel,
  spotsLeft,
  startTime,
} from "@/lib/format";
import { colors, radii, spacing, typography } from "@/theme/tokens";

export default function HikeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const hike = useHike(id);
  const reviews = useHikeReviews(id);

  if (hike.isLoading || hike.error || !hike.data) {
    return <Screen loading={hike.isLoading} error={hike.error} onRetry={() => hike.refetch()} />;
  }

  const data = hike.data;
  const organizerProfile = data.organizer?.organizer_profiles ?? null;
  const isOwnHike = profile?.id === data.organizer_id;
  const isFull = data.confirmed_spots >= data.capacity_max;
  const isBookable = ["published", "full"].includes(data.status) &&
    new Date(data.start_at) > new Date();

  const gear = data.requirements?.gear ?? [];

  return (
    <Screen>
      {data.photos?.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
          {data.photos.map((uri) => (
            <Image key={uri} source={{ uri }} style={styles.photo} contentFit="cover" />
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.headerRow}>
        <DifficultyChip difficulty={data.difficulty} />
        {data.status === "cancelled" ? <Badge label="Cancelled" tone="danger" /> : null}
        {isFull && data.status !== "cancelled" ? <Badge label="Full" tone="warning" /> : null}
      </View>

      <Text style={styles.title}>{data.title}</Text>
      <Text style={styles.meta}>{startTime(data.start_at, data.timezone)}</Text>

      <View style={styles.statRow}>
        <Stat label="Distance" value={distance(data.distance_km)} />
        <Stat label="Elevation" value={elevation(data.elevation_gain_m).replace(" gain", "")} />
        <Stat label="Duration" value={duration(data.duration_min)} />
      </View>

      <Card>
        <Text style={styles.sectionTitle}>{data.organizer?.display_name}</Text>
        <View style={styles.badgeRow}>
          {organizerProfile?.status === "verified" ? (
            <Badge label="ID verified" tone="success" />
          ) : (
            <Badge label="Verification pending" tone="warning" />
          )}
          {organizerProfile?.rating_avg ? (
            <Badge
              label={`★ ${organizerProfile.rating_avg.toFixed(1)} (${organizerProfile.rating_count})`}
            />
          ) : null}
        </View>
        {organizerProfile?.credentials_text ? (
          <Text style={styles.body}>{organizerProfile.credentials_text}</Text>
        ) : null}
        {data.organizer?.bio ? <Text style={styles.meta}>{data.organizer.bio}</Text> : null}
      </Card>

      <Text style={styles.sectionTitle}>About this hike</Text>
      <Text style={styles.body}>{data.description}</Text>

      {/* FR-8.1 — route polyline + elevation profile. */}
      <Card style={styles.placeholder}>
        <Text style={styles.sectionTitle}>Route</Text>
        <Text style={styles.meta}>
          {/* TODO(FR-8.1): Mapbox polyline from hikes.route plus an elevation chart from
              hikes.elevation_profile. Needs a development build. */}
          Route map and elevation profile render in a development build (FR-8.1).
          {data.gpx_url ? " A GPX track is attached to this listing." : ""}
        </Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Meeting point</Text>
        {data.meeting_notes ? <Text style={styles.body}>{data.meeting_notes}</Text> : null}
        {data.parking_notes ? <Text style={styles.meta}>{data.parking_notes}</Text> : null}
        {/* FR-8.2 — hand off to the platform maps app rather than building navigation. */}
        <Button
          label={Platform.OS === "ios" ? "Open in Apple Maps" : "Open in Google Maps"}
          variant="secondary"
          onPress={() => {
            // Coordinates come from the hikes_nearby RPC or a dedicated point read; the
            // detail row exposes meeting_point as geography, so resolve it there.
            void Linking.openURL(
              Platform.OS === "ios"
                ? `http://maps.apple.com/?q=${encodeURIComponent(data.title)}`
                : `geo:0,0?q=${encodeURIComponent(data.title)}`,
            );
          }}
        />
      </Card>

      {gear.length > 0 ? (
        <Card>
          <Text style={styles.sectionTitle}>What to bring</Text>
          {gear.map((item) => (
            <Text key={item} style={styles.body}>
              • {item}
            </Text>
          ))}
          {data.requirements?.fitness ? (
            <Text style={styles.meta}>Fitness: {data.requirements.fitness}</Text>
          ) : null}
        </Card>
      ) : null}

      {data.whats_included ? (
        <Card>
          <Text style={styles.sectionTitle}>What&apos;s included</Text>
          <Text style={styles.body}>{data.whats_included}</Text>
        </Card>
      ) : null}

      {/* FR-10.4 — the standard safety checklist appears on every listing. */}
      <Card style={styles.safety}>
        <Text style={styles.sectionTitle}>Hike smart</Text>
        <Text style={styles.body}>• Check the forecast the morning of the hike.</Text>
        <Text style={styles.body}>• Tell someone your plan and expected return time.</Text>
        <Text style={styles.body}>• Carry more water than you think you need.</Text>
        <Text style={styles.body}>• Turn back if conditions change. The summit is optional.</Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Cancellation policy</Text>
        <Text style={styles.body}>{policyLabel[data.cancellation_policy]}</Text>
      </Card>

      {(reviews.data ?? []).length > 0 ? (
        <View style={styles.reviews}>
          <Text style={styles.sectionTitle}>
            Reviews {data.rating_avg ? `· ★ ${data.rating_avg.toFixed(1)}` : ""}
          </Text>
          {(reviews.data ?? []).slice(0, 5).map((review) => (
            <Card key={review.id}>
              <Text style={styles.reviewMeta}>
                {review.users?.display_name ?? "A hiker"} · ★ {review.hike_rating}
              </Text>
              {review.body ? <Text style={styles.body}>{review.body}</Text> : null}
              {review.organizer_response ? (
                <Text style={styles.response}>
                  Organizer replied: {review.organizer_response}
                </Text>
              ) : null}
            </Card>
          ))}
        </View>
      ) : null}

      <View style={styles.footer}>
        <View>
          <Text style={styles.price}>{money(data.price_cents, data.currency)}</Text>
          <Text style={styles.meta}>{spotsLeft(data.capacity_max, data.confirmed_spots)}</Text>
        </View>
        <View style={styles.footerAction}>
          {isOwnHike ? (
            <Button
              label="Manage"
              variant="secondary"
              onPress={() => router.push("/organizer")}
            />
          ) : (
            <Button
              label={isFull ? "Join waitlist" : data.price_cents === 0 ? "RSVP" : "Book"}
              disabled={!isBookable}
              onPress={() => router.push(`/checkout/${data.id}`)}
            />
          )}
        </View>
      </View>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gallery: { marginHorizontal: -spacing.lg },
  photo: { width: 280, height: 180, borderRadius: radii.md, marginLeft: spacing.lg },
  headerRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  title: { ...typography.display, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted },
  body: { ...typography.body, color: colors.text },
  sectionTitle: { ...typography.heading, color: colors.text },
  badgeRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },

  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  stat: { gap: 2 },
  statValue: { ...typography.heading, color: colors.forest },
  statLabel: { ...typography.label, color: colors.textMuted, textTransform: "uppercase" },

  placeholder: { borderStyle: "dashed", backgroundColor: colors.surfaceAlt },
  safety: { backgroundColor: colors.surfaceAlt },
  reviews: { gap: spacing.md },
  reviewMeta: { ...typography.label, color: colors.textMuted },
  response: { ...typography.caption, color: colors.forest, fontStyle: "italic" },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.lg,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  footerAction: { flex: 1 },
  price: { ...typography.title, color: colors.forest },
});
