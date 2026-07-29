/**
 * My Hikes (§8) — upcoming and past bookings, plus the review prompt (FR-6.1) and hiker
 * cancellation (FR-5.4).
 *
 * The refund amount shown on cancel comes from the server, not from re-implementing §9.3
 * on the device. That is the whole reason cancelBooking() returns it.
 */

import { useState } from "react";
import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, EmptyState, Screen } from "@/components/ui";
import { useMyBookings, type BookingWithHike } from "@/lib/queries";
import { cancelBooking, FunctionError } from "@/lib/functions";
import { money, policyLabel, relativeStart, startTime } from "@/lib/format";
import { colors, spacing, typography } from "@/theme/tokens";

export default function MyHikesScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const bookings = useMyBookings();

  const now = Date.now();
  const all = bookings.data ?? [];

  const upcoming = all.filter(
    (b) =>
      new Date(b.hikes.start_at).getTime() > now &&
      ["pending_payment", "confirmed"].includes(b.status),
  );
  const past = all.filter((b) => !upcoming.includes(b));

  const visible = tab === "upcoming" ? upcoming : past;

  return (
    <Screen loading={bookings.isLoading} error={bookings.error} onRetry={() => bookings.refetch()}>
      <View style={styles.tabs}>
        <Pressable
          onPress={() => setTab("upcoming")}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === "upcoming" }}
          style={[styles.tab, tab === "upcoming" && styles.tabActive]}
        >
          <Text style={[styles.tabLabel, tab === "upcoming" && styles.tabLabelActive]}>
            Upcoming ({upcoming.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("past")}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === "past" }}
          style={[styles.tab, tab === "past" && styles.tabActive]}
        >
          <Text style={[styles.tabLabel, tab === "past" && styles.tabLabelActive]}>
            Past ({past.length})
          </Text>
        </Pressable>
      </View>

      {visible.length === 0 ? (
        <EmptyState
          title={tab === "upcoming" ? "No hikes booked" : "No past hikes yet"}
          body={
            tab === "upcoming"
              ? "Head to Explore and find something near you."
              : "Hikes you have completed will appear here, along with the review prompt."
          }
        />
      ) : (
        visible.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            onOpen={() => router.push(`/hike/${booking.hikes.id}`)}
            onOpenChat={() => router.push(`/hike/${booking.hikes.id}/chat`)}
            onCancelled={() => bookings.refetch()}
          />
        ))
      )}
    </Screen>
  );
}

function BookingCard({
  booking,
  onOpen,
  onOpenChat,
  onCancelled,
}: {
  booking: BookingWithHike;
  onOpen: () => void;
  onOpenChat: () => void;
  onCancelled: () => void;
}) {
  const [cancelling, setCancelling] = useState(false);

  const isUpcoming =
    new Date(booking.hikes.start_at).getTime() > Date.now() &&
    ["pending_payment", "confirmed"].includes(booking.status);
  const canReview = booking.status === "attended";

  async function onCancel() {
    setCancelling(true);
    try {
      const result = await cancelBooking({ bookingId: booking.id });
      Alert.alert(
        "Booking cancelled",
        result.refundCents > 0
          ? `${money(result.refundCents, booking.currency)} of ${money(result.paidCents, booking.currency)} is being refunded under the ${result.policy} policy.`
          : `No refund is due under the ${result.policy} policy this close to the start time.`,
      );
      onCancelled();
    } catch (error) {
      const message =
        error instanceof FunctionError ? error.message : "Could not cancel this booking.";
      Alert.alert("Cancellation failed", message);
    } finally {
      setCancelling(false);
    }
  }

  function confirmCancel() {
    Alert.alert(
      "Cancel this booking?",
      policyLabel[booking.hikes.cancellation_policy],
      [
        { text: "Keep it", style: "cancel" },
        { text: "Cancel booking", style: "destructive", onPress: () => void onCancel() },
      ],
    );
  }

  return (
    <Card>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {booking.hikes.title}
        </Text>
        <StatusBadge status={booking.status} />
      </View>

      <Text style={styles.meta}>
        {startTime(booking.hikes.start_at)} · {relativeStart(booking.hikes.start_at)}
      </Text>
      <Text style={styles.meta}>
        {booking.qty} {booking.qty === 1 ? "spot" : "spots"} ·{" "}
        {money(booking.amount_cents + booking.hiker_fee_cents, booking.currency)}
        {booking.refunded_amount_cents > 0
          ? ` · ${money(booking.refunded_amount_cents, booking.currency)} refunded`
          : ""}
      </Text>

      {booking.waiver_id ? null : (
        <Badge label="Waiver not signed" tone="warning" />
      )}

      <View style={styles.actions}>
        <View style={styles.actionItem}>
          <Button label="Details" variant="secondary" onPress={onOpen} />
        </View>
        {isUpcoming && booking.status === "confirmed" ? (
          <View style={styles.actionItem}>
            <Button label="Chat" variant="secondary" onPress={onOpenChat} />
          </View>
        ) : null}
      </View>

      {isUpcoming ? (
        <Button
          label="Cancel booking"
          variant="ghost"
          onPress={confirmCancel}
          loading={cancelling}
          accessibilityHint={policyLabel[booking.hikes.cancellation_policy]}
        />
      ) : null}

      {canReview ? (
        <Button
          label="Leave a review"
          onPress={() =>
            Alert.alert(
              "Review flow",
              "TODO(FR-6.1): the review screen — star ratings for the hike and the organizer, text, and optional photos. useSubmitReview() in lib/queries.ts is already wired.",
            )
          }
        />
      ) : null}
    </Card>
  );
}

function StatusBadge({ status }: { status: BookingWithHike["status"] }) {
  const map: Record<BookingWithHike["status"], { label: string; tone: Parameters<typeof Badge>[0]["tone"] }> = {
    pending_payment: { label: "Payment pending", tone: "warning" },
    confirmed: { label: "Confirmed", tone: "success" },
    attended: { label: "Completed", tone: "neutral" },
    no_show: { label: "No show", tone: "danger" },
    cancelled_by_hiker: { label: "Cancelled", tone: "neutral" },
    cancelled_by_organizer: { label: "Cancelled by organizer", tone: "danger" },
    refunded: { label: "Refunded", tone: "info" },
  };
  const entry = map[status];
  return <Badge label={entry.label} tone={entry.tone} />;
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: spacing.sm },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  tabActive: { borderBottomColor: colors.forest },
  tabLabel: { ...typography.heading, color: colors.textMuted },
  tabLabelActive: { color: colors.forest },

  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  cardTitle: { ...typography.heading, color: colors.text, flex: 1 },
  meta: { ...typography.caption, color: colors.textMuted },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  actionItem: { flex: 1 },
});
