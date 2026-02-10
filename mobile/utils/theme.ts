export const COLORS = {
  gradientStart: "#FFD1DC",
  gradientEnd: "#FFF5CC",
  surface: "#FFFFFF",
  surfaceAlt: "#FFF0F5",
  text: "#2D2D2D",
  textSecondary: "#8E8E93",
  accent: "#E8A0BF",
  accentAlt: "#F5C6AA",
  success: "#A8D5BA",
  error: "#F4A7A7",
  border: "#F0E6EF",
  buttonPrimary: "#E8A0BF",
  buttonText: "#FFFFFF",
  inactive: "#D4D4D8",
} as const;

export const TYPOGRAPHY = {
  heading: { fontSize: 28, fontWeight: "700" as const },
  body: { fontSize: 18, fontWeight: "400" as const },
  caption: { fontSize: 14, fontWeight: "400" as const },
  label: { fontSize: 16, fontWeight: "600" as const },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const RADII = {
  sm: 8,
  md: 16,
  lg: 24,
  full: 999,
} as const;
