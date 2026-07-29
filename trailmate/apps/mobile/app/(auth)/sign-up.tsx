/**
 * Sign up (FR-1.1, NFR-4).
 *
 * The 18+ confirmation is collected here rather than at checkout: v1 is adults-only, which
 * is what keeps the waiver and safety posture simple (NFR-4). Booking is blocked server-side
 * until users.adult_confirmed_at is set.
 */

import { useState } from "react";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Field, Screen } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { colors, radii, spacing, typography } from "@/theme/tokens";

export default function SignUpScreen() {
  const { signUpWithEmail } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdult, setIsAdult] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    displayName.trim().length >= 2 &&
    email.includes("@") &&
    password.length >= 10 &&
    isAdult &&
    acceptedTerms;

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await signUpWithEmail(email.trim(), password, displayName.trim());

      // The profile row is created by the on_auth_user_created trigger; stamp the 18+
      // attestation on it now that the session exists.
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await supabase
          .from("users")
          .update({ adult_confirmed_at: new Date().toISOString() })
          .eq("auth_id", data.session.user.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create your account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Create your account</Text>

      <Field label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="Alex Chen" />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        hint="At least 10 characters."
        error={error ?? undefined}
      />

      <Checkbox
        checked={isAdult}
        onToggle={() => setIsAdult((v) => !v)}
        label="I confirm I am 18 or older."
      />
      <Checkbox
        checked={acceptedTerms}
        onToggle={() => setAcceptedTerms((v) => !v)}
        label="I agree to the Terms of Service and Privacy Policy."
      />

      <Button label="Create account" onPress={onSubmit} loading={submitting} disabled={!canSubmit} />

      <Text style={styles.footer}>
        Already have an account? <Link href="/(auth)/sign-in" style={styles.link}>Sign in</Link>
      </Text>
    </Screen>
  );
}

function Checkbox({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={styles.checkboxRow}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <Text style={styles.checkmark}>✓</Text> : null}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.text, marginBottom: spacing.sm },
  footer: { ...typography.body, color: colors.textMuted, textAlign: "center", marginTop: spacing.lg },
  link: { color: colors.forest, fontWeight: "600" },
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
  checkboxLabel: { ...typography.body, color: colors.text, flex: 1 },
});
