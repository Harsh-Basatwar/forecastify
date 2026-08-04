"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Filter, Package, AlertTriangle, BarChart3 } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const chartTooltipStyle = {
  background: "var(--elevated)",
  border: "1px solid var(--border-strong)",
  borderRadius: "10px",
  boxShadow: "var(--shadow-md)",
  fontSize: "12px",
  color: "var(--foreground)",
} as const;

// Contextual skeleton — mirrors the real layout to prevent shift
function LoadingSkeleton() {
  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12" aria-busy="true" aria-label="Loading forecasts">
      <div className="fx-card p-6 space-y-4">
        <div className="skeleton-shimmer h-4 w-72" />
        <div className="skeleton-shimmer h-3.5 w-56" />
        <div className="skeleton-shimmer h-64 w-full" />
      </div>
      <div className="fx-card grid grid-cols-2 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="p-5 space-y-2.5 border-r border-border last:border-r-0">
            <div className="skeleton-shimmer h-3 w-20" />
            <div className="skeleton-shimmer h-7 w-14" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="fx-card p-6 space-y-3">
          <div className="skeleton-shimmer h-4 w-36" />
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton-shimmer h-12 w-full" />)}
        </div>
        <div className="fx-card p-6 xl:col-span-2 space-y-3">
          <div className="skeleton-shimmer h-4 w-48" />
          <div className="skeleton-shimmer h-56 w-full" />
          <div className="skeleton-shimmer h-16 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function ForecastsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState("All");

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetch("/api/forecasts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        });
        const d = await res.json();
        if (!d.error) {
          setData(d);
          if (d.productForecasts?.length) setSelectedProduct(d.productForecasts[0]);
        }
      } catch {} finally { setLoading(false); }
    })();
  }, [user]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  const products = data?.productForecasts || [];
  const storeWide = data?.storeWideForecast || [];
  const categories = ["All", ...new Set(products.map((p: any) => p.category))] as string[];
  const filtered = filterCategory === "All" ? products : products.filter((p: any) => p.category === filterCategory);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      {/* Store-Wide Forecast Chart — the hero */}
      <section aria-label="Store-wide forecast" className="fx-card p-6">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} />
          <h3 className="fx-display text-[17px] text-foreground">Store-Wide 7-Day Demand Forecast</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Aggregated prediction vs last week actuals with confidence bounds
          {data?.totalProducts && <span className="ml-2">({data.totalProducts} products tracked)</span>}
        </p>
        <div className="h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={storeWide} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="fGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 6" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} dy={6} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} cursor={{ stroke: "var(--border-strong)", strokeDasharray: "3 3" }} />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} iconType="plainline" />
              <Area type="monotone" dataKey="upper" name="Upper Bound" stroke="none" fill="var(--accent-soft)" />
              <Area type="monotone" dataKey="lower" name="Lower Bound" stroke="none" fill="var(--background)" />
              <Area type="monotone" dataKey="predicted" name="Forecast" stroke="var(--accent)" strokeWidth={2} fill="url(#fGrad)" activeDot={{ r: 4 }} />
              <Area type="monotone" dataKey="actual" name="Last Week Avg" stroke="var(--muted-foreground)" strokeWidth={1.5} fill="none" strokeDasharray="5 4" />
              <Area type="monotone" dataKey="recommended" name="Recommended" stroke="var(--warning)" strokeWidth={1.5} fill="none" strokeDasharray="2 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Summary ledger strip */}
      <section aria-label="Forecast summary" className="fx-card grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[var(--border)] overflow-hidden">
        <div className="px-5 py-4">
          <p className="fx-eyebrow text-[10px]">Total Products</p>
          <p className="fx-num text-lg font-semibold mt-1.5 text-foreground">{data?.totalProducts || 0}</p>
        </div>
        <div className="px-5 py-4">
          <p className="fx-eyebrow text-[10px]">Critical Stock</p>
          <p className={`fx-num text-lg font-semibold mt-1.5 inline-flex items-center gap-1.5 ${(data?.criticalCount || 0) > 0 ? "text-danger" : "text-foreground"}`}>
            {(data?.criticalCount || 0) > 0 && <span className="fx-signal fx-signal-danger" aria-hidden="true" />}
            {data?.criticalCount || 0}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="fx-eyebrow text-[10px]">Low Stock</p>
          <p className={`fx-num text-lg font-semibold mt-1.5 inline-flex items-center gap-1.5 ${(data?.lowCount || 0) > 0 ? "text-warning" : "text-foreground"}`}>
            {(data?.lowCount || 0) > 0 && <span className="fx-signal fx-signal-warning" aria-hidden="true" />}
            {data?.lowCount || 0}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="fx-eyebrow text-[10px]">Overstock</p>
          <p className="fx-num text-lg font-semibold mt-1.5 text-foreground">{data?.overstockCount || 0}</p>
        </div>
        {data?.testInputs?.total > 0 && (
          <div className="px-5 py-4 col-span-2 sm:col-span-4 fx-rule border-l-0">
            <p className="fx-eyebrow text-[10px]">Test Inputs (test_input table)</p>
            <p className="text-sm text-secondary-foreground mt-1.5">
              <span className="fx-num font-semibold text-foreground">{data.testInputs.total}</span> predictions required — <span className="fx-num font-semibold text-foreground">{data.testInputs.productIds?.length || 0}</span> unique products
            </p>
          </div>
        )}
      </section>

      {/* Product List + Detail */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section aria-label="Product forecasts" className="fx-card p-6">
          <div className="flex items-center justify-between mb-4 gap-3">
            <h3 className="fx-display text-[17px] text-foreground">Product Forecasts</h3>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                aria-label="Filter by category"
                className="fx-input !w-auto !py-1.5 !px-2.5 text-xs"
              >
                {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
              </select>
            </div>
          </div>
          <div className="max-h-[400px] overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <div className="text-center py-8">
                <Package className="w-5 h-5 text-muted-foreground mx-auto mb-3 opacity-50" aria-hidden="true" strokeWidth={1.8} />
                <p className="text-sm text-secondary-foreground font-medium">No products found</p>
                <p className="text-xs text-muted-foreground mt-1">Try a different category filter.</p>
              </div>
            )}
            {filtered.map((product: any) => (
              <button
                key={product.productId}
                onClick={() => setSelectedProduct(product)}
                aria-pressed={selectedProduct?.productId === product.productId}
                className={`w-full text-left px-3 py-3 border-b border-border last:border-b-0 transition-colors fx-focus ${
                  selectedProduct?.productId === product.productId
                    ? "bg-[var(--accent-soft)]"
                    : "hover:bg-secondary/60"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {product.product}
                      {product.isTestInput && <span className="ml-1.5 fx-badge fx-badge-accent">TEST</span>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{product.category} &bull; {product.brand}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {product.trend === "rising" ? <TrendingUp className="w-4 h-4 text-success" aria-hidden="true" strokeWidth={1.8} /> :
                     product.trend === "falling" ? <TrendingDown className="w-4 h-4 text-danger" aria-hidden="true" strokeWidth={1.8} /> :
                     <Minus className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />}
                    <span className="fx-num text-sm font-semibold text-foreground">{product.dailyDemand}/day</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section aria-label="Selected product forecast" className="xl:col-span-2 fx-card p-6">
          {selectedProduct ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                <div>
                  <h3 className="fx-display text-[17px] text-foreground">{selectedProduct.product}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    7-day forecast &bull; Avg <span className="fx-num font-medium text-secondary-foreground">{selectedProduct.dailyDemand}</span> units/day &bull; MRP <span className="fx-num font-medium text-secondary-foreground">₹{selectedProduct.mrp}</span>
                  </p>
                </div>
                <span className={`fx-badge ${
                  selectedProduct.status === "critical" ? "fx-badge-danger" :
                  selectedProduct.status === "low" ? "fx-badge-warning" :
                  selectedProduct.status === "overstock" ? "fx-badge-accent" :
                  "fx-badge-success"
                }`}>
                  {selectedProduct.status === "critical" ? <AlertTriangle className="w-3 h-3" aria-hidden="true" /> :
                   selectedProduct.status === "low" ? <AlertTriangle className="w-3 h-3" aria-hidden="true" /> :
                   selectedProduct.status === "overstock" ? <Package className="w-3 h-3" aria-hidden="true" /> : null}
                  {selectedProduct.status === "critical" ? "Critical" :
                   selectedProduct.status === "low" ? "Low Stock" :
                   selectedProduct.status === "overstock" ? "Overstock" : "Optimal"}
                </span>
              </div>

              <div className="h-64 sm:h-72 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedProduct.dailyForecast} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
                    <CartesianGrid strokeDasharray="4 6" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} dy={6} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      cursor={{ stroke: "var(--border-strong)", strokeDasharray: "3 3" }}
                      formatter={(value: any, name: any) => {
                        if (name === "predicted") return [value, "Forecast"];
                        if (name === "recommended") return [value, "Recommended"];
                        if (name === "confidence") return [`${value}%`, "Confidence"];
                        return [value, name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} iconType="plainline" />
                    <Line type="monotone" dataKey="predicted" name="Forecast" stroke="var(--accent)" strokeWidth={2} dot={{ fill: "var(--accent)", r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="recommended" name="Recommended" stroke="var(--warning)" strokeWidth={1.5} strokeDasharray="2 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[var(--border)] border border-border rounded-[var(--radius-md)] overflow-hidden mb-4">
                {[
                  { label: "Current Stock", value: `${selectedProduct.currentStock} units`, color: "text-foreground" },
                  { label: "Recommended", value: `${selectedProduct.recommendedStock} units`, color: "text-warning" },
                  { label: "Weekly Demand", value: `${selectedProduct.weeklyDemand} units`, color: "text-foreground" },
                  { label: "Days of Stock", value: `${selectedProduct.daysOfStock} days`, color: selectedProduct.daysOfStock < 3 ? "text-danger" : "text-foreground" },
                ].map((stat) => (
                  <div key={stat.label} className="px-4 py-3">
                    <p className="fx-eyebrow text-[10px]">{stat.label}</p>
                    <p className={`fx-num text-sm font-semibold mt-1 ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Detailed table */}
              <div className="overflow-x-auto -mx-2">
                <table className="fx-table min-w-[480px]">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th className="text-right">Forecast</th>
                      <th className="text-right">Recommended</th>
                      <th className="text-right">Confidence</th>
                      <th className="text-right">Est. Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProduct.dailyForecast?.map((d: any, i: number) => (
                      <tr key={i}>
                        <td>
                          <span className="font-medium text-foreground">{d.day}</span>
                          <span className="text-xs text-muted-foreground ml-1.5">{d.date}</span>
                        </td>
                        <td className="text-right fx-num font-semibold text-foreground">{d.predicted}</td>
                        <td className="text-right fx-num text-warning">{d.recommended}</td>
                        <td className="text-right">
                          <span className={`fx-num text-xs font-medium ${d.confidence >= 85 ? "text-success" : d.confidence >= 70 ? "text-warning" : "text-danger"}`}>
                            {d.confidence}%
                          </span>
                        </td>
                        <td className="text-right fx-num text-muted-foreground">
                          ₹{(d.predicted * selectedProduct.mrp).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="fx-rule mt-4 pt-3 flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                <span>Historic Avg: <span className="fx-num font-medium text-secondary-foreground">{selectedProduct.historicAvg}</span> units/day</span>
                <span>Confidence: <span className="fx-num font-medium text-secondary-foreground">{selectedProduct.confidence}%</span></span>
                <span>Trend: <span className={selectedProduct.trend === "rising" ? "text-success font-medium" : selectedProduct.trend === "falling" ? "text-danger font-medium" : "font-medium"}>{selectedProduct.trend}</span></span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <BarChart3 className="w-5 h-5 text-muted-foreground mb-3 opacity-50" aria-hidden="true" strokeWidth={1.8} />
              <p className="text-sm text-secondary-foreground font-medium">Select a product to view forecast</p>
              <p className="text-xs text-muted-foreground mt-1">Pick any item from the list on the left.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
