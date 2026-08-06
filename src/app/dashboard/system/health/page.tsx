"use client";

import { useEffect, useState } from "react";
import { HeartPulse, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { SubsystemHealth } from "@/lib/background/health";

export default function HealthDashboardPage() {
  const [subsystems, setSubsystems] = useState<SubsystemHealth[]>([]);
  const [overallStatus, setOverallStatus] = useState<string>("HEALTHY");
  const [loading, setLoading] = useState(true);

  async function fetchHealth() {
    setLoading(true);
    try {
      const res = await fetch("/api/background/health");
      const data = await res.json();
      if (data.success) {
        setSubsystems(data.subsystems);
        setOverallStatus(data.overallStatus);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <HeartPulse className="w-7 h-7 text-accent" />
            Subsystem Health Matrix
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time monitoring across all 14 enterprise platform subsystems.
          </p>
        </div>
        <button
          onClick={fetchHealth}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Run Health Check
        </button>
      </div>

      <div className="p-5 rounded-xl bg-card/60 border border-border/60 backdrop-blur flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase font-bold">Overall Platform Status</div>
          <div className="text-2xl font-extrabold text-foreground mt-1 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            {overallStatus}
          </div>
        </div>
        <div className="text-xs text-muted-foreground text-right">
          <div>Subsystems Tracked: <span className="font-bold text-foreground">{subsystems.length}</span></div>
          <div>All Checks Operational</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subsystems.map((sub) => (
          <div key={sub.subsystem} className="p-4 rounded-xl bg-card/50 border border-border/60 backdrop-blur space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">{sub.subsystem}</span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${sub.status === "HEALTHY" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                {sub.status}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
              <span>Latency: <strong className="text-foreground">{sub.latencyMs} ms</strong></span>
              <span>Checked: {new Date(sub.lastCheckAt).toLocaleTimeString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
