/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ArrowLeft, Users, RefreshCw } from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";

export default function CustomerLoyaltyPage() {
  const { callApi } = useStoreAssistant();
  const [segments, setSegments] = useState<any[]>([]);
  const [distribution, setDistribution] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadLoyalty = async () => {
    setLoading(true);
    const segs = await callApi("loyalty.segments");
    if (segs) setSegments(segs);

    const dist = await callApi("loyalty.distribution");
    if (dist) setDistribution(dist);
    setLoading(false);
  };

  useEffect(() => {
    loadLoyalty();
  }, []);

  const handleResegment = async () => {
    await callApi("loyalty.resegment");
    loadLoyalty();
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/store-assistant" className="p-2 rounded-lg bg-card hover:bg-accent/10 border border-border text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Heart className="w-6 h-6 text-accent" /> Customer Loyalty & Segmentation Engine
            </h1>
            <p className="text-xs text-muted-foreground">VIP, Frequent, Inactive & Lost customer classification with targeted offers</p>
          </div>
        </div>

        <button
          onClick={handleResegment}
          className="px-4 py-2 rounded-xl bg-accent text-accent-foreground font-bold text-xs hover:opacity-90 transition-all flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Re-Segment Customers
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="fx-card p-4 space-y-1">
          <span className="text-xs text-muted-foreground">VIP Customers</span>
          <div className="text-2xl font-black text-amber-400">{distribution?.vip || 0}</div>
        </div>
        <div className="fx-card p-4 space-y-1">
          <span className="text-xs text-muted-foreground">Frequent Regulars</span>
          <div className="text-2xl font-black text-emerald-400">{distribution?.frequent || 0}</div>
        </div>
        <div className="fx-card p-4 space-y-1">
          <span className="text-xs text-muted-foreground">Inactive (30d+)</span>
          <div className="text-2xl font-black text-amber-500">{distribution?.inactive || 0}</div>
        </div>
        <div className="fx-card p-4 space-y-1">
          <span className="text-xs text-muted-foreground">Lost (90d+)</span>
          <div className="text-2xl font-black text-rose-400">{distribution?.lost || 0}</div>
        </div>
      </div>

      <div className="fx-card p-6 space-y-4">
        <h2 className="text-base font-bold">Customer Loyalty Segments</h2>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Analyzing customer purchasing patterns...</div>
        ) : segments.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">No customer segments calculated yet. Click Re-Segment above.</div>
        ) : (
          <div className="space-y-3">
            {segments.map((seg) => (
              <div key={seg.id} className="p-4 rounded-xl bg-card border border-border/50 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold">{seg.customer_name || "Customer"}</div>
                  <p className="text-muted-foreground">LTV: ₹{Number(seg.total_lifetime_value).toLocaleString("en-IN")}</p>
                </div>
                <span className="px-2.5 py-1 rounded bg-accent/15 text-accent font-bold uppercase text-[10px]">
                  {seg.segment}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
