/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, ArrowLeft, TrendingUp, Calendar } from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";

export default function BenchmarkingPage() {
  const { callApi } = useStoreAssistant();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadBenchmarking = async () => {
    setLoading(true);
    const res = await callApi("benchmark.compare");
    if (res) setData(res);
    setLoading(false);
  };

  useEffect(() => {
    loadBenchmarking();
  }, []);

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/store-assistant" className="p-2 rounded-lg bg-card hover:bg-accent/10 border border-border text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-accent" /> Store Performance Benchmarking
          </h1>
          <p className="text-xs text-muted-foreground">Month-over-Month & Year-over-Year revenue, profit & basket size comparisons</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="fx-card p-5 space-y-1">
          <span className="text-xs text-muted-foreground">Revenue Growth (MoM)</span>
          <div className="text-2xl font-black text-emerald-400">
            {data?.deltas?.revenuePct >= 0 ? "+" : ""}{data?.deltas?.revenuePct || 0}%
          </div>
        </div>
        <div className="fx-card p-5 space-y-1">
          <span className="text-xs text-muted-foreground">Transaction Growth (MoM)</span>
          <div className="text-2xl font-black text-teal-400">
            {data?.deltas?.txnPct >= 0 ? "+" : ""}{data?.deltas?.txnPct || 0}%
          </div>
        </div>
        <div className="fx-card p-5 space-y-1">
          <span className="text-xs text-muted-foreground">Avg Basket Size (MoM)</span>
          <div className="text-2xl font-black text-accent">
            {data?.deltas?.basketPct >= 0 ? "+" : ""}{data?.deltas?.basketPct || 0}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="fx-card p-6 space-y-3 border-l-4 border-l-accent">
          <h2 className="text-sm font-bold text-accent">This Month</h2>
          <div className="space-y-1 text-xs">
            <div>Revenue: <strong>₹{(data?.current?.revenue || 0).toLocaleString("en-IN")}</strong></div>
            <div>Transactions: <strong>{data?.current?.transactions || 0}</strong></div>
            <div>Avg Basket: <strong>₹{(data?.current?.avgBasket || 0).toLocaleString("en-IN")}</strong></div>
          </div>
        </div>

        <div className="fx-card p-6 space-y-3">
          <h2 className="text-sm font-bold">Last Month</h2>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>Revenue: <strong className="text-foreground">₹{(data?.previous?.revenue || 0).toLocaleString("en-IN")}</strong></div>
            <div>Transactions: <strong className="text-foreground">{data?.previous?.transactions || 0}</strong></div>
            <div>Avg Basket: <strong className="text-foreground">₹{(data?.previous?.avgBasket || 0).toLocaleString("en-IN")}</strong></div>
          </div>
        </div>

        <div className="fx-card p-6 space-y-3">
          <h2 className="text-sm font-bold">Same Month Last Year</h2>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>Revenue: <strong className="text-foreground">₹{(data?.lastYear?.revenue || 0).toLocaleString("en-IN")}</strong></div>
            <div>Transactions: <strong className="text-foreground">{data?.lastYear?.transactions || 0}</strong></div>
            <div>Avg Basket: <strong className="text-foreground">₹{(data?.lastYear?.avgBasket || 0).toLocaleString("en-IN")}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
