"use client";

import { useEffect, useState } from "react";
import { Layers, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";

export default function QueueDashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function fetchQueue() {
    setLoading(true);
    try {
      const res = await fetch("/api/background/jobs");
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchQueue();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="w-7 h-7 text-accent" />
            Job Queue Operations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            FIFO, Priority, Delayed, Retry, and Dead-Letter Queue operational metrics.
          </p>
        </div>
        <button
          onClick={fetchQueue}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Queue Metrics
        </button>
      </div>

      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-card/50 border border-border/60 backdrop-blur">
            <div className="text-xs text-muted-foreground uppercase font-bold">Total Jobs Enqueued</div>
            <div className="text-2xl font-bold mt-1 text-foreground">{metrics.totalJobs}</div>
          </div>
          <div className="p-5 rounded-xl bg-card/50 border border-border/60 backdrop-blur">
            <div className="text-xs text-muted-foreground uppercase font-bold">Currently Queued</div>
            <div className="text-2xl font-bold mt-1 text-amber-500">{metrics.queued}</div>
          </div>
          <div className="p-5 rounded-xl bg-card/50 border border-border/60 backdrop-blur">
            <div className="text-xs text-muted-foreground uppercase font-bold">Currently Running</div>
            <div className="text-2xl font-bold mt-1 text-blue-500">{metrics.running}</div>
          </div>
          <div className="p-5 rounded-xl bg-card/50 border border-border/60 backdrop-blur">
            <div className="text-xs text-muted-foreground uppercase font-bold">Dead Letter Queue</div>
            <div className="text-2xl font-bold mt-1 text-rose-500">{metrics.deadLetterCount}</div>
          </div>
        </div>
      )}
    </div>
  );
}
