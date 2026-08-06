/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, AlertTriangle, CheckCircle } from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";

export default function LossPreventionPage() {
  const { callApi } = useStoreAssistant();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadIncidents = async () => {
    setLoading(true);
    let list = await callApi("lossPrevention.incidents");
    if (!list || list.length === 0) {
      list = await callApi("lossPrevention.scan");
    }
    if (list) setIncidents(list);

    const sum = await callApi("lossPrevention.summary");
    if (sum) setSummary(sum);
    setLoading(false);
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const handleResolve = async (incidentId: string) => {
    await callApi("lossPrevention.update", { incidentId, status: "resolved" });
    loadIncidents();
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/store-assistant" className="p-2 rounded-lg bg-card hover:bg-accent/10 border border-border text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-accent" /> Theft & Loss Prevention Guard
          </h1>
          <p className="text-xs text-muted-foreground">Detect void abuse, cash leaks, fake returns & employee discount abuse</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="fx-card p-5 space-y-1">
          <span className="text-xs text-muted-foreground">Open Incidents</span>
          <div className="text-2xl font-black text-amber-400">{summary?.open || 0}</div>
        </div>
        <div className="fx-card p-5 space-y-1">
          <span className="text-xs text-muted-foreground">Estimated Loss Value</span>
          <div className="text-2xl font-black text-rose-400">₹{(summary?.totalLoss || 0).toLocaleString("en-IN")}</div>
        </div>
        <div className="fx-card p-5 space-y-1">
          <span className="text-xs text-muted-foreground">Critical Severity</span>
          <div className="text-2xl font-black text-rose-500">{summary?.critical || 0}</div>
        </div>
      </div>

      <div className="fx-card p-6 space-y-4">
        <h2 className="text-base font-bold">Loss Incidents Audit Log</h2>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Scanning transaction anomalies...</div>
        ) : incidents.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">No suspicious loss incidents detected!</div>
        ) : (
          <div className="space-y-3">
            {incidents.map((inc) => (
              <div key={inc.id} className="p-4 rounded-xl bg-card border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase text-rose-400">{inc.incident_type.replace("_", " ")}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300">
                      {inc.severity}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{inc.description}</p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-bold text-sm text-rose-400">₹{inc.estimated_loss.toLocaleString("en-IN")}</span>
                  {inc.status === "open" && (
                    <button
                      onClick={() => handleResolve(inc.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-xs hover:bg-emerald-500/30 transition-all border border-emerald-500/30"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
