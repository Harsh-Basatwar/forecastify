"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Calendar, Package } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Urgency reads as a gradient: immediate screams, soon warns, the rest stay quiet
const urgencyConfig: Record<string, { label: string; signal: string }> = {
  immediate: { label: "Immediate", signal: "fx-signal fx-signal-danger" },
  soon:      { label: "Soon",      signal: "fx-signal fx-signal-warning" },
  upcoming:  { label: "Upcoming",  signal: "fx-signal fx-signal-accent" },
  planned:   { label: "Planned",   signal: "fx-signal" },
};

function UrgencyStatus({ urgency }: { urgency: string }) {
  if (urgency === "immediate") return <span className="fx-badge fx-badge-danger">Immediate</span>;
  if (urgency === "soon") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warning">
        <span className="fx-signal fx-signal-warning" aria-hidden="true" /> Soon
      </span>
    );
  }
  if (urgency === "upcoming") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary-foreground">
        <span className="fx-signal fx-signal-accent" aria-hidden="true" /> Upcoming
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">Planned</span>;
}

// Skeleton mirrors the KPI strip, timeline cards, and ledger table
function LoadingSkeleton() {
  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12" aria-busy="true" aria-label="Loading reorder plan">
      <div className="fx-card grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-[var(--border)] overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="p-5 space-y-3">
            <div className="skeleton-shimmer h-3 w-24" />
            <div className="skeleton-shimmer h-7 w-16" />
            <div className="skeleton-shimmer h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="fx-card p-5 space-y-3">
            <div className="skeleton-shimmer h-4 w-40" />
            <div className="skeleton-shimmer h-2 w-full" />
            <div className="skeleton-shimmer h-3.5 w-2/3" />
          </div>
        ))}
      </div>
      <div className="fx-card p-6">
        <div className="skeleton-shimmer h-3.5 w-40 mb-5" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b border-border last:border-b-0">
            <div className="skeleton-shimmer h-3.5 w-1/4" />
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

