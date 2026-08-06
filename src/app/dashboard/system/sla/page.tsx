"use client";

import { useEffect, useState } from "react";
import { Gauge, CheckCircle2, AlertTriangle } from "lucide-react";
import { SLAMetric, slaMonitor } from "@/lib/background/sla";

export default function SLADashboardPage() {
  const [metrics, setMetrics] = useState<SLAMetric[]>([]);

  useEffect(() => {
    setMetrics(slaMonitor.getSLAMetrics());
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Gauge className="w-7 h-7 text-accent" />
          Enterprise SLA Compliance Monitor
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tracking compliance against SLA targets for Forecasts, Recommendations, APIs, Workers, and Notifications.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metrics.map((m) => (
          <div key={m.id} className="p-5 rounded-xl bg-card/50 border border-border/60 backdrop-blur flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">{m.name}</h3>
              <div className="text-xs text-muted-foreground mt-1">
                Target: {m.targetValue} {m.unit} | Current: <strong className="text-foreground">{m.currentValue} {m.unit}</strong>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-emerald-500">{m.compliancePct}%</span>
              <div className="text-[10px] font-bold text-emerald-500 uppercase">{m.status}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
