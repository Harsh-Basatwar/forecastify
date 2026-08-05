"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  CreditCard,
  RotateCcw,
  Printer,
  Calendar,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { formatINR } from "@/lib/billing-utils";
import { useAuth } from "@/lib/auth-context";
import InvoiceModal from "@/components/billing/InvoiceModal";
import { SaleTransaction, SalesAnalyticsSummary } from "@/lib/types/sales";
import { cn } from "@/lib/utils";

export default function SalesHistoryPage() {
  const { user } = useAuth();
  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [analytics, setAnalytics] = useState<SalesAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeRange, setTimeRange] = useState("30d");
  const [searchQuery, setSearchQuery] = useState("");

  // Invoice view & refund modal state
  const [selectedSale, setSelectedSale] = useState<SaleTransaction | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [processingRefund, setProcessingRefund] = useState(false);
  const [refundSaleTarget, setRefundSaleTarget] = useState<SaleTransaction | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // 1. Fetch sales list
      const salesRes = await fetch(
        `/api/sales?storeId=${user.id}&status=${statusFilter}&limit=100`
      );
      const salesData = await salesRes.json();
      setSales(salesData.sales || []);

      // 2. Fetch analytics summary
      const analyticsRes = await fetch(
        `/api/sales/analytics?storeId=${user.id}&range=${timeRange}`
      );
      const analyticsData = await analyticsRes.json();
      setAnalytics(analyticsData.summary || null);
    } catch (e) {
      console.warn("Error fetching sales data:", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, statusFilter, timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundSaleTarget || processingRefund) return;
    setProcessingRefund(true);

    try {
      const res = await fetch(`/api/sales/${refundSaleTarget.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "refund",
          reason: refundReason || "Customer return",
          restock: true,
        }),
      });

      const data = await res.json();
      setProcessingRefund(false);

      if (data.success) {
        setRefundSaleTarget(null);
        setRefundReason("");
        fetchData();
      } else {
        alert(`Failed to refund sale: ${data.error || "Unknown error"}`);
      }
    } catch (err: unknown) {
      setProcessingRefund(false);
      alert(`Network error: ${err instanceof Error ? err.message : "Failed to refund"}`);
    }
  };

  const filteredSales = sales.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      s.invoice_number.toLowerCase().includes(q) ||
      (s.customer?.name && s.customer.name.toLowerCase().includes(q)) ||
      (s.payment_method && s.payment_method.toLowerCase().includes(q)) ||
      String(s.grand_total).includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground fx-display">
            Sales & Revenue Analytics
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track daily receipts, profit margins, top selling items, and customer order history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {["today", "7d", "30d", "all"].map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition-colors border",
                timeRange === r
                  ? "bg-accent text-accent-foreground border-accent shadow-xs"
                  : "bg-secondary/40 text-muted-foreground border-border hover:text-foreground"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Analytics Summary Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="fx-card p-4 space-y-1 bg-card border-border">
          <p className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
            <span>Total Revenue</span>
            <DollarSign className="w-3.5 h-3.5 text-accent" />
          </p>
          <p className="text-lg font-extrabold text-foreground">
            {formatINR(analytics?.total_revenue || 0)}
          </p>
          <p className="text-[10px] text-muted-foreground">Completed Orders</p>
        </div>

        <div className="fx-card p-4 space-y-1 bg-card border-border">
          <p className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
            <span>Gross Profit</span>
            <TrendingUp className="w-3.5 h-3.5 text-success" />
          </p>
          <p className="text-lg font-extrabold text-success">
            {formatINR(analytics?.total_profit || 0)}
          </p>
          <p className="text-[10px] text-success/80">Revenue minus COGS</p>
        </div>

        <div className="fx-card p-4 space-y-1 bg-card border-border">
          <p className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
            <span>Completed Orders</span>
            <ShoppingBag className="w-3.5 h-3.5 text-accent" />
          </p>
          <p className="text-lg font-extrabold text-foreground">{analytics?.total_orders || 0}</p>
          <p className="text-[10px] text-muted-foreground">Invoices Generated</p>
        </div>

        <div className="fx-card p-4 space-y-1 bg-card border-border">
          <p className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
            <span>Average Order Value</span>
            <BarChart3 className="w-3.5 h-3.5 text-accent" />
          </p>
          <p className="text-lg font-extrabold text-foreground">
            {formatINR(analytics?.average_order_value || 0)}
          </p>
          <p className="text-[10px] text-muted-foreground">AOV per Customer</p>
        </div>

        <div className="fx-card p-4 space-y-1 bg-card border-border">
          <p className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
            <span>Units Sold</span>
            <Layers className="w-3.5 h-3.5 text-accent" />
          </p>
          <p className="text-lg font-extrabold text-foreground">
            {analytics?.total_units_sold || 0}
          </p>
          <p className="text-[10px] text-muted-foreground">Items Checked Out</p>
        </div>

        <div className="fx-card p-4 space-y-1 bg-card border-border">
          <p className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
            <span>GST Tax Collected</span>
            <CreditCard className="w-3.5 h-3.5 text-accent" />
          </p>
          <p className="text-lg font-extrabold text-foreground">
            {formatINR(analytics?.total_tax_collected || 0)}
          </p>
          <p className="text-[10px] text-muted-foreground">CGST + SGST (18%)</p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-card p-3 rounded-xl border border-border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter sales by invoice number, customer name, payment method..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="fx-input pl-9 h-10 text-xs w-full"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {["all", "completed", "refunded", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-colors border",
                statusFilter === s
                  ? "bg-secondary text-foreground border-border shadow-xs"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Sales Transactions History Table */}
      <div className="fx-card bg-card border-border overflow-hidden">
        <div className="p-4 border-b border-border/80 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Invoices & Receipts Ledger</h3>
          <span className="text-xs text-muted-foreground">
            Showing {filteredSales.length} of {sales.length} transactions
          </span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Loading sales history...
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No sales records match the selected filters.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-muted-foreground font-semibold">
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Payment Method</th>
                  <th className="p-3 text-right">Items</th>
                  <th className="p-3 text-right">Grand Total</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredSales.map((sale) => {
                  const isRefunded = sale.status === "refunded";
                  const isCancelled = sale.status === "cancelled";
                  const createdStr = new Date(sale.created_at).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={sale.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="p-3 font-mono font-bold text-foreground">
                        {sale.invoice_number}
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">{createdStr}</td>
                      <td className="p-3 font-medium text-foreground">
                        {sale.customer?.name || (
                          <span className="text-muted-foreground italic">Walk-in Customer</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="uppercase font-semibold text-[11px] px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                          {sale.payment_method}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold">{sale.items?.length || 1}</td>
                      <td className="p-3 text-right font-extrabold text-foreground">
                        {formatINR(sale.grand_total)}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                            isRefunded
                              ? "bg-danger-soft text-danger"
                              : isCancelled
                              ? "bg-warning/15 text-warning"
                              : "bg-success/15 text-success"
                          )}
                        >
                          {sale.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedSale(sale);
                              setShowInvoiceModal(true);
                            }}
                            title="View / Print Tax Invoice"
                            className="p-1 text-muted-foreground hover:text-accent transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {sale.status === "completed" && (
                            <button
                              onClick={() => setRefundSaleTarget(sale)}
                              title="Process Refund & Restock Inventory"
                              className="p-1 text-muted-foreground hover:text-danger transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Invoice Modal */}
      <InvoiceModal
        open={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        sale={selectedSale}
      />

      {/* Refund Confirmation Modal */}
      {refundSaleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="fx-card p-5 bg-card border border-border max-w-md w-full space-y-4">
            <h3 className="text-sm font-bold text-foreground">
              Confirm Refund for Invoice #{refundSaleTarget.invoice_number}
            </h3>
            <p className="text-xs text-muted-foreground">
              Refunding this sale will issue a customer return of {formatINR(refundSaleTarget.grand_total)} and automatically restock items back into active store inventory.
            </p>

            <form onSubmit={handleProcessRefund} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Reason for Return / Refund
                </label>
                <input
                  type="text"
                  placeholder="e.g. Damaged pack / Wrong item purchased"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="fx-input h-9 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={processingRefund}
                  className="fx-btn bg-danger text-white hover:bg-danger/90 flex-1 h-9 text-xs font-bold"
                >
                  {processingRefund ? "Refunding..." : "Confirm & Restock Inventory"}
                </button>
                <button
                  type="button"
                  onClick={() => setRefundSaleTarget(null)}
                  className="fx-btn fx-btn-outline h-9 text-xs px-3"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
