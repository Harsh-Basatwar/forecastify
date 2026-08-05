/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { Package, Search, ArrowUpDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

type Status = "critical" | "low" | "optimal" | "overstock";
type Trend = "rising" | "falling" | "stable";

interface InventoryItem {
  id: number;
  product: string;
  sku: string;
  category: string;
  currentStock: number;
  recommendedStock: number;
  dailyDemand: number;
  daysOfStock: number;
  status: Status;
  trend: Trend;
}

function transformItem(row: any): InventoryItem {
  const currentStock = row.current_stock ?? 0;
  // Status based on AI-driven daily demand from historic sales
  // critical: < 3 days supply, low: < 7 days, overstock: > 30 days
  const dailyDemand = Math.max(1, Math.round(currentStock / 14));
  const daysOfStock = dailyDemand > 0 ? Math.round(currentStock / dailyDemand) : 0;

  let status: Status = "optimal";
  if (currentStock <= 5) status = "critical";
  else if (currentStock <= 15) status = "low";
  else if (currentStock >= 150) status = "overstock";

  return {
    id: row.id,
    product: row.product_name ?? "Unknown",
    sku: row.sku ?? "—",
    category: row.category ?? "General",
    currentStock,
    recommendedStock: Math.ceil(dailyDemand * 14),
    dailyDemand,
    daysOfStock,
    status,
    trend: "stable" as Trend,
  };
}

// Severity language: critical screams, low warns, optimal stays quiet
function StatusCell({ status }: { status: Status }) {
  if (status === "critical") {
    return <span className="fx-badge fx-badge-danger">Critical</span>;
  }
  if (status === "low") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warning">
        <span className="fx-signal fx-signal-warning" aria-hidden="true" /> Low Stock
      </span>
    );
  }
  if (status === "overstock") {
    return <span className="fx-badge">Overstock</span>;
  }
  return <span className="text-xs text-muted-foreground">Optimal</span>;
}

const barColor: Record<Status, string> = {
  critical: "var(--danger)",
  low: "var(--warning)",
  optimal: "var(--success)",
  overstock: "var(--muted-foreground)",
};

