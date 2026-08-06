"use client";

import { useEffect, useState } from "react";
import { Target, RefreshCw, Activity, Cpu, Database, Zap } from "lucide-react";
import { SystemMetricsSummary } from "@/lib/background/metrics";

export default function MetricsDashboardPage() {
  const [metrics, setMetrics] = useState<SystemMetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchMetrics() {
    setLoading(true);
    try {
      const res = await fetch("/api/background/metrics");
      const data = await res.json();
      if (data.success) {
        setMetrics(data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Target className="w-7 h-7 text-accent" />
            Platform Observability & Telemetry
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time execution latency, worker utilization, cache efficiency, and platform metrics.
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Telemetry
        </button>
      </div>

      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl bg-card/50 border border-border/60 backdrop-blur space-y-1">
            <div className="text-xs font-bold text-muted-foreground uppercase">Prediction Latency</div>
            <div className="text-2xl font-extrabold text-foreground">{metrics.avgPredictionLatencyMs} ms</div>
            <div className="text-xs text-emerald-500 font-semibold">P99 Optimal Threshold</div>
          </div>
          <div className="p-5 rounded-xl bg-card/50 border border-border/60 backdrop-blur space-y-1">
            <div className="text-xs font-bold text-muted-foreground uppercase">Feature Refresh Time</div>
            <div className="text-2xl font-extrabold text-foreground">{metrics.avgFeatureRefreshMs} ms</div>
            <div className="text-xs text-muted-foreground">Derived lag computation</div>
          </div>
          <div className="p-5 rounded-xl bg-card/50 border border-border/60 backdrop-blur space-y-1">
            <div className="text-xs font-bold text-muted-foreground uppercase">Worker Utilization</div>
            <div className="text-2xl font-extrabold text-accent">{metrics.workerUtilizationPct}%</div>
            <div className="text-xs text-muted-foreground">Pool active load</div>
          </div>
          <div className="p-5 rounded-xl bg-card/50 border border-border/60 backdrop-blur space-y-1">
            <div className="text-xs font-bold text-muted-foreground uppercase">Queue Depth</div>
            <div className="text-2xl font-extrabold text-foreground">{metrics.queueDepth}</div>
            <div className="text-xs text-muted-foreground">Pending job buffer</div>
          </div>
          <div className="p-5 rounded-xl bg-card/50 border border-border/60 backdrop-blur space-y-1">
            <div className="text-xs font-bold text-muted-foreground uppercase">Cache Hit Ratio</div>
            <div className="text-2xl font-extrabold text-emerald-500">{(metrics.overallCacheHitRatio * 100).toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">Redis & memory cache</div>
          </div>
          <div className="p-5 rounded-xl bg-card/50 border border-border/60 backdrop-blur space-y-1">
            <div className="text-xs font-bold text-muted-foreground uppercase">System Uptime</div>
            <div className="text-2xl font-extrabold text-foreground">{metrics.systemUptimePct}%</div>
            <div className="text-xs text-emerald-500 font-semibold">SLA Target Met</div>
          </div>
        </div>
      )}
    </div>
  );
}
