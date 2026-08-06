/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, ArrowLeft, Lightbulb, CheckCircle2 } from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";

export default function LayoutOptimizerPage() {
  const { callApi } = useStoreAssistant();
  const [recs, setRecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLayout = async () => {
    setLoading(true);
    let list = await callApi("layout.list");
    if (!list || list.length === 0) {
      list = await callApi("layout.generate");
    }
    if (list) setRecs(list);
    setLoading(false);
  };

  useEffect(() => {
    loadLayout();
  }, []);

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/store-assistant" className="p-2 rounded-lg bg-card hover:bg-accent/10 border border-border text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-accent" /> Store Layout Optimizer
          </h1>
          <p className="text-xs text-muted-foreground">Impulse placement, cross-merchandising & high-velocity item placement recommendations</p>
        </div>
      </div>

      <div className="fx-card p-6 space-y-4">
        <h2 className="text-base font-bold">Layout & Merchandising Recommendations</h2>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Analyzing traffic & cross-purchase patterns...</div>
        ) : recs.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Store layout is currently optimized!</div>
        ) : (
          <div className="space-y-3">
            {recs.map((rec) => (
              <div key={rec.id} className="p-4 rounded-xl bg-card border border-border/50 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">{rec.product_name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-accent/15 text-accent">
                    {rec.recommendation_type.replace("_", " ")}
                  </span>
                </div>
                <p className="text-muted-foreground">{rec.rationale}</p>
                <div className="text-[11px] font-bold text-emerald-400">Impact: {rec.expected_impact}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
