"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Moon, Sun, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { ScrollProgress, Magnetic, EASE_OUT } from "@/lib/motion-primitives";

const LINKS = [
  { href: "#cost", label: "Why" },
  { href: "#story", label: "How it thinks" },
  { href: "#reasoning", label: "Reasoning" },
  { href: "#autopilot", label: "Autopilot" },
];

export default function LandingNav() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const reduce = useReducedMotion();
  const [lifted, setLifted] = useState(false);

  /* IntersectionObserver on a zero-height sentinel rather than a scroll
     listener: one callback at the threshold instead of one per frame. */
  useEffect(() => {
    const sentinel = document.getElementById("lp-scroll-sentinel");
    if (!sentinel) return;
    const io = new IntersectionObserver(
      ([entry]) => setLifted(!entry.isIntersecting),
      { rootMargin: "0px" }
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div id="lp-scroll-sentinel" aria-hidden="true" className="absolute top-0 h-px w-px" />
      <motion.header
        initial={reduce ? false : { y: -64, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-200 ${
          lifted
            ? "border-b bg-[color-mix(in_srgb,var(--background)_82%,transparent)] backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <nav className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-4 sm:px-6 lg:px-10">
          <Link
            href="/"
            className="fx-group flex shrink-0 items-center gap-2.5"
            aria-label="Forecastify home"
          >
            <span className="fx-glow grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--accent-foreground)]">
              <TrendingUp size={16} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span className="fx-display text-[17px] leading-none">Forecastify</span>
          </Link>

          <ul className="ml-auto hidden items-center gap-7 lg:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="fx-underline text-[13.5px] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <button
              type="button"
              onClick={toggleTheme}
              className="fx-icon-btn"
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            >
              {theme === "dark" ? (
                <Sun size={16} aria-hidden="true" />
              ) : (
                <Moon size={16} aria-hidden="true" />
              )}
            </button>

            {!user && (
              <Link
                href="/auth/login"
                className="hidden text-[13.5px] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] sm:block"
              >
                Sign in
              </Link>
            )}

            <Magnetic strength={4}>
              <Link
                href={user ? "/dashboard" : "/auth/signup"}
                className="fx-btn fx-btn-accent fx-press whitespace-nowrap"
              >
                Open the console
              </Link>
            </Magnetic>
          </div>
        </nav>

        <ScrollProgress className="fx-scroll-rail" />
      </motion.header>
    </>
  );
}
