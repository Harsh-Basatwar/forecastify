"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Magnetic, EASE_OUT, useCursorGlow } from "@/lib/motion-primitives";
import ForecastCanvas from "./ForecastCanvas";

/* Words rise in sequence so the sentence reads as it assembles. */
const LINE_ONE = ["Your", "shelf", "knows", "what", "sells."];
const LINE_TWO = ["Now", "it", "knows", "what's", "coming."];

export default function Hero() {
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const glowRef = useCursorGlow<HTMLDivElement>();

  const word = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: "0.5em" },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay: 0.1 + i * 0.045, ease: EASE_OUT },
  });

  return (
    <section
      ref={glowRef}
      className="fx-cursor-glow relative min-h-[100dvh] overflow-hidden pt-24 pb-16"
    >
      {/* Ambient ledger rule, echoing the console's paper grid. Decorative,
          so it is hidden from assistive tech and never intercepts pointers. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px)] [background-size:96px_100%] [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_62%,transparent)]"
      />

      <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10">
        {/* The headline takes the full measure rather than a column, so it can
            run large and still break exactly where the two sentences do. */}
        <h1 className="fx-display text-[2.35rem] leading-[1.08] tracking-[-0.025em] sm:text-[3.2rem] lg:text-[4.4rem] xl:text-[4.9rem]">
          <span className="block">
            {LINE_ONE.map((w, i) => (
              <motion.span key={w + i} className="inline-block" {...word(i)}>
                {w}
                {i < LINE_ONE.length - 1 ? " " : ""}
              </motion.span>
            ))}
          </span>
          <span className="block text-[var(--accent)]">
            {LINE_TWO.map((w, i) => (
              <motion.span
                key={w + i}
                className="inline-block"
                {...word(i + LINE_ONE.length)}
              >
                {w}
                {i < LINE_TWO.length - 1 ? " " : ""}
              </motion.span>
            ))}
          </span>
        </h1>

        <div className="mt-10 grid items-end gap-10 lg:mt-14 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4">
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.58, ease: EASE_OUT }}
              className="max-w-[44ch] text-[16px] leading-relaxed text-[var(--muted-foreground)]"
            >
              Forecastify reads weather, festivals and your own sales log to say what
              to stock next, and shows the reasoning behind every number.
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.68, ease: EASE_OUT }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Magnetic strength={6}>
                <Link
                  href={user ? "/dashboard" : "/auth/signup"}
                  className="fx-btn fx-btn-accent fx-press fx-group h-11 whitespace-nowrap px-5 text-[14px]"
                >
                  Open the console
                  <ArrowRight
                    size={15}
                    className="fx-icon-shift ml-1.5"
                    aria-hidden="true"
                  />
                </Link>
              </Magnetic>
              <a
                href="#story"
                className="fx-btn fx-press h-11 whitespace-nowrap px-5 text-[14px]"
              >
                See how it thinks
              </a>
            </motion.div>
          </div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 22, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.24, ease: EASE_OUT }}
            className="lg:col-span-8"
          >
            <ForecastCanvas />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
