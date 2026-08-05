/**
 * Shared Recharts theming for Forecastify.
 *
 * Every value resolves to a CSS custom property, so charts re-tint
 * automatically when the `.dark` class flips — no JS theme listener needed.
 * (Verified: `var()` resolves correctly in SVG presentation attributes.)
 *
 * Import these instead of redeclaring local colour arrays.
 */

/** Categorical ramp. Each swatch clears 3:1 against `--card` in both
 *  themes and is hue-separated from its neighbours. */
export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
] as const;

/** Pick a ramp colour by index, wrapping safely. */
export const chartColor = (i: number) => CHART_COLORS[i % CHART_COLORS.length];

/** Semantic series colours — meaning, not decoration. */
export const SERIES = {
  primary: "var(--accent)",
  comparison: "var(--muted-foreground)",
  threshold: "var(--warning)",
  danger: "var(--danger)",
  success: "var(--success)",
} as const;

/** Dash patterns so series stay distinguishable without colour
 *  (WCAG 1.4.1 — never encode meaning in hue alone). */
export const DASH = {
  solid: undefined,
  comparison: "5 4",
  threshold: "2 4",
} as const;

/** Tooltip surface — floating, so it earns a real shadow. */
export const tooltipStyle = {
  background: "var(--elevated)",
  border: "1px solid var(--border-strong)",
  borderRadius: "10px",
  boxShadow: "var(--shadow-md)",
  fontSize: "12px",
  color: "var(--foreground)",
} as const;

export const tooltipLabelStyle = {
  color: "var(--muted-foreground)",
  fontSize: "11px",
  marginBottom: "2px",
} as const;

/** Minimal grid — horizontal rules only by default. */
export const gridProps = {
  strokeDasharray: "4 6",
  stroke: "var(--border)",
  vertical: false,
} as const;

/** Axis defaults — no tick marks, no axis line, quiet labels. */
export const axisProps = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

export const legendProps = {
  wrapperStyle: { fontSize: "11px", paddingTop: "8px" },
  iconType: "plainline",
} as const;

/** One height scale for every chart, so panels align across pages. */
export const CHART_H = {
  spark: 64,
  compact: 180,
  standard: 260,
  tall: 320,
} as const;
