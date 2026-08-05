"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Building,
  ChevronRight,
} from "lucide-react";

export default function ApprovalCenterPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchApprovals = () => {
    if (!user) return;
    setLoading(true);
    fetch(`/api/procurement/approvals?storeId=${user.id}`)
      .then((res) => res.json())
      .then((res) => {
        setApprovals(res.approvals || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchApprovals();
  }, [user]);

  const handleDecision = async (poId: string, decision: "approved" | "rejected") => {
    if (!user) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/procurement/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: user.id,
          poId,
          decision,
          userId: user.id,
          userName: user.email?.split("@")[0] || "Manager",
        }),
      });

      const json = await res.json();
      if (json.success) {
        fetchApprovals();
      } else {
        alert(json.error || "Approval action failed");
      }
    } catch (err) {
      alert("Error submitting approval decision");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="fx-display text-2xl tracking-tight">Manager Approval Center</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Review high-value purchase orders exceeding auto-approval thresholds before dispatching to suppliers.
        </p>
      </div>

      {/* Approvals List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-muted-foreground">Loading pending approval queue...</div>
      ) : approvals.length === 0 ? (
        <div className="p-12 fx-card text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <h3 className="fx-display text-base font-bold">No Pending Approvals</h3>
          <p className="text-xs text-muted-foreground">All purchase orders are approved or auto-cleared.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map((po) => (
            <div
              key={po.id}
              className="p-6 fx-card shadow-sm backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] fx-eyebrow bg-amber-500/20 text-amber-500 border border-amber-500/30">
                    Pending Manager Review
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Created {new Date(po.created_at).toLocaleDateString("en-IN")}
                  </span>
                </div>
                <h3 className="fx-display text-lg font-bold mt-1">{po.po_number}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Supplier: <span className="font-semibold text-foreground">{po.supplier?.name}</span> • {po.items?.length || 0} Line Items
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="fx-eyebrow text-[10px]">PO Total</span>
                  <p className="fx-display fx-num text-xl font-bold text-accent">₹{Number(po.total_amount || 0).toLocaleString("en-IN")}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDecision(po.id, "approved")}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => handleDecision(po.id, "rejected")}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-bold text-xs transition border border-rose-500/20 flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
