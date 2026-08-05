"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  PackageCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Calendar,
  Building,
  ArrowRight,
} from "lucide-react";

export default function GoodsReceivedNotePage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const poIdFromQuery = searchParams.get("poId");

  const [loading, setLoading] = useState(true);
  const [openPos, setOpenPos] = useState<any[]>([]);
  const [selectedPoId, setSelectedPoId] = useState(poIdFromQuery || "");
  const [selectedPo, setSelectedPo] = useState<any>(null);

  // GRN Form fields
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [grnItems, setGrnItems] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch(`/api/procurement/purchase-orders?storeId=${user.id}&status=sent`)
      .then((res) => res.json())
      .then((res) => {
        const activePos = res.orders || [];
        setOpenPos(activePos);
        if (!selectedPoId && activePos[0]) {
          setSelectedPoId(activePos[0].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!selectedPoId) return;
    fetch(`/api/procurement/purchase-orders/${selectedPoId}`)
      .then((res) => res.json())
      .then((res) => {
        const po = res.po;
        setSelectedPo(po);
        if (po && po.items) {
          const formatted = po.items.map((item: any) => {
            const pendingQty = Math.max(1, (item.ordered_qty || 0) - (item.received_qty || 0));
            return {
              poItemId: item.id,
              productId: item.product_id,
              productName: item.product?.name || "Product",
              orderedQty: item.ordered_qty,
              batchNumber: `LOT-${Date.now().toString().slice(-4)}`,
              expiryDate: new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0],
              qtyReceived: pendingQty,
              qtyAccepted: pendingQty,
              qtyRejected: 0,
              rejectionReason: "",
              qualityStatus: "pass",
              costPrice: item.purchase_price,
            };
          });
          setGrnItems(formatted);
          setInvoiceAmount(po.total_amount || 0);
        }
      });
  }, [selectedPoId]);

  const handleSubmitGrn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedPo) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/procurement/grn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: user.id,
          poId: selectedPo.id,
          supplierId: selectedPo.supplier_id,
          invoiceNumber,
          invoiceAmount,
          notes,
          items: grnItems,
          userId: user.id,
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert("GRN processed successfully! Stock has been updated via InventoryDomainService.");
        router.push(`/dashboard/procurement/orders/${selectedPo.id}`);
      } else {
        alert(json.error || "Failed to submit GRN.");
      }
    } catch (err) {
      alert("Error submitting GRN quality inspection.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-card/60 border border-border/80 shadow-md backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-accent font-semibold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-accent" /> Receiving & Inspection Authority
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Goods Received Note (GRN) & Quality Check
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Verify shipment quantities, FEFO batch numbers & expiry dates. Approved stock is atomically pushed to InventoryDomainService and logged in the immutable ledger.
          </p>
        </div>
      </div>

      {/* Select PO Header */}
      <div className="p-6 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-md space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Select Active PO to Receive</label>
            <select
              value={selectedPoId}
              onChange={(e) => setSelectedPoId(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-background border border-border/80 text-xs text-foreground focus:outline-none"
            >
              {openPos.length === 0 ? (
                <option value="">No POs ready for receiving</option>
              ) : (
                openPos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.po_number} - {p.supplier?.name} (₹{Number(p.total_amount).toLocaleString("en-IN")})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Vendor Invoice Number</label>
            <input
              type="text"
              placeholder="e.g. INV-994820"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-background border border-border/80 text-xs text-foreground focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Invoice Amount ₹</label>
            <input
              type="number"
              value={invoiceAmount}
              onChange={(e) => setInvoiceAmount(parseFloat(e.target.value) || 0)}
              className="w-full p-2.5 rounded-xl bg-background border border-border/80 text-xs text-foreground focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* GRN Quality Inspection Line Items */}
      {selectedPo && (
        <form onSubmit={handleSubmitGrn} className="space-y-6">
          <div className="rounded-2xl bg-card/50 border border-border/80 overflow-hidden shadow-lg backdrop-blur-md">
            <div className="p-4 bg-secondary/60 border-b border-border flex items-center justify-between">
              <span className="font-semibold text-xs text-foreground uppercase tracking-wider">
                Quality Check Line Items ({grnItems.length})
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold uppercase">
                Stock Authority: InventoryDomainService.receiveStock()
              </span>
            </div>

            <div className="divide-y divide-border/40 p-4 space-y-4">
              {grnItems.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-secondary/20 border border-border/40 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{item.productName}</h4>
                      <span className="text-[10px] text-muted-foreground">Ordered Qty: {item.orderedQty} units</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div>
                        <label className="block text-[10px] text-muted-foreground uppercase">Quality Status</label>
                        <select
                          value={item.qualityStatus}
                          onChange={(e) => {
                            const next = [...grnItems];
                            next[idx].qualityStatus = e.target.value;
                            if (e.target.value === "fail" || e.target.value === "damaged") {
                              next[idx].qtyRejected = next[idx].qtyReceived;
                              next[idx].qtyAccepted = 0;
                            } else if (e.target.value === "pass") {
                              next[idx].qtyAccepted = next[idx].qtyReceived;
                              next[idx].qtyRejected = 0;
                            }
                            setGrnItems(next);
                          }}
                          className="p-1.5 rounded-lg bg-background border border-border text-xs text-foreground"
                        >
                          <option value="pass">Pass (Full Accept)</option>
                          <option value="partial_pass">Partial Pass</option>
                          <option value="fail">Fail (Reject All)</option>
                          <option value="damaged">Damaged Stock</option>
                          <option value="expired">Expired Date</option>
                          <option value="quarantine">Quarantine Inspection</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[10px] text-muted-foreground uppercase">Batch / Lot #</label>
                      <input
                        type="text"
                        value={item.batchNumber}
                        onChange={(e) => {
                          const next = [...grnItems];
                          next[idx].batchNumber = e.target.value;
                          setGrnItems(next);
                        }}
                        className="w-full p-2 rounded-lg bg-background border border-border text-xs text-foreground font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-muted-foreground uppercase">Expiry Date</label>
                      <input
                        type="date"
                        value={item.expiryDate}
                        onChange={(e) => {
                          const next = [...grnItems];
                          next[idx].expiryDate = e.target.value;
                          setGrnItems(next);
                        }}
                        className="w-full p-2 rounded-lg bg-background border border-border text-xs text-foreground"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-muted-foreground uppercase">Received Qty</label>
                      <input
                        type="number"
                        value={item.qtyReceived}
                        onChange={(e) => {
                          const next = [...grnItems];
                          const r = parseInt(e.target.value) || 0;
                          next[idx].qtyReceived = r;
                          next[idx].qtyAccepted = Math.max(0, r - next[idx].qtyRejected);
                          setGrnItems(next);
                        }}
                        className="w-full p-2 rounded-lg bg-background border border-border text-xs text-foreground font-bold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-emerald-400 font-semibold uppercase">Accepted Qty</label>
                      <input
                        type="number"
                        value={item.qtyAccepted}
                        onChange={(e) => {
                          const next = [...grnItems];
                          const a = parseInt(e.target.value) || 0;
                          next[idx].qtyAccepted = a;
                          next[idx].qtyRejected = Math.max(0, next[idx].qtyReceived - a);
                          setGrnItems(next);
                        }}
                        className="w-full p-2 rounded-lg bg-background border border-emerald-500/40 text-xs text-emerald-400 font-bold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-rose-400 font-semibold uppercase">Rejected Qty</label>
                      <input
                        type="number"
                        value={item.qtyRejected}
                        onChange={(e) => {
                          const next = [...grnItems];
                          const rj = parseInt(e.target.value) || 0;
                          next[idx].qtyRejected = rj;
                          next[idx].qtyAccepted = Math.max(0, next[idx].qtyReceived - rj);
                          setGrnItems(next);
                        }}
                        className="w-full p-2 rounded-lg bg-background border border-rose-500/40 text-xs text-rose-400 font-bold"
                      />
                    </div>
                  </div>

                  {item.qtyRejected > 0 && (
                    <div>
                      <input
                        type="text"
                        placeholder="Reason for rejection / damage..."
                        value={item.rejectionReason}
                        onChange={(e) => {
                          const next = [...grnItems];
                          next[idx].rejectionReason = e.target.value;
                          setGrnItems(next);
                        }}
                        className="w-full p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 placeholder:text-rose-400/50"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-lg flex items-center gap-2"
            >
              <PackageCheck className="w-4 h-4" /> Submit GRN & Update Inventory Domain
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
