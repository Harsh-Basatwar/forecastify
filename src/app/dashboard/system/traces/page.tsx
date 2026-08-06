"use client";

import { useEffect, useState } from "react";
import { GitCommit, RefreshCw, Layers } from "lucide-react";
import { DistributedSpan } from "@/lib/background/tracing";

export default function TracesDashboardPage() {
  const [spans, setSpans] = useState<DistributedSpan[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchTraces() {
    setLoading(true);
    try {
      const res = await fetch("/api/background/traces");
      const data = await res.json();
      if (data.success) {
        setSpans(data.spans);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTraces();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <GitCommit className="w-7 h-7 text-accent" />
            Distributed Tracing Waterfall
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            End-to-end trace spans propagating traceId and spanId across execution boundaries.
          </p>
        </div>
        <button
          onClick={fetchTraces}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Traces
        </button>
      </div>

      <div className="p-5 rounded-xl bg-card/50 border border-border/60 backdrop-blur space-y-3">
        <h2 className="text-sm font-bold text-foreground">Active Trace Waterfall: <span className="font-mono text-accent">tr_8921a4b</span></h2>
        <div className="space-y-2 pt-2">
          {spans.map((sp) => (
            <div key={sp.id} className="p-3 rounded-lg bg-card/80 border border-border/40 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-accent">{sp.subsystem}</span>
                <div className="text-sm font-bold text-foreground mt-0.5">{sp.operation}</div>
                <div className="text-[11px] text-muted-foreground font-mono">Span ID: {sp.spanId} {sp.parentSpanId ? `| Parent: ${sp.parentSpanId}` : ""}</div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-emerald-500 font-mono">{sp.durationMs} ms</span>
                <div className="text-[10px] text-muted-foreground font-bold">{sp.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
