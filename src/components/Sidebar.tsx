"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, AlertTriangle, LogOut, X, Zap, Bot, Box, Plus, Tag, ShoppingCart, Megaphone, Clock, FlaskConical, Newspaper, BadgePercent, Puzzle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { supabase } from "@/lib/supabase";

const navSections = [
  {
    titleKey: "nav.section.command",
    items: [
      { href: "/dashboard", labelKey: "nav.overview", icon: LayoutDashboard },
      { href: "/dashboard/jarvis", labelKey: "nav.jarvis", icon: Bot },
    ],
  },
  {
    titleKey: "nav.section.intelligence",
    items: [
      { href: "/dashboard/demand-analysis", labelKey: "nav.demandSpikes", icon: Zap },
      { href: "/dashboard/product-analysis", labelKey: "nav.productAnalysis", icon: Box },
      { href: "/dashboard/category-analysis", labelKey: "nav.categoryAnalysis", icon: Tag },
      { href: "/dashboard/what-if", labelKey: "nav.whatIf", icon: FlaskConical },
    ],
  },
  {
    titleKey: "nav.section.market",
    items: [
      { href: "/dashboard/news", labelKey: "nav.news", icon: Newspaper },
      { href: "/dashboard/promotions", labelKey: "nav.promotions", icon: BadgePercent },
      { href: "/dashboard/market-insights", labelKey: "nav.marketInsights", icon: Megaphone },
    ],
  },
  {
    titleKey: "nav.section.operations",
    items: [
      { href: "/dashboard/purchase-list", labelKey: "nav.purchaseList", icon: ShoppingCart },
      { href: "/dashboard/inventory", labelKey: "nav.inventory", icon: Package },
      { href: "/dashboard/expiry-risk", labelKey: "nav.expiryRisk", icon: Clock },
      { href: "/dashboard/alerts", labelKey: "nav.alerts", icon: AlertTriangle },
      { href: "/dashboard/extension", labelKey: "nav.extension", icon: Puzzle },
    ],
  },
];

function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <div
      className="rounded-lg bg-accent flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M3 20L7 10L11 13L17 6L21 10" stroke="var(--accent-foreground)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="17" cy="6" r="2.3" fill="var(--accent-foreground)" />
      </svg>
    </div>
  );
}

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { t } = useLang();
  const [profileStoreName, setProfileStoreName] = useState("");

  const storeName = profileStoreName || user?.user_metadata?.store_name || "Store";
  const userName = user?.user_metadata?.full_name || user?.email || "User";

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
    <div className="flex flex-col h-full overflow-x-hidden select-none">
      {/* Brand */}
      <div className="flex items-center justify-between pl-5 pr-3 h-16 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5 fx-focus rounded-md">
          <BrandMark />
          <span className="fx-display text-[17px] font-semibold tracking-tight text-foreground">
            Forecastify
          </span>
        </Link>
        <button
          onClick={onMobileClose}
          className="lg:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary fx-focus"
          aria-label="Close navigation"
        >
          <X className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Primary action */}
      <div className="px-3 pt-1 pb-2 shrink-0">
        <button
          onClick={() => setShowAddProduct(true)}
          className="fx-btn w-full justify-start gap-2 text-[13px] text-secondary-foreground"
        >
          <Plus className="w-4 h-4 shrink-0 text-accent" strokeWidth={2.2} />
          {t("nav.addProduct")}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-4 overflow-y-auto overflow-x-hidden" aria-label="Primary">
        {navSections.map((section) => (
          <div key={section.titleKey} className="mt-4 first:mt-1">
            <p className="fx-eyebrow px-2.5 mb-1.5 text-[10px]">{t(section.titleKey)}</p>
            <div className="space-y-px">
              {section.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative flex items-center gap-2.5 pl-2.5 pr-2 py-[7px] rounded-md text-[13px] transition-colors duration-100 fx-focus group ${
                      isActive
                        ? "bg-card text-foreground font-semibold shadow-xs border border-border"
                        : "text-sidebar-foreground font-medium border border-transparent hover:text-foreground hover:bg-card/60"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-4 rounded-full bg-accent" aria-hidden="true" />
                    )}
                    <item.icon
                      className={`w-4 h-4 shrink-0 transition-colors ${isActive ? "text-accent" : "text-muted-foreground group-hover:text-foreground"}`}
                      strokeWidth={isActive ? 2.1 : 1.8}
                    />
                    <span className="whitespace-nowrap truncate">{t(item.labelKey)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Account */}
      <div className="fx-rule px-3 py-3 shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-[11px] font-semibold text-secondary-foreground uppercase shrink-0">
            {String(userName).slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-foreground truncate leading-tight">{userName}</p>
            <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">{storeName}</p>
          </div>
          <button
            onClick={signOut}
            title={t("nav.signOut")}
            aria-label={t("nav.signOut")}
            className="p-2 rounded-md text-muted-foreground hover:text-danger hover:bg-danger/8 transition-colors fx-focus shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {showAddProduct && (
        <div
          className="fixed inset-0 bg-foreground/25 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4 fx-fade-in"
          onClick={() => setShowAddProduct(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Add product"
        >
          <div
            className="bg-elevated border border-border rounded-[var(--radius-lg)] w-full max-w-md fx-page"
            style={{ boxShadow: "var(--shadow-lg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
              <div>
                <h2 className="fx-display text-lg text-foreground">Add Product</h2>
                <p className="text-xs text-muted-foreground mt-0.5">New item in {storeName}&apos;s catalog</p>
              </div>
              <button
                onClick={() => setShowAddProduct(false)}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary fx-focus"
                aria-label="Close"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            <form onSubmit={handleAddProduct} className="px-6 py-5 space-y-3.5 max-h-[65vh] overflow-y-auto">
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
                <p className="text-xs text-danger bg-danger/8 border border-danger/20 rounded-md px-3 py-2" role="alert">{error}</p>
              )}
              <div className="pt-1">
                <button type="submit" disabled={saving} className="fx-btn fx-btn-accent w-full py-2.5">
                  {saving ? "Adding…" : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mobileOpen && <div className="fixed inset-0 bg-foreground/25 backdrop-blur-[2px] z-40 lg:hidden fx-fade-in" onClick={onMobileClose} aria-hidden="true" />}

      {/* Mobile drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-border transform transition-transform duration-200 ease-out lg:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {sidebarContent}
      </aside>

      {/* Desktop rail */}
      <aside className="hidden lg:flex flex-col sticky top-0 h-screen w-[232px] bg-sidebar border-r border-border shrink-0">
        {sidebarContent}
      </aside>
    </>
  );
}
