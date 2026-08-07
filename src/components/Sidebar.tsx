"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, AlertTriangle, LogOut, X, Zap, Bot, Box, Plus, Tag, ShoppingCart, Megaphone, Clock, FlaskConical, Newspaper, BadgePercent, Puzzle, Pin, PinOff, TrendingUp, ClipboardList, HeartPulse, Target, Users, Settings, Receipt, DollarSign, Lightbulb, Workflow, PlayCircle, Cpu, Network, GitCommit, Activity, ShieldAlert, Gauge, Sliders, Lock, Database, Layers, FileText, Sunrise, Building2, ArrowLeftRight, ShoppingBag, MessageSquare } from "lucide-react";
import { useAuth, useRBAC } from "@/lib/auth-context";
import { getRoleLabel, Permission } from "@/lib/rbac";
import { useLang } from "@/lib/lang-context";
import { supabase } from "@/lib/supabase";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/providers/sidebar-provider";
import Modal from "@/components/ui/Modal";

const navSections = [
  {
    titleKey: "COMMAND",
    items: [
      { href: "/dashboard", labelKey: "nav.overview", icon: LayoutDashboard },
      { href: "/dashboard/hq", labelKey: "HQ Command Center", icon: Building2 },
      { href: "/dashboard/communications", labelKey: "Communications Hub", icon: MessageSquare },
      { href: "/dashboard/jarvis", labelKey: "nav.jarvis", icon: Bot },
      { href: "/dashboard/store-assistant", labelKey: "Autopilot Hub", icon: Sunrise },
    ],
  },
  {
    titleKey: "OPERATIONS",
    items: [
      { href: "/dashboard/inventory", labelKey: "nav.inventory", icon: Package },
      { href: "/dashboard/sales", labelKey: "nav.sales", icon: DollarSign },
      { href: "/dashboard/transfers", labelKey: "Stock Transfers", icon: ArrowLeftRight },
      { href: "/dashboard/expiry-risk", labelKey: "nav.expiryRisk", icon: Clock },
      { href: "/dashboard/procurement", labelKey: "Procurement Hub", icon: ShoppingCart },
    ],
  },
  {
    titleKey: "PLANNING",
    items: [
      { href: "/dashboard/forecasts", labelKey: "nav.forecasts", icon: TrendingUp },
      { href: "/dashboard/central-procurement", labelKey: "Central Procurement", icon: ShoppingBag },
      { href: "/dashboard/reorder-planner", labelKey: "nav.reorderPlanner", icon: ClipboardList },
      { href: "/dashboard/what-if", labelKey: "nav.whatIf", icon: FlaskConical },
      { href: "/dashboard/explainability", labelKey: "Explainability (XAI)", icon: Lightbulb },
    ],
  },
  {
    titleKey: "INSIGHTS",
    items: [
      { href: "/dashboard/demand-analysis", labelKey: "Analytics", icon: Zap },
      { href: "/dashboard/market-insights", labelKey: "nav.marketInsights", icon: Megaphone },
      { href: "/dashboard/promotions", labelKey: "nav.promotions", icon: BadgePercent },
      { href: "/dashboard/news", labelKey: "nav.news", icon: Newspaper },
    ],
  },
  {
    titleKey: "UTILITIES",
    items: [
      { href: "/dashboard/alerts", labelKey: "Alerts & Audit", icon: AlertTriangle },
      { href: "/dashboard/system", labelKey: "System Console", icon: Cpu },
      { href: "/dashboard/settings", labelKey: "Settings", icon: Settings },
      { href: "/dashboard/settings/organization", labelKey: "Org Settings", icon: Building2 },
    ],
  },
];

