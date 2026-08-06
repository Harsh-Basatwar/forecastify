/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingCart, ArrowLeft, CheckCircle2, TrendingUp, Send, FileText } from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";

export default function PurchaseAutomationPage() {
  const { callApi } = useStoreAssistant();
  const [smartPOs, setSmartPOs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [created, setCreated] = useState<string | null>(null);

  const loadPOs = async () => {
    setLoading(true);
    const pos = await callApi("purchase.generate");
    if (pos) setSmartPOs(pos);
    setLoading(false);
  };

  useEffect(() => {
    loadPOs();
  }, []);

  const handleApprovePO = async (po: any) => {
    const poId = await callApi("purchase.createDraft", { smartPO: po });
    if (poId) {
      setCreated(`Draft PO created: ${poId}`);
      await callApi("vendor.draft", { poId });
      loadPOs();
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/store-assistant" className="p-2 rounded-lg bg-card hover:bg-accent/10 border border-border text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-accent" /> Purchase Automation
          </h1>
          <p className="text-xs text-muted-foreground">Auto-generated purchase orders with ROI prediction and GST calculation</p>
        </div>
      </div>

      {created && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-between">
          <span>{created}</span>
          <button onClick={() => setCreated(null)}>Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-xs text-muted-foreground">Analyzing demand signals...</div>
      ) : smartPOs.length === 0 ? (
        <div className="fx-card p-12 text-center text-muted-foreground text-xs space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <p>Inventory stock levels are healthy! No purchase orders required today.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {smartPOs.map((po, idx) => (
            <div key={idx} className="fx-card p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
                <div>
                  <span className="text-xs font-bold text-accent uppercase">Recommended Supplier</span>
                  <h2 className="text-lg font-bold">{po.supplierName}</h2>
                  <p className="text-xs text-muted-foreground">{po.justification}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">Total PO Value</span>
                    <div className="text-xl font-black text-foreground">₹{po.totalAmount.toLocaleString("en-IN")}</div>
                  </div>
                  <button
                    onClick={() => handleApprovePO(po)}
                    className="px-5 py-2.5 rounded-xl bg-accent text-accent-foreground font-bold text-xs hover:opacity-90 transition-all shadow-md shadow-accent/20"
                  >
                    Approve & Draft Message
                  </button>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-border/40 text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="py-2">Product</th>
                      <th className="py-2">Current Stock</th>
                      <th className="py-2">Order Qty</th>
                      <th className="py-2">Unit Price</th>
                      <th className="py-2">Total</th>
                      <th className="py-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {po.items.map((item: any) => (
                      <tr key={item.productId}>
                        <td className="py-2.5 font-semibold">{item.productName}</td>
                        <td className="py-2.5">{item.currentStock}</td>
                        <td className="py-2.5 font-bold text-accent">{item.orderQuantity}</td>
                        <td className="py-2.5">₹{item.unitPrice}</td>
                        <td className="py-2.5 font-bold">₹{item.lineTotal.toLocaleString("en-IN")}</td>
                        <td className="py-2.5 text-muted-foreground">{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
