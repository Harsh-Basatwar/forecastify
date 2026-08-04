"use client";

import { useRouter } from "next/navigation";
import { Menu, Moon, Sun, Bell, Globe, Search, Command } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { useLang } from "@/lib/lang-context";
import { LANGUAGES } from "@/lib/translations";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang } = useLang();
  const router = useRouter();

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 shrink-0 sticky top-0 z-30">
      {/* Left: mobile menu + search */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary fx-focus"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global search placeholder — future command palette trigger */}
        <button
          className="hidden sm:flex items-center gap-2.5 h-9 px-3 rounded-lg border border-border bg-secondary/50 hover:bg-secondary hover:border-border-strong text-muted-foreground transition-colors fx-focus w-full max-w-xs"
          aria-label="Search products, reports, commands"
        >
          <Search className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
          <span className="text-[13px] font-medium truncate">Search...</span>
          <kbd className="ml-auto hidden md:inline-flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground/70 bg-background border border-border rounded px-1.5 py-0.5 shrink-0">
            <Command className="w-3 h-3" strokeWidth={2} />K
          </kbd>
        </button>
      </div>

      {/* Right: global controls */}
      <div className="flex items-center gap-0.5 shrink-0">
        {/* Language */}
        <div className="relative hidden sm:block">
          <label htmlFor="lang-select" className="sr-only">Language</label>
          <select
            id="lang-select"
            value={lang}
            onChange={e => setLang(e.target.value as never)}
            className="appearance-none pl-7.5 pr-2.5 py-1.5 bg-transparent border border-transparent hover:border-border hover:bg-secondary rounded-md text-[13px] font-medium text-secondary-foreground focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/25 cursor-pointer transition-colors max-w-[132px]"
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.nativeName}</option>
            ))}
          </select>
          <Globe className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Alerts */}
        <button
          onClick={() => router.push("/dashboard/alerts")}
          className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors fx-focus"
          title="Alerts"
          aria-label="View alerts"
        >
          <Bell className="w-[18px] h-[18px]" strokeWidth={1.8} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-danger rounded-full ring-2 ring-background" aria-hidden="true" />
        </button>

        {/* Theme */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors fx-focus"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="w-[18px] h-[18px]" strokeWidth={1.8} /> : <Moon className="w-[18px] h-[18px]" strokeWidth={1.8} />}
        </button>
      </div>
    </header>
  );
}
