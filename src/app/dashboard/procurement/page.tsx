"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  ShoppingCart,
  Clock,
  TrendingUp,
  AlertTriangle,
  Users,
  CheckCircle2,
  PackageCheck,
  Zap,
  ArrowRight,
  Plus,
  FileSpreadsheet,
  TrendingDown,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";

export default function ProcurementDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/procurement/analytics?storeId=${user.id}`)
      .then((res) => res.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const kpis = data?.kpis || {
    totalPoCount: 14,
    openPoCount: 5,
    pendingDeliveriesCount: 3,
    delayedOrdersCount: 1,
    avgLeadTimeDays: 2.8,
    avgSupplierScore: 96,
    totalSpend: 248500,
    totalSavings: 18400,
    outstandingPayments: 34000,
  };

  const navCards = [
    { title: "Purchase Orders", desc: "Manage draft, approved, in-transit & closed POs", href: "/dashboard/procurement/orders", icon: ShoppingCart, count: kpis.openPoCount, badge: "Active" },
    { title: "GRN & Quality Check", desc: "Inspect receipts & push to InventoryDomainService", href: "/dashboard/procurement/grn", icon: PackageCheck, count: kpis.pendingDeliveriesCount, badge: "Pending" },
    { title: "AI Recommendations", desc: "Smart reorder advice with stock-out risk reasoning", href: "/dashboard/procurement/recommendations", icon: Sparkles, badge: "AI Powered" },
    { title: "Supplier Portal", desc: "Reliability scores, lead times & credit limits", href: "/dashboard/procurement/suppliers", icon: Users, count: data?.supplierList?.length || 8 },
    { title: "Price History", desc: "Lowest vs highest price trends across suppliers", href: "/dashboard/procurement/price-history", icon: TrendingUp },
    { title: "Approval Center", desc: "Review & approve high-value purchase orders", href: "/dashboard/procurement/approvals", icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 fx-card p-6 shadow-sm backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 fx-eyebrow text-accent mb-1">
            <Zap className="w-4 h-4 text-accent animate-pulse" /> Enterprise Procurement Hub
          </div>
          <h1 className="fx-display text-2xl sm:text-3xl tracking-tight">
            Procurement & Purchase System
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            End-to-end purchasing lifecycle integrated directly with Forecastify's Inventory Domain Service, AI forecasting, and immutable ledger.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/procurement/orders?action=new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-accent-foreground font-semibold text-sm hover:opacity-90 transition shadow-md"
          >
            <Plus className="w-4 h-4" /> Create PO
          </Link>
          <Link
            href="/dashboard/procurement/grn"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm hover:bg-secondary/80 transition"
          >
            <PackageCheck className="w-4 h-4" /> Goods Receipt (GRN)
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 fx-card backdrop-blur-md"
        >
          <div className="flex items-center justify-between">
            <span className="fx-eyebrow">Open POs</span>
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <p className="fx-display fx-num text-2xl font-bold mt-3">{kpis.openPoCount}</p>
          <span className="text-xs text-accent font-medium">{kpis.totalPoCount} Total Orders</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-5 fx-card backdrop-blur-md"
        >
          <div className="flex items-center justify-between">
            <span className="fx-eyebrow">Pending Deliveries</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="fx-display fx-num text-2xl font-bold mt-3">{kpis.pendingDeliveriesCount}</p>
          <span className="text-xs text-amber-500 font-medium">{kpis.delayedOrdersCount} Delayed Order</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 fx-card backdrop-blur-md"
        >
          <div className="flex items-center justify-between">
            <span className="fx-eyebrow">Total Spend</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="fx-display fx-num text-2xl font-bold mt-3">₹{kpis.totalSpend.toLocaleString("en-IN")}</p>
          <span className="text-xs text-emerald-500 font-medium">₹{kpis.totalSavings.toLocaleString("en-IN")} Savings</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-5 fx-card backdrop-blur-md"
        >
          <div className="flex items-center justify-between">
            <span className="fx-eyebrow">Supplier Reliability</span>
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="fx-display fx-num text-2xl font-bold mt-3">{kpis.avgSupplierScore}%</p>
          <span className="text-xs text-accent font-medium">{kpis.avgLeadTimeDays} Days Avg Lead Time</span>
        </motion.div>
      </div>

      {/* Primary Workspaces Grid */}
      <div>
        <h2 className="fx-display text-lg font-semibold mb-4">Procurement Workspaces</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {navCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <Link key={idx} href={card.href}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative p-6 fx-card fx-card-interactive backdrop-blur-sm h-full flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition">
                        <Icon className="w-6 h-6" />
                      </div>
                      {card.badge && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-accent/15 text-accent border border-accent/20">
                          {card.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="fx-display text-lg font-bold group-hover:text-accent transition">
                      {card.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                  <div className="mt-6 flex items-center justify-between text-xs font-semibold text-muted-foreground group-hover:text-foreground">
                    <span>Explore Module</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* AI Recommendation Fast Action Banner */}
      <div className="p-6 fx-card shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-accent/10 text-accent shrink-0">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] fx-eyebrow bg-accent/15 text-accent border border-accent/20">
              Jarvis AI Intelligence
            </span>
            <h3 className="fx-display text-lg font-bold mt-1">
              Automated Purchase Recommendations Active
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
              Our AI continuously evaluates daily sales velocity, lead times, safety stocks, and stockout risk dates to generate 1-click purchase orders.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/procurement/recommendations"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-accent text-accent-foreground font-semibold text-sm transition shadow-md shrink-0 hover:opacity-90"
        >
          View AI Recommendations <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
