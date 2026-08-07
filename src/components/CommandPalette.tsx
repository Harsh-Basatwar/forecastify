"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft } from "lucide-react";
import { useLang } from "@/lib/lang-context";

/** Destinations mirror the sidebar sections so the two never disagree. */
const DESTINATIONS: { href: string; labelKey: string; group: string }[] = [
  { href: "/dashboard/forecasts", labelKey: "⚡ Forecast Demand", group: "QUICK ACTIONS" },
  { href: "/dashboard/procurement", labelKey: "🛒 Generate Purchase List", group: "QUICK ACTIONS" },
  { href: "/dashboard/what-if", labelKey: "🧪 Run What-If Simulation", group: "QUICK ACTIONS" },
  { href: "/dashboard/jarvis", labelKey: "🤖 Ask Jarvis AI", group: "QUICK ACTIONS" },
  { href: "/dashboard/promotions", labelKey: "🏷️ Create Promotion", group: "QUICK ACTIONS" },
  { href: "/dashboard", labelKey: "nav.overview", group: "COMMAND" },
  { href: "/dashboard/jarvis", labelKey: "nav.jarvis", group: "COMMAND" },
  { href: "/dashboard/store-assistant", labelKey: "Autopilot Hub", group: "COMMAND" },
  { href: "/dashboard/inventory", labelKey: "nav.inventory", group: "OPERATIONS" },
  { href: "/dashboard/sales", labelKey: "nav.sales", group: "OPERATIONS" },
  { href: "/dashboard/expiry-risk", labelKey: "nav.expiryRisk", group: "OPERATIONS" },
  { href: "/dashboard/procurement", labelKey: "Procurement Hub", group: "OPERATIONS" },
  { href: "/dashboard/forecasts", labelKey: "nav.forecasts", group: "PLANNING" },
  { href: "/dashboard/reorder-planner", labelKey: "nav.reorderPlanner", group: "PLANNING" },
  { href: "/dashboard/what-if", labelKey: "nav.whatIf", group: "PLANNING" },
  { href: "/dashboard/explainability", labelKey: "Explainability (XAI)", group: "PLANNING" },
  { href: "/dashboard/demand-analysis", labelKey: "Analytics", group: "INSIGHTS" },
  { href: "/dashboard/market-insights", labelKey: "nav.marketInsights", group: "INSIGHTS" },
  { href: "/dashboard/promotions", labelKey: "nav.promotions", group: "INSIGHTS" },
  { href: "/dashboard/news", labelKey: "nav.news", group: "INSIGHTS" },
  { href: "/dashboard/alerts", labelKey: "Alerts & Audit", group: "UTILITIES" },
  { href: "/dashboard/system", labelKey: "System Console", group: "UTILITIES" },
  { href: "/dashboard/settings", labelKey: "nav.settings", group: "UTILITIES" },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { t } = useLang();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const results = useMemo(() => {
    const items = DESTINATIONS.map((d) => ({ ...d, label: t(d.labelKey), groupLabel: t(d.group) }));
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) => i.label.toLowerCase().includes(q) || i.groupLabel.toLowerCase().includes(q)
    );
  }, [query, t]);

  // Remember the trigger, focus the field, restore focus on close.
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      setQuery("");
      setActive(0);
      inputRef.current?.focus();
    } else if (triggerRef.current) {
      triggerRef.current.focus?.();
      triggerRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Keep the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active].href);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-foreground/25 backdrop-blur-[2px] flex items-start justify-center pt-[12vh] px-4 fx-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search and commands"
        className="w-full max-w-lg bg-elevated border border-border rounded-[var(--radius-lg)] overflow-hidden fx-page"
        style={{ boxShadow: "var(--shadow-lg)" }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <label htmlFor="cmdk-input" className="fx-sr-only">Search pages</label>
          <input
            ref={inputRef}
            id="cmdk-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Jump to a page…"
            autoComplete="off"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-activedescendant={results[active] ? `cmdk-opt-${active}` : undefined}
            className="flex-1 bg-transparent border-0 py-3.5 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        <ul ref={listRef} id="cmdk-list" role="listbox" aria-label="Pages" className="max-h-[50vh] overflow-y-auto py-1.5">
          {results.length === 0 && (
            <li className="px-4 py-8 text-center">
              <p className="text-sm text-secondary-foreground font-medium">No pages match “{query}”</p>
              <p className="text-xs text-muted-foreground mt-1">Try a shorter term.</p>
            </li>
          )}
          {results.map((r, i) => (
            <li key={r.href} role="none">
              <button
                type="button"
                id={`cmdk-opt-${i}`}
                role="option"
                aria-selected={i === active}
                data-active={i === active}
                onClick={() => go(r.href)}
                onMouseEnter={() => setActive(i)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                  i === active ? "bg-hover-surface text-foreground" : "text-secondary-foreground"
                }`}
              >
                <span className="flex-1 truncate font-medium">{r.label}</span>
                <span className="text-[11px] text-muted-foreground shrink-0">{r.groupLabel}</span>
                {i === active && <CornerDownLeft className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>

        <div className="px-4 py-2.5 border-t border-border flex items-center gap-4 text-[11px] text-muted-foreground">
          <span>↑↓ to navigate</span>
          <span>↵ to open</span>
          <span>esc to close</span>
        </div>
      </div>
    </div>
  );
}
