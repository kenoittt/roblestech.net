/**
 * Sign in (FR-1.1).
 *
 * Email + password is wired up. Apple and Google are stubbed until the provider credentials
 * exist — Apple sign-in is mandatory for App Store review once Google is enabled, so the two
 * ship together or not at all.
 */

import { useState } from "react";
import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Button, Field, Screen } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { colors, spacing, typography } from "@/theme/tokens";

export default function SignInScreen() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>TrailMate</Text>
        <Text style={styles.subtitle}>Find a hike. Go with people who know the trail.</Text>
      </View>

      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        placeholder="••••••••"
        error={error ?? undefined}
      />

      <Button label="Sign in" onPress={onSubmit} loading={submitting} disabled={!email || !password} />

      <Text style={styles.footer}>
        New here? <Link href="/(auth)/sign-up" style={styles.link}>Create an account</Link>
      </Text>

      {/* TODO(FR-1.1): Apple + Google OAuth via supabase.auth.signInWithOAuth once the
          provider credentials are configured in supabase/config.toml. */}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, paddingVertical: spacing.xxl },
  title: { ...typography.display, color: colors.forest },
  subtitle: { ...typography.body, color: colors.textMuted },
  footer: { ...typography.body, color: colors.textMuted, textAlign: "center", marginTop: spacing.lg },
  link: { color: colors.forest, fontWeight: "600" },
});
