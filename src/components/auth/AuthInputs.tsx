"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

export const AnimatedInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <div className="w-full space-y-2">
        <label htmlFor={id} className="block text-[13px] font-medium text-secondary-foreground">
          {label}
        </label>
        <motion.div
          animate={{
            borderColor: error
              ? "var(--danger)"
              : isFocused
              ? "var(--accent)"
              : "rgba(32, 30, 27, 0.08)",
            boxShadow: error
              ? "0 0 0 3px rgba(185, 58, 52, 0.15)"
              : isFocused
              ? "0 0 0 4px var(--accent-soft)"
              : "0 1px 2px rgba(32, 30, 27, 0.02)",
          }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="rounded-xl border border-neutral-200/80 bg-card/90 overflow-hidden dark:border-white/10"
        >
          <input
            ref={ref}
            id={id}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            className={`fx-input py-3 px-5 border-none bg-transparent focus:ring-0 focus:outline-none text-foreground ${className}`}
            {...props}
          />
        </motion.div>
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4, x: 0 }}
              animate={{
                opacity: 1,
                y: 0,
                x: [0, -4, 4, -4, 4, 0],
              }}
              exit={{ opacity: 0, y: -4 }}
              transition={{
                x: { duration: 0.4, ease: "easeInOut" },
                opacity: { duration: 0.2 },
              }}
              className="text-xs text-danger font-medium flex items-center gap-1.5 pt-0.5"
            >
              <span>•</span>
              <span>{error}</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);
AnimatedInput.displayName = "AnimatedInput";

interface PasswordInputProps extends Omit<InputProps, "type"> {
  showPassword: boolean;
  onToggleShowPassword: () => void;
}

export const AnimatedPasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, showPassword, onToggleShowPassword, className = "", id, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <div className="w-full space-y-2">
        <label htmlFor={id} className="block text-[13px] font-medium text-secondary-foreground">
          {label}
        </label>
        <motion.div
          animate={{
            borderColor: error
              ? "var(--danger)"
              : isFocused
              ? "var(--accent)"
              : "rgba(32, 30, 27, 0.08)",
            boxShadow: error
              ? "0 0 0 3px rgba(185, 58, 52, 0.15)"
              : isFocused
              ? "0 0 0 4px var(--accent-soft)"
              : "0 1px 2px rgba(32, 30, 27, 0.02)",
          }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative rounded-xl border border-neutral-200/80 bg-card/90 overflow-hidden dark:border-white/10"
        >
          <input
            ref={ref}
            id={id}
            type={showPassword ? "text" : "password"}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            className={`fx-input py-3 pl-5 pr-12 border-none bg-transparent focus:ring-0 focus:outline-none text-foreground ${className}`}
            {...props}
          />
          <button
            type="button"
            onClick={onToggleShowPassword}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg fx-focus"
          >
            <motion.div
              key={showPassword ? "eye-off" : "eye-on"}
              initial={{ rotate: -25, scale: 0.8, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {showPassword ? (
                <EyeOff className="w-4.5 h-4.5" strokeWidth={1.8} />
              ) : (
                <Eye className="w-4.5 h-4.5" strokeWidth={1.8} />
              )}
            </motion.div>
          </button>
        </motion.div>
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{
                opacity: 1,
                y: 0,
                x: [0, -4, 4, -4, 4, 0],
              }}
              exit={{ opacity: 0, y: -4 }}
              transition={{
                x: { duration: 0.4, ease: "easeInOut" },
                opacity: { duration: 0.2 },
              }}
              className="text-xs text-danger font-medium flex items-center gap-1.5 pt-0.5"
            >
              <span>•</span>
              <span>{error}</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);
AnimatedPasswordInput.displayName = "AnimatedPasswordInput";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: string[];
}

export const AnimatedSelect = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, id, className = "", ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <div className="w-full space-y-2">
        <label htmlFor={id} className="block text-[13px] font-medium text-secondary-foreground">
          {label}
        </label>
        <motion.div
          animate={{
            borderColor: isFocused ? "var(--accent)" : "rgba(32, 30, 27, 0.08)",
            boxShadow: isFocused
              ? "0 0 0 4px var(--accent-soft)"
              : "0 1px 2px rgba(32, 30, 27, 0.02)",
          }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="rounded-xl border border-neutral-200/80 bg-card/90 overflow-hidden dark:border-white/10"
        >
          <select
            ref={ref}
            id={id}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            className={`fx-input py-3 px-5 border-none bg-transparent focus:ring-0 focus:outline-none text-foreground ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </motion.div>
      </div>
    );
  }
);
AnimatedSelect.displayName = "AnimatedSelect";
