"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft } from "lucide-react";
import { useLang } from "@/lib/lang-context";

/** Destinations mirror the sidebar sections so the two never disagree. */
const DESTINATIONS: { href: string; labelKey: string; group: string }[] = [
  { href: "/dashboard", labelKey: "nav.overview", group: "nav.section.command" },
  { href: "/dashboard/jarvis", labelKey: "nav.jarvis", group: "nav.section.command" },
  { href: "/dashboard/demand-analysis", labelKey: "nav.demandSpikes", group: "nav.section.intelligence" },
  { href: "/dashboard/product-analysis", labelKey: "nav.productAnalysis", group: "nav.section.intelligence" },
  { href: "/dashboard/category-analysis", labelKey: "nav.categoryAnalysis", group: "nav.section.intelligence" },
  { href: "/dashboard/what-if", labelKey: "nav.whatIf", group: "nav.section.intelligence" },
  { href: "/dashboard/forecasts", labelKey: "nav.forecasts", group: "nav.section.planning" },
  { href: "/dashboard/reorder-planner", labelKey: "nav.reorderPlanner", group: "nav.section.planning" },
  { href: "/dashboard/inventory-health", labelKey: "nav.inventoryHealth", group: "nav.section.planning" },
  { href: "/dashboard/model-accuracy", labelKey: "nav.modelAccuracy", group: "nav.section.planning" },
  { href: "/dashboard/news", labelKey: "nav.news", group: "nav.section.market" },
  { href: "/dashboard/promotions", labelKey: "nav.promotions", group: "nav.section.market" },
  { href: "/dashboard/market-insights", labelKey: "nav.marketInsights", group: "nav.section.market" },
  { href: "/dashboard/purchase-list", labelKey: "nav.purchaseList", group: "nav.section.operations" },
  { href: "/dashboard/inventory", labelKey: "nav.inventory", group: "nav.section.operations" },
  { href: "/dashboard/expiry-risk", labelKey: "nav.expiryRisk", group: "nav.section.operations" },
  { href: "/dashboard/alerts", labelKey: "nav.alerts", group: "nav.section.operations" },
  { href: "/dashboard/federated-intelligence", labelKey: "nav.federated", group: "nav.section.operations" },
  { href: "/dashboard/extension", labelKey: "nav.extension", group: "nav.section.operations" },
  { href: "/dashboard/settings", labelKey: "nav.settings", group: "nav.section.operations" },
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
