"use client";

import { useEffect, useState } from "react";
import { ClipboardList, RefreshCw, ShieldCheck } from "lucide-react";
import { AuditRecord } from "@/lib/background/audit";

export default function AuditDashboardPage() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchAudit() {
    setLoading(true);
    try {
      const res = await fetch("/api/background/audit");
      const data = await res.json();
      if (data.success) {
        setRecords(data.records);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAudit();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-accent" />
            Enterprise Audit Log
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Immutable system operation records, model promotions, worker events, and admin overrides.
          </p>
        </div>
        <button
          onClick={fetchAudit}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Audit Log
        </button>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-card/80 border-b border-border/60 text-muted-foreground uppercase text-[11px] font-bold">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Resource</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {records.map((r) => (
              <tr key={r.id} className="hover:bg-card/60 transition-colors">
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs font-bold text-accent">{r.action}</td>
                <td className="px-4 py-3 text-xs font-medium text-foreground">{r.actor}</td>
                <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{r.resourceType}:{r.resourceId || "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{JSON.stringify(r.details)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
