"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Purely decorative ambient layer for the auth screens.
 *
 * One static, subtle wash — no infinite loops, no cursor tracking, no
 * fabricated "signal" chips. The only motion is a single one-shot fade,
 * which is skipped entirely when the user prefers reduced motion.
 */
export default function AuthBackground() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0"
    >
      <motion.div
        className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] max-w-[900px] max-h-[900px] rounded-full blur-[140px]"
        style={{
          background:
            "radial-gradient(circle, var(--accent) 0%, color-mix(in srgb, var(--accent) 45%, transparent) 45%, transparent 70%)",
        }}
        initial={{ opacity: reduceMotion ? 0.14 : 0 }}
        animate={{ opacity: 0.14 }}
        transition={{ duration: reduceMotion ? 0 : 0.24, ease: "easeOut" }}
      />
    </div>
  );
}
