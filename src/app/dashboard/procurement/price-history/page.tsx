"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Building,
  Tag,
  Calendar,
} from "lucide-react";

export default function PriceHistoryPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch(`/api/procurement/price-history?storeId=${user.id}`)
      .then((res) => res.json())
      .then((res) => {
        setHistory(res.history || []);
        setSummary(res.summary || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="fx-display text-2xl tracking-tight">Supplier Price History & Trends</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Historical pricing intelligence, lowest vs highest cost tracking, and lead-time analytics.
        </p>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 fx-card backdrop-blur-md">
            <span className="fx-eyebrow text-[10px]">Lowest Recorded Price</span>
            <p className="fx-display fx-num text-2xl font-bold text-emerald-500 mt-2">₹{summary.lowestPrice}</p>
          </div>
          <div className="p-4 fx-card backdrop-blur-md">
            <span className="fx-eyebrow text-[10px]">Highest Price</span>
            <p className="fx-display fx-num text-2xl font-bold text-rose-500 mt-2">₹{summary.highestPrice}</p>
          </div>
          <div className="p-4 fx-card backdrop-blur-md">
            <span className="fx-eyebrow text-[10px]">Average Price</span>
            <p className="fx-display fx-num text-2xl font-bold text-foreground mt-2">₹{summary.averagePrice}</p>
          </div>
          <div className="p-4 fx-card backdrop-blur-md">
            <span className="fx-eyebrow text-[10px]">Price Movement</span>
            <div className="flex items-center gap-2 mt-2">
              <span className="fx-display fx-num text-2xl font-bold text-foreground">₹{summary.lastPrice}</span>
              {summary.priceTrend === "up" ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-500 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Up
                </span>
              ) : summary.priceTrend === "down" ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-500 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> Down
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-500/20 text-gray-400 flex items-center gap-1">
                  <Minus className="w-3 h-3" /> Stable
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="rounded-2xl bg-card/50 border border-border/80 overflow-hidden shadow-lg backdrop-blur-md">
        <div className="p-4 bg-secondary/60 border-b border-border font-semibold text-xs text-foreground uppercase tracking-wider">
          Price Records Log ({history.length})
        </div>
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">Loading price history...</div>
        ) : history.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">No historical price entries recorded. Process GRNs to accumulate price history.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="bg-secondary/30 border-b border-border/60 text-muted-foreground font-semibold uppercase">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Product</th>
                  <th className="p-4">Supplier</th>
                  <th className="p-4">Invoice Ref</th>
                  <th className="p-4 text-right">Purchase Price ₹</th>
                  <th className="p-4 text-right">GST %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-secondary/20 transition">
                    <td className="p-4 text-muted-foreground font-mono">
                      {new Date(h.date || h.created_at).toLocaleDateString("en-IN")}
                    </td>
                    <td className="p-4 font-bold text-foreground">{h.product?.name || "Product"}</td>
                    <td className="p-4 font-medium text-accent">{h.supplier?.name || "Supplier"}</td>
                    <td className="p-4 font-mono text-muted-foreground">{h.invoice_ref || "N/A"}</td>
                    <td className="p-4 text-right font-bold text-foreground">₹{h.purchase_price}</td>
                    <td className="p-4 text-right text-muted-foreground">{h.gst_rate || 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
