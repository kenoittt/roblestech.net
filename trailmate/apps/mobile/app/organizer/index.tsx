/**
 * Organizer dashboard (§8) — listings, roster and earnings.
 *
 * The three things an organizer opens the app for: is my next hike filling, who is coming,
 * and when do I get paid.
 */

import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, EmptyState, Screen } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { cancelHike, FunctionError } from "@/lib/functions";
import { money, spotsLeft, startTime } from "@/lib/format";
import { colors, spacing, typography } from "@/theme/tokens";
import type { HikeRow } from "@/types/database";

interface LedgerTotals {
  heldCents: number;
  releasedCents: number;
  currency: string;
}

export default function OrganizerDashboardScreen() {
  const router = useRouter();
  const { profile, isOrganizer } = useAuth();

  const listings = useQuery({
    queryKey: ["organizer-listings", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async (): Promise<HikeRow[]> => {
      const { data, error } = await supabase
        .from("hikes")
        .select("*")
        .eq("organizer_id", profile!.id)
        .order("start_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as HikeRow[];
    },
  });

  const earnings = useQuery({
    queryKey: ["organizer-earnings", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async (): Promise<LedgerTotals> => {
      const { data, error } = await supabase
        .from("payouts_ledger")
        .select("net_cents, status, currency")
        .eq("organizer_id", profile!.id);
      if (error) throw error;

      const rows = (data ?? []) as { net_cents: number; status: string; currency: string }[];
      return {
        heldCents: rows.filter((r) => r.status === "held").reduce((sum, r) => sum + r.net_cents, 0),
        releasedCents: rows
          .filter((r) => r.status === "released")
          .reduce((sum, r) => sum + r.net_cents, 0),
        currency: rows[0]?.currency ?? "usd",
      };
    },
  });

  if (!isOrganizer) {
    return (
      <Screen>
        <EmptyState
          title="Not an organizer yet"
          body="Verify your ID and connect a payout account to start publishing hikes."
        />
        <Button label="Get set up" onPress={() => router.push("/organizer/onboarding")} />
      </Screen>
    );
  }

  const upcoming = (listings.data ?? []).filter((h) =>
    ["draft", "published", "full"].includes(h.status),
  );
  const finished = (listings.data ?? []).filter((h) =>
    ["completed", "cancelled"].includes(h.status),
  );

  async function onCancel(hike: HikeRow, weather: boolean) {
    try {
      const result = await cancelHike({
        hikeId: hike.id,
        reason: weather ? "Cancelled due to weather conditions" : "Cancelled by organizer",
        weather,
      });
      Alert.alert(
        "Hike cancelled",
        `${result.refundedBookings} booking(s) fully refunded and everyone has been notified.`,
      );
      void listings.refetch();
      void earnings.refetch();
    } catch (error) {
      Alert.alert(
        "Could not cancel",
        error instanceof FunctionError ? error.message : "Please try again.",
      );
    }
  }

  function confirmCancel(hike: HikeRow) {
    Alert.alert(
      `Cancel "${hike.title}"?`,
      "Every attendee is refunded in full, including the platform commission. This cannot be undone.",
      [
        { text: "Keep it", style: "cancel" },
        { text: "Weather cancellation", onPress: () => void onCancel(hike, true) },
        { text: "Cancel hike", style: "destructive", onPress: () => void onCancel(hike, false) },
      ],
    );
  }

  return (
    <Screen loading={listings.isLoading} error={listings.error} onRetry={() => listings.refetch()}>
      <Card>
        <Text style={styles.sectionTitle}>Earnings</Text>
        <View style={styles.earningsRow}>
          <Stat
            label="In dispute window"
            value={money(earnings.data?.heldCents ?? 0, earnings.data?.currency)}
          />
          <Stat
            label="Released"
            value={money(earnings.data?.releasedCents ?? 0, earnings.data?.currency)}
          />
        </View>
        <Text style={styles.meta}>
          Earnings are released 24 hours after each hike completes, minus platform commission.
        </Text>
      </Card>

      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Your hikes</Text>
        <Button
          label="New hike"
          variant="secondary"
          onPress={() =>
            Alert.alert(
              "Create listing wizard",
              "TODO(FR-3.1, FR-3.2): the 5-step create-listing wizard — basics, route (GPX upload or draw), logistics, pricing and policy, review and publish.",
            )
          }
        />
      </View>

      {upcoming.length === 0 ? (
        <EmptyState
          title="No hikes yet"
          body="Publish your first hike and it shows up in Explore for everyone within range."
        />
      ) : (
        upcoming.map((hike) => (
          <Card key={hike.id}>
            <View style={styles.header}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {hike.title}
              </Text>
              <Badge
                label={hike.status}
                tone={hike.status === "draft" ? "warning" : hike.status === "full" ? "info" : "success"}
              />
            </View>
            <Text style={styles.meta}>{startTime(hike.start_at, hike.timezone)}</Text>
            <Text style={styles.meta}>
              {spotsLeft(hike.capacity_max, hike.confirmed_spots)} ·{" "}
              {money(hike.price_cents, hike.currency)} per spot
            </Text>
            {hike.confirmed_spots < hike.capacity_min ? (
              <Badge label={`Below minimum of ${hike.capacity_min}`} tone="warning" />
            ) : null}

            <View style={styles.actions}>
              <View style={styles.actionItem}>
                <Button
                  label="Roster"
                  variant="secondary"
                  onPress={() =>
                    Alert.alert(
                      "Roster",
                      "TODO(FR-5.7): attendee list with waiver status, emergency contacts and day-of check-in. useRoster() and useEmergencyContacts() are already wired in lib/queries.ts.",
                    )
                  }
                />
              </View>
              <View style={styles.actionItem}>
                <Button
                  label="View"
                  variant="secondary"
                  onPress={() => router.push(`/hike/${hike.id}`)}
                />
              </View>
            </View>

            {hike.status !== "draft" ? (
              <Button label="Cancel hike" variant="ghost" onPress={() => confirmCancel(hike)} />
            ) : null}
          </Card>
        ))
      )}

      {finished.length > 0 ? (
        <View style={styles.pastSection}>
          <Text style={styles.sectionTitle}>Past</Text>
          {finished.map((hike) => (
            <Card key={hike.id}>
              <View style={styles.header}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {hike.title}
                </Text>
                <Badge label={hike.status} tone={hike.status === "cancelled" ? "danger" : "neutral"} />
              </View>
              <Text style={styles.meta}>
                {hike.rating_avg ? `★ ${hike.rating_avg.toFixed(1)} (${hike.rating_count})` : "No reviews yet"}
              </Text>
              {/* FR-3.4 — organizers run the same hike repeatedly. */}
              <Button
                label="Duplicate"
                variant="secondary"
                onPress={() =>
                  Alert.alert(
                    "Duplicate hike",
                    "TODO(FR-3.4): copy this listing into a new draft with a fresh date, setting duplicated_from_id.",
                  )
                }
              />
            </Card>
          ))}
        </View>
      ) : null}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  sectionTitle: { ...typography.heading, color: colors.text },
  cardTitle: { ...typography.heading, color: colors.text, flex: 1 },
  meta: { ...typography.caption, color: colors.textMuted },
  earningsRow: { flexDirection: "row", gap: spacing.xl, marginVertical: spacing.sm },
  stat: { gap: 2 },
  statValue: { ...typography.title, color: colors.forest },
  statLabel: { ...typography.label, color: colors.textMuted, textTransform: "uppercase" },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  actionItem: { flex: 1 },
  pastSection: { gap: spacing.md, marginTop: spacing.lg },
});
