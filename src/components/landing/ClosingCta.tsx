"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { ArrowRight, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Reveal, Magnetic, useCursorGlow } from "@/lib/motion-primitives";

export default function ClosingCta() {
  const { user } = useAuth();
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const glowRef = useCursorGlow<HTMLDivElement>();

  /* The forecast line from the hero returns and completes as the page ends.
     Same motif, resolved: the visual bookend for the argument. */
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end end"],
  });
  const pathLength = useTransform(scrollYProgress, [0.1, 0.85], [0, 1]);

  return (
    <section ref={ref} className="relative overflow-hidden border-t">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
      >
        <svg
          viewBox="0 0 1200 300"
          preserveAspectRatio="none"
          className="h-full w-full"
        >
          <motion.path
            d="M 0 280 C 180 268, 320 250, 460 226 S 720 168, 860 118 S 1080 40, 1200 12"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.35"
            style={reduce ? { pathLength: 1 } : { pathLength }}
          />
        </svg>
      </div>

      <div
        ref={glowRef}
        className="fx-cursor-glow relative mx-auto max-w-[1400px] px-4 py-28 sm:px-6 lg:px-10 lg:py-40"
      >
        <Reveal>
          <span className="fx-glow inline-grid h-11 w-11 place-items-center rounded-[var(--radius-md)] bg-[var(--accent)] text-[var(--accent-foreground)]">
            <TrendingUp size={20} strokeWidth={2.1} aria-hidden="true" />
          </span>

          <h2 className="fx-display mt-8 max-w-[15ch] text-[2.4rem] leading-[1.06] tracking-[-0.025em] sm:text-6xl lg:text-[4rem]">
            Stock what sells. Skip what does not.
          </h2>
          <p className="mt-6 max-w-[48ch] text-[16.5px] leading-relaxed text-[var(--muted-foreground)]">
            Bring your sales log. Forecastify handles the arithmetic and hands the
            decision back to you.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Magnetic strength={7}>
              <Link
                href={user ? "/dashboard" : "/auth/signup"}
                className="fx-btn fx-btn-accent fx-press fx-group h-12 whitespace-nowrap px-6 text-[15px]"
              >
                Open the console
                <ArrowRight
                  size={16}
                  className="fx-icon-shift ml-1.5"
                  aria-hidden="true"
                />
              </Link>
            </Magnetic>
            {!user && (
              <Link
                href="/auth/login"
                className="fx-btn fx-press h-12 whitespace-nowrap px-6 text-[15px]"
              >
                Sign in
              </Link>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
