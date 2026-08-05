"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  ArrowLeft,
  CheckCircle2,
  Send,
  Truck,
  PackageCheck,
  XCircle,
  Clock,
  MessageSquare,
  Paperclip,
  FileText,
  AlertCircle,
  Building,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";

const STAGES = [
  "draft",
  "pending_approval",
  "approved",
  "sent",
  "supplier_accepted",
  "in_transit",
  "partially_received",
  "received",
  "closed",
];

export default function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [po, setPo] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [commentText, setCommentText] = useState("");

  const fetchPoDetails = () => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/procurement/purchase-orders/${id}`)
      .then((res) => res.json())
      .then((res) => {
        setPo(res.po);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchPoDetails();
  }, [id]);

  const handleStatusTransition = async (targetStatus: string, reason?: string) => {
    if (!user || !id) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/procurement/purchase-orders/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetStatus,
          reason,
          userId: user.id,
          userName: user.email?.split("@")[0] || "User",
        }),
      });

      const json = await res.json();
      if (json.success) {
        fetchPoDetails();
      } else {
        alert(json.error || "Status transition failed.");
      }
    } catch (err) {
      alert("Error executing status transition.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommentText("");
    fetchPoDetails();
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-muted-foreground">Loading purchase order details...</div>;
  }

  if (!po) {
    return (
      <div className="p-12 text-center">
        <p className="text-sm font-semibold text-foreground">Purchase Order not found.</p>
        <Link href="/dashboard/procurement/orders" className="text-xs text-accent hover:underline mt-2 inline-block">
          ← Return to Orders List
        </Link>
      </div>
    );
  }

  const currentStageIndex = STAGES.indexOf(po.status);

  return (
    <div className="space-y-8">
      {/* Header & Back Link */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/dashboard/procurement/orders" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Purchase Orders
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="fx-display text-2xl tracking-tight">{po.po_number}</h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-accent/15 text-accent border border-accent/20 uppercase tracking-wider">
              {po.status.replace("_", " ")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Created on {new Date(po.created_at).toLocaleDateString("en-IN")} • Supplier: <span className="font-semibold text-foreground">{po.supplier?.name}</span>
          </p>
        </div>

        {/* Action Buttons State Machine Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {po.status === "draft" && (
            <button
              onClick={() => handleStatusTransition("pending_approval")}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-amber-500 text-white font-semibold text-xs hover:bg-amber-600 transition shadow-md"
            >
              Submit for Approval
            </button>
          )}

          {po.status === "pending_approval" && (
            <button
              onClick={() => handleStatusTransition("approved")}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-500 transition shadow-md"
            >
              Approve Purchase Order
            </button>
          )}

          {po.status === "approved" && (
            <button
              onClick={() => handleStatusTransition("sent")}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-500 transition shadow-md"
            >
              <Send className="w-3.5 h-3.5 inline mr-1" /> Send to Supplier
            </button>
          )}

          {po.status === "sent" && (
            <button
              onClick={() => handleStatusTransition("supplier_accepted")}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold text-xs hover:bg-purple-500 transition shadow-md"
            >
              Mark Supplier Accepted
            </button>
          )}

          {(po.status === "supplier_accepted" || po.status === "sent") && (
            <button
              onClick={() => handleStatusTransition("in_transit")}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-500 transition shadow-md"
            >
              <Truck className="w-3.5 h-3.5 inline mr-1" /> Mark In Transit
            </button>
          )}

          {["sent", "supplier_accepted", "in_transit", "partially_received"].includes(po.status) && (
            <Link
              href={`/dashboard/procurement/grn?poId=${po.id}`}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-500 transition shadow-md"
            >
              <PackageCheck className="w-3.5 h-3.5 inline mr-1" /> Create GRN Receipt
            </Link>
          )}

          {po.status !== "closed" && po.status !== "cancelled" && (
            <button
              onClick={() => handleStatusTransition("cancelled", "User cancelled order")}
              disabled={actionLoading}
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition border border-rose-500/20"
            >
              Cancel PO
            </button>
          )}
        </div>
      </div>

      {/* 10-Stage Lifecycle Progress Bar */}
      <div className="p-6 fx-card backdrop-blur-md">
        <h3 className="fx-eyebrow mb-4">Lifecycle Progress</h3>
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {STAGES.map((stg, idx) => {
            const isCompleted = currentStageIndex >= idx;
            const isCurrent = currentStageIndex === idx;
            return (
              <div key={stg} className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                      isCurrent
                        ? "bg-accent text-accent-foreground ring-4 ring-accent/20"
                        : isCompleted
                        ? "bg-emerald-500 text-white"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? "✓" : idx + 1}
                  </div>
                  <span className={`text-[10px] font-semibold mt-1 capitalize ${isCurrent ? "text-accent" : "text-muted-foreground"}`}>
                    {stg.replace("_", " ")}
                  </span>
                </div>
                {idx < STAGES.length - 1 && (
                  <div className={`h-0.5 w-12 sm:w-16 rounded-full ${isCompleted ? "bg-emerald-500" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Supplier Info & Financial Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 fx-card backdrop-blur-md">
          <div className="flex items-center gap-2 fx-eyebrow text-accent mb-3">
            <Building className="w-4 h-4 text-accent" /> Supplier Metadata
          </div>
          <h4 className="fx-display text-base font-bold">{po.supplier?.name}</h4>
          <p className="text-xs text-muted-foreground mt-1 fx-num">GSTIN: {po.supplier?.gstin || "N/A"}</p>
          <p className="text-xs text-muted-foreground">Email: {po.supplier?.email || "N/A"}</p>
          <p className="text-xs text-muted-foreground">Terms: {po.terms || "Net 30"}</p>
        </div>

        <div className="p-6 fx-card backdrop-blur-md md:col-span-2">
          <div className="flex items-center justify-between fx-eyebrow mb-3">
            <span>Financial Summary</span>
            <span className="text-emerald-500">GST Invoice</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-xl bg-secondary/50">
              <span className="fx-eyebrow text-[10px]">Subtotal</span>
              <p className="fx-display fx-num text-base font-bold text-foreground">₹{Number(po.subtotal || 0).toLocaleString("en-IN")}</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/50">
              <span className="fx-eyebrow text-[10px]">GST Tax (18%)</span>
              <p className="fx-display fx-num text-base font-bold text-foreground">₹{Number(po.tax_amount || 0).toLocaleString("en-IN")}</p>
            </div>
            <div className="p-3 rounded-xl bg-accent/10 border border-accent/20">
              <span className="fx-eyebrow text-[10px] text-accent font-semibold">Total Amount</span>
              <p className="fx-display fx-num text-base font-bold text-accent">₹{Number(po.total_amount || 0).toLocaleString("en-IN")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="rounded-2xl bg-card/50 border border-border/80 overflow-hidden shadow-lg backdrop-blur-md">
        <div className="p-4 bg-secondary/60 border-b border-border font-semibold text-xs text-foreground uppercase tracking-wider">
          Purchase Line Items ({po.items?.length || 0})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-foreground">
            <thead className="bg-secondary/30 border-b border-border/60 text-muted-foreground font-semibold uppercase">
              <tr>
                <th className="p-4">Product</th>
                <th className="p-4 text-center">Ordered Qty</th>
                <th className="p-4 text-center">Received Qty</th>
                <th className="p-4 text-center">Rejected Qty</th>
                <th className="p-4 text-right">Price ₹</th>
                <th className="p-4 text-right">GST %</th>
                <th className="p-4 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {po.items?.map((item: any) => {
                const lineTotal = item.ordered_qty * item.purchase_price * (1 + (item.gst_rate || 0) / 100);
                return (
                  <tr key={item.id} className="hover:bg-secondary/20 transition">
                    <td className="p-4">
                      <div className="font-bold text-foreground">{item.product?.name || "Product"}</div>
                      <div className="text-[10px] text-muted-foreground">Barcode: {item.product?.barcode || "N/A"}</div>
                    </td>
                    <td className="p-4 text-center font-semibold">{item.ordered_qty}</td>
                    <td className="p-4 text-center text-emerald-400 font-semibold">{item.received_qty || 0}</td>
                    <td className="p-4 text-center text-rose-400 font-semibold">{item.rejected_qty || 0}</td>
                    <td className="p-4 text-right">₹{item.purchase_price}</td>
                    <td className="p-4 text-right">{item.gst_rate}%</td>
                    <td className="p-4 text-right font-bold text-foreground">₹{Math.round(lineTotal).toLocaleString("en-IN")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Timeline Audit Event Stream */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-card/50 border border-border/80 backdrop-blur-md">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Audit & Activity Timeline</h3>
          <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
            {po.timeline?.length === 0 ? (
              <p className="text-xs text-muted-foreground">No timeline events recorded yet.</p>
            ) : (
              po.timeline?.map((ev: any) => (
                <div key={ev.id} className="flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">{ev.description}</p>
                    <span className="text-[10px] text-muted-foreground">
                      By {ev.performed_by || "System"} • {new Date(ev.created_at).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Discussion Comments Thread */}
        <div className="p-6 rounded-2xl bg-card/50 border border-border/80 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              <MessageSquare className="w-4 h-4 text-accent" /> Purchase Discussion & Notes
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 mb-4">
              {po.comments?.length === 0 ? (
                <p className="text-xs text-muted-foreground">No comments posted yet.</p>
              ) : (
                po.comments?.map((c: any) => (
                  <div key={c.id} className="p-3 rounded-xl bg-secondary/30 border border-border/40 text-xs">
                    <div className="flex items-center justify-between font-semibold text-accent mb-1">
                      <span>{c.user_name}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-foreground">{c.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              placeholder="Add a comment or note..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 p-2.5 rounded-xl bg-background border border-border/80 text-xs text-foreground focus:outline-none"
            />
            <button type="submit" className="px-4 py-2.5 rounded-xl bg-accent text-accent-foreground text-xs font-semibold">
              Post
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
