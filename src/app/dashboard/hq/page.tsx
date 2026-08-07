/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useOrgStore } from "@/providers/org-store-provider";
import { AnimatedCounter } from "@/lib/motion-primitives";
import {
  Building2,
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Clock,
  Store,
  Warehouse,
  ShieldCheck,
  Building,
  RefreshCw,
  FileText,
} from "lucide-react";

// System status indicator consistent with Overview page
function SystemStatus() {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground select-none">
      <span className="fx-signal fx-signal-success" aria-hidden="true" />
      HQ Multi-Store Command Node Operational
    </span>
  );
}

// Health ring component consistent with overview dashboard
function HealthRing({ score }: { score: number }) {
  const radius = 36;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const ringColor = score >= 80 ? "var(--success)" : score >= 65 ? "var(--warning)" : "var(--danger)";
  const label = score >= 80 ? "Optimal" : score >= 65 ? "Caution" : "Critical";

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-20 h-20 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 90 90">
          <circle cx="45" cy="45" r={radius} stroke="var(--muted)" strokeWidth={strokeWidth} fill="transparent" />
          <circle
            cx="45"
            cy="45"
            r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)" }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="fx-num text-base font-bold text-foreground">{score}%</span>
        </div>
      </div>
      <div>
        <p className="fx-eyebrow">Org Health Index</p>
        <p className="text-xs font-semibold mt-0.5" style={{ color: ringColor }}>
          {label} State
        </p>
      </div>
    </div>
  );
}

