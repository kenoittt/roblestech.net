/**
 * Design tokens.
 *
 * Deliberately small — a scaffold, not a design system. Colours lean forest/stone so the
 * UI sits behind outdoor photography without competing with it. Type scale is expressed in
 * points that respect Dynamic Type when passed through `allowFontScaling` (NFR-6).
 */

export const colors = {
  // Brand
  forest: "#0F2E1E",
  forestLight: "#1B4A32",
  moss: "#4A7C59",
  clay: "#C2703D",

  // Surfaces
  background: "#FBFAF7",
  surface: "#FFFFFF",
  surfaceAlt: "#F2F0EA",
  border: "#E2DFD6",

  // Text
  text: "#171612",
  textMuted: "#5F5C53",
  textInverse: "#FFFFFF",

  // Semantic
  success: "#1F7A46",
  warning: "#B7791F",
  danger: "#B3261E",
  info: "#2B5F8C",
} as const;

/** FR-3.1 difficulty is a first-class visual signal, so it gets fixed colours. */
export const difficultyColors = {
  easy: "#2F7D51",
  moderate: "#B7791F",
  hard: "#C2703D",
  expert: "#8C2F2F",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 30, fontWeight: "700" as const, lineHeight: 36 },
  title: { fontSize: 22, fontWeight: "700" as const, lineHeight: 28 },
  heading: { fontSize: 17, fontWeight: "600" as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: "400" as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: "400" as const, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: "600" as const, lineHeight: 16 },
} as const;

/** Minimum touch target. NFR-6 / platform HIG both land on 44pt. */
export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const minTouchTarget = 44;
