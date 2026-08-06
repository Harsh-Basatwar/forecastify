"use client";

import { useEffect, useState } from "react";
import { Database, RefreshCw, Download, RotateCcw, ShieldCheck } from "lucide-react";
import { BackupSnapshot } from "@/lib/background/backup";

export default function BackupRecoveryDashboardPage() {
  const [backups, setBackups] = useState<BackupSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchBackups() {
    setLoading(true);
    try {
      const res = await fetch("/api/background/backups");
      const data = await res.json();
      if (data.success) {
        setBackups(data.backups);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBackups();
  }, []);

  async function handleCreateSnapshot() {
    await fetch("/api/background/backups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `manual_snapshot_${Date.now()}.snap`, backupType: "FULL" }),
    });
    fetchBackups();
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Database className="w-7 h-7 text-accent" />
            Backup & Disaster Recovery Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automated snapshot backups and point-in-time disaster recovery checkpoints.
          </p>
        </div>
        <button
          onClick={handleCreateSnapshot}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
        >
          <Database className="w-4 h-4" /> Create Snapshot Now
        </button>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-card/80 border-b border-border/60 text-muted-foreground uppercase text-[11px] font-bold">
            <tr>
              <th className="px-4 py-3">Snapshot Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Storage Location</th>
              <th className="px-4 py-3">Created At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {backups.map((bk) => (
              <tr key={bk.id} className="hover:bg-card/60 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-bold text-accent">{bk.backupName}</td>
                <td className="px-4 py-3 text-xs text-foreground">{bk.backupType}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{(bk.sizeBytes / 1024 / 1024).toFixed(1)} MB</td>
                <td className="px-4 py-3">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                    {bk.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{bk.storageLocation}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(bk.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
