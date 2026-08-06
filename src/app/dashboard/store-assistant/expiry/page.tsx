/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Timer, ArrowLeft, AlertCircle, Tag, RefreshCw } from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";
import { cn } from "@/lib/utils";

export default function ExpiryAssistantPage() {
  const { callApi } = useStoreAssistant();
  const [tiers, setTiers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadExpiry = async () => {
    setLoading(true);
    const tData = await callApi("expiry.scan");
    if (tData) setTiers(tData);

    const sData = await callApi("expiry.summary");
    if (sData) setSummary(sData);
    setLoading(false);
  };

  useEffect(() => {
    loadExpiry();
  }, []);

  const handleAction = async (productId: string, action: string) => {
    await callApi("expiry.executeAction", { productId, action });
    loadExpiry();
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/store-assistant" className="p-2 rounded-lg bg-card hover:bg-accent/10 border border-border text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Timer className="w-6 h-6 text-accent" /> Expiry Risk Assistant
          </h1>
          <p className="text-xs text-muted-foreground">Tiered expiry alerts & AI recommendations to prevent inventory loss</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="fx-card p-5 space-y-1">
          <span className="text-xs text-muted-foreground">Total Expiring Items</span>
          <div className="text-2xl font-black">{summary?.totalExpiring || 0}</div>
        </div>
        <div className="fx-card p-5 space-y-1">
          <span className="text-xs text-muted-foreground">Capital Value At Risk</span>
          <div className="text-2xl font-black text-rose-400">₹{(summary?.totalValueAtRisk || 0).toLocaleString("en-IN")}</div>
        </div>
        <div className="fx-card p-5 space-y-1">
          <span className="text-xs text-muted-foreground">Urgent Actions Required</span>
          <div className="text-2xl font-black text-amber-400">{summary?.urgentCount || 0}</div>
        </div>
      </div>

      {/* Tiers List */}
      <div className="space-y-6">
        {tiers.map((tier, idx) => (
          <div key={idx} className="fx-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h2 className="text-base font-bold flex items-center gap-2">
                <AlertCircle className={cn("w-4 h-4", idx === 0 ? "text-rose-400" : "text-amber-400")} />
                {tier.label} ({tier.items.length} items)
              </h2>
              <span className="text-xs font-bold text-muted-foreground">
                Total Value: ₹{tier.totalValue.toLocaleString("en-IN")}
              </span>
            </div>

            {tier.items.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No items in this category.</p>
            ) : (
              <div className="space-y-2">
                {tier.items.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-card/60 border border-border/40 text-xs">
                    <div>
                      <span className="font-bold">{item.name}</span>
                      <p className="text-[11px] text-muted-foreground">
                        {item.quantity} units | Expiry: {item.expiryDate} ({item.daysUntilExpiry} days left)
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-rose-400">₹{item.value.toLocaleString("en-IN")}</span>
                      <button
                        onClick={() => handleAction(item.id, item.recommendedAction)}
                        className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground font-bold text-xs hover:opacity-90 transition-all capitalize"
                      >
                        Apply {item.recommendedAction}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
