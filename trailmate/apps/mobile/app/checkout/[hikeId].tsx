/**
 * Checkout (FR-5.1, FR-5.2, FR-5.3, FR-3.6).
 *
 * Three steps, in this order and no other:
 *   spots → waiver (blocking) → pay
 *
 * The waiver is not a checkbox. The server refuses to create a PaymentIntent without a
 * signature, so skipping it client-side just produces an error rather than a free booking.
 * Free hikes still pass through the waiver step and come back confirmed with no Stripe leg.
 */

import { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useStripe } from "@stripe/stripe-react-native";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, Field, Screen } from "@/components/ui";
import { useHike, usePlatformConfig } from "@/lib/queries";
import { createBookingCheckout, fetchWaiverTemplate, FunctionError } from "@/lib/functions";
import { features } from "@/lib/env";
import { money, policyLabel, startTime } from "@/lib/format";
import { colors, radii, spacing, typography } from "@/theme/tokens";

type Step = "spots" | "waiver" | "paying";

export default function CheckoutScreen() {
  const { hikeId } = useLocalSearchParams<{ hikeId: string }>();
  const router = useRouter();
  const stripe = useStripe();

  const hike = useHike(hikeId);
  const config = usePlatformConfig();
  const waiver = useQuery({
    queryKey: ["waiver-template"],
    staleTime: 60 * 60_000,
    queryFn: fetchWaiverTemplate,
  });

  const [step, setStep] = useState<Step>("spots");
  const [qty, setQty] = useState(1);
  const [signedName, setSignedName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  const data = hike.data;
  const spotsAvailable = data ? Math.max(0, data.capacity_max - data.confirmed_spots) : 0;
  const maxQty = data ? Math.min(1 + data.guest_limit, spotsAvailable) : 1;
  const isFree = data?.price_cents === 0;

  // Mirrors priceBooking() in the Edge Function. The server's numbers are authoritative —
  // this exists so the hiker sees the breakdown before committing (FR-5.1).
  const breakdown = useMemo(() => {
    if (!data || !config.data) return null;
    const subtotal = data.price_cents * qty;
    const hikerFee = Math.floor((subtotal * config.data.hiker_fee_bps) / 10000 + 0.5);
    return { subtotal, hikerFee, total: subtotal + hikerFee };
  }, [data, config.data, qty]);

  async function onConfirm() {
    if (!data) return;
    setBusy(true);
    setStep("paying");

    try {
      const result = await createBookingCheckout({
        hikeId: data.id,
        qty,
        signedName: signedName.trim(),
        waiverTemplateVersion: waiver.data!.version,
      });

      // FR-3.6 — free hikes are already confirmed at this point.
      if (result.free) {
        Alert.alert("You're in", "Your spot is confirmed and your waiver is on file.");
        router.replace("/(tabs)/my-hikes");
        return;
      }

      if (!features.payments) {
        Alert.alert(
          "Development build required",
          "The Stripe Payment Sheet needs native code. Your spot is held and the waiver is signed — finish the payment from a development build.",
        );
        setStep("waiver");
        return;
      }

      const { error: initError } = await stripe.initPaymentSheet({
        merchantDisplayName: "TrailMate",
        paymentIntentClientSecret: result.clientSecret!,
        customerId: result.customerId,
        customerEphemeralKeySecret: result.ephemeralKeySecret,
        allowsDelayedPaymentMethods: false,
        returnURL: "trailmate://checkout-return",
        applePay: { merchantCountryCode: "US" },
        googlePay: { merchantCountryCode: "US", testEnv: true },
      });
      if (initError) throw new Error(initError.message);

      const { error: sheetError } = await stripe.presentPaymentSheet();
      if (sheetError) {
        // Canceling leaves the booking in pending_payment; the failed-payment webhook
        // releases the held spot, so nothing is stuck.
        if (sheetError.code === "Canceled") {
          setStep("waiver");
          return;
        }
        throw new Error(sheetError.message);
      }

      // SDS §3.3 — the booking becomes `confirmed` when payment_intent.succeeded arrives,
      // not because the sheet closed. My Hikes reflects it once the webhook lands.
      Alert.alert(
        "Payment received",
        "Your booking is being confirmed. You'll get a push notification the moment it's final.",
      );
      router.replace("/(tabs)/my-hikes");
    } catch (error) {
      const message =
        error instanceof FunctionError || error instanceof Error
          ? error.message
          : "Checkout failed.";
      Alert.alert("Could not complete checkout", message);
      setStep("waiver");
    } finally {
      setBusy(false);
    }
  }

  if (hike.isLoading || !data || waiver.isLoading || config.isLoading) {
    return <Screen loading error={hike.error ?? waiver.error} />;
  }

  if (spotsAvailable === 0) {
    return (
      <Screen>
        <Card>
          <Text style={styles.title}>This hike is full</Text>
          <Text style={styles.body}>
            {/* TODO(FR-3.5): join the waitlist here — insert into waitlist_entries and show
                the 6-hour claim window when a spot frees up. */}
            Waitlists land with FR-3.5. For now, follow the organizer so you hear about the
            next one first.
          </Text>
          <Button label="Back" variant="secondary" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>{data.title}</Text>
      <Text style={styles.meta}>{startTime(data.start_at, data.timezone)}</Text>

      <StepIndicator step={step} />

      {step === "spots" ? (
        <Card>
          <Text style={styles.sectionTitle}>How many spots?</Text>
          <View style={styles.qtyRow}>
            {Array.from({ length: Math.max(1, maxQty) }, (_, index) => index + 1).map((value) => (
              <Pressable
                key={value}
                onPress={() => setQty(value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: qty === value }}
                style={[styles.qtyChip, qty === value && styles.qtyChipActive]}
              >
                <Text style={[styles.qtyLabel, qty === value && styles.qtyLabelActive]}>
                  {value}
                </Text>
              </Pressable>
            ))}
          </View>
          {data.guest_limit > 0 ? (
            <Text style={styles.meta}>
              You can bring up to {data.guest_limit} guest{data.guest_limit === 1 ? "" : "s"}.
            </Text>
          ) : (
            <Text style={styles.meta}>This organizer does not allow guest bookings.</Text>
          )}

          {breakdown ? (
            <View style={styles.breakdown}>
              <Row
                label={`${money(data.price_cents, data.currency)} × ${qty}`}
                value={money(breakdown.subtotal, data.currency)}
              />
              {breakdown.hikerFee > 0 ? (
                <Row label="Service fee" value={money(breakdown.hikerFee, data.currency)} />
              ) : null}
              <Row label="Total" value={money(breakdown.total, data.currency)} bold />
            </View>
          ) : null}

          <Text style={styles.meta}>{policyLabel[data.cancellation_policy]}</Text>

          <Button label="Continue to waiver" onPress={() => setStep("waiver")} />
        </Card>
      ) : null}

      {step === "waiver" || step === "paying" ? (
        <Card>
          <View style={styles.waiverHeader}>
            <Text style={styles.sectionTitle}>Liability waiver</Text>
            <Badge label={`v${waiver.data?.version ?? "?"}`} />
          </View>
          <Text style={styles.meta}>
            Required for every attendee, including free hikes. Read it in full — you are
            signing it.
          </Text>

          <ScrollView style={styles.waiverBox} nestedScrollEnabled>
            <Text style={styles.waiverText}>{waiver.data?.bodyMd}</Text>
          </ScrollView>

          <Pressable
            onPress={() => setAgreed((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
            accessibilityLabel="I have read and agree to the waiver"
            style={styles.checkboxRow}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={styles.body}>
              I have read the waiver in full and I agree to it.
            </Text>
          </Pressable>

          <Field
            label="Type your full legal name to sign"
            value={signedName}
            onChangeText={setSignedName}
            placeholder="Alex Chen"
            autoCapitalize="words"
            hint="This name, the time, and the waiver version are recorded."
          />

          <Button
            label={isFree ? "Sign and RSVP" : `Sign and pay ${money(breakdown?.total ?? 0, data.currency)}`}
            onPress={() => void onConfirm()}
            loading={busy}
            disabled={!agreed || signedName.trim().length < 2}
          />
        </Card>
      ) : null}
    </Screen>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "spots", label: "Spots" },
    { key: "waiver", label: "Waiver" },
    { key: "paying", label: "Pay" },
  ];
  const activeIndex = steps.findIndex((s) => s.key === step);

  return (
    <View style={styles.steps}>
      {steps.map((s, index) => (
        <View key={s.key} style={styles.stepItem}>
          <View style={[styles.stepDot, index <= activeIndex && styles.stepDotActive]} />
          <Text style={[styles.stepLabel, index <= activeIndex && styles.stepLabelActive]}>
            {s.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.body, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.body, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted },
  body: { ...typography.body, color: colors.text, flex: 1 },
  bold: { fontWeight: "700" },
  sectionTitle: { ...typography.heading, color: colors.text },

  steps: { flexDirection: "row", gap: spacing.lg, paddingVertical: spacing.sm },
  stepItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
  },
  stepDotActive: { backgroundColor: colors.forest },
  stepLabel: { ...typography.label, color: colors.textMuted },
  stepLabelActive: { color: colors.forest },

  qtyRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  qtyChip: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qtyChipActive: { backgroundColor: colors.forest, borderColor: colors.forest },
  qtyLabel: { ...typography.heading, color: colors.forest },
  qtyLabelActive: { color: colors.textInverse },

  breakdown: {
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },

  waiverHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  waiverBox: {
    maxHeight: 260,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
  },
  waiverText: { ...typography.caption, color: colors.text },

  checkboxRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 44 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: colors.forest, borderColor: colors.forest },
  checkmark: { color: colors.textInverse, fontSize: 15, fontWeight: "700" },
});
