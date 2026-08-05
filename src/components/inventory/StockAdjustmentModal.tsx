"use client";

import { useState } from "react";
import { X, Layers, Save } from "lucide-react";
import { ProductCatalogItem, AdjustmentType } from "@/lib/inventory/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  product: ProductCatalogItem | null;
  storeId: string;
  onAdjusted: () => void;
}

export function StockAdjustmentModal({ isOpen, onClose, product, storeId, onAdjusted }: Props) {
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>("add");
  const [quantity, setQuantity] = useState("10");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !product) return null;

  const currentStock = (product as unknown as { current_stock?: number }).current_stock ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const rawQty = parseFloat(quantity);
      // Determine sign based on adjustment type
      const isNegativeType = ["remove", "damaged", "expired", "lost"].includes(adjustmentType);
      const quantityChange = isNegativeType ? -Math.abs(rawQty) : Math.abs(rawQty);

      const res = await fetch("/api/inventory/stock-adjustment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          productId: product.id,
          adjustmentType,
          quantityChange,
          reason: reason || `Manual ${adjustmentType} adjustment`,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to adjust stock");
      }

      onAdjusted();
      onClose();
    } catch (err) {
      alert("Error submitting stock adjustment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-background rounded-xl border border-border shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-accent" />
            <h3 className="text-sm font-bold text-foreground">Stock Movement & Adjustment</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <span className="text-muted-foreground">Product:</span>
            <div className="font-bold text-sm text-foreground">{product.name}</div>
            <div className="text-[11px] text-emerald-400 mt-0.5">Current Stock: {currentStock} {(product as unknown as { unit?: string }).unit || "pcs"}</div>
          </div>

          <div>
            <label className="block font-medium mb-1">Movement Type</label>
            <select
              className="fx-select"
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)}
            >
              <option value="add">➕ Stock Purchase / Inflow (Add)</option>
              <option value="remove">➖ Stock Reduction / Outflow (Remove)</option>
              <option value="damaged">⚠️ Damaged Item Removal</option>
              <option value="expired">⏳ Expired Item Disposal</option>
              <option value="lost">🔍 Shrinkage / Lost Item</option>
              <option value="found">📦 Audit Found Item</option>
              <option value="reconciliation">📋 Physical Count Reconciliation</option>
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1">Quantity Change</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              className="fx-input font-bold"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Reason / Notes</label>
            <textarea
              className="fx-textarea"
              rows={2}
              placeholder="Provide reason for auditing ledger..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="fx-btn fx-btn-outline text-xs">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="fx-btn fx-btn-primary text-xs flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5" /> {submitting ? "Updating..." : "Commit Stock Change"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