export default function ReorderPlannerPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ reorderNow: 0, totalCost: 0, avgLeadTime: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/reorder-planner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        });
        const data = await res.json();
        if (data.error) { setError(data.error); return; }
        setItems(data.items || []);
        setSummary(data.summary || {});
      } catch { setError("Failed to load reorder data."); }
      finally { setLoading(false); }
    })();
  }, [user?.id]);

  const urgencyCounts = items.reduce((acc: Record<string, number>, i: any) => {
    acc[i.urgency] = (acc[i.urgency] || 0) + 1;
    return acc;
  }, {});

  const reorderSoonCount = (urgencyCounts["immediate"] || 0) + (urgencyCounts["soon"] || 0);
  const reorderItems = items.filter((i: any) => i.needsReorder);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
        <div role="alert" className="bg-danger/8 border border-danger/25 text-danger rounded-[var(--radius-md)] px-4 py-3 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      <div>
        <h1 className="fx-display text-[24px] text-foreground">Reorder Planner</h1>
        <p className="text-[13px] text-muted-foreground mt-1.5">
          Plan purchase orders based on projected demand spikes and inventory lead times
        </p>
      </div>

      {/* ── Reorder posture · one ledger strip ────────────────────── */}
      <section aria-label="Reorder summary" className="fx-card grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-[var(--border)] overflow-hidden">
        <div className="p-5 sm:p-6">
          <p className="fx-eyebrow">Reorder Now</p>
          <p className="fx-num text-[26px] sm:text-[30px] font-semibold text-foreground mt-2.5 leading-none">{urgencyCounts["immediate"] || 0}</p>
          <p className={`inline-flex items-center gap-1.5 text-xs mt-2.5 font-medium ${(urgencyCounts["immediate"] || 0) > 0 ? "text-danger" : "text-muted-foreground"}`}>
            <span className={`fx-signal ${(urgencyCounts["immediate"] || 0) > 0 ? "fx-signal-danger" : "fx-signal-success"}`} aria-hidden="true" />
            {(urgencyCounts["immediate"] || 0) > 0 ? "Need immediate reorder" : "Nothing overdue"}
          </p>
        </div>
        <div className="p-5 sm:p-6">
          <p className="fx-eyebrow">Reorder Soon</p>
          <p className="fx-num text-[26px] sm:text-[30px] font-semibold text-foreground mt-2.5 leading-none">{reorderSoonCount}</p>
          <p className={`inline-flex items-center gap-1.5 text-xs mt-2.5 font-medium ${reorderSoonCount > 0 ? "text-warning" : "text-muted-foreground"}`}>
            <span className={`fx-signal ${reorderSoonCount > 0 ? "fx-signal-warning" : "fx-signal-success"}`} aria-hidden="true" />
            {reorderSoonCount > 0 ? "Within 3 days" : "No pressure this week"}
          </p>
        </div>
        <div className="p-5 sm:p-6">
          <p className="fx-eyebrow">Total Reorder Cost</p>
          <p className="fx-num text-[26px] sm:text-[30px] font-semibold text-foreground mt-2.5 leading-none">₹{summary.totalCost?.toLocaleString("en-IN")}</p>
          <p className="text-xs text-muted-foreground mt-2.5">Estimated for all reorders</p>
        </div>
        <div className="p-5 sm:p-6">
          <p className="fx-eyebrow">Avg Lead Time</p>
          <p className="fx-num text-[26px] sm:text-[30px] font-semibold text-foreground mt-2.5 leading-none">
            {summary.avgLeadTime}<span className="text-sm font-normal text-muted-foreground ml-1.5">days</span>
          </p>
          <p className="text-xs text-muted-foreground mt-2.5">Average supplier lead time</p>
        </div>
      </section>

      {/* ── Urgency breakdown · quiet signal strip ────────────────── */}
      <section aria-label="Urgency breakdown" className="fx-card px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="fx-eyebrow">Urgency</span>
        {(["immediate", "soon", "upcoming", "planned"] as const).map((u) => {
          const cfg = urgencyConfig[u];
          return (
            <span key={u} className="inline-flex items-center gap-2 text-[13px]">
              <span className={cfg.signal} aria-hidden="true" />
              <span className="text-secondary-foreground">{cfg.label}</span>
              <span className="fx-num font-semibold text-foreground">{urgencyCounts[u] || 0}</span>
            </span>
          );
        })}
      </section>

      {/* ── Reorder timeline ──────────────────────────────────────── */}
      {reorderItems.length > 0 && (
        <section aria-label="Reorder timeline" className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
            <h2 className="fx-display text-[19px] text-foreground">Reorder Timeline</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {reorderItems.map((item: any, idx: number) => {
              const stockPct = item.reorderPoint > 0 ? Math.min(100, Math.round((item.currentStock / item.reorderPoint) * 100)) : 100;
              return (
                <div key={idx} className="fx-card p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">{item.productName}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.category}</p>
                    </div>
                    <UrgencyStatus urgency={item.urgency} />
                  </div>
                  {/* Stock progress */}
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span>Current <span className="fx-num text-foreground font-medium">{item.currentStock} {item.unit}</span></span>
                      <span>Reorder point <span className="fx-num text-foreground font-medium">{item.reorderPoint}</span></span>
                    </div>
                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={stockPct} aria-valuemin={0} aria-valuemax={100} aria-label={`Stock level for ${item.productName}`}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${stockPct}%`,
                          background: stockPct <= 30 ? "var(--danger)" : stockPct <= 60 ? "var(--warning)" : "var(--success)",
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 fx-rule pt-3.5">
                    <div>
                      <p className="fx-eyebrow text-[10px]">Order by</p>
                      <p className="fx-num text-sm font-medium text-foreground mt-1">{item.reorderDate}</p>
                    </div>
                    <div>
                      <p className="fx-eyebrow text-[10px]">Suggested Qty</p>
                      <p className="fx-num text-sm font-medium text-foreground mt-1">{item.orderQuantity} {item.unit}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm fx-rule pt-3.5">
                    <span className="text-xs text-muted-foreground">Est. Cost</span>
                    <span className="fx-num font-semibold text-foreground">₹{item.estimatedCost.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Full product ledger ───────────────────────────────────── */}
      <section aria-label="All products" className="fx-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
          <h2 className="fx-display text-[17px] text-foreground">All Products</h2>
          <span className="fx-badge fx-num">{items.length}</span>
        </div>
        <div className="overflow-x-auto -mx-2">
          <table className="fx-table min-w-[960px]">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th className="text-right">Current Stock</th>
                <th className="text-right">Daily Demand</th>
                <th className="text-right">Lead Time</th>
                <th className="text-right">Reorder Point</th>
                <th className="text-right">Safety Stock</th>
                <th className="text-right">Days Until</th>
                <th className="text-right">Order Qty</th>
                <th className="text-right">Est. Cost</th>
                <th>Urgency</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, idx: number) => (
                <tr key={idx}>
                  <td className="font-medium text-foreground">{item.productName}</td>
                  <td className="text-xs text-muted-foreground">{item.category}</td>
                  <td className="text-right fx-num text-foreground">{item.currentStock}</td>
                  <td className="text-right fx-num text-secondary-foreground">{item.dailyDemand}</td>
                  <td className="text-right fx-num text-secondary-foreground">{item.leadTimeDays}d</td>
                  <td className="text-right fx-num text-secondary-foreground">{item.reorderPoint}</td>
                  <td className="text-right fx-num text-secondary-foreground">{item.safetyStock}</td>
                  <td className="text-right fx-num text-secondary-foreground">{item.daysUntilReorder}d</td>
                  <td className="text-right fx-num font-semibold text-foreground">{item.orderQuantity}</td>
                  <td className="text-right fx-num text-foreground">₹{item.estimatedCost.toLocaleString("en-IN")}</td>
                  <td><UrgencyStatus urgency={item.urgency} /></td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-10 text-center">
                    <Package className="w-5 h-5 text-muted-foreground mx-auto mb-3 opacity-50" aria-hidden="true" strokeWidth={1.8} />
                    <p className="text-sm text-secondary-foreground font-medium">No products to plan</p>
                    <p className="text-xs text-muted-foreground mt-1">Add inventory to generate reorder suggestions.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
