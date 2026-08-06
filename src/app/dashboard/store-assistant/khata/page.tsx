/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ArrowLeft, Send, Plus, CheckCircle, AlertTriangle, Users } from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";

export default function SmartKhataPage() {
  const { callApi } = useStoreAssistant();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadKhata = async () => {
    setLoading(true);
    const accs = await callApi("khata.accounts");
    if (accs) setAccounts(accs);

    const sum = await callApi("khata.summary");
    if (sum) setSummary(sum);
    setLoading(false);
  };

  useEffect(() => {
    loadKhata();
  }, []);

  const handleSendReminder = async (accountId: string) => {
    await callApi("khata.scheduleReminder", { accountId, channel: "whatsapp", scheduledAt: new Date().toISOString() });
    alert("WhatsApp reminder queued for sending!");
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/store-assistant" className="p-2 rounded-lg bg-card hover:bg-accent/10 border border-border text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-accent" /> Smart Khata Digital Ledger
          </h1>
          <p className="text-xs text-muted-foreground">Customer credit book, payment predictions & automated WhatsApp reminders</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="fx-card p-5 space-y-1">
          <span className="text-xs text-muted-foreground">Total Credit Outstanding</span>
          <div className="text-2xl font-black text-amber-400">₹{(summary?.totalOutstanding || 0).toLocaleString("en-IN")}</div>
        </div>
        <div className="fx-card p-5 space-y-1">
          <span className="text-xs text-muted-foreground">Collected This Month</span>
          <div className="text-2xl font-black text-emerald-400">₹{(summary?.totalCollectedThisMonth || 0).toLocaleString("en-IN")}</div>
        </div>
        <div className="fx-card p-5 space-y-1">
          <span className="text-xs text-muted-foreground">Overdue Accounts</span>
          <div className="text-2xl font-black text-rose-400">{summary?.overdueAccounts || 0} accounts</div>
        </div>
      </div>

      {/* Accounts List */}
      <div className="fx-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Customer Credit Accounts</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading accounts...</div>
        ) : accounts.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">No active credit accounts found.</div>
        ) : (
          <div className="divide-y divide-border/20">
            {accounts.map((acc) => (
              <div key={acc.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold flex items-center gap-2">
                    <span>{acc.customer_name || "Customer"}</span>
                    {acc.status === "overdue" && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-500/20 text-rose-400">
                        OVERDUE
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{acc.customer_phone || "No phone"}</span>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground">Balance</span>
                    <div className="font-bold text-amber-400 text-sm">₹{Number(acc.outstanding_balance).toLocaleString("en-IN")}</div>
                  </div>

                  <button
                    onClick={() => handleSendReminder(acc.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 hover:bg-accent text-accent hover:text-accent-foreground font-semibold transition-all text-xs"
                  >
                    <Send className="w-3.5 h-3.5" /> Remind
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
