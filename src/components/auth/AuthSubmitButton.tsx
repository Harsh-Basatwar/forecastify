"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AuthSubmitButtonProps {
  loading: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: "submit" | "button";
  disabled?: boolean;
}

const LOADING_STATES = [
  "Authenticating...",
  "Verifying Credentials...",
  "Loading Forecasts...",
  "Preparing Dashboard...",
];

export default function AuthSubmitButton({
  loading,
  children,
  onClick,
  type = "submit",
  disabled = false,
}: AuthSubmitButtonProps) {
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);

  // Cycle through multi-stage authenticating messages during load
  useEffect(() => {
    if (!loading) {
      setLoadingTextIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingTextIndex((prev) => (prev + 1) % LOADING_STATES.length);
    }, 700);

    return () => clearInterval(interval);
  }, [loading]);

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={{ 
        scale: disabled || loading ? 1 : 1.01, 
        y: disabled || loading ? 0 : -1,
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 8px 24px rgba(9, 90, 80, 0.4)"
      }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="relative w-full py-3 px-6 rounded-xl font-semibold text-sm text-white overflow-hidden cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed select-none group border border-[#095A50]/50 transition-shadow duration-300"
      style={{
        background: "linear-gradient(135deg, #0B6E62 0%, #095A50 60%, #07473F 100%)",
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 4px 12px rgba(11, 110, 98, 0.3)",
      }}
    >
      {/* Subtle shine sweep on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 flex items-center justify-center gap-2">
        {loading ? (
          <div className="flex items-center gap-2.5">
            {/* Custom SVG Spinner */}
            <svg
              className="w-4 h-4 animate-spin text-white"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-90"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <AnimatePresence mode="wait">
              <motion.span
                key={loadingTextIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="inline-block"
              >
                {LOADING_STATES[loadingTextIndex]}
              </motion.span>
            </AnimatePresence>
          </div>
        ) : (
          <span>{children}</span>
        )}
      </div>
    </motion.button>
  );
}
