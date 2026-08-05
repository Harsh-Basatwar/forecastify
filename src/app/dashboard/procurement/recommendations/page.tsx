"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Sparkles,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Building,
} from "lucide-react";
import { motion } from "framer-motion";

export default function AIRecommendationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch(`/api/procurement/recommendations?storeId=${user.id}`)
      .then((res) => res.json())
      .then((res) => {
        setRecommendations(res.recommendations || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const handleConvert = async (rec: any) => {
    if (!user) return;
    setConvertingId(rec.id);
    try {
      const res = await fetch("/api/procurement/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: user.id,
          recommendation: rec,
          userId: user.id,
        }),
      });

      const json = await res.json();
      if (json.success && json.po) {
        router.push(`/dashboard/procurement/orders/${json.po.id}`);
      } else {
        alert(json.error || "Failed to create PO from recommendation");
      }
    } catch (err) {
      alert("Error converting recommendation");
    } finally {
      setConvertingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-card/60 border border-border/80 shadow-md backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-accent font-semibold text-xs uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-accent animate-pulse" /> AI Reorder Intelligence
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Purchase Recommendations Engine
          </h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Autonomous calculation of stockout risk dates, safety stocks, daily sales velocity, and vendor lead times. Convert recommendations into draft POs in 1-click.
          </p>
        </div>
      </div>

      {/* Recommendations Feed */}
      {loading ? (
        <div className="p-12 text-center text-xs text-muted-foreground">Evaluating inventory balances & generating AI recommendations...</div>
      ) : recommendations.length === 0 ? (
        <div className="p-12 rounded-2xl bg-card/50 border border-border/80 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-foreground">All Stock Levels Optimal</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            No items currently exceed safety stock reorder thresholds. Jarvis AI is monitoring sales velocity in real-time.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {recommendations.map((rec) => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl bg-card/60 border border-border/80 shadow-md backdrop-blur-md space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] uppercase font-bold bg-accent/15 text-accent border border-accent/20">
                      Reorder Alert
                    </span>
                    <span className="text-xs font-semibold text-rose-500">
                      Expected Stockout: {new Date(rec.reasoning?.expected_stockout_date).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mt-1">{rec.product_name}</h3>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground uppercase">Recommended PO Total</span>
                    <p className="text-lg font-bold text-accent">₹{rec.expected_cost.toLocaleString("en-IN")}</p>
                  </div>
                  <button
                    onClick={() => handleConvert(rec)}
                    disabled={convertingId === rec.id}
                    className="px-5 py-2.5 rounded-xl bg-accent hover:opacity-90 text-accent-foreground font-bold text-xs transition shadow-md flex items-center gap-2 shrink-0"
                  >
                    <Sparkles className="w-4 h-4" />
                    {convertingId === rec.id ? "Drafting PO..." : "Draft 1-Click PO"}
                  </button>
                </div>
              </div>

              {/* Explanations Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/40">
                  <span className="font-bold text-accent">Why Reorder</span>
                  <p className="text-muted-foreground mt-1">{rec.reasoning?.why_reorder}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/40">
                  <span className="font-bold text-accent">Why Quantity ({rec.recommended_qty} Units)</span>
                  <p className="text-muted-foreground mt-1">{rec.reasoning?.why_quantity}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/40">
                  <span className="font-bold text-accent">Why {rec.recommended_supplier_name}</span>
                  <p className="text-muted-foreground mt-1">{rec.reasoning?.why_supplier}</p>
                </div>
              </div>

              {/* Risk Warning Box */}
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Stockout Risk Warning: </span>
                  {rec.reasoning?.risk_if_ignored} Estimated savings of ₹{rec.expected_savings} if ordered before {new Date(rec.recommended_purchase_date).toLocaleDateString("en-IN")}.
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
