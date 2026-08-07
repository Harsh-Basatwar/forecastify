"use client";

/**
 * Hero data visualisation.
 *
 * A real chart of illustrative data, not a decorative squiggle and not a
 * div-built fake screenshot: the series below are plotted through the same
 * scale/path helpers a production chart would use, so the shape of the curve
 * is a consequence of the numbers rather than of a hand-drawn bezier.
 *
 * The draw-in is one-shot and scroll-independent. Under reduced motion the
 * final frame renders immediately.
 */

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion-primitives";

/* Illustrative daily unit sales for a single SKU. 14 observed, 7 predicted. */
const OBSERVED = [42, 38, 45, 41, 47, 44, 52, 48, 46, 53, 50, 58, 55, 61];
const PREDICTED = [61, 72, 89, 118, 141, 126, 94, 76];
/* Half-width of the prediction interval, widening with horizon. */
const INTERVAL = [0, 7, 12, 19, 26, 29, 31, 34];

const W = 760;
const H = 320;
const PAD = { top: 26, right: 18, bottom: 30, left: 18 };

const TOTAL_POINTS = OBSERVED.length + PREDICTED.length - 1;
const Y_MAX = 190;

const x = (i: number) =>
  PAD.left + (i / (TOTAL_POINTS - 1)) * (W - PAD.left - PAD.right);
const y = (v: number) =>
  H - PAD.bottom - (v / Y_MAX) * (H - PAD.top - PAD.bottom);

/** Catmull-Rom to cubic bezier, so the line reads as a curve without inventing points. */
function smoothPath(points: [number, number][]) {
  if (points.length < 2) return "";
  let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

const observedPts: [number, number][] = OBSERVED.map((v, i) => [x(i), y(v)]);
const predictedPts: [number, number][] = PREDICTED.map((v, i) => [
  x(OBSERVED.length - 1 + i),
  y(v),
]);

const observedPath = smoothPath(observedPts);
const predictedPath = smoothPath(predictedPts);

const bandPath = (() => {
  const upper: [number, number][] = PREDICTED.map((v, i) => [
    x(OBSERVED.length - 1 + i),
    y(v + INTERVAL[i]),
  ]);
  const lower: [number, number][] = PREDICTED.map((v, i) => [
    x(OBSERVED.length - 1 + i),
    y(Math.max(0, v - INTERVAL[i])),
  ]);
  return `${smoothPath(upper)} L ${lower[lower.length - 1][0].toFixed(1)} ${lower[
    lower.length - 1
  ][1].toFixed(1)} ${smoothPath([...lower].reverse()).replace(/^M[^C]*/, "")} Z`;
})();

const splitX = x(OBSERVED.length - 1);
const peakIndex = PREDICTED.indexOf(Math.max(...PREDICTED));
const peak: [number, number] = [
  x(OBSERVED.length - 1 + peakIndex),
  y(PREDICTED[peakIndex]),
];

export default function ForecastCanvas() {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");

  const draw = (delay: number, duration: number) =>
    reduce ? { duration: 0 } : { duration, delay, ease: EASE_OUT };

  return (
    <figure className="relative w-full">
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] border bg-[var(--card)]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full h-auto"
          role="img"
          aria-label="Daily unit sales for one product: fourteen observed days rising into a seven-day forecast that peaks during a festival, shown with a widening prediction interval."
        >
          <defs>
            <linearGradient id={`band-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.20" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id={`fade-${uid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--border)" stopOpacity="0" />
              <stop offset="12%" stopColor="var(--border)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--border)" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Gridlines. Present because the reader needs a scale, not as decoration. */}
          {[50, 100, 150].map((v) => (
            <line
              key={v}
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(v)}
              y2={y(v)}
              stroke={`url(#fade-${uid})`}
              strokeWidth="1"
            />
          ))}

          {/* Prediction interval */}
          <motion.path
            d={bandPath}
            fill={`url(#band-${uid})`}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={draw(0.85, 0.7)}
          />

          {/* Boundary between what happened and what is expected */}
          <motion.line
            x1={splitX}
            x2={splitX}
            y1={PAD.top - 6}
            y2={H - PAD.bottom}
            stroke="var(--border-strong)"
            strokeWidth="1"
            strokeDasharray="3 5"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={draw(0.7, 0.4)}
          />
          <motion.text
            x={splitX - 8}
            y={PAD.top - 12}
            textAnchor="end"
            className="fill-[var(--muted-foreground)] text-[11px]"
            style={{ fontFamily: "var(--font-mono)" }}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={draw(0.7, 0.4)}
          >
            today
          </motion.text>

          {/* Observed */}
          <motion.path
            d={observedPath}
            fill="none"
            stroke="var(--foreground)"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.72"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={draw(0.15, 1.1)}
          />

          {/* Forecast */}
          <motion.path
            d={predictedPath}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="7 6"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={draw(0.95, 0.9)}
          />

          {/* Peak marker plus the reason for it. The annotation is the point:
              a number without a cause is not an explanation. */}
          <motion.g
            initial={reduce ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={draw(1.5, 0.5)}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          >
            <circle cx={peak[0]} cy={peak[1]} r="4.5" fill="var(--accent)" />
            <circle
              cx={peak[0]}
              cy={peak[1]}
              r="10"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1"
              opacity="0.45"
            />
            <line
              x1={peak[0]}
              x2={peak[0]}
              y1={peak[1] - 14}
              y2={peak[1] - 34}
              stroke="var(--accent-border)"
              strokeWidth="1"
            />
          </motion.g>
        </svg>

        {/* Annotation lives in the DOM, not the SVG, so it stays selectable
            and scales with the reader's font settings. */}
        <motion.div
          className="absolute left-[52%] top-[6%] max-w-[42%] rounded-[var(--radius-sm)] border border-[var(--accent-border)] bg-[var(--elevated)] px-3 py-2"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={draw(1.6, 0.5)}
        >
          <p className="text-[11px] leading-tight text-[var(--muted-foreground)]">
            Peak driven by
          </p>
          <p className="text-[12.5px] font-medium leading-snug text-[var(--foreground)]">
            Ganesh Chaturthi, plus three days of forecast rain
          </p>
        </motion.div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t px-4 py-2.5 text-[11px] text-[var(--muted-foreground)]">
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-px w-5 bg-[var(--foreground)] opacity-70"
            />
            Sold
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-px w-5 border-t border-dashed border-[var(--accent)]"
            />
            Forecast
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2.5 w-5 rounded-[2px] bg-[var(--accent)] opacity-20"
            />
            Confidence range
          </span>
        </div>
      </div>

      <figcaption className="mt-3 text-[11.5px] text-[var(--muted-foreground)]">
        Illustrative data for a single product.
      </figcaption>
    </figure>
  );
}
