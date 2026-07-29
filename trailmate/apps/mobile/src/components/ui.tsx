/**
 * Small shared UI primitives. Intentionally plain — the UX spec called out in SDS §8 is the
 * next deliverable, and these exist so screens can be wired up before that lands.
 */

import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { colors, difficultyColors, minTouchTarget, radii, spacing, typography } from "@/theme/tokens";
import type { HikeDifficulty } from "@/types/database";

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
}) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(isDisabled), busy: Boolean(loading) }}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && styles.buttonPrimary,
        variant === "secondary" && styles.buttonSecondary,
        variant === "danger" && styles.buttonDanger,
        variant === "ghost" && styles.buttonGhost,
        pressed && !isDisabled && styles.buttonPressed,
        isDisabled && styles.buttonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" || variant === "ghost" ? colors.forest : colors.textInverse} />
      ) : (
        <Text
          style={[
            styles.buttonLabel,
            (variant === "secondary" || variant === "ghost") && styles.buttonLabelDark,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  error,
  ...inputProps
}: TextInputProps & { label: string; hint?: string; error?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error ? styles.inputError : null, inputProps.style]}
      />
      {hint && !error ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      {error ? (
        <Text style={styles.fieldError} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function Badge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const toneColor = {
    neutral: colors.textMuted,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    info: colors.info,
  }[tone];

  return (
    <View style={[styles.badge, { borderColor: toneColor }]}>
      <Text style={[styles.badgeLabel, { color: toneColor }]}>{label}</Text>
    </View>
  );
}

/** FR-3.1 — difficulty needs to read at a glance in a list of twenty hikes. */
export function DifficultyChip({ difficulty }: { difficulty: HikeDifficulty }) {
  return (
    <View style={[styles.chip, { backgroundColor: difficultyColors[difficulty] }]}>
      <Text style={styles.chipLabel}>
        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
      </Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Screen({
  children,
  scroll = true,
  loading,
  error,
  onRetry,
}: {
  /** Optional so a screen can render `<Screen loading />` while its data is in flight. */
  children?: ReactNode;
  scroll?: boolean;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
}) {
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.forest} />
      </View>
    );
  }

  if (error) {
    const message = error instanceof Error ? error.message : "Something went wrong.";
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>We hit a snag</Text>
        <Text style={styles.errorBody}>{message}</Text>
        {onRetry ? <Button label="Try again" onPress={onRetry} variant="secondary" /> : null}
      </View>
    );
  }

  return scroll ? (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.screen, styles.screenContent]}>{children}</View>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  screenContent: { padding: spacing.lg, gap: spacing.md },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },

  button: {
    minHeight: minTouchTarget,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  buttonPrimary: { backgroundColor: colors.forest },
  buttonSecondary: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  buttonDanger: { backgroundColor: colors.danger },
  buttonGhost: { backgroundColor: "transparent" },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.45 },
  buttonLabel: { ...typography.heading, color: colors.textInverse },
  buttonLabelDark: { color: colors.forest },

  field: { gap: spacing.xs },
  fieldLabel: { ...typography.label, color: colors.textMuted, textTransform: "uppercase" },
  input: {
    minHeight: minTouchTarget,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger },
  fieldHint: { ...typography.caption, color: colors.textMuted },
  fieldError: { ...typography.caption, color: colors.danger },

  badge: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  badgeLabel: { ...typography.label },

  chip: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  chipLabel: { ...typography.label, color: colors.textInverse },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },

  errorTitle: { ...typography.title, color: colors.text, textAlign: "center" },
  errorBody: { ...typography.body, color: colors.textMuted, textAlign: "center" },

  empty: { gap: spacing.sm, paddingVertical: spacing.xxl, alignItems: "center" },
  emptyTitle: { ...typography.heading, color: colors.text },
  emptyBody: { ...typography.body, color: colors.textMuted, textAlign: "center" },
});
