"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, RefreshCw, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { SystemAlert } from "@/lib/background/alerts";

export default function AlertsDashboardPage() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchAlerts() {
    setLoading(true);
    try {
      const res = await fetch("/api/background/alerts");
      const data = await res.json();
      if (data.success) {
        setAlerts(data.alerts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAlerts();
  }, []);

  async function handleResolve(id: string) {
    await fetch("/api/background/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, resolvedBy: "AdminUser" }),
    });
    fetchAlerts();
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-accent" />
            System Alert Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time incident tracking, severity alerts, and multi-channel routing.
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Alerts
        </button>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="p-4 rounded-xl bg-card/50 border border-border/60 backdrop-blur flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {alert.severity === "CRITICAL" && <AlertTriangle className="w-5 h-5 text-rose-500" />}
                {alert.severity === "WARNING" && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                {alert.severity === "INFO" && <Info className="w-5 h-5 text-blue-500" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">{alert.title}</h3>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-card/80 border border-border/40 text-muted-foreground">
                    {alert.subsystem}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                <div className="text-[11px] text-muted-foreground mt-2">
                  Logged: {new Date(alert.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            <div>
              {!alert.isResolved ? (
                <button
                  onClick={() => handleResolve(alert.id)}
                  className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  Resolve Alert
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500">
                  <CheckCircle className="w-3.5 h-3.5" /> Resolved
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
