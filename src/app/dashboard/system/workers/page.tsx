"use client";

import { useEffect, useState } from "react";
import { Cpu, RefreshCw, Activity, Server } from "lucide-react";
import { WorkerStatus } from "@/lib/background/workers";

export default function WorkersDashboardPage() {
  const [workers, setWorkers] = useState<WorkerStatus[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchWorkers() {
    setLoading(true);
    try {
      const res = await fetch("/api/background/workers");
      const data = await res.json();
      if (data.success) {
        setWorkers(data.workers);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWorkers();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Cpu className="w-7 h-7 text-accent" />
            Worker Orchestrator Console
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time status for 12 background worker classes scaling independently.
          </p>
        </div>
        <button
          onClick={fetchWorkers}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Workers
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workers.map((w) => (
          <div key={w.id} className="p-4 rounded-xl bg-card/50 border border-border/60 backdrop-blur space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-accent">{w.workerType}</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${w.status === "IDLE" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                {w.status}
              </span>
            </div>
            <div className="text-sm font-bold text-foreground font-mono">{w.id}</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t border-border/40">
              <div>Processed: <span className="font-semibold text-foreground">{w.processedCount}</span></div>
              <div>Failed: <span className="font-semibold text-rose-500">{w.failedCount}</span></div>
              <div>CPU Load: <span className="font-semibold text-foreground">{w.cpuUsagePct}%</span></div>
              <div>RAM: <span className="font-semibold text-foreground">{w.memoryMb} MB</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
