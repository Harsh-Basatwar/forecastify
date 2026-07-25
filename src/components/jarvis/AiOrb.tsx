"use client";
import React, { useEffect, useState } from "react";

export type OrbState = "sleeping" | "idle" | "listening" | "thinking" | "speaking" | "paused" | "report";

interface AiOrbProps {
  state: OrbState;
  onClick?: () => void;
  className?: string;
}

export function AiOrb({ state, onClick, className = "" }: AiOrbProps) {
  // Generate outer particles once
  const [particles] = useState(() => 
    Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      angle: (i * 360) / 12,
      distance: 90 + Math.random() * 20,
      speed: 5 + Math.random() * 10,
      size: 1 + Math.random() * 2,
      opacity: 0.3 + Math.random() * 0.5,
    }))
  );

  // Map state to animation speeds and glows
  const getOrbConfig = () => {
    switch (state) {
      case "sleeping":
      case "paused":
        return {
          coreGlow: "drop-shadow-[0_0_15px_rgba(56,189,248,0.2)]",
          coreOpacity: 0.3,
          ring1Speed: "20s",
          ring2Speed: "25s",
          pulseOpacity: 0,
          scale: "scale-95 grayscale-[50%]",
          floatSpeed: "6s",
        };
      case "idle":
        return {
          coreGlow: "drop-shadow-[0_0_30px_rgba(34,211,238,0.5)]",
          coreOpacity: 0.6,
          ring1Speed: "15s",
          ring2Speed: "20s",
          pulseOpacity: 0.2,
          scale: "scale-100",
          floatSpeed: "4s",
        };
      case "listening":
        return {
          coreGlow: "drop-shadow-[0_0_50px_rgba(56,189,248,0.8)] drop-shadow-[0_0_80px_rgba(59,130,246,0.5)]",
          coreOpacity: 0.9,
          ring1Speed: "8s",
          ring2Speed: "10s",
          pulseOpacity: 0.8,
          scale: "scale-110",
          floatSpeed: "2s",
        };
      case "thinking":
        return {
          coreGlow: "drop-shadow-[0_0_40px_rgba(14,165,233,0.7)]",
          coreOpacity: 0.8,
          ring1Speed: "3s",
          ring2Speed: "4s",
          pulseOpacity: 0.4,
          scale: "scale-105",
          floatSpeed: "3s",
        };
      case "speaking":
        return {
          coreGlow: "drop-shadow-[0_0_60px_rgba(34,211,238,0.9)] drop-shadow-[0_0_100px_rgba(6,182,212,0.6)]",
          coreOpacity: 1,
          ring1Speed: "10s",
          ring2Speed: "12s",
          pulseOpacity: 1,
          scale: "scale-105",
          floatSpeed: "3s",
        };
      case "report":
        return {
          coreGlow: "drop-shadow-[0_0_100px_rgba(255,255,255,1)] drop-shadow-[0_0_150px_rgba(6,182,212,0.9)]",
          coreOpacity: 1,
          ring1Speed: "2s",
          ring2Speed: "3s",
          pulseOpacity: 1,
          scale: "scale-125",
          floatSpeed: "1s",
        };
      default:
        return {
          coreGlow: "drop-shadow-[0_0_30px_rgba(34,211,238,0.5)]",
          coreOpacity: 0.6,
          ring1Speed: "15s",
          ring2Speed: "20s",
          pulseOpacity: 0.2,
          scale: "scale-100",
          floatSpeed: "4s",
        };
    }
  };

  const config = getOrbConfig();

  return (
    <div className={`relative flex items-center justify-center w-64 h-64 ${className}`}>
      <style>{`
        @keyframes orb-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes orb-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orb-spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes orb-pulse-ring {
          0% { transform: scale(0.8); opacity: 0; }
          50% { opacity: var(--pulse-opacity); }
          100% { transform: scale(1.3); opacity: 0; }
        }
        @keyframes orb-speak-ripple {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes orb-particle-orbit {
          from { transform: rotate(0deg) translateX(var(--radius)) rotate(0deg); }
          to { transform: rotate(360deg) translateX(var(--radius)) rotate(-360deg); }
        }
        @keyframes orb-report-emerge {
          0% { transform: scale(0); opacity: 0; }
          40% { transform: scale(1.5); opacity: 1; }
          100% { transform: scale(4) translateY(-10px); opacity: 0; }
        }
        @keyframes orb-card-unfold {
          0% { transform: scale(0) rotateX(90deg); opacity: 0; }
          60% { transform: scale(1.1) rotateX(-10deg); opacity: 1; }
          100% { transform: scale(1) rotateX(0deg); opacity: 1; }
        }
      `}</style>

      <div 
        className={`relative w-full h-full flex items-center justify-center cursor-pointer transition-all duration-700 ease-out hover:scale-110 ${config.scale}`}
        style={{ animation: `orb-float ${config.floatSpeed} ease-in-out infinite` }}
        onClick={onClick}
      >
        {/* SVG Container */}
        <svg viewBox="0 0 200 200" className="w-full h-full absolute inset-0 overflow-visible">
          <defs>
            <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="1" />
              <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
            </radialGradient>
            
            <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.8" />
            </linearGradient>

            <filter id="blur-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer Particle Field */}
          <g className="origin-center" style={{ animation: "orb-spin 60s linear infinite" }}>
            {particles.map((p) => (
              <circle
                key={p.id}
                cx="100"
                cy="100"
                r={p.size}
                fill="#22d3ee"
                opacity={p.opacity}
                className="origin-center"
                style={{
                  '--radius': `${p.distance}px`,
                  animation: `orb-particle-orbit ${p.speed}s linear infinite`,
                  animationDelay: `-${p.id}s`
                } as React.CSSProperties}
              />
            ))}
          </g>

          {/* Ring 3: Dynamic Pulse Ring (Expands constantly) */}
          <circle
            cx="100"
            cy="100"
            r="65"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="1"
            className="origin-center transition-opacity duration-500"
            style={{ 
              '--pulse-opacity': config.pulseOpacity,
              animation: `orb-pulse-ring 3s cubic-bezier(0.4, 0, 0.2, 1) infinite`
            } as React.CSSProperties}
          />

          {/* Speaking Audio Ripples */}
          {state === "speaking" && (
            <>
              <circle cx="100" cy="100" r="50" fill="none" stroke="#22d3ee" strokeWidth="2" className="origin-center" style={{ animation: "orb-speak-ripple 1.5s cubic-bezier(0, 0, 0.2, 1) infinite" }} />
              <circle cx="100" cy="100" r="50" fill="none" stroke="#0ea5e9" strokeWidth="1" className="origin-center" style={{ animation: "orb-speak-ripple 1.5s cubic-bezier(0, 0, 0.2, 1) infinite", animationDelay: "0.5s" }} />
              <circle cx="100" cy="100" r="50" fill="none" stroke="#38bdf8" strokeWidth="3" className="origin-center" style={{ animation: "orb-speak-ripple 1.5s cubic-bezier(0, 0, 0.2, 1) infinite", animationDelay: "1s" }} />
            </>
          )}

          {/* Ring 2: Thin Holographic Ring with Tick Marks */}
          <circle
            cx="100"
            cy="100"
            r="75"
            fill="none"
            stroke="url(#ring-gradient)"
            strokeWidth="1.5"
            strokeDasharray="2 6"
            className="origin-center transition-all duration-700"
            style={{ animation: `orb-spin-reverse ${config.ring2Speed} linear infinite` }}
            filter="url(#blur-glow)"
          />

          {/* Ring 1: Thick Segmented Ring */}
          <circle
            cx="100"
            cy="100"
            r="55"
            fill="none"
            stroke="url(#ring-gradient)"
            strokeWidth="4"
            strokeDasharray="40 10 20 15 60 25"
            strokeLinecap="round"
            className="origin-center transition-all duration-700"
            style={{ animation: `orb-spin ${config.ring1Speed} linear infinite` }}
            filter="url(#blur-glow)"
          />

          {/* Center Glowing Core */}
          <circle
            cx="100"
            cy="100"
            r={state === "listening" ? "45" : state === "speaking" ? "40" : "35"}
            fill="url(#core-glow)"
            className={`origin-center transition-all duration-700 ${config.coreGlow}`}
            style={{ opacity: config.coreOpacity }}
          />
          
          {/* Inner Core Plasma/Energy dot */}
          <circle
            cx="100"
            cy="100"
            r="15"
            fill="#ffffff"
            className="origin-center"
            style={{ 
              opacity: state === "sleeping" ? 0.2 : 0.8,
              filter: "blur(4px)",
              animation: `orb-pulse-ring ${state === 'thinking' || state === 'report' ? '1s' : '4s'} ease-in-out infinite alternate`
            }}
          />

          {/* Report Mode Emergence Animation */}
          {state === "report" && (
            <g className="origin-center">
              {/* Expanding sphere */}
              <circle cx="100" cy="100" r="20" fill="#ffffff" filter="url(#blur-glow)" className="origin-center" style={{ animation: "orb-report-emerge 3s cubic-bezier(0.2, 0, 0, 1) forwards" }} />
              <circle cx="100" cy="100" r="25" fill="none" stroke="#22d3ee" strokeWidth="4" className="origin-center" style={{ animation: "orb-report-emerge 3s cubic-bezier(0.2, 0, 0, 1) forwards", animationDelay: "0.2s" }} />
            </g>
          )}
        </svg>

        {/* State Label Overlay (Optional, subtle text inside orb if needed, currently leaving empty for pure orb look) */}
        {state === "report" && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none" style={{ animation: "orb-card-unfold 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) 2s forwards", opacity: 0 }}>
            <div className="w-32 h-40 border border-cyan-500/50 bg-black/60 backdrop-blur-md rounded-xl shadow-[0_0_30px_rgba(34,211,238,0.3)] flex flex-col items-center justify-center overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
              <div className="w-12 h-2 bg-cyan-500/30 rounded-full mb-4 animate-pulse" />
              <div className="w-20 h-1.5 bg-cyan-500/20 rounded-full mb-2" />
              <div className="w-16 h-1.5 bg-cyan-500/20 rounded-full mb-2" />
              <div className="w-24 h-1.5 bg-cyan-500/20 rounded-full" />
              <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-cyan-500/10 to-transparent" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
