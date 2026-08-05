"use client";

import { useReducedMotion } from "framer-motion";

interface AuthSubmitButtonProps {
  loading: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: "submit" | "button";
  disabled?: boolean;
  /** Honest, single label shown while the request is in flight. */
  loadingLabel?: string;
}

export default function AuthSubmitButton({
  loading,
  children,
  onClick,
  type = "submit",
  disabled = false,
  loadingLabel = "Working…",
}: AuthSubmitButtonProps) {
  const reduceMotion = useReducedMotion();

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      className="fx-btn fx-btn-accent w-full py-3 text-sm font-semibold"
    >
      {loading ? (
        <>
          <svg
            className={`w-4 h-4 ${reduceMotion ? "" : "animate-spin"}`}
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
          <span>{loadingLabel}</span>
        </>
      ) : (
        <span>{children}</span>
      )}
    </button>
  );
}
