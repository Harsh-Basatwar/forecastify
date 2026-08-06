/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, ArrowLeft, Star, Award } from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";

export default function SupplierAssistantPage() {
  const { callApi } = useStoreAssistant();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSuppliers = async () => {
    setLoading(true);
    const ranked = await callApi("supplier.rank");
    if (ranked) setSuppliers(ranked);
    setLoading(false);
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/store-assistant" className="p-2 rounded-lg bg-card hover:bg-accent/10 border border-border text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-accent" /> Supplier Scorecard & Ranking
          </h1>
          <p className="text-xs text-muted-foreground">Multi-criteria supplier evaluations across price, lead time & defect rate</p>
        </div>
      </div>

      <div className="fx-card p-6 space-y-4">
        <h2 className="text-base font-bold">Supplier Rankings</h2>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Ranking suppliers...</div>
        ) : suppliers.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">No suppliers found in database.</div>
        ) : (
          <div className="space-y-3">
            {suppliers.map((sup) => (
              <div key={sup.supplierId} className="p-4 rounded-xl bg-card border border-border/50 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-sm">{sup.supplierName}</div>
                  <p className="text-muted-foreground">
                    Reliability: {sup.reliabilityScore}/100 | Lead Time Score: {sup.leadTimeScore}/100
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground">Overall Rank</span>
                    <div className="font-extrabold text-accent text-lg">{sup.overallScore}/100</div>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-accent/15 text-accent font-bold uppercase text-[10px]">
                    {sup.rank}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
