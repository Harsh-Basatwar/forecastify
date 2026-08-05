"use client";

import { motion, useReducedMotion } from "framer-motion";
import { TrendingUp, BarChart3, ShieldCheck } from "lucide-react";
import ForecastGraphSVG from "./ForecastGraphSVG";
import { useCursorGlow } from "@/lib/motion-primitives";

function BrandMark({ dark = false, size = 38 }: { dark?: boolean; size?: number }) {
  const ink = dark ? "var(--panel-fg)" : "var(--accent-foreground)";
  const reduce = useReducedMotion();

  return (
    <div
      className="rounded-[var(--radius-md)] flex items-center justify-center shrink-0 shadow-md fx-glow fx-float"
      style={{
        width: size,
        height: size,
        background: dark ? "var(--panel-surface)" : "var(--accent)",
        border: dark ? "1px solid var(--panel-line)" : "none",
      }}
    >
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* The forecast line writes itself in — the one brand flourish. */}
        <motion.path
          d="M3 20L7 10L11 13L17 6L21 10"
          stroke={ink}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduce ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.circle
          cx="17"
          cy="6"
          r="2.3"
          fill={ink}
          initial={reduce ? false : { scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: reduce ? 0 : 0.26, delay: reduce ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        />
      </svg>
    </div>
  );
}

interface AuthLeftPanelProps {
  mode?: "login" | "signup";
  step?: number;
}

/**
 * Deliberate brand surface: a deep-evergreen panel in both themes, but
 * driven by panel-scoped custom properties (`--panel-*`) with a `.dark`
 * variant so it adapts instead of being frozen. Every foreground value
 * here clears 4.5:1 against the panel background.
 */
const PANEL_TOKENS = [
  "[--panel-bg-a:#102B26]",
  "[--panel-bg-b:#12332D]",
  "[--panel-bg-c:#0B2420]",
  "[--panel-fg:#F5F3ED]",
  "[--panel-fg-muted:#C3D0CA]",
  "[--panel-line:rgba(245,243,237,0.14)]",
  "[--panel-surface:rgba(245,243,237,0.05)]",
  "[--panel-accent:#3BB8A5]",
  "[--panel-forecast:#7FC49A]",
  "dark:[--panel-bg-a:#0C201C]",
  "dark:[--panel-bg-b:#0E2621]",
  "dark:[--panel-bg-c:#081916]",
  "dark:[--panel-fg:#EAE8E3]",
  "dark:[--panel-fg-muted:#AFBDB7]",
  "dark:[--panel-line:rgba(234,232,227,0.12)]",
  "dark:[--panel-surface:rgba(234,232,227,0.04)]",
].join(" ");

export default function AuthLeftPanel({ mode = "login", step = 1 }: AuthLeftPanelProps) {
  const reduceMotion = useReducedMotion();
  // Writes --mx/--my on the panel so the sheen follows the cursor in CSS,
  // with no React re-render per pointer move.
  const glowRef = useCursorGlow<HTMLDivElement>();

  /** One-shot entrance: ≤240ms, 30ms steps, nothing at all when reduced. */
  const enter = (index: number) =>
    reduceMotion
      ? { initial: false as const, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
      : {
          initial: { opacity: 0, y: 6 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.24, delay: index * 0.03, ease: "easeOut" as const },
        };

  const headline =
    mode === "login" ? (
      <>
        Know what sells,
        <br />
        before it sells.
      </>
    ) : (
      <>
        Set up your store
        <br />
        in minutes.
      </>
    );

  const features = [
    {
      icon: TrendingUp,
      title: "7-day demand predictions",
      desc: "Weather, market and event signals built in",
    },
    {
      icon: BarChart3,
      title: "Smart inventory levels",
      desc: "Avoid stockouts and overstocking automatically",
    },
    {
      icon: ShieldCheck,
      title: "Risk alerts & insights",
      desc: "Actionable alerts for at-risk products",
    },
  ];

  const steps = [
    { n: 1, title: "Personal information", desc: "Your account credentials" },
    { n: 2, title: "Store details", desc: "Tell us about your retail business" },
  ];

  return (
    <div
      ref={glowRef}
      className={`hidden lg:flex lg:w-[53%] relative flex-col justify-between gap-[3vh] px-[4.5vw] py-[4.5vh] lg:max-h-[100dvh] overflow-y-auto fx-panel-glow ${PANEL_TOKENS}`}
      style={{
        background:
          "linear-gradient(145deg, var(--panel-bg-a) 0%, var(--panel-bg-b) 60%, var(--panel-bg-c) 100%)",
        color: "var(--panel-fg)",
      }}
    >
      {/* 1. Logo */}
      <motion.div {...enter(0)} className="flex items-center gap-3 relative z-10 self-start shrink-0">
        <BrandMark dark />
        <span
          className="text-xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Forecastify
        </span>
      </motion.div>

      {/* 2. Editorial block */}
      <div className="flex flex-col gap-[2.5vh] max-w-[480px] w-full relative z-10">
        <div className="space-y-[1vh]">
          <motion.p
            {...enter(1)}
            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--panel-fg-muted)" }}
          >
            {mode === "login" ? "Retail Intelligence Platform" : "Get Started"}
          </motion.p>

          <motion.h2
            {...enter(2)}
            className="font-semibold tracking-tight leading-[1.12] max-w-[20ch]"
            style={{
              fontFamily: "var(--font-display), Georgia, serif",
              fontSize: "clamp(1.8rem, 2.8vw, 2.5rem)",
              letterSpacing: "-0.015em",
            }}
          >
            {headline}
          </motion.h2>

          <motion.p
            {...enter(3)}
            className="leading-relaxed"
            style={{ fontSize: "clamp(0.8rem, 1vw, 0.9rem)", color: "var(--panel-fg-muted)" }}
          >
            {mode === "login"
              ? "Demand forecasting, inventory intelligence, and market signals. One calm operating picture for your store."
              : "Join retailers running calmer, better-stocked stores with Forecastify's demand intelligence."}
          </motion.p>
        </div>

        {/* Illustrative forecast curve — decorative, drawn once */}
        <motion.div
          {...enter(4)}
          className="min-h-[90px] h-[14vh] max-h-[160px] w-full relative z-10 flex items-center justify-center shrink-0"
        >
          <ForecastGraphSVG />
        </motion.div>

        <div className="space-y-[1vh]">
          {mode === "login"
            ? features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  {...enter(5 + i)}
                  className="flex items-start gap-3 p-[1.2vh] rounded-[var(--radius-md)] border"
                  style={{ borderColor: "var(--panel-line)", background: "var(--panel-surface)" }}
                >
                  <div
                    className="p-2 rounded-[var(--radius-sm)] border shrink-0"
                    style={{
                      borderColor: "var(--panel-line)",
                      background: "var(--panel-surface)",
                      color: "var(--panel-accent)",
                    }}
                  >
                    <feature.icon className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
                  </div>
                  <div>
                    <h3
                      className="font-medium"
                      style={{ fontSize: "clamp(0.78rem, 1vw, 0.88rem)" }}
                    >
                      {feature.title}
                    </h3>
                    <p className="text-[11px] mt-0.5 leading-normal" style={{ color: "var(--panel-fg-muted)" }}>
                      {feature.desc}
                    </p>
                  </div>
                </motion.div>
              ))
            : steps.map((item, i) => (
                <motion.div
                  key={item.n}
                  {...enter(5 + i)}
                  className="flex items-center gap-3 py-[1.2vh] border-t first:border-t-0"
                  style={{ borderColor: "var(--panel-line)" }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
                    style={
                      step >= item.n
                        ? { background: "var(--panel-fg)", color: "var(--panel-bg-b)" }
                        : { border: "1px solid var(--panel-line)", color: "var(--panel-fg-muted)" }
                    }
                  >
                    {item.n}
                  </div>
                  <div>
                    <p className="font-medium" style={{ fontSize: "clamp(0.78rem, 1vw, 0.88rem)" }}>
                      {item.title}
                    </p>
                    <p className="text-[11px] mt-0.5 leading-normal" style={{ color: "var(--panel-fg-muted)" }}>
                      {item.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
        </div>
      </div>

      {/* 3. Footer — quiet brand line, no fabricated system status */}
      <motion.p
        {...enter(7)}
        className="relative z-10 text-[10px] xl:text-xs self-start shrink-0"
        style={{ color: "var(--panel-fg-muted)" }}
      >
        Forecastify · Demand intelligence for independent retail
      </motion.p>
    </div>
  );
}
