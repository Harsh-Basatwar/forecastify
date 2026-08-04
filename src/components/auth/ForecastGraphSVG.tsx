"use client";

import { motion } from "framer-motion";

export default function ForecastGraphSVG() {
  // Main actual & predicted paths
  const historicalPath = "M0 240 Q 100 210, 200 225 T 400 140 T 520 160";
  const predictedPath = "M 520 160 C 580 120, 640 70, 720 95 T 800 40";
  const confidenceBandTop = "M 520 160 C 580 100, 640 45, 720 70 T 800 20 L 800 65 T 720 120 C 640 95, 580 140, 520 160 Z";

  return (
    <div className="relative w-full h-full overflow-hidden pointer-events-none select-none">
      <svg
        className="w-full h-full"
        viewBox="0 0 800 280"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          {/* Gradient for historical area */}
          <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3BB8A5" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3BB8A5" stopOpacity="0.0" />
          </linearGradient>

          {/* Gradient for prediction area */}
          <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#58B57F" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#58B57F" stopOpacity="0.0" />
          </linearGradient>

          {/* Glow filter - reduced by 30% */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Confidence Band Area - reduced opacity for visual hierarchy */}
        <motion.path
          d={confidenceBandTop}
          fill="url(#predGrad)"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.08, 0.18, 0.08] }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.2,
          }}
        />

        {/* Secondary Layer - Baseline Wave (muted opacity) */}
        <motion.path
          d="M0 270 Q 150 250, 300 260 T 600 230 T 800 200"
          stroke="rgba(245, 243, 237, 0.06)"
          strokeWidth="1.2"
          fill="none"
          strokeDasharray="4 6"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.2, ease: "easeOut" }}
        />

        {/* Historical Solid Line */}
        <motion.path
          d={historicalPath}
          stroke="#3BB8A5"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          filter="url(#glow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Forecast Dashed Line (AI Prediction) */}
        <motion.path
          d={predictedPath}
          stroke="#58B57F"
          strokeWidth="2.5"
          strokeDasharray="6 6"
          fill="none"
          strokeLinecap="round"
          filter="url(#glow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.4, delay: 1.4, ease: "easeInOut" }}
        />

        {/* Transition Point Indicator (Today / AI Junction) */}
        <motion.circle
          cx="520"
          cy="160"
          r="4.5"
          fill="#3BB8A5"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [1, 1.4, 1], opacity: 1 }}
          transition={{
            scale: { repeat: Infinity, duration: 2.5, ease: "easeInOut" },
            default: { delay: 1.5, duration: 0.5 },
          }}
        />
        <circle cx="520" cy="160" r="9" stroke="#3BB8A5" strokeWidth="1" fill="none" opacity="0.4" />

        {/* Traveling Glowing Dots along the curve */}
        <motion.circle
          r="4"
          fill="#F5F3ED"
          filter="url(#glow)"
          animate={{
            cx: [0, 200, 400, 520],
            cy: [240, 225, 140, 160],
            opacity: [0, 0.9, 0.9, 0],
          }}
          transition={{
            duration: 4.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />

        <motion.circle
          r="4.5"
          fill="#58B57F"
          filter="url(#glow)"
          animate={{
            cx: [520, 640, 800],
            cy: [160, 70, 40],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3.5,
          }}
        />
      </svg>
    </div>
  );
}
