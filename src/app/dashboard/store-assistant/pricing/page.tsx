/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, ArrowLeft, Tag, DollarSign, CheckCircle2 } from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";

export default function PricingPage() {
  const { callApi } = useStoreAssistant();
  const [optimizations, setOptimizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPricing = async () => {
    setLoading(true);
    const opts = await callApi("pricing.optimize");
    if (opts) setOptimizations(opts);
    setLoading(false);
  };

  useEffect(() => {
    loadPricing();
  }, []);

  const handleApplyPrice = async (productId: string, newPrice: number) => {
    await callApi("pricing.apply", { productId, newPrice });
    loadPricing();
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/store-assistant" className="p-2 rounded-lg bg-card hover:bg-accent/10 border border-border text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-accent" /> Dynamic Price Optimizer
          </h1>
          <p className="text-xs text-muted-foreground">Demand, margin & expiry-based intelligent price suggestions</p>
        </div>
      </div>

      {/* Recommendations Table */}
      <div className="fx-card p-6 space-y-4">
        <h2 className="text-base font-bold">Price Optimization Opportunities</h2>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Computing price elasticity & demand factors...</div>
        ) : optimizations.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">All store prices are currently optimal!</div>
        ) : (
          <div className="space-y-3">
            {optimizations.map((opt) => (
              <div key={opt.productId} className="p-4 rounded-xl bg-card border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{opt.productName}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-accent/15 text-accent">
                      {opt.strategy}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{opt.justification}</p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-[10px] font-semibold text-muted-foreground">Current → Recommended</span>
                    <div className="font-bold text-sm">
                      <span className="line-through text-muted-foreground">₹{opt.currentPrice}</span>{" "}
                      <span className="text-accent text-base font-extrabold">₹{opt.recommendedPrice}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleApplyPrice(opt.productId, opt.recommendedPrice)}
                    className="px-4 py-2 rounded-xl bg-accent text-accent-foreground font-bold text-xs hover:opacity-90 transition-all shadow-sm"
                  >
                    Apply Price
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
