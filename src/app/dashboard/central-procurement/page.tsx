"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShoppingBag,
  Building2,
  TrendingUp,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Package,
  Layers,
  Truck,
  Store,
  Warehouse,
} from "lucide-react";
import { useOrgStore } from "@/providers/org-store-provider";

export default function CentralProcurementPage() {
  const { activeOrg, stores } = useOrgStore();
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");

  const mockDemandAggregations = [
    {
      id: "agg-1",
      sku: "PROD-9912",
      name: "Tropicana Orange Juice 1L",
      supplier: "Pepsico India Holdings",
      totalForecastDemand: 450,
      currentOrgStock: 80,
      suggestedPOQty: 400,
      estimatedCost: "₹38,000",
      allocations: [
        { storeName: "Main Outlet", qty: 200, reason: "Forecast" },
        { storeName: "Downtown Store", qty: 150, reason: "Forecast" },
        { storeName: "Central Warehouse", qty: 50, reason: "Emergency" },
      ],
    },
    {
      id: "agg-2",
      sku: "PROD-4401",
      name: "Fortune Sunflower Oil 5L",
      supplier: "Adani Wilmar Ltd",
      totalForecastDemand: 600,
      currentOrgStock: 120,
      suggestedPOQty: 500,
      estimatedCost: "₹3,75,000",
      allocations: [
        { storeName: "Main Outlet", qty: 300, reason: "Promotion" },
        { storeName: "Downtown Store", qty: 200, reason: "Forecast" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-card border border-border">
        <div>
          <div className="flex items-center gap-2 text-accent text-xs font-bold uppercase tracking-wider mb-1">
            <ShoppingBag className="w-4 h-4" />
            Planning Hub • Central Procurement
          </div>
          <h1 className="text-2xl font-bold text-foreground">Multi-Store Central Procurement</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aggregate store demands, optimize vendor bulk discounts, and distribute allocations automatically
          </p>
        </div>

        <button className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-accent text-accent-foreground font-semibold text-xs hover:bg-accent/90 transition-all fx-press shadow-md shadow-accent/10 shrink-0">
          <Plus className="w-4 h-4" />
          Create Central PO
        </button>
      </div>

      {/* Aggregate Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] text-muted-foreground font-medium uppercase">Aggregated Reorder Value</p>
          <p className="text-xl font-bold text-foreground mt-1">₹4,13,000</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] text-muted-foreground font-medium uppercase">Consolidated Suppliers</p>
          <p className="text-xl font-bold text-accent mt-1">2 Preferred Vendors</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] text-muted-foreground font-medium uppercase">Bulk Tier Savings</p>
          <p className="text-xl font-bold text-emerald-500 mt-1">₹42,500 (10.2%)</p>
        </div>
      </div>

      {/* Aggregated Demands List */}
      <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Demand Aggregation & Allocation Breakdown</h2>
        </div>

        <div className="space-y-4">
          {mockDemandAggregations.map((item) => (
            <div key={item.id} className="p-5 rounded-xl border border-border bg-secondary/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-accent/10 text-accent border border-accent/20">
                      {item.sku}
                    </span>
                    <h3 className="text-sm font-bold text-foreground">{item.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Supplier: {item.supplier}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Suggested Total PO</p>
                    <p className="text-sm font-bold text-foreground">{item.suggestedPOQty} units ({item.estimatedCost})</p>
                  </div>
                  <button className="h-8 px-3 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors">
                    Approve Order
                  </button>
                </div>
              </div>

              {/* Allocation Breakdown per Store */}
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase mb-2">Store Allocations</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {item.allocations.map((alloc, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-border bg-background flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{alloc.storeName}</p>
                        <p className="text-[10px] text-muted-foreground">Reason: {alloc.reason}</p>
                      </div>
                      <span className="text-xs font-bold text-accent">{alloc.qty} pcs</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