function BrandMark({ size = 30 }: { size?: number }) {
  const reduce = useReducedMotion();
  return (
    <div
      className="rounded-lg bg-accent flex items-center justify-center shrink-0 fx-glow"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {/* The forecast line draws itself once on mount — the brand gesture. */}
        <motion.path
          d="M3 20L7 10L11 13L17 6L21 10"
          stroke="var(--accent-foreground)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduce ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.circle
          cx="17" cy="6" r="2.3" fill="var(--accent-foreground)"
          initial={reduce ? false : { scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: reduce ? 0 : 0.24, delay: reduce ? 0 : 0.42, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        />
      </svg>
    </div>
  );
}

const NAV_ITEM_PERMISSIONS: Record<string, Permission> = {
  "/dashboard/billing": "view_financials",
  "/dashboard/sales": "execute_pos",
  "/dashboard/procurement": "manage_purchases",
  "/dashboard/purchase-list": "manage_purchases",
  "/dashboard/reorder-planner": "manage_purchases",
  "/dashboard/inventory": "manage_inventory",
  "/dashboard/expiry-risk": "manage_inventory",
  "/dashboard/product-analysis": "manage_inventory",
  "/dashboard/category-analysis": "manage_inventory",
  "/dashboard/what-if": "view_financials",
  "/dashboard/inventory-health": "view_health_score",
  "/dashboard/model-accuracy": "view_health_score",
  "/dashboard/federated-intelligence": "view_health_score",
  "/dashboard/alerts": "view_audit_logs",
  "/dashboard/store-assistant": "manage_tasks",
};

export default function Sidebar() {
  const { isExpanded, isPinned, isMobileOpen, togglePin, setMobileOpen, setHovered } = useSidebar();
  const mobileOpen = isMobileOpen;
  const onMobileClose = () => setMobileOpen(false);
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { role, can } = useRBAC();
  const { t } = useLang();
  const [profileStoreName, setProfileStoreName] = useState("");

  const visibleSections = navSections
    .map((section) => {
      const visibleItems = section.items.filter((item) => {
        if (item.href.startsWith("/dashboard/system")) {
          return can("manage_store_config");
        }
        const requiredPermission = NAV_ITEM_PERMISSIONS[item.href];
        if (!requiredPermission) return true;
        return can(requiredPermission);
      });
      return { ...section, items: visibleItems };
    })
    .filter((section) => section.items.length > 0);

  const storeName = profileStoreName || user?.user_metadata?.store_name || "Store";
  const userName = user?.user_metadata?.full_name || user?.email || "User";

  // Real initials from a name; a bare email would otherwise show "DO" from "doraemon…".
  const initials = (() => {
    const name = String(userName);
    if (name.includes("@")) return name[0]?.toUpperCase() ?? "?";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  })();

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const emptyForm = { product: "", category: "Groceries", current_stock: "", unit: "pcs", price: "", brand: "", sku: "", expiryDate: "" };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    supabase
      .from("profiles")
      .select("store_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data?.store_name) setProfileStoreName(data.store_name);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const { error } = await supabase.from("inventory").insert({
      store_id: user?.id,
      product_name: form.product,
      category: form.category,
      current_stock: Number(form.current_stock),
      unit: form.unit,
      price: Number(form.price),
      brand: form.brand || null,
      sku: form.sku || null,
      expiry_date: form.expiryDate || null,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    window.dispatchEvent(new Event("products_updated"));
    setForm(emptyForm);
    setShowAddProduct(false);
  }

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-x-hidden">
      {/* Brand */}
      <div className={cn(
        "flex items-center shrink-0 border-b border-border/80 h-16",
        isExpanded ? "justify-between pl-4 pr-2" : "justify-center"
      )}>
        <Link
          href="/dashboard"
          aria-label="Forecastify home"
          className={cn(
            "flex items-center fx-focus rounded-md min-h-11",
            isExpanded ? "gap-3" : "mx-auto justify-center w-11"
          )}
        >
          <BrandMark size={isExpanded ? 32 : 34} />
          {isExpanded && (
            <span className="fx-display text-[18px] font-semibold tracking-tight text-foreground whitespace-nowrap truncate">
              Forecastify
            </span>
          )}
        </Link>
        {isExpanded && (
          <button
            onClick={togglePin}
            aria-label={isPinned ? "Unpin sidebar" : "Pin sidebar open"}
            aria-pressed={isPinned}
            className="hidden lg:inline-flex fx-icon-btn"
          >
            {isPinned
              ? <PinOff className="w-4 h-4 text-accent" aria-hidden="true" />
              : <Pin className="w-4 h-4" aria-hidden="true" />}
          </button>
        )}
        <button
          onClick={onMobileClose}
          className="lg:hidden fx-icon-btn"
          aria-label="Close navigation"
        >
          <X className="w-4.5 h-4.5" aria-hidden="true" />
        </button>
      </div>

      <div className="px-3 pt-4 pb-2.5 shrink-0 flex justify-center">
        <button
          onClick={() => setShowAddProduct(true)}
          aria-label={isExpanded ? undefined : t("nav.addProduct")}
          className={cn(
            "fx-btn fx-press fx-ripple fx-lift text-[14px] text-secondary-foreground",
            isExpanded
              ? "w-full justify-start gap-3"
              : "w-11 h-11 p-0 flex items-center justify-center"
          )}
        >
          <Plus className="w-5 h-5 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
          {isExpanded && <span className="whitespace-nowrap truncate">{t("nav.addProduct")}</span>}
        </button>
      </div>

      <nav className="flex-1 px-3 pt-2 pb-4 overflow-y-auto overflow-x-hidden" aria-label="Primary">
        {visibleSections.map((section) => (
          <div key={section.titleKey} className="mt-7 first:mt-2">
            {isExpanded ? (
              <p className="fx-eyebrow px-2.5 mb-2.5">{t(section.titleKey)}</p>
            ) : (
              <div className="h-px bg-border/40 my-4 first:hidden" aria-hidden="true" />
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const label = t(item.labelKey);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    aria-current={isActive ? "page" : undefined}
                    /* Name the link even when the rail is collapsed — `title`
                       alone is not a reliable accessible name. */
                    aria-label={isExpanded ? undefined : label}
                    className={cn(
                      "relative flex items-center rounded-md text-[14.5px] transition-all duration-[var(--t-medium)] ease-[var(--ease-out)] fx-focus fx-lift group min-h-11",
                      isExpanded
                        ? "pl-3.5 pr-2.5 gap-3.5 w-full"
                        : "w-11 p-0 justify-center mx-auto",
                      isActive
                        ? "bg-card text-foreground font-semibold shadow-xs border border-border"
                        : "text-sidebar-foreground font-medium border border-transparent hover:text-foreground hover:bg-hover-surface"
                    )}
                  >
                    {/* One indicator shared across rows, so it slides between
                        them instead of blinking out and in. */}
                    {isActive && isExpanded && (
                      <motion.span
                        layoutId="nav-active-indicator"
                        className="absolute left-0 top-1/2 w-[2.5px] h-4.5 rounded-full bg-accent"
                        style={{ y: "-50%" }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        aria-hidden="true"
                      />
                    )}
                    <item.icon
                      size={21}
                      className={cn(
                        "shrink-0 transition-transform duration-[var(--t-medium)] ease-[var(--ease-out)] group-hover:scale-110",
                        isActive ? "text-accent" : "text-muted-foreground group-hover:text-foreground"
                      )}
                      strokeWidth={isActive ? 2.0 : 1.7}
                      aria-hidden="true"
                    />
                    {isExpanded && <span className="whitespace-nowrap truncate">{label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="fx-rule px-3 pt-3 pb-3 shrink-0 flex justify-center">
        <div className={cn(
          "flex items-center w-full",
          isExpanded ? "gap-3 px-2" : "justify-center"
        )}>
          <div
            className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center text-[12px] font-semibold text-secondary-foreground uppercase shrink-0"
            aria-hidden="true"
          >
            {initials}
          </div>
          {isExpanded ? (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-foreground truncate leading-tight">{userName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-[11.5px] text-muted-foreground truncate leading-tight">{storeName}</p>
                  <span className="text-[9.5px] font-mono font-medium px-1.5 py-0.5 rounded bg-accent/10 text-accent uppercase tracking-wider">{getRoleLabel(role)}</span>
                </div>
              </div>
              <Link
                href="/dashboard/settings"
                onClick={onMobileClose}
                aria-label={t("nav.settings")}
                aria-current={pathname === "/dashboard/settings" ? "page" : undefined}
                className="fx-icon-btn shrink-0"
              >
                <Settings className="w-4 h-4" aria-hidden="true" />
              </Link>
              <button
                onClick={signOut}
                aria-label={t("nav.signOut")}
                className="fx-icon-btn shrink-0 hover:text-danger"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </button>
            </>
          ) : (
            <span className="fx-sr-only">{userName}, {storeName}</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Modal
        open={showAddProduct}
        onClose={() => setShowAddProduct(false)}
        title="Add Product"
        description={`New item in ${storeName}'s catalog`}
      >
        <form id="add-product-form" onSubmit={handleAddProduct} className="space-y-3.5">
              <div>
                <label htmlFor="ap-name" className="block text-xs font-medium text-secondary-foreground mb-1.5">Product Name *</label>
                <input id="ap-name" required placeholder="e.g. Tata Salt 1kg" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} className="fx-input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ap-brand" className="block text-xs font-medium text-secondary-foreground mb-1.5">Brand</label>
                  <input id="ap-brand" placeholder="e.g. Tata" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="fx-input" />
                </div>
                <div>
                  <label htmlFor="ap-cat" className="block text-xs font-medium text-secondary-foreground mb-1.5">Category *</label>
                  <select id="ap-cat" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="fx-input">
                    {["Groceries", "Dairy", "Beverages", "Snacks", "Personal Care", "Household"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ap-qty" className="block text-xs font-medium text-secondary-foreground mb-1.5">Quantity *</label>
                  <input id="ap-qty" required type="number" min="0" placeholder="e.g. 100" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: e.target.value })} className="fx-input fx-num" />
                </div>
                <div>
                  <label htmlFor="ap-unit" className="block text-xs font-medium text-secondary-foreground mb-1.5">Unit *</label>
                  <select id="ap-unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="fx-input">
                    {["pcs", "kg", "g", "L", "ml", "box", "pack", "dozen"].map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ap-price" className="block text-xs font-medium text-secondary-foreground mb-1.5">Price (₹) *</label>
                  <input id="ap-price" required type="number" min="0" step="0.01" placeholder="e.g. 25.00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="fx-input fx-num" />
                </div>
                <div>
                  <label htmlFor="ap-sku" className="block text-xs font-medium text-secondary-foreground mb-1.5">SKU</label>
                  <input id="ap-sku" placeholder="e.g. TS-001" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="fx-input" />
                </div>
              </div>
              <div>
                <label htmlFor="ap-exp" className="block text-xs font-medium text-secondary-foreground mb-1.5">Expiry Date</label>
                <input id="ap-exp" type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="fx-input" />
              </div>
              {error && (
                <p className="text-xs text-danger bg-danger-soft border border-danger/25 rounded-md px-3 py-2" role="alert">{error}</p>
              )}
              <div className="pt-1">
                <button type="submit" disabled={saving} className="fx-btn fx-btn-accent w-full">
                  {saving ? "Adding…" : "Add Product"}
                </button>
              </div>
        </form>
      </Modal>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-foreground/25 backdrop-blur-[2px] z-40 lg:hidden fx-fade-in"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/*
        Mobile drawer. `inert` removes it from the tab order and the
        accessibility tree while it is translated off-screen — without it the
        19 controls inside stay reachable by keyboard behind the closed drawer.
      */}
      <aside
        id="mobile-nav"
        inert={!mobileOpen}
        aria-hidden={!mobileOpen}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-border transform transition-transform duration-200 ease-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/*
        Desktop rail. Width is not transitioned: animating it reflows the whole
        page every frame, and this fires on every hover. `focus-within` lets
        keyboard users expand it too — hover alone left them with icons only.
      */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setHovered(false);
        }}
        className={cn(
          "hidden lg:flex flex-col sticky top-0 h-[100dvh] bg-sidebar border-r border-border shrink-0 overflow-x-hidden",
          isExpanded ? "w-[240px]" : "w-[60px]"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
