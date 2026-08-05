"use client";

import { Package, TrendingUp, AlertTriangle, Clock, Layers, DollarSign } from "lucide-react";
import { DashboardMetricsSummary } from "@/lib/inventory/types";

interface Props {
  metrics: DashboardMetricsSummary | null;
  loading: boolean;
}

export function InventoryKpiCards({ metrics, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6" aria-busy="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="fx-card p-4 space-y-2">
            <div className="skeleton-shimmer h-3 w-20" />
            <div className="skeleton-shimmer h-6 w-16" />
          </div>
        ))}
      </div>
    );
  }

  const formatINR = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {/* 1. Total Valuation */}
      <div className="fx-card p-4 space-y-1 hover:border-accent/40 transition-colors">
        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
          <span>Total Valuation</span>
          <DollarSign className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-xl font-bold text-foreground">
          {formatINR(metrics?.total_inventory_value || 0)}
        </div>
        <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
          <span>{metrics?.total_products_count || 0} Products</span>
        </div>
      </div>

      {/* 2. Carrying Cost */}
      <div className="fx-card p-4 space-y-1 hover:border-accent/40 transition-colors">
        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
          <span>Carrying Cost (Est.)</span>
          <Layers className="w-4 h-4 text-sky-400" />
        </div>
        <div className="text-xl font-bold text-foreground">
          {formatINR(metrics?.carrying_cost || 0)}
        </div>
        <div className="text-[11px] text-muted-foreground">18% Est. Annual</div>
      </div>

      {/* 3. Expiry Risk */}
      <div className="fx-card p-4 space-y-1 hover:border-accent/40 transition-colors">
        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
          <span>Near Expiry (30d)</span>
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-xl font-bold text-amber-400">
          {metrics?.expiry_risk_count || 0} Items
        </div>
        <div className="text-[11px] text-amber-400/80 font-medium">Requires Markdown</div>
      </div>

      {/* 4. Blocked Capital */}
      <div className="fx-card p-4 space-y-1 hover:border-accent/40 transition-colors">
        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
          <span>Blocked Capital</span>
          <Clock className="w-4 h-4 text-rose-400" />
        </div>
        <div className="text-xl font-bold text-foreground">
          {formatINR(metrics?.blocked_capital || 0)}
        </div>
        <div className="text-[11px] text-rose-400 font-medium">{metrics?.overstock_count || 0} Overstocked</div>
      </div>

      {/* 5. Dead Stock % */}
      <div className="fx-card p-4 space-y-1 hover:border-accent/40 transition-colors">
        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
          <span>Dead Stock %</span>
          <Package className="w-4 h-4 text-purple-400" />
        </div>
        <div className="text-xl font-bold text-foreground">
          {metrics?.dead_stock_pct || 0}%
        </div>
        <div className="text-[11px] text-purple-400 font-medium">{metrics?.dead_stock_count || 0} Items Silent</div>
      </div>

      {/* 6. Inventory Turnover */}
      <div className="fx-card p-4 space-y-1 hover:border-accent/40 transition-colors">
        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
          <span>Turnover Rate</span>
          <TrendingUp className="w-4 h-4 text-accent" />
        </div>
        <div className="text-xl font-bold text-accent">
          {metrics?.inventory_turnover || 0}x
        </div>
        <div className="text-[11px] text-muted-foreground">Optimal Kirana Rate</div>
      </div>
    </div>
  );
}