export default function HQDashboardPage() {
  const { activeOrg, stores, executionContext } = useOrgStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const rawOrgMetrics = {
    totalRevenue: 2485400,
    revenueGrowth: "+14.2%",
    totalMargin: 28.5,
    totalStores: stores.length || 3,
    inventoryValue: 6840000,
    outOfStockCount: 14,
    pendingApprovals: 5,
    healthScore: 92,
  };

  const storePerformance = [
    {
      id: "store-1",
      name: "Main Supermarket Outlet",
      code: "STORE-01",
      type: "retail",
      revenue: 1240000,
      growth: "+18.4%",
      margin: "31.2%",
      healthScore: 95,
      outOfStock: 2,
      pendingTransfers: 1,
    },
    {
      id: "store-2",
      name: "Downtown Express Store",
      code: "STORE-02",
      type: "retail",
      revenue: 815000,
      growth: "+9.1%",
      margin: "26.4%",
      healthScore: 88,
      outOfStock: 7,
      pendingTransfers: 3,
    },
    {
      id: "store-3",
      name: "Central Logistics Warehouse",
      code: "WH-01",
      type: "warehouse",
      revenue: 430400,
      growth: "+12.0%",
      margin: "24.0%",
      healthScore: 94,
      outOfStock: 5,
      pendingTransfers: 1,
    },
  ];

  const pendingDecisionCards = [
    {
      id: "app-1",
      title: "Inter-Store Stock Transfer #TR-8920",
      subtitle: "Downtown Store requested 50x Amul Butter 500g from Central Warehouse",
      type: "transfer",
      amount: "₹14,500",
      priority: "high",
      time: "10 mins ago",
    },
    {
      id: "app-2",
      title: "Central Procurement Purchase Order #PO-4412",
      subtitle: "Combined PO for Nestlé India Ltd (Store 01 + Store 02)",
      type: "procurement",
      amount: "₹1,28,000",
      priority: "medium",
      time: "45 mins ago",
    },
    {
      id: "app-3",
      title: "Cash Drawer Reconciliation Mismatch",
      subtitle: "Store 02 closing balance variance (-₹450)",
      type: "cash",
      amount: "₹450",
      priority: "high",
      time: "2 hours ago",
    },
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      {/* ── Page Lead Header (Editorial Ledger Design) ───────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div className="min-w-0">
          <SystemStatus />
          <h1 className="fx-display text-[28px] sm:text-[34px] leading-tight text-foreground mt-2.5">
            {activeOrg?.name || "Enterprise HQ Command Center"}
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1.5 flex items-center gap-1.5 flex-wrap">
            <Building className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Centralized Control across {stores.length || 3} Outlets</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-secondary-foreground">
              Scope: {(executionContext?.role || "organization_owner").replace("_", " ").toUpperCase()}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleRefresh} className="fx-btn">
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} /> Sync HQ Data
          </button>
          <button className="fx-btn fx-btn-accent">
            <FileText className="w-3.5 h-3.5" /> Org Summary
          </button>
        </div>
      </div>

      {/* ── KPI Ledger Row (Consistent hairline-divided grid) ─────────── */}
      <section aria-label="HQ Key Metrics" className="fx-card grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-[var(--border)] overflow-hidden">
        <div className="p-5 sm:p-6">
          <p className="fx-eyebrow">Combined Revenue</p>
          <p className="fx-num fx-metric-xl text-foreground mt-2.5">
            <AnimatedCounter value={rawOrgMetrics.totalRevenue} prefix="₹" />
          </p>
          <p className="inline-flex items-center gap-1.5 text-xs text-emerald-500 mt-2.5 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            {rawOrgMetrics.revenueGrowth} vs last month
          </p>
        </div>

        <div className="p-5 sm:p-6">
          <p className="fx-eyebrow">Inventory Valuation</p>
          <p className="fx-num fx-metric-xl text-foreground mt-2.5">
            <AnimatedCounter value={rawOrgMetrics.inventoryValue} prefix="₹" />
          </p>
          <p className="text-xs text-muted-foreground mt-2.5">
            {rawOrgMetrics.outOfStockCount} items out-of-stock across outlets
          </p>
        </div>

        <div className="p-5 sm:p-6">
          <p className="fx-eyebrow">Gross Margin</p>
          <p className="fx-num fx-metric-xl text-foreground mt-2.5">
            <AnimatedCounter value={rawOrgMetrics.totalMargin} suffix="%" />
          </p>
          <p className="text-xs text-muted-foreground mt-2.5">Weighted multi-store average</p>
        </div>

        <div className="p-5 sm:p-6">
          <p className="fx-eyebrow">Pending Approvals</p>
          <p className="fx-num fx-metric-xl text-amber-500 mt-2.5">
            <AnimatedCounter value={rawOrgMetrics.pendingApprovals} />
            <span className="text-sm font-normal text-muted-foreground ml-1.5">tasks</span>
          </p>
          <p className="inline-flex items-center gap-1.5 text-xs text-amber-500 mt-2.5 font-medium">
            <span className="fx-signal fx-signal-warning" aria-hidden="true" />
            Requires HQ decision
          </p>
        </div>
      </section>

      {/* ── Operational Command & Health Row ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Action Center (2 Cols) */}
        <section aria-label="HQ Action Center" className="fx-card p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent" strokeWidth={1.8} />
              <h2 className="fx-display text-[17px] text-foreground">HQ Decision Action Center</h2>
            </div>
            <span className="fx-badge fx-badge-warning fx-num">
              {pendingDecisionCards.length} Decisions Pending
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pendingDecisionCards.map((card) => (
              <div key={card.id} className="fx-card p-4 space-y-3 bg-secondary/30">
                <div className="flex items-center justify-between">
                  <span className="fx-badge fx-badge-accent uppercase font-semibold">
                    {card.type}
                  </span>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {card.time}
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground leading-snug">{card.title}</h3>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{card.subtitle}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                  <span className="fx-num text-xs font-bold text-foreground">{card.amount}</span>
                  <div className="flex items-center gap-1.5">
                    <button className="fx-icon-btn text-emerald-500 hover:bg-emerald-500/10 min-w-[2rem] min-h-[2rem]">
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button className="fx-icon-btn text-rose-500 hover:bg-rose-500/10 min-w-[2rem] min-h-[2rem]">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Health Score Component */}
        <section aria-label="Organization Health" className="fx-card p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-accent" strokeWidth={1.8} />
            <h2 className="fx-display text-[17px] text-foreground">Org Operational Health</h2>
          </div>
          <HealthRing score={rawOrgMetrics.healthScore} />
          <div className="fx-rule pt-4 text-xs text-muted-foreground space-y-1.5">
            <p className="flex justify-between">
              <span>Transfers Active:</span> <strong className="fx-num text-foreground">5 Requests</strong>
            </p>
            <p className="flex justify-between">
              <span>Central Orders:</span> <strong className="fx-num text-foreground">3 Orders</strong>
            </p>
          </div>
        </section>
      </div>

      {/* ── Multi-Store Performance Leaderboard Table ─────────────────── */}
      <section aria-label="Multi-Store Leaderboard" className="fx-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="fx-display text-[17px] text-foreground">Multi-Store Performance Leaderboard</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Real-time revenue, growth %, and health scores per outlet</p>
          </div>
          <span className="fx-badge fx-badge-info fx-num">
            {storePerformance.length} Outlets Tracked
          </span>
        </div>

        <div className="fx-table-scroll">
          <table className="fx-table min-w-[700px]">
            <thead>
              <tr>
                <th scope="col">Store Outlet</th>
                <th scope="col">Type</th>
                <th scope="col">Revenue</th>
                <th scope="col">Growth</th>
                <th scope="col">Margin</th>
                <th scope="col">Stockout Risk</th>
                <th scope="col">Health Index</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {storePerformance.map((store) => (
                <tr key={store.id}>
                  <td className="font-semibold text-foreground">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-secondary border border-border shrink-0">
                        {store.type === "warehouse" ? (
                          <Warehouse className="w-4 h-4 text-accent" />
                        ) : (
                          <Store className="w-4 h-4 text-sky-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{store.name}</p>
                        <p className="fx-num text-[10px] text-muted-foreground">{store.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="uppercase text-[10px] font-bold text-muted-foreground">
                    {store.type}
                  </td>
                  <td className="fx-num font-bold text-foreground">
                    ₹{store.revenue.toLocaleString("en-IN")}
                  </td>
                  <td className="fx-num font-bold text-emerald-500">{store.growth}</td>
                  <td className="fx-num font-semibold text-foreground">{store.margin}</td>
                  <td className="fx-num font-medium text-amber-500">{store.outOfStock} SKUs</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${store.healthScore}%` }}
                        />
                      </div>
                      <span className="fx-num font-bold text-foreground">{store.healthScore}%</span>
                    </div>
                  </td>
                  <td>
                    <span className="fx-badge fx-badge-success uppercase">
                      ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
