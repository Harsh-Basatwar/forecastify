/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HeartPulse, ArrowLeft, TrendingUp, AlertTriangle } from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";

export default function StoreHealthPage() {
  const { callApi } = useStoreAssistant();
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadHealth = async () => {
    setLoading(true);
    const res = await callApi("health.compute");
    if (res) setHealth(res);
    setLoading(false);
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const dimensions = health?.dimensions ? Object.entries(health.dimensions) : [];

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/store-assistant" className="p-2 rounded-lg bg-card hover:bg-accent/10 border border-border text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-accent" /> Composite Store Health Monitor
          </h1>
          <p className="text-xs text-muted-foreground">Comprehensive health score evaluated across 9 core operational dimensions</p>
        </div>
      </div>

      {/* Main Score Display */}
      <div className="fx-card p-8 text-center space-y-3 bg-gradient-to-br from-card to-accent/10 border border-accent/30">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Overall Operational Score</span>
        <div className="text-5xl font-black text-accent">{health?.overall_score || 0}<span className="text-xl font-bold text-muted-foreground">/100</span></div>
        <p className="text-xs font-semibold text-muted-foreground">Status: <strong className="text-foreground capitalize">{health?.trend || "Stable"}</strong></p>
      </div>

      {/* 9 Dimensions Grid */}
      <div className="fx-card p-6 space-y-4">
        <h2 className="text-base font-bold">9 Operational Dimensions Breakdown</h2>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Evaluating dimensions...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {dimensions.map(([dim, score]: [string, any]) => (
              <div key={dim} className="p-4 rounded-xl bg-card border border-border/50 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold capitalize">
                  <span>{dim.replace(/([A-Z])/g, " $1")}</span>
                  <span className="text-accent">{score}/100</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-accent transition-all" style={{ width: `${score}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="fx-card p-6 space-y-3 border-l-4 border-l-accent">
        <h2 className="text-base font-bold">Priority Improvement Recommendations</h2>
        <div className="space-y-2">
          {(health?.recommendations || []).map((rec: string, idx: number) => (
            <p key={idx} className="text-xs text-muted-foreground">• {rec}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
