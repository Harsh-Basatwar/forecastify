"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Menu, Moon, Sun, Bell, Globe, Search, Command, ChevronDown } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { useLang } from "@/lib/lang-context";
import { LANGUAGES } from "@/lib/translations";
import CommandPalette from "@/components/CommandPalette";

import StoreSwitcher from "@/components/StoreSwitcher";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang } = useLang();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);

  // The ⌘K / Ctrl+K affordance shown on the trigger has to actually work.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between gap-2 px-2 sm:px-6 shrink-0 sticky top-0 z-30">
        {/* Left: mobile menu + Store Switcher + search */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            onClick={onMenuClick}
            className="lg:hidden fx-icon-btn"
            aria-label="Open navigation"
            aria-controls="mobile-nav"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Multi-Store & HQ Organization Switcher */}
          <StoreSwitcher />

          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden sm:flex items-center gap-2.5 h-9 px-3 rounded-[var(--radius-md)] border border-border bg-secondary/50 hover:bg-secondary hover:border-border-strong text-muted-foreground transition-colors fx-focus fx-press w-full max-w-xs group"
            aria-label="Search pages and commands"
          >
            <Search className="w-3.5 h-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span className="text-[13px] font-medium truncate">Search…</span>
            <kbd className="ml-auto hidden md:inline-flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground bg-background border border-border rounded px-1.5 py-0.5 shrink-0">
              {isMac ? <Command className="w-3 h-3" strokeWidth={2} aria-hidden="true" /> : "Ctrl "}K
            </kbd>
          </button>

          {/* Mobile: icon-only entry to the same palette */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="sm:hidden fx-icon-btn"
            aria-label="Search pages and commands"
          >
            <Search className="w-[18px] h-[18px]" strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>

        {/* Right: global controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Language — available on every breakpoint */}
          <div className="relative">
            <label htmlFor="lang-select" className="fx-sr-only">Language</label>
            <select
              id="lang-select"
              value={lang}
              onChange={e => setLang(e.target.value as never)}
              className="appearance-none pl-8 pr-7 h-11 bg-transparent border border-transparent hover:border-border hover:bg-secondary rounded-[var(--radius-md)] text-[13px] font-medium text-secondary-foreground cursor-pointer transition-colors max-w-[7.5rem] sm:max-w-[9rem] truncate"
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.nativeName}</option>
              ))}
            </select>
            <Globe className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          </div>

          <button
            onClick={() => router.push("/dashboard/alerts")}
            className="fx-icon-btn fx-press group"
            aria-label="View alerts"
          >
            <Bell
              className="w-[18px] h-[18px] transition-transform duration-[var(--t-medium)] ease-[var(--ease-out)] group-hover:-rotate-12"
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </button>

          <button
            onClick={toggleTheme}
            className="fx-icon-btn fx-press overflow-hidden"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {/* The two glyphs swap on an arc, so the change reads as one motion. */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={theme}
                initial={reduceMotion ? false : { y: 14, rotate: -35, opacity: 0 }}
                animate={{ y: 0, rotate: 0, opacity: 1 }}
                exit={reduceMotion ? undefined : { y: -14, rotate: 35, opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center justify-center"
              >
                {theme === "dark"
                  ? <Sun className="w-[18px] h-[18px]" strokeWidth={1.8} aria-hidden="true" />
                  : <Moon className="w-[18px] h-[18px]" strokeWidth={1.8} aria-hidden="true" />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
