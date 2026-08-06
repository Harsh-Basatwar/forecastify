/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Handshake, ArrowLeft, Lightbulb } from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";

export default function NegotiationPage() {
  const { callApi } = useStoreAssistant();
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNegotiation = async () => {
    setLoading(true);
    let list = await callApi("negotiation.insights");
    if (!list || list.length === 0) {
      await callApi("negotiation.generate");
      list = await callApi("negotiation.insights");
    }
    if (list) setInsights(list);
    setLoading(false);
  };

  useEffect(() => {
    loadNegotiation();
  }, []);

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/store-assistant" className="p-2 rounded-lg bg-card hover:bg-accent/10 border border-border text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Handshake className="w-6 h-6 text-accent" /> AI Supplier Negotiation Insights
          </h1>
          <p className="text-xs text-muted-foreground">Historical order pattern mining for discount leverage & optimal order days</p>
        </div>
      </div>

      <div className="fx-card p-6 space-y-4">
        <h2 className="text-base font-bold">Negotiation Leverage Insights</h2>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Mining purchase order history...</div>
        ) : insights.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">No negotiation insights available yet.</div>
        ) : (
          <div className="space-y-3">
            {insights.map((ins) => (
              <div key={ins.id} className="p-4 rounded-xl bg-card border border-border/50 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-accent">{ins.supplier_name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-accent/15 text-accent">
                    Confidence: {Math.round((ins.confidence || 0) * 100)}%
                  </span>
                </div>
                <p className="text-foreground font-medium">{ins.insight_text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
