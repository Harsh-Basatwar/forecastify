"use client";
import React from "react";
import { useReducedMotion } from "framer-motion";

export type OrbState = "sleeping" | "idle" | "listening" | "thinking" | "speaking" | "paused" | "report";

interface AiOrbProps {
  state: OrbState;
  onClick?: () => void;
  className?: string;
  /** What activating the orb DOES — this is the accessible name. State is
   *  announced separately by the page's live regions. */
  actionLabel?: string;
}

/* Geometry is fixed and scaled with transform. Animating the SVG `r`
   attribute re-runs layout every frame; `scale` stays on the compositor. */
const CORE_BASE_R = 13;
const FIELD_BASE_R = 27;

// Calm, minimal intelligence indicator — a teal concentric pulse on paper.
// State is expressed through pulse cadence and core presence, not spectacle.
export function AiOrb({ state, onClick, className = "", actionLabel }: AiOrbProps) {
  const reduceMotion = useReducedMotion();

  const getOrbConfig = () => {
    switch (state) {
      case "sleeping":
      case "paused":
        return { coreOpacity: 0.35, coreR: 10, pulseOpacity: 0, pulseDuration: "0s", showArc: false, ringOpacity: 0.6 };
      case "idle":
        return { coreOpacity: 0.9, coreR: 11, pulseOpacity: 0.35, pulseDuration: "4.5s", showArc: false, ringOpacity: 1 };
      case "listening":
        return { coreOpacity: 1, coreR: 13, pulseOpacity: 0.6, pulseDuration: "2.2s", showArc: false, ringOpacity: 1 };
      case "thinking":
        return { coreOpacity: 1, coreR: 11, pulseOpacity: 0.3, pulseDuration: "3.5s", showArc: true, ringOpacity: 1 };
      case "speaking":
        return { coreOpacity: 1, coreR: 12, pulseOpacity: 0.55, pulseDuration: "1.8s", showArc: false, ringOpacity: 1 };
      case "report":
        return { coreOpacity: 1, coreR: 12, pulseOpacity: 0.5, pulseDuration: "1.6s", showArc: true, ringOpacity: 1 };
      default:
        return { coreOpacity: 0.9, coreR: 11, pulseOpacity: 0.35, pulseDuration: "4.5s", showArc: false, ringOpacity: 1 };
    }
  };

  const config = getOrbConfig();

  const defaultLabel =
    state === "sleeping" ? "Wake Jarvis and start listening"
      : state === "paused" ? "Resume Jarvis"
      : state === "speaking" ? "Stop Jarvis speaking"
      : "Stop Jarvis";

  // Geometry transition — short, and skipped entirely for reduced motion.
  const geomTransition = reduceMotion
    ? undefined
    : "transform var(--t-medium) var(--ease-out), opacity var(--t-medium) var(--ease-out)";
  const scaleStyle = (r: number, base: number): React.CSSProperties => ({
    transformBox: "fill-box",
    transformOrigin: "center",
    transform: `scale(${r / base})`,
  });

  return (
    <button
      type="button"
      className={`fx-orb relative flex items-center justify-center w-40 h-40 fx-focus rounded-full ${className}`}
      onClick={onClick}
      aria-label={actionLabel ?? defaultLabel}
    >
      <svg
        viewBox="0 0 160 160"
        className="w-full h-full"
        aria-hidden="true"
        style={{
          "--orb-pulse-opacity": config.pulseOpacity,
          "--orb-core-opacity": config.coreOpacity,
        } as React.CSSProperties}
      >
        {/* Paper disc — grounds the indicator on the page */}
        <circle cx="80" cy="80" r="62" fill="var(--card)" stroke="var(--border)" strokeWidth="1" style={{ opacity: config.ringOpacity, transition: geomTransition }} />

        {/* Outer hairline reference ring */}
        <circle cx="80" cy="80" r="74" fill="none" stroke="var(--border)" strokeWidth="1" style={{ opacity: config.ringOpacity * 0.8, transition: geomTransition }} />

        {/* Concentric pulse — cadence carries the state.
            Held still for anyone who asked for reduced motion. */}
        {config.pulseOpacity > 0 && !reduceMotion && (
          <>
            <circle
              cx="80" cy="80" r="72"
              fill="none" stroke="var(--accent)" strokeWidth="1"
              className="origin-center"
              style={{ animation: `orb-quiet-pulse ${config.pulseDuration} var(--ease-out) infinite` }}
            />
            {(state === "speaking" || state === "listening") && (
              <circle
                cx="80" cy="80" r="72"
                fill="none" stroke="var(--accent)" strokeWidth="1"
                className="origin-center"
                style={{ animation: `orb-quiet-pulse-b ${config.pulseDuration} var(--ease-out) infinite` }}
              />
            )}
          </>
        )}

        {/* Thinking / report — slow dashed arc, quiet processing cue */}
        {config.showArc && (
          <circle
            cx="80" cy="80" r="48"
            fill="none" stroke="var(--muted-foreground)" strokeWidth="1"
            strokeDasharray="3 9" strokeLinecap="round"
            className="origin-center"
            style={{ animation: reduceMotion ? undefined : "orb-arc-turn 6s linear infinite", opacity: 0.7 }}
          />
        )}

        {/* Soft accent field behind the core */}
        <circle
          cx="80" cy="80" r={FIELD_BASE_R}
          fill="var(--accent)"
          style={{
            ...scaleStyle(config.coreR + 14, FIELD_BASE_R),
            opacity: config.coreOpacity * 0.1,
            transition: geomTransition,
          }}
        />

        {/* Core signal */}
        <circle
          cx="80" cy="80" r={CORE_BASE_R}
          fill="var(--accent)"
          style={{
            ...scaleStyle(config.coreR, CORE_BASE_R),
            transition: geomTransition,
            animation: (state === "sleeping" || state === "paused") && !reduceMotion
              ? "orb-core-breathe 5s ease-in-out infinite"
              : undefined,
            opacity: config.coreOpacity,
          }}
        />
      </svg>
    </button>
  );
}
