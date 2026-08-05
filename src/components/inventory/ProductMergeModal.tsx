"use client";

import { useState } from "react";
import { X, GitMerge, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { ProductCatalogItem } from "@/lib/inventory/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  products: ProductCatalogItem[];
  storeId: string;
  onMerged: () => void;
}

export function ProductMergeModal({ isOpen, onClose, products, storeId, onMerged }: Props) {
  const [targetId, setTargetId] = useState("");
  const [duplicateIds, setDuplicateIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<{
    targetProduct: string;
    duplicateCount: number;
    currentStock: number;
    mergedStock: number;
    conflicts: string[];
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [merging, setMerging] = useState(false);

  if (!isOpen) return null;

  const handleToggleDuplicate = (id: string) => {
    if (duplicateIds.includes(id)) {
      setDuplicateIds(duplicateIds.filter((item) => item !== id));
    } else {
      setDuplicateIds([...duplicateIds, id]);
    }
  };

  const handleRunPreview = async () => {
    if (!targetId || duplicateIds.length === 0) return;
    setLoadingPreview(true);
    try {
      const res = await fetch("/api/inventory/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          storeId,
          targetProductId: targetId,
          duplicateProductIds: duplicateIds,
        }),
      });
      const data = await res.json();
      setPreview(data);
    } catch (err) {
      alert("Error generating merge preview.");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmMerge = async () => {
    if (!targetId || duplicateIds.length === 0) return;
    setMerging(true);
    try {
      const res = await fetch("/api/inventory/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "merge",
          storeId,
          targetProductId: targetId,
          duplicateProductIds: duplicateIds,
        }),
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        onMerged();
        onClose();
      } else {
        alert(`Merge failed: ${json.error}`);
      }
    } catch (err) {
      alert("Error processing product merge.");
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-background rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-accent" />
            <h3 className="text-sm font-bold text-foreground">Safe Product Merge Engine</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Target Product Selection */}
          <div>
            <label className="block font-semibold text-foreground mb-1">1. Select Target Master Product</label>
            <select
              className="fx-select"
              value={targetId}
              onChange={(e) => {
                setTargetId(e.target.value);
                setPreview(null);
              }}
            >
              <option value="">-- Choose Master Product --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Stock: {(p as unknown as { current_stock?: number }).current_stock || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Duplicates Multi-selection */}
          <div>
            <label className="block font-semibold text-foreground mb-1">2. Select Duplicate Items to Merge In</label>
            <div className="border border-border rounded-lg max-h-36 overflow-y-auto divide-y divide-border p-2">
              {products
                .filter((p) => p.id !== targetId)
                .map((p) => (
                  <label key={p.id} className="flex items-center gap-2 py-1.5 px-2 hover:bg-muted/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={duplicateIds.includes(p.id)}
                      onChange={() => {
                        handleToggleDuplicate(p.id);
                        setPreview(null);
                      }}
                    />
                    <span className="font-medium text-foreground">{p.name}</span>
                    <span className="text-[11px] text-muted-foreground ml-auto">Stock: {(p as unknown as { current_stock?: number }).current_stock || 0}</span>
                  </label>
                ))}
            </div>
          </div>

          <button
            disabled={!targetId || duplicateIds.length === 0 || loadingPreview}
            onClick={handleRunPreview}
            className="w-full fx-btn fx-btn-outline text-xs flex items-center justify-center gap-2 py-2"
          >
            {loadingPreview ? "Checking Conflicts..." : "Generate Merge Preview & Conflict Check"}
          </button>

          {/* Preview Details */}
          {preview && (
            <div className="p-4 bg-muted/20 border border-border rounded-lg space-y-3">
              <div className="flex items-center justify-between text-sm font-bold">
                <span className="text-foreground">Merged Stock Preview:</span>
                <span className="text-emerald-400">{preview.currentStock} → {preview.mergedStock} pcs</span>
              </div>

              {preview.conflicts.length > 0 ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded text-amber-300 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Conflicts Detected
                  </div>
                  {preview.conflicts.map((c, i) => (
                    <div key={i} className="text-[11px]">{c}</div>
                  ))}
                </div>
              ) : (
                <div className="text-emerald-400 font-medium text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Ready for safe merge. Ledger records will be re-pointed to master product.
                </div>
              )}

              <button
                disabled={merging}
                onClick={handleConfirmMerge}
                className="w-full fx-btn fx-btn-primary text-xs flex items-center justify-center gap-2 py-2.5"
              >
                <ArrowRight className="w-4 h-4" /> {merging ? "Merging Products..." : "Confirm & Execute Merge"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
