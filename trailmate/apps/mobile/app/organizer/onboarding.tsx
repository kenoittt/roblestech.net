/**
 * Organizer onboarding (FR-2.1, FR-2.2).
 *
 * Two gates, both owned by Stripe and both required before a listing can leave `draft`:
 *   1. Identity — document + selfie via Stripe Identity.
 *   2. Payouts — bank details, KYC and tax info via Connect Express.
 *
 * Neither result is taken from the client. The screen shows what Stripe has told the
 * webhook, refetched on focus, which is why "Refresh status" exists rather than an
 * optimistic tick.
 */

import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, Screen } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { FunctionError, startConnectOnboarding, startIdentityVerification } from "@/lib/functions";
import { colors, spacing, typography } from "@/theme/tokens";
import type { OrganizerProfileRow } from "@/types/database";

export default function OrganizerOnboardingScreen() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const [busy, setBusy] = useState<"identity" | "payouts" | null>(null);

  const organizer = useQuery({
    queryKey: ["organizer-profile", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async (): Promise<OrganizerProfileRow | null> => {
      const { data, error } = await supabase
        .from("organizer_profiles")
        .select("*")
        .eq("user_id", profile!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as OrganizerProfileRow | null) ?? null;
    },
  });

  // Coming back from the hosted Stripe flow, the webhook may have landed a second ago.
  useFocusEffect(
    useCallback(() => {
      void organizer.refetch();
      void refreshProfile();
    }, [organizer, refreshProfile]),
  );

  const identityDone = organizer.data?.identity_status === "verified";
  const payoutsDone = Boolean(organizer.data?.charges_enabled && organizer.data?.payouts_enabled);
  const canPublish = identityDone && payoutsDone && organizer.data?.status === "verified";

  async function onVerifyIdentity() {
    setBusy("identity");
    try {
      const result = await startIdentityVerification();
      if (result.alreadyVerified) {
        Alert.alert("Already verified", "Your identity check has already passed.");
        return;
      }
      // TODO(FR-2.1): present the Stripe Identity native sheet with result.clientSecret via
      // @stripe/stripe-identity-react-native. Until that dependency is added, the session is
      // created and the webhook still drives the status.
      Alert.alert(
        "Verification started",
        "A verification session was created. The native Identity sheet lands with the development build; the result arrives by webhook either way.",
      );
    } catch (error) {
      Alert.alert(
        "Could not start verification",
        error instanceof FunctionError ? error.message : "Please try again.",
      );
    } finally {
      setBusy(null);
      void organizer.refetch();
    }
  }

  async function onSetUpPayouts() {
    setBusy("payouts");
    try {
      const { url } = await startConnectOnboarding({ country: "US" });
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert(
        "Could not open payout setup",
        error instanceof FunctionError ? error.message : "Please try again.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen loading={organizer.isLoading} error={organizer.error} onRetry={() => organizer.refetch()}>
      <Text style={styles.title}>Become an organizer</Text>
      <Text style={styles.body}>
        Two steps, both handled by Stripe. You can build a draft listing at any time —
        publishing unlocks when both are green.
      </Text>

      <Card>
        <View style={styles.stepHeader}>
          <Text style={styles.sectionTitle}>1. Verify your identity</Text>
          <Badge
            label={identityDone ? "Verified" : (organizer.data?.identity_status ?? "not started")}
            tone={identityDone ? "success" : "warning"}
          />
        </View>
        <Text style={styles.meta}>
          A government ID and a selfie. Hikers see a verification badge on your profile — it
          is the single biggest trust signal on a listing.
        </Text>
        {!identityDone ? (
          <Button
            label="Start ID check"
            onPress={() => void onVerifyIdentity()}
            loading={busy === "identity"}
          />
        ) : null}
      </Card>

      <Card>
        <View style={styles.stepHeader}>
          <Text style={styles.sectionTitle}>2. Set up payouts</Text>
          <Badge
            label={payoutsDone ? "Ready" : organizer.data?.details_submitted ? "In review" : "Not started"}
            tone={payoutsDone ? "success" : "warning"}
          />
        </View>
        <Text style={styles.meta}>
          Bank details, tax info and identity checks, collected by Stripe. Earnings are
          released 24 hours after each hike completes.
        </Text>
        {!payoutsDone ? (
          <Button
            label={organizer.data?.details_submitted ? "Continue setup" : "Set up payouts"}
            onPress={() => void onSetUpPayouts()}
            loading={busy === "payouts"}
          />
        ) : null}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Before you publish</Text>
        <Text style={styles.meta}>
          Publishing also requires confirming you carry a first-aid kit and that you have
          checked the forecast within the last 7 days (FR-10.4).
        </Text>
      </Card>

      <Button label="Refresh status" variant="secondary" onPress={() => void organizer.refetch()} />

      {canPublish ? (
        <Button label="Go to organizer dashboard" onPress={() => router.replace("/organizer")} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.text },
  body: { ...typography.body, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted },
  sectionTitle: { ...typography.heading, color: colors.text },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
});
