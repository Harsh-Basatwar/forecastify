"use client";

import { useEffect, useState } from "react";
import { Activity, RefreshCw, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { DriftReport } from "@/lib/background/drift";

export default function DriftDashboardPage() {
  const [reports, setReports] = useState<DriftReport[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchDrift() {
    setLoading(true);
    try {
      const res = await fetch("/api/background/drift");
      const data = await res.json();
      if (data.success) {
        setReports(data.reports);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDrift();
  }, []);

  async function handleTriggerAnalysis() {
    await fetch("/api/background/drift", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId: "ensemble-forecast-v2" }),
    });
    fetchDrift();
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="w-7 h-7 text-accent" />
            Drift Detection Engine
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            PSI scores, KL Divergence, distribution shift, MAPE trend & model decay metrics across 9 dimensions.
          </p>
        </div>
        <button
          onClick={handleTriggerAnalysis}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Run Drift Analysis
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => (
          <div key={r.id} className="p-5 rounded-xl bg-card/50 border border-border/60 backdrop-blur space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-accent">{r.driftType} DRIFT</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${r.driftDetected ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"}`}>
                {r.driftDetected ? "DRIFT DETECTED" : "STABLE"}
              </span>
            </div>
            <div className="text-sm font-bold text-foreground">{r.modelId}</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-2 border-t border-border/40">
              <div>PSI Score: <strong className="text-foreground">{r.psiScore}</strong></div>
              <div>KL Div: <strong className="text-foreground">{r.klDivergence}</strong></div>
              <div>MAPE Trend: <strong className="text-foreground">{(r.mapeTrend * 100).toFixed(2)}%</strong></div>
              <div>RMSE: <strong className="text-foreground">{r.rmseTrend}</strong></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
