"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Clock, Tag, Trash2, CheckCircle2 } from "lucide-react";

interface Props {
  storeId: string;
}

interface ExpiryItem {
  id: string;
  product_name: string;
  expiry_date: string;
  current_stock: number;
  price: number;
  days_left: number;
  suggested_discount_pct: number;
}

export function BatchExpiryManager({ storeId }: Props) {
  const [items, setItems] = useState<ExpiryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpiryData();
  }, [storeId]);

  const fetchExpiryData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory?storeId=${storeId}&limit=100`);
      const json = await res.json();
      const all = json.items || [];

      const now = new Date();
      const expiryList: ExpiryItem[] = [];

      all.forEach((item: Record<string, unknown>) => {
        if (item.expiry_date) {
          const expDate = new Date(item.expiry_date as string);
          const diffMs = expDate.getTime() - now.getTime();
          const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          if (daysLeft <= 45) {
            let discount = 0;
            if (daysLeft <= 0) discount = 100; // Expired
            else if (daysLeft <= 7) discount = 50; // 50% clearance
            else if (daysLeft <= 15) discount = 30; // 30% markdown
            else if (daysLeft <= 30) discount = 15; // 15% markdown

            expiryList.push({
              id: item.id as string,
              product_name: item.product_name as string,
              expiry_date: item.expiry_date as string,
              current_stock: (item.current_stock as number) || 0,
              price: (item.price as number) || 0,
              days_left: daysLeft,
              suggested_discount_pct: discount,
            });
          }
        }
      });

      setItems(expiryList.sort((a, b) => a.days_left - b.days_left));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisposal = async (item: ExpiryItem) => {
    if (!confirm(`Dispose expired stock of ${item.product_name} (${item.current_stock} units)?`)) return;

    try {
      await fetch("/api/inventory/stock-adjustment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          productId: item.id,
          adjustmentType: "expired",
          quantityChange: -item.current_stock,
          reason: "FEFO Batch Expiry Disposal",
        }),
      });

      fetchExpiryData();
    } catch (err) {
      alert("Error processing disposal.");
    }
  };

  if (loading) {
    return <div className="fx-card p-6 text-center text-xs text-muted-foreground">Loading batch & expiry engine...</div>;
  }

  return (
    <div className="fx-card p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> FEFO Expiry Risk & Markdown Suggestions
          </h3>
          <p className="text-xs text-muted-foreground">
            Automated near-expiry alerts and AI price clearance suggestions to prevent dead capital.
          </p>
        </div>
        <span className="fx-badge fx-badge-warning text-xs">{items.length} Risk Items Detected</span>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 text-xs text-emerald-400 flex flex-col items-center gap-2">
          <CheckCircle2 className="w-8 h-8" />
          No immediate expiry risks detected in current inventory batches.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground font-medium uppercase tracking-wider">
                <th className="py-2.5 px-3">Product</th>
                <th className="py-2.5 px-3">Expiry Date</th>
                <th className="py-2.5 px-3">Days Left</th>
                <th className="py-2.5 px-3">Risk Qty</th>
                <th className="py-2.5 px-3">AI Markdown</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => {
                const isExpired = item.days_left <= 0;

                return (
                  <tr key={item.id} className="hover:bg-muted/30">
                    <td className="py-3 px-3 font-semibold text-foreground">{item.product_name}</td>
                    <td className="py-3 px-3 font-mono text-[11px]">{item.expiry_date}</td>
                    <td className="py-3 px-3">
                      <span className={isExpired ? "text-rose-400 font-bold" : "text-amber-400 font-medium"}>
                        {isExpired ? "EXPIRED" : `${item.days_left} Days`}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium">{item.current_stock} pcs</td>
                    <td className="py-3 px-3">
                      {item.suggested_discount_pct > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          <Tag className="w-3 h-3" /> Apply {item.suggested_discount_pct}% Off
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDisposal(item)}
                        className="fx-btn fx-btn-outline text-xs text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Dispose
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
