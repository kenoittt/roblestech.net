/**
 * Profile & settings (FR-1.2, FR-1.3, FR-1.4, FR-9.2).
 *
 * Also the entry point to "Become an organizer" (FR-1.3) and to in-app account deletion,
 * which App Review checks for explicitly (§10 Phase 3).
 */

import { useState } from "react";
import { useRouter } from "expo-router";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, Screen } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { deleteAccount, FunctionError } from "@/lib/functions";
import { distance } from "@/lib/format";
import { colors, spacing, typography } from "@/theme/tokens";

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, isOrganizer, isAdmin, signOut, loading } = useAuth();
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    setDeleting(true);
    try {
      await deleteAccount();
      Alert.alert(
        "Account deleted",
        "Your profile has been removed. Booking and payment records are retained as required by law.",
      );
      await signOut();
    } catch (error) {
      Alert.alert(
        "Could not delete account",
        error instanceof FunctionError ? error.message : "Please try again.",
      );
    } finally {
      setDeleting(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      "Delete your account?",
      "This removes your profile, photo and follows. Booking, waiver and payment records are kept for 7 years as required by law. This cannot be undone.",
      [
        { text: "Keep my account", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => void onDelete() },
      ],
    );
  }

  return (
    <Screen loading={loading}>
      <Card>
        <Text style={styles.name}>{profile?.display_name ?? "—"}</Text>
        {profile?.region ? <Text style={styles.meta}>{profile.region}</Text> : null}
        {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        <View style={styles.badges}>
          <Badge label={profile?.experience_level ?? "beginner"} />
          {isOrganizer ? <Badge label="Organizer" tone="success" /> : null}
          {isAdmin ? <Badge label="Admin" tone="info" /> : null}
        </View>

        <View style={styles.stats}>
          <Stat label="Hikes" value={String(profile?.hikes_completed ?? 0)} />
          <Stat label="Distance" value={distance(profile?.distance_completed_km ?? 0)} />
        </View>
      </Card>

      {isOrganizer ? (
        <Button label="Organizer dashboard" onPress={() => router.push("/organizer")} />
      ) : (
        <Card>
          <Text style={styles.cardTitle}>Lead your own hikes</Text>
          <Text style={styles.meta}>
            Verify your ID and connect a payout account, then publish hikes and get paid 24
            hours after each one.
          </Text>
          <Button
            label="Become an organizer"
            onPress={() => router.push("/organizer/onboarding")}
          />
        </Card>
      )}

      <Card>
        <Text style={styles.cardTitle}>Settings</Text>
        {/* TODO(FR-9.2): per-category notification toggles, reading and writing
            public.notification_prefs — one row per notification_type. */}
        {/* TODO(FR-1.5): emergency contact editor, writing user_emergency_contacts. */}
        {/* TODO(FR-1.2): edit profile — name, photo, bio, region, experience level. */}
        <Text style={styles.meta}>
          Notification preferences, emergency contact and profile editing are next up
          (FR-9.2, FR-1.5, FR-1.2).
        </Text>
      </Card>

      <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />

      <Button
        label="Delete account"
        variant="ghost"
        onPress={confirmDelete}
        loading={deleting}
        accessibilityHint="Removes your profile. Financial records are retained."
      />
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
  name: { ...typography.title, color: colors.text },
  bio: { ...typography.body, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted },
  cardTitle: { ...typography.heading, color: colors.text },
  badges: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap", marginTop: spacing.sm },
  stats: { flexDirection: "row", gap: spacing.xl, marginTop: spacing.md },
  stat: { gap: 2 },
  statValue: { ...typography.title, color: colors.forest },
  statLabel: { ...typography.label, color: colors.textMuted, textTransform: "uppercase" },
});
