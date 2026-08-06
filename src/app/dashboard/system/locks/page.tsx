"use client";

import { useEffect, useState } from "react";
import { Lock, RefreshCw, Unlock, ShieldAlert } from "lucide-react";
import { DistributedLock } from "@/lib/background/locks";

export default function LocksDashboardPage() {
  const [locks, setLocks] = useState<DistributedLock[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchLocks() {
    setLoading(true);
    try {
      const res = await fetch("/api/background/locks");
      const data = await res.json();
      if (data.success) {
        setLocks(data.locks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLocks();
  }, []);

  async function handleRelease(lockKey: string, holderId: string) {
    await fetch(`/api/background/locks?lockKey=${encodeURIComponent(lockKey)}&holderId=${encodeURIComponent(holderId)}`, {
      method: "DELETE",
    });
    fetchLocks();
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Lock className="w-7 h-7 text-accent" />
            Distributed Lock Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Active store & product resource lease locks with fencing token verification.
          </p>
        </div>
        <button
          onClick={fetchLocks}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Locks
        </button>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-card/80 border-b border-border/60 text-muted-foreground uppercase text-[11px] font-bold">
            <tr>
              <th className="px-4 py-3">Lock Key</th>
              <th className="px-4 py-3">Holder ID</th>
              <th className="px-4 py-3">Fence Token</th>
              <th className="px-4 py-3">Acquired At</th>
              <th className="px-4 py-3">Expires At</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {locks.map((lk) => (
              <tr key={lk.lockKey} className="hover:bg-card/60 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-bold text-accent">{lk.lockKey}</td>
                <td className="px-4 py-3 text-xs text-foreground font-medium">{lk.holderId}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{lk.fenceToken}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(lk.acquiredAt).toLocaleTimeString()}</td>
                <td className="px-4 py-3 text-xs text-amber-500 font-semibold">{new Date(lk.expiresAt).toLocaleTimeString()}</td>
                <td className="px-4 py-3 text-xs">
                  <button
                    onClick={() => handleRelease(lk.lockKey, lk.holderId)}
                    className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-500 font-bold hover:bg-rose-500/30"
                  >
                    <Unlock className="w-3 h-3 inline mr-1" /> Break Lock
                  </button>
                </td>
              </tr>
            ))}
            {locks.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-xs text-muted-foreground">
                  No active distributed locks held.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
