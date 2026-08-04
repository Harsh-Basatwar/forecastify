"use client";
import React from "react";

export type OrbState = "sleeping" | "idle" | "listening" | "thinking" | "speaking" | "paused" | "report";

interface AiOrbProps {
  state: OrbState;
  onClick?: () => void;
  className?: string;
}

// Calm, minimal intelligence indicator — a teal concentric pulse on paper.
// State is expressed through pulse cadence and core presence, not spectacle.
export function AiOrb({ state, onClick, className = "" }: AiOrbProps) {
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

  return (
    <div
      className={`relative flex items-center justify-center w-40 h-40 cursor-pointer fx-focus rounded-full ${className}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Jarvis status: ${state}`}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } }}
    >
      <style>{`
        @keyframes orb-quiet-pulse {
          0% { transform: scale(0.55); opacity: var(--orb-pulse-opacity); }
          80% { transform: scale(1); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes orb-quiet-pulse-b {
          0% { transform: scale(0.55); opacity: 0; }
          20% { transform: scale(0.64); opacity: var(--orb-pulse-opacity); }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes orb-arc-turn {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orb-core-breathe {
          0%, 100% { opacity: var(--orb-core-opacity); }
          50% { opacity: calc(var(--orb-core-opacity) * 0.65); }
        }
      `}</style>

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
        <circle cx="80" cy="80" r="62" fill="var(--card)" stroke="var(--border)" strokeWidth="1" style={{ opacity: config.ringOpacity, transition: "opacity 400ms ease" }} />

        {/* Outer hairline reference ring */}
        <circle cx="80" cy="80" r="74" fill="none" stroke="var(--border)" strokeWidth="1" style={{ opacity: config.ringOpacity * 0.8, transition: "opacity 400ms ease" }} />

        {/* Concentric pulse — cadence carries the state */}
        {config.pulseOpacity > 0 && (
          <>
            <circle
              cx="80" cy="80" r="72"
              fill="none" stroke="var(--accent)" strokeWidth="1"
              className="origin-center"
              style={{ animation: `orb-quiet-pulse ${config.pulseDuration} cubic-bezier(0.16, 1, 0.3, 1) infinite` }}
            />
            {(state === "speaking" || state === "listening") && (
              <circle
                cx="80" cy="80" r="72"
                fill="none" stroke="var(--accent)" strokeWidth="1"
                className="origin-center"
                style={{ animation: `orb-quiet-pulse-b ${config.pulseDuration} cubic-bezier(0.16, 1, 0.3, 1) infinite` }}
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
            style={{ animation: "orb-arc-turn 6s linear infinite", opacity: 0.7 }}
          />
        )}

        {/* Soft accent field behind the core */}
        <circle
          cx="80" cy="80" r={config.coreR + 14}
          fill="var(--accent)"
          style={{ opacity: config.coreOpacity * 0.1, transition: "opacity 400ms ease, r 400ms ease" }}
        />

        {/* Core signal */}
        <circle
          cx="80" cy="80" r={config.coreR}
          fill="var(--accent)"
          style={{
            transition: "r 400ms cubic-bezier(0.16, 1, 0.3, 1)",
            animation: state === "sleeping" || state === "paused"
              ? "orb-core-breathe 5s ease-in-out infinite"
              : undefined,
            opacity: config.coreOpacity,
          }}
        />
      </svg>
    </div>
  );
}
