"use client";

import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

/* ── Shared bits ──────────────────────────────────────────────── */

function describedBy(...ids: Array<string | undefined>) {
  const joined = ids.filter(Boolean).join(" ");
  return joined.length > 0 ? joined : undefined;
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-[13px] font-medium text-secondary-foreground">
      {children}
    </label>
  );
}

function FieldHint({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="text-xs text-muted-foreground">
      {children}
    </p>
  );
}

/** Error text is a live region so it is announced when it appears. */
function FieldError({ id, message }: { id?: string; message?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.p
          id={id}
          role="alert"
          initial={reduceMotion ? false : { opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -2 }}
          transition={{ duration: reduceMotion ? 0 : 0.14, ease: "easeOut" }}
          className="text-xs text-danger font-medium"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

/* ── Text input ───────────────────────────────────────────────── */

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Persistent helper text, linked via aria-describedby. */
  hint?: string;
}

export const AnimatedInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    const hintId = hint && id ? `${id}-hint` : undefined;
    const errorId = id ? `${id}-error` : undefined;

    return (
      <div className="w-full space-y-1.5">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(hintId, error ? errorId : undefined)}
          className={`fx-input ${className}`}
          {...props}
        />
        {hintId && <FieldHint id={hintId}>{hint}</FieldHint>}
        <FieldError id={errorId} message={error} />
      </div>
    );
  }
);
AnimatedInput.displayName = "AnimatedInput";

/* ── Password input ───────────────────────────────────────────── */

interface PasswordInputProps extends Omit<InputProps, "type"> {
  showPassword: boolean;
  onToggleShowPassword: () => void;
}

export const AnimatedPasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    { label, error, hint, showPassword, onToggleShowPassword, className = "", id, ...props },
    ref
  ) => {
    const hintId = hint && id ? `${id}-hint` : undefined;
    const errorId = id ? `${id}-error` : undefined;

    return (
      <div className="w-full space-y-1.5">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={showPassword ? "text" : "password"}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(hintId, error ? errorId : undefined)}
            className={`fx-input pr-12 ${className}`}
            {...props}
          />
          <button
            type="button"
            onClick={onToggleShowPassword}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="fx-icon-btn absolute right-0 top-1/2 -translate-y-1/2"
          >
            {showPassword ? (
              <EyeOff className="w-4.5 h-4.5" strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <Eye className="w-4.5 h-4.5" strokeWidth={1.8} aria-hidden="true" />
            )}
          </button>
        </div>
        {hintId && <FieldHint id={hintId}>{hint}</FieldHint>}
        <FieldError id={errorId} message={error} />
      </div>
    );
  }
);
AnimatedPasswordInput.displayName = "AnimatedPasswordInput";

/* ── Select ───────────────────────────────────────────────────── */

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: string[];
  /** Non-submittable prompt rendered as a disabled empty-value option. */
  placeholder?: string;
  error?: string;
  hint?: string;
}

export const AnimatedSelect = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, placeholder, error, hint, id, className = "", ...props }, ref) => {
    const hintId = hint && id ? `${id}-hint` : undefined;
    const errorId = id ? `${id}-error` : undefined;

    return (
      <div className="w-full space-y-1.5">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <select
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(hintId, error ? errorId : undefined)}
          className={`fx-input ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {hintId && <FieldHint id={hintId}>{hint}</FieldHint>}
        <FieldError id={errorId} message={error} />
      </div>
    );
  }
);
AnimatedSelect.displayName = "AnimatedSelect";
