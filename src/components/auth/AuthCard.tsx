"use client";

import { motion, useReducedMotion } from "framer-motion";

interface AuthCardProps {
  children: React.ReactNode;
}

export default function AuthCard({ children }: AuthCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.24, ease: "easeOut" }}
      className="w-full max-w-[480px] p-6 sm:p-8 xl:p-10 rounded-[var(--radius-lg)] bg-card border border-border shadow-lg relative z-10"
    >
      {/* Decorative top-edge lighting, radius matched to the card */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-[var(--radius-lg)] pointer-events-none select-none"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, var(--accent-soft) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
