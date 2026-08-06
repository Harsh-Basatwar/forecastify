"use client";

import { useEffect, useState } from "react";
import { Layers, RefreshCw, TrendingUp } from "lucide-react";
import { CapacityProjection, capacityPlanner } from "@/lib/background/capacity";

export default function CapacityDashboardPage() {
  const [projections, setProjections] = useState<CapacityProjection[]>([]);

  useEffect(() => {
    setProjections(capacityPlanner.getCapacityProjections());
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="w-7 h-7 text-accent" />
            Capacity Planning & Resource Forecasting
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Predictive growth forecasting across CPU, memory, queue depth, storage, and database footprint.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {projections.map((p) => (
          <div key={p.resource} className="p-5 rounded-xl bg-card/50 border border-border/60 backdrop-blur space-y-3">
            <div className="text-xs font-bold text-accent uppercase">{p.resource}</div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Current Usage: <strong className="text-foreground">{p.currentUsage} {p.unit}</strong></div>
              <div className="text-xs text-muted-foreground">30-Day Projected: <strong className="text-foreground">{p.projection30d} {p.unit}</strong></div>
              <div className="text-xs text-muted-foreground">90-Day Projected: <strong className="text-amber-500">{p.projection90d} {p.unit}</strong></div>
            </div>
            <p className="text-xs text-emerald-500 font-semibold pt-2 border-t border-border/40">{p.recommendation}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
