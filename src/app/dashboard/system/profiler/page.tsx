"use client";

import { useEffect, useState } from "react";
import { Zap, RefreshCw, AlertTriangle, Clock } from "lucide-react";
import { SlowQueryProfile, performanceProfiler } from "@/lib/background/profiler";

export default function ProfilerDashboardPage() {
  const [queries, setQueries] = useState<SlowQueryProfile[]>([]);

  useEffect(() => {
    setQueries(performanceProfiler.getSlowQueries());
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Zap className="w-7 h-7 text-accent" />
          Performance Profiler & Slow Diagnostics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Slow query detection, bottleneck profiling, memory leak diagnostics, and queue wait times.
        </p>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-card/80 border-b border-border/60 text-muted-foreground uppercase text-[11px] font-bold">
            <tr>
              <th className="px-4 py-3">Subsystem</th>
              <th className="px-4 py-3">SQL / Execution Profile</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {queries.map((q) => (
              <tr key={q.id} className="hover:bg-card/60 transition-colors">
                <td className="px-4 py-3 text-xs font-mono font-bold text-accent">{q.subsystem}</td>
                <td className="px-4 py-3 text-xs font-mono text-foreground">{q.query}</td>
                <td className="px-4 py-3 font-mono text-xs font-bold text-amber-500">{q.durationMs} ms</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(q.timestamp).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