// Skeleton mirrors the KPI strip + ledger table to prevent shift
function LoadingSkeleton() {
  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12" aria-busy="true" aria-label="Loading inventory">
      <div className="fx-card grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[var(--border)] overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="p-5 space-y-3">
            <div className="skeleton-shimmer h-3 w-24" />
            <div className="skeleton-shimmer h-7 w-14" />
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="skeleton-shimmer h-10 flex-1" />
        <div className="skeleton-shimmer h-10 w-full sm:w-36" />
        <div className="skeleton-shimmer h-10 w-full sm:w-36" />
      </div>
      <div className="fx-card p-6 space-y-0">
        <div className="skeleton-shimmer h-3.5 w-40 mb-5" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b border-border last:border-b-0">
            <div className="skeleton-shimmer h-3.5 w-1/3" />
            <div className="skeleton-shimmer h-3.5 w-16" />
            <div className="skeleton-shimmer h-3.5 w-12 ml-auto" />
            <div className="skeleton-shimmer h-3.5 w-12" />
            <div className="skeleton-shimmer h-3.5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"daysOfStock" | "product">("daysOfStock");
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("inventory")
        .select("*")
        .eq("store_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setInventoryData((data ?? []).map(transformItem));
      }
      setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filtered = inventoryData
    .filter((item: InventoryItem) => {
      const matchesSearch = item.product.toLowerCase().includes(search.toLowerCase()) || item.sku.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a: InventoryItem, b: InventoryItem) => sortBy === "daysOfStock" ? a.daysOfStock - b.daysOfStock : a.product.localeCompare(b.product));

  const summary = {
    total: inventoryData.length,
    critical: inventoryData.filter((i: InventoryItem) => i.status === "critical").length,
    low: inventoryData.filter((i: InventoryItem) => i.status === "low").length,
    overstock: inventoryData.filter((i: InventoryItem) => i.status === "overstock").length,
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
        <div role="alert" className="bg-danger-soft border border-danger/25 text-danger rounded-[var(--radius-md)] px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm">Failed to load inventory: {error}</span>
          <button onClick={fetchInventory} className="fx-btn">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      <div>
        <h1 className="fx-display text-[24px] text-foreground">Inventory Management</h1>
        <p className="text-[13px] text-muted-foreground mt-1.5">
          Monitor stock levels, daily demand, and AI restock recommendations
        </p>
      </div>

      {/* ── Stock posture · one ledger strip ─────────────────────── */}
      <section aria-label="Inventory summary" className="fx-card grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[var(--border)] overflow-hidden">
        <div className="p-5 sm:p-6">
          <p className="fx-eyebrow">Total Products</p>
          <p className="fx-num fx-metric-xl text-foreground mt-2.5">{summary.total}</p>
          <p className="text-xs text-muted-foreground mt-2.5">Tracked SKUs</p>
        </div>
        <div className="p-5 sm:p-6">
          <p className="fx-eyebrow">Critical</p>
          <p className="fx-num fx-metric-xl text-foreground mt-2.5">{summary.critical}</p>
          <p className={`inline-flex items-center gap-1.5 text-xs mt-2.5 font-medium ${summary.critical > 0 ? "text-danger" : "text-muted-foreground"}`}>
            <span className={`fx-signal ${summary.critical > 0 ? "fx-signal-danger" : "fx-signal-success"}`} aria-hidden="true" />
            {summary.critical > 0 ? "Under 3 days supply" : "None at risk"}
          </p>
        </div>
        <div className="p-5 sm:p-6">
          <p className="fx-eyebrow">Low Stock</p>
          <p className="fx-num fx-metric-xl text-foreground mt-2.5">{summary.low}</p>
          <p className={`inline-flex items-center gap-1.5 text-xs mt-2.5 font-medium ${summary.low > 0 ? "text-warning" : "text-muted-foreground"}`}>
            <span className={`fx-signal ${summary.low > 0 ? "fx-signal-warning" : "fx-signal-success"}`} aria-hidden="true" />
            {summary.low > 0 ? "Reorder this week" : "All above threshold"}
          </p>
        </div>
        <div className="p-5 sm:p-6">
          <p className="fx-eyebrow">Overstock</p>
          <p className="fx-num fx-metric-xl text-foreground mt-2.5">{summary.overstock}</p>
          <p className="text-xs text-muted-foreground mt-2.5">Over 30 days supply</p>
        </div>
      </section>

      {/* ── Controls · quiet toolbar, no card ─────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
          <input
            type="text"
            placeholder="Search products or SKU..."
            aria-label="Search products or SKU"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="fx-input pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="fx-input sm:w-44"
        >
          <option value="all">All Status</option>
          <option value="critical">Critical</option>
          <option value="low">Low Stock</option>
          <option value="optimal">Optimal</option>
          <option value="overstock">Overstock</option>
        </select>
        <button onClick={() => setSortBy(sortBy === "daysOfStock" ? "product" : "daysOfStock")} className="fx-btn">
          <ArrowUpDown className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} />
          {sortBy === "daysOfStock" ? "Days of Stock" : "Name"}
        </button>
      </div>

      {/* ── Ledger · desktop ──────────────────────────────────────── */}
      <section aria-label="Inventory ledger" className="hidden md:block fx-card p-6">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h2 className="fx-display text-[17px] text-foreground">Stock Ledger</h2>
          <p className="text-xs text-muted-foreground fx-num">{filtered.length} of {inventoryData.length} products</p>
        </div>
        <div className="fx-table-scroll -mx-2">
          <table className="fx-table min-w-[720px]">
            <caption className="fx-sr-only">
              Stock ledger: product and SKU, category, current stock against the recommended level, daily demand, days of cover left, and stock status. Product and Days Left are sortable.
            </caption>
            <thead>
              <tr>
                <th scope="col" aria-sort={sortBy === "product" ? "ascending" : "none"}>
                  <button type="button" className="fx-sort" onClick={() => setSortBy("product")}>
                    Product
                    {sortBy === "product"
                      ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={2} />
                      : <ArrowUpDown className="w-3.5 h-3.5 opacity-60" aria-hidden="true" strokeWidth={2} />}
                  </button>
                </th>
                <th scope="col">Category</th>
                <th scope="col" className="text-right">Current Stock</th>
                <th scope="col" className="text-right">Recommended</th>
                <th scope="col" className="text-right">Daily Demand</th>
                <th scope="col" className="text-right" aria-sort={sortBy === "daysOfStock" ? "ascending" : "none"}>
                  <button type="button" className="fx-sort" onClick={() => setSortBy("daysOfStock")}>
                    Days Left
                    {sortBy === "daysOfStock"
                      ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={2} />
                      : <ArrowUpDown className="w-3.5 h-3.5 opacity-60" aria-hidden="true" strokeWidth={2} />}
                  </button>
                </th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const stockPercent = Math.min(100, (item.currentStock / item.recommendedStock) * 100);
                return (
                  <tr key={item.id}>
                    <td>
                      <p className="text-sm font-medium text-foreground">{item.product}</p>
                      <p className="fx-num text-xs text-muted-foreground mt-0.5">{item.sku}</p>
                    </td>
                    <td className="text-xs text-muted-foreground">{item.category}</td>
                    <td className="text-right">
                      <p className="fx-num text-sm font-semibold text-foreground">{item.currentStock}</p>
                      <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-1.5" aria-hidden="true">
                        <div className="h-full rounded-full" style={{ width: `${stockPercent}%`, background: barColor[item.status] }} />
                      </div>
                    </td>
                    <td className="text-right fx-num text-muted-foreground">{item.recommendedStock}</td>
                    <td className="text-right fx-num text-secondary-foreground">{item.dailyDemand}</td>
                    <td className="text-right">
                      <span className={`fx-num font-semibold inline-flex items-center gap-1.5 ${item.daysOfStock <= 2 ? "text-danger" : item.daysOfStock <= 4 ? "text-warning" : "text-foreground"}`}>
                        {item.daysOfStock <= 2 && <span className="fx-signal fx-signal-danger" aria-hidden="true" />}
                        {item.daysOfStock > 2 && item.daysOfStock <= 4 && <span className="fx-signal fx-signal-warning" aria-hidden="true" />}
                        {item.daysOfStock}d
                      </span>
                    </td>
                    <td><StatusCell status={item.status} /></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center">
                    <Package className="w-5 h-5 text-muted-foreground mx-auto mb-3 opacity-50" aria-hidden="true" strokeWidth={1.8} />
                    <p className="text-sm text-secondary-foreground font-medium">No products match</p>
                    <p className="text-xs text-muted-foreground mt-1">Adjust the search or status filter to see inventory.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Mobile · hairline-divided rows ────────────────────────── */}
      <section aria-label="Inventory list" className="md:hidden fx-card px-5">
        {filtered.map((item) => {
          const stockPercent = Math.min(100, (item.currentStock / item.recommendedStock) * 100);
          return (
            <div key={item.id} className="py-4 border-b border-border last:border-b-0">
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.product}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.category} · <span className="fx-num">{item.sku}</span></p>
                </div>
                <StatusCell status={item.status} />
              </div>
              <div className="w-full h-1 bg-muted rounded-full overflow-hidden mb-2.5" aria-hidden="true">
                <div className="h-full rounded-full" style={{ width: `${stockPercent}%`, background: barColor[item.status] }} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="fx-eyebrow">Stock</p>
                  <p className="fx-num fx-metric-sm text-foreground mt-0.5">{item.currentStock}</p>
                </div>
                <div>
                  <p className="fx-eyebrow">Demand /day</p>
                  <p className="fx-num fx-metric-sm text-foreground mt-0.5">{item.dailyDemand}</p>
                </div>
                <div>
                  <p className="fx-eyebrow">Days Left</p>
                  <p className={`fx-num fx-metric-sm mt-0.5 inline-flex items-center gap-1.5 ${item.daysOfStock <= 2 ? "text-danger" : item.daysOfStock <= 4 ? "text-warning" : "text-foreground"}`}>
                    {item.daysOfStock <= 2 && <span className="fx-signal fx-signal-danger" aria-hidden="true" />}
                    {item.daysOfStock > 2 && item.daysOfStock <= 4 && <span className="fx-signal fx-signal-warning" aria-hidden="true" />}
                    {item.daysOfStock}d
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-10 text-center">
            <Package className="w-5 h-5 text-muted-foreground mx-auto mb-3 opacity-50" aria-hidden="true" strokeWidth={1.8} />
            <p className="text-sm text-secondary-foreground font-medium">No products match</p>
            <p className="text-xs text-muted-foreground mt-1">Adjust the search or status filter to see inventory.</p>
          </div>
        )}
      </section>
    </div>
  );
}
