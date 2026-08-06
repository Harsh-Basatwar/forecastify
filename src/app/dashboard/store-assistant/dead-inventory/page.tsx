/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PackageX, ArrowLeft, AlertCircle, DollarSign, TrendingDown } from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";

export default function DeadInventoryPage() {
  const { callApi } = useStoreAssistant();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadDeadInventory = async () => {
    setLoading(true);
    const res = await callApi("deadInventory.detect");
    if (res) setData(res);
    setLoading(false);
  };

  useEffect(() => {
    loadDeadInventory();
  }, []);

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/store-assistant" className="p-2 rounded-lg bg-card hover:bg-accent/10 border border-border text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PackageX className="w-6 h-6 text-accent" /> Dead Inventory Liquidation
          </h1>
          <p className="text-xs text-muted-foreground">Identify slow-moving stock & unlock trapped working capital</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="fx-card p-5 space-y-1">
          <span className="text-xs text-muted-foreground">Dead Stock Items</span>
          <div className="text-2xl font-black">{data?.totalItems || 0} items</div>
        </div>
        <div className="fx-card p-5 space-y-1">
          <span className="text-xs text-muted-foreground">Trapped Working Capital</span>
          <div className="text-2xl font-black text-rose-400">₹{(data?.totalCapitalBlocked || 0).toLocaleString("en-IN")}</div>
        </div>
      </div>

      {/* Items Table */}
      <div className="fx-card p-6 space-y-4">
        <h2 className="text-base font-bold">Non-Selling Products (&gt;15 Days)</h2>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Scanning inventory history...</div>
        ) : (data?.items || []).length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Great news! No dead inventory detected.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-border/40 text-muted-foreground uppercase text-[10px]">
                <tr>
                  <th className="py-2">Product</th>
                  <th className="py-2">Category</th>
                  <th className="py-2">Stock</th>
                  <th className="py-2">Trapped Capital</th>
                  <th className="py-2">Days Unsold</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {(data?.items || []).map((item: any) => (
                  <tr key={item.productId}>
                    <td className="py-3 font-semibold">{item.productName}</td>
                    <td className="py-3 text-muted-foreground">{item.category}</td>
                    <td className="py-3">{item.currentStock}</td>
                    <td className="py-3 font-bold text-rose-400">₹{item.capitalBlocked.toLocaleString("en-IN")}</td>
                    <td className="py-3 font-bold text-amber-400">{item.daysSinceLastSale} days</td>
                    <td className="py-3">
                      <span className="px-2.5 py-1 rounded bg-accent/15 text-accent font-bold uppercase text-[10px]">
                        {item.recommendedAction}
                      </span>
                    </td>
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
