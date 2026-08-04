"use client";

import { motion } from "framer-motion";
import { TrendingUp, BarChart3, ShieldCheck } from "lucide-react";
import ForecastGraphSVG from "./ForecastGraphSVG";

function BrandMark({ dark = false, size = 38 }: { dark?: boolean; size?: number }) {
  return (
    <motion.div
      whileHover={{ rotate: 8, scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300, damping: 15 }}
      className="rounded-lg flex items-center justify-center shrink-0 cursor-pointer shadow-md"
      style={{
        width: size,
        height: size,
        background: dark ? "rgba(245, 243, 237, 0.14)" : "var(--accent)",
        border: dark ? "1px solid rgba(245, 243, 237, 0.2)" : "none",
      }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M3 20L7 10L11 13L17 6L21 10" stroke={dark ? "#F5F3ED" : "var(--accent-foreground)"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="17" cy="6" r="2.3" fill={dark ? "#F5F3ED" : "var(--accent-foreground)"} />
      </svg>
    </motion.div>
  );
}

interface AuthLeftPanelProps {
  mode?: "login" | "signup";
  step?: number;
}

export default function AuthLeftPanel({ mode = "login", step = 1 }: AuthLeftPanelProps) {
  // Word-by-word headline reveal animation setup
  const headlineText = mode === "login"
    ? "Know what sells,\nbefore it sells."
    : "Set up your store\nin minutes.";
  
  const headlineWords = headlineText.split(" ");

  const features = mode === "login" ? [
    { icon: TrendingUp, title: "7-day demand predictions", desc: "Weather, market and event signals built in" },
    { icon: BarChart3, title: "Smart inventory levels", desc: "Avoid stockouts and overstocking automatically" },
    { icon: ShieldCheck, title: "Risk alerts & insights", desc: "Actionable alerts for at-risk products" },
  ] : [
    { n: 1, title: "Personal information", desc: "Your account credentials" },
    { n: 2, title: "Store details", desc: "Tell us about your retail business" },
  ];

  return (
    <div
      className="hidden lg:flex lg:w-[53%] relative overflow-hidden flex-col justify-between px-[4.5vw] py-[4.5vh] select-none h-full"
      style={{ background: "linear-gradient(145deg, #102B26 0%, #12332D 60%, #0B2420 100%)", color: "#F5F3ED" }}
    >
      {/* 1. Logo Block */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-[0.7vw] relative z-10 self-start"
      >
        <BrandMark dark />
        <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display), Georgia, serif" }}>
          Forecastify
        </span>
      </motion.div>

      {/* 2. Main content container (vertically centered via my-auto, fluid spacing) */}
      <div className="my-auto flex flex-col space-y-[2.5vh] max-w-[480px] w-full relative z-10 flex-1 min-h-0 justify-center">
        
        {/* Hero Block (space-y-[1vh] for tight fluid rhythm) */}
        <div className="space-y-[1vh]">
          {/* Eyebrow Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.5, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
          >
            {mode === "login" ? "Retail Intelligence Platform" : "Get Started"}
          </motion.p>

          {/* Headline - Optical Wrapping (max-width 20ch) & Clamped Typography */}
          <h2
            className="font-semibold tracking-tight leading-[1.12] max-w-[20ch]"
            style={{ 
              fontFamily: "var(--font-display), Georgia, serif", 
              fontSize: "clamp(1.8rem, 2.8vw, 2.5rem)",
              letterSpacing: "-0.015em" 
            }}
          >
            {headlineWords.map((word, i) => (
              <motion.span
                key={i}
                className="inline-block mr-2"
                initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{
                  duration: 0.65,
                  delay: 0.35 + i * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {word === "\nbefore" ? (
                  <>
                    <br />
                    before
                  </>
                ) : word === "\nin" ? (
                  <>
                    <br />
                    in
                  </>
                ) : (
                  word
                )}
              </motion.span>
            ))}
          </h2>

          {/* Description - Clamped typography & optical contrast weight */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 0.75, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="leading-relaxed opacity-70 font-normal"
            style={{ fontSize: "clamp(0.8rem, 1vw, 0.9rem)" }}
          >
            {mode === "login"
              ? "Demand forecasting, inventory intelligence, and market signals — one calm operating picture for your store."
              : "Join retailers running calmer, better-stocked stores with Forecastify's demand intelligence."}
          </motion.p>
        </div>

        {/* AI Metrics Row - Tiny, Vercel-style metrics */}
        <div className="flex items-center justify-between text-[9px] xl:text-[10px] font-mono tracking-wider text-white/40 uppercase border-y border-white/5 py-[1.2vh] select-none">
          <div className="flex items-center gap-[0.5vw]">
            <span className="font-semibold text-emerald-400">94.2%</span>
            <span>Accuracy</span>
          </div>
          <div className="w-[1px] h-3 bg-white/10" />
          <div className="flex items-center gap-[0.5vw]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Stable Inventory</span>
          </div>
          <div className="w-[1px] h-3 bg-white/10" />
          <div className="flex items-center gap-[0.5vw]">
            <span className="font-semibold text-white/90">21</span>
            <span>At Risk</span>
          </div>
        </div>

        {/* Fluid Graph Area (flex-1 min-h-[90px] max-h-[160px] to allow flex shrinking) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.85, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 min-h-[90px] max-h-[160px] w-full relative z-10 flex items-center justify-center"
        >
          <ForecastGraphSVG />
        </motion.div>

        {/* Features Block (space-y-[1vh] for fluid rhythm) */}
        <div className="space-y-[1vh]">
          {mode === "login" ? (
            (features as Array<{ icon: React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>; title: string; desc: string }>).map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 1.0 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ 
                  y: -1.5, 
                  backgroundColor: "rgba(255, 255, 255, 0.04)", 
                  borderColor: "rgba(255, 255, 255, 0.12)",
                  boxShadow: "0 8px 20px -10px rgba(0, 0, 0, 0.3)" 
                }}
                className="flex items-center gap-[0.8vw] p-[1.2vh] rounded-xl border border-white/5 bg-white/[0.01] transition-all duration-300 group cursor-pointer"
              >
                <div className="p-[0.8vh] rounded-lg bg-white/5 border border-white/10 group-hover:border-emerald-400/40 group-hover:bg-emerald-500/10 text-white/90 group-hover:text-emerald-400 transition-all duration-300">
                  <feature.icon className="w-4 h-4" strokeWidth={1.8} />
                </div>
                <div>
                  <h3 
                    className="font-medium text-white/90 transition-colors duration-300 group-hover:text-white"
                    style={{ fontSize: "clamp(0.78rem, 1vw, 0.88rem)" }}
                  >
                    {feature.title}
                  </h3>
                  <p className="text-[11px] text-white/50 mt-0.5 leading-normal">{feature.desc}</p>
                </div>
              </motion.div>
            ))
          ) : (
            (features as Array<{ n: number; title: string; desc: string }>).map((item, i) => (
              <motion.div
                key={item.n}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: step >= item.n ? 1 : 0.45, x: 0 }}
                transition={{ duration: 0.6, delay: 1.0 + i * 0.12 }}
                className="flex items-center gap-[0.8vw] py-[1.2vh] border-t border-white/10 first:border-none"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 transition-all duration-300"
                  style={step >= item.n
                    ? { background: "#F5F3ED", color: "#12332D", boxShadow: "0 0 16px rgba(245, 243, 237, 0.3)" }
                    : { border: "1px solid rgba(245, 243, 237, 0.35)", color: "rgba(245, 243, 237, 0.7)" }}
                >
                  {item.n}
                </div>
                <div>
                  <p 
                    className="font-medium"
                    style={{ fontSize: "clamp(0.78rem, 1vw, 0.88rem)" }}
                  >
                    {item.title}
                  </p>
                  <p className="text-[11px] mt-0.5 text-white/50 leading-normal">{item.desc}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>

      </div>

      {/* 3. Footer indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="relative z-10 flex items-center gap-2 text-[10px] xl:text-xs self-start"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>System Operational • AI Models Online</span>
      </motion.div>
    </div>
  );
}
