"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

interface SuccessOverlayProps {
  show: boolean;
  onComplete: () => void;
}

/** One short confirmation beat, then hand off. No fabricated progress. */
const CONFIRM_MS = 200;

export default function SuccessOverlay({ show, onComplete }: SuccessOverlayProps) {
  const reduceMotion = useReducedMotion();

  // Held in a ref so an inline onComplete identity change can never restart
  // the timer and stall the redirect.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!show) return;
    const timeoutId = setTimeout(() => onCompleteRef.current(), CONFIRM_MS);
    return () => clearTimeout(timeoutId);
  }, [show]);

  if (!show) return null;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.14, ease: "easeOut" }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4"
    >
      <div
        role="status"
        className="flex flex-col items-center justify-center gap-3 p-8 rounded-[var(--radius-lg)] bg-elevated border border-border shadow-lg max-w-sm w-full text-center"
      >
        <CheckCircle2 className="w-8 h-8 text-success" aria-hidden="true" />
        <p className="fx-display text-lg text-foreground">Opening your dashboard</p>
      </div>
    </motion.div>
  );
}
