/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sunrise, ArrowLeft, Calendar, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";
import { cn } from "@/lib/utils";

export default function DailyBriefPage() {
  const { callApi } = useStoreAssistant();
  const [activeTab, setActiveTab] = useState<"morning" | "closing">("morning");
  const [morningBrief, setMorningBrief] = useState<any>(null);
  const [closingBrief, setClosingBrief] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);

  const loadData = async () => {
    setLoadingData(true);
    const mData = await callApi("brief.morning");
    if (mData) setMorningBrief(mData);

    const cData = await callApi("brief.closing");
    if (cData) setClosingBrief(cData);
    setLoadingData(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const data = activeTab === "morning" ? morningBrief?.data : closingBrief?.data;

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/store-assistant" className="p-2 rounded-lg bg-card hover:bg-accent/10 border border-border text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sunrise className="w-6 h-6 text-accent" /> Daily Business Brief
          </h1>
          <p className="text-xs text-muted-foreground">Morning priorities & closing reconciliation reports</p>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("morning")}
          className={cn("px-6 py-3 text-sm font-bold border-b-2 transition-all", activeTab === "morning" ? "border-accent text-accent" : "border-transparent text-muted-foreground")}
        >
          Morning Brief (7:00 AM)
        </button>
        <button
          onClick={() => setActiveTab("closing")}
          className={cn("px-6 py-3 text-sm font-bold border-b-2 transition-all", activeTab === "closing" ? "border-accent text-accent" : "border-transparent text-muted-foreground")}
        >
          Closing Brief (10:00 PM)
        </button>
      </div>

      {loadingData ? (
        <div className="p-12 text-center text-xs text-muted-foreground">Generating brief...</div>
      ) : activeTab === "morning" ? (
        <div className="space-y-6">
          {/* AI Executive Summary Box */}
          <div className="fx-card p-6 bg-accent/10 border border-accent/30 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-accent">AI Executive Summary</span>
            <p className="text-sm font-medium">{morningBrief?.ai_summary || "Morning operations initialized."}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="fx-card p-5 space-y-1">
              <span className="text-xs text-muted-foreground">Yesterday's Revenue</span>
              <div className="text-2xl font-black text-foreground">₹{(data?.revenue || 0).toLocaleString("en-IN")}</div>
            </div>
            <div className="fx-card p-5 space-y-1">
              <span className="text-xs text-muted-foreground">Cash Received</span>
              <div className="text-2xl font-black text-emerald-400">₹{(data?.cashReceived || 0).toLocaleString("en-IN")}</div>
            </div>
            <div className="fx-card p-5 space-y-1">
              <span className="text-xs text-muted-foreground">UPI Received</span>
              <div className="text-2xl font-black text-teal-400">₹{(data?.upiReceived || 0).toLocaleString("en-IN")}</div>
            </div>
          </div>

          {/* Today's Priorities */}
          <div className="fx-card p-6 space-y-4">
            <h2 className="text-base font-bold">Today's Priority Action Items</h2>
            <div className="space-y-2">
              {(data?.todaysPriorities || []).map((priority: string, idx: number) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-card/60 border border-border/50 text-xs font-semibold">
                  <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <span>{priority}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Closing Report Tab */
        <div className="space-y-6">
          <div className="fx-card p-6 space-y-4">
            <h2 className="text-base font-bold">Closing Checklist & Reconciliation</h2>
            <div className="space-y-3">
              {(data?.checklist || []).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border/40 text-xs">
                  <div className="flex items-center gap-3">
                    <CheckCircle className={cn("w-4 h-4", item.completed ? "text-emerald-400" : "text-muted-foreground")} />
                    <span className="font-semibold">{item.label}</span>
                  </div>
                  {item.value && <span className="font-bold text-accent">{item.value}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
