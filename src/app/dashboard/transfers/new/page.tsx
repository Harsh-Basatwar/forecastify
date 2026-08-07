"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowLeftRight, Plus, Trash2, CheckCircle2, Warehouse, Store } from "lucide-react";
import { useOrgStore } from "@/providers/org-store-provider";

export default function NewTransferPage() {
  const router = useRouter();
  const { stores, activeStore } = useOrgStore();

  const [sourceStoreId, setSourceStoreId] = useState(stores[0]?.id || "");
  const [destStoreId, setDestStoreId] = useState(stores[1]?.id || "");
  const [items, setItems] = useState([
    { id: "1", productName: "Amul Butter 500g", requestedQty: 50, batchNumber: "BAT-9920", expiryDate: "2026-10-15" },
  ]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const addItem = () => {
    setItems([
      ...items,
      { id: String(Date.now()), productName: "", requestedQty: 10, batchNumber: "", expiryDate: "" },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Simulate submitting stock transfer to Supabase API
    setTimeout(() => {
      setSubmitting(false);
      router.push("/dashboard/transfers");
    }, 600);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/transfers"
          className="p-2 rounded-xl border border-border bg-card hover:bg-secondary text-muted-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Request Inter-Store Stock Transfer</h1>
          <p className="text-xs text-muted-foreground">Move inventory between store outlets or warehouses</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Stores Selection */}
        <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider text-accent">1. Select Outlets</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Source Store (Dispatching)</label>
              <select
                value={sourceStoreId}
                onChange={(e) => setSourceStoreId(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-secondary/50 border border-border rounded-xl text-foreground focus:outline-none focus:border-accent"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code}) - {s.storeType.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Destination Store (Receiving)</label>
              <select
                value={destStoreId}
                onChange={(e) => setDestStoreId(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-secondary/50 border border-border rounded-xl text-foreground focus:outline-none focus:border-accent"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code}) - {s.storeType.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Transfer Items & Batch Details */}
        <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider text-accent">2. Items & Batch Details</h2>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Add Product
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={item.id} className="p-4 rounded-xl border border-border bg-secondary/30 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">Product Name / SKU</label>
                  <input
                    type="text"
                    placeholder="e.g. Amul Butter 500g"
                    value={item.productName}
                    onChange={(e) => {
                      const updated = [...items];
                      updated[index].productName = e.target.value;
                      setItems(updated);
                    }}
                    className="w-full h-9 px-3 text-xs bg-background border border-border rounded-lg"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={item.requestedQty}
                    onChange={(e) => {
                      const updated = [...items];
                      updated[index].requestedQty = Number(e.target.value);
                      setItems(updated);
                    }}
                    className="w-full h-9 px-3 text-xs bg-background border border-border rounded-lg"
                    required
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">Batch Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. BAT-9920"
                    value={item.batchNumber}
                    onChange={(e) => {
                      const updated = [...items];
                      updated[index].batchNumber = e.target.value;
                      setItems(updated);
                    }}
                    className="w-full h-9 px-3 text-xs bg-background border border-border rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={item.expiryDate}
                    onChange={(e) => {
                      const updated = [...items];
                      updated[index].expiryDate = e.target.value;
                      setItems(updated);
                    }}
                    className="w-full h-9 px-3 text-xs bg-background border border-border rounded-lg"
                  />
                </div>

                <div className="sm:col-span-1 text-right">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transfer Notes */}
        <div className="p-6 rounded-2xl border border-border bg-card space-y-3">
          <label className="block text-xs font-semibold text-muted-foreground">Transfer Reason & Notes</label>
          <textarea
            rows={3}
            placeholder="Reason for transfer e.g. High demand spike at Downtown store"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-3 text-xs bg-secondary/50 border border-border rounded-xl focus:outline-none focus:border-accent"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/dashboard/transfers"
            className="h-10 px-5 rounded-xl border border-border hover:bg-secondary text-xs font-semibold transition-colors flex items-center"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="h-10 px-6 rounded-xl bg-accent text-accent-foreground text-xs font-bold hover:bg-accent/90 transition-all fx-press flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {submitting ? "Submitting..." : "Submit Transfer Request"}
          </button>
        </div>
      </form>
    </div>
  );
}
