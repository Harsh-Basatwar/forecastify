"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Decorative forecast sparkline for the brand panel.
 *
 * Drawn once — no infinite loops, no per-frame `cx`/`cy` geometry writes and
 * no `feGaussianBlur` re-running every frame. Colours come from the
 * panel-scoped custom properties so the graph follows the panel's theme.
 */
export default function ForecastGraphSVG() {
  const reduceMotion = useReducedMotion();

  const historicalPath = "M0 240 Q 100 210, 200 225 T 400 140 T 520 160";
  const predictedPath = "M 520 160 C 580 120, 640 70, 720 95 T 800 40";
  const confidenceBandTop =
    "M 520 160 C 580 100, 640 45, 720 70 T 800 20 L 800 65 T 720 120 C 640 95, 580 140, 520 160 Z";

  const line = "var(--panel-accent, #3BB8A5)";
  const forecast = "var(--panel-forecast, #7FC49A)";

  // One-shot draw-in, at the motion ceiling. Skipped entirely when reduced.
  const draw = (delay: number) =>
    reduceMotion
      ? undefined
      : { duration: 0.24, delay, ease: "easeOut" as const };

  return (
    <div
      aria-hidden="true"
      className="relative w-full h-full overflow-hidden pointer-events-none select-none"
    >
      <svg className="w-full h-full" viewBox="0 0 800 280" preserveAspectRatio="none">
        <defs>
          <linearGradient id="fx-pred-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={forecast} stopOpacity="0.28" />
            <stop offset="100%" stopColor={forecast} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Confidence band */}
        <path d={confidenceBandTop} fill="url(#fx-pred-grad)" opacity="0.5" />

        {/* Baseline reference wave */}
        <path
          d="M0 270 Q 150 250, 300 260 T 600 230 T 800 200"
          stroke="var(--panel-line, rgba(245, 243, 237, 0.12))"
          strokeWidth="1.2"
          fill="none"
          strokeDasharray="4 6"
        />

        {/* Historical */}
        <motion.path
          d={historicalPath}
          stroke={line}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          initial={reduceMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={draw(0)}
        />

        {/* Forecast */}
        <motion.path
          d={predictedPath}
          stroke={forecast}
          strokeWidth="2.5"
          strokeDasharray="6 6"
          fill="none"
          strokeLinecap="round"
          initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={draw(0.06)}
        />

        {/* Today / forecast junction */}
        <motion.circle
          cx="520"
          cy="160"
          r="4.5"
          fill={line}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          initial={reduceMotion ? false : { scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={draw(0.06)}
        />
        <circle cx="520" cy="160" r="9" stroke={line} strokeWidth="1" fill="none" opacity="0.4" />
      </svg>
    </div>
  );
}
