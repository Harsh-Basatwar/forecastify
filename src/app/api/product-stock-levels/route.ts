/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";
import { resolveStoreScope, stockOf } from "@/lib/analysis/store-data";
import { forecastAll } from "@/lib/analysis/demand-forecast";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/** Lead times by category, in days, until supplier data says otherwise. */
const LEAD_TIME: Record<string, number> = {
  Dairy: 1,
  Beverages: 3,
  Snacks: 3,
  Groceries: 4,
  Electronics: 7,
};
/** Perishables cannot be held as long, whatever the demand says. */
const MAX_COVER_DAYS: Record<string, number> = {
  Dairy: 7,
  Beverages: 21,
  Snacks: 21,
  Groceries: 21,
  Electronics: 45,
};

/**
 * POST /api/product-stock-levels
 *
 * Min/max stock bands per product.
 *
 * The old version asked an LLM to apply a safety-stock formula to data read
 * from a `demand_forecast` table that does not exist. The formula is
 * deterministic, so it is computed here directly from the forecast: no model
 * call, no variance between runs, and the arithmetic is auditable.
 */
export async function POST(request: Request) {
  try {
    const { userId, leadTimeDays } = await request.json();
    if (!userId) return Response.json({ error: "userId required" }, { status: 400 });

    const scope = await resolveStoreScope(supabase, userId);
    if (!scope.items.length) {
      return Response.json({ products: [], message: "No inventory found for this account." });
    }

    const forecasts = await forecastAll(supabase, { horizon: 7, minDays: 5 });
    const byName = new Map(forecasts.map((f) => [f.productName.toLowerCase(), f]));

    const products = scope.items.map((item) => {
      const f = byName.get(item.product_name.toLowerCase());
      const category = item.category || "Other";
      const currentStock = stockOf(item);

      const avgDaily = f ? f.avgDaily : 0;
      const peakDaily = f ? Math.max(...f.daily.map((d) => d.predicted)) : 0;
      const lead = Number(leadTimeDays) || LEAD_TIME[category] || 3;
      const maxCover = MAX_COVER_DAYS[category] || 21;

      /* Safety stock covers demand variability across the lead time.
         Buffer scales with how volatile this product has proved to be. */
      const volatility = f?.mape != null ? Math.min(0.5, f.mape / 100) : 0.2;
      const minStock = Math.max(
        1,
        Math.ceil(avgDaily * lead * (1 + volatility))
      );
      const maxStock = Math.max(
        minStock + 1,
        Math.ceil(Math.max(avgDaily, peakDaily) * maxCover)
      );

      let status: "critical" | "low" | "optimal" | "overstock" = "optimal";
      if (currentStock <= 0) status = "critical";
      else if (currentStock < minStock) status = "low";
      else if (currentStock > maxStock) status = "overstock";

      return {
        name: item.product_name,
        category,
        currentStock,
        unit: item.unit || "pcs",
        price: Number(item.price) || 0,
        minStock,
        maxStock,
        status,
        avgDailyDemand: avgDaily,
        leadTimeDays: lead,
        coverDays: avgDaily > 0 ? +(currentStock / avgDaily).toFixed(1) : null,
        reorderQty: currentStock < minStock ? Math.ceil(maxStock - currentStock) : 0,
        observedDays: f?.observedDays ?? 0,
        days: (f?.daily ?? []).map((d) => ({
          day: d.day,
          date: d.date,
          predicted: d.predicted,
          recommended: Math.round(d.predicted * 1.3),
        })),
      };
    });

    return Response.json({
      products,
      totalProducts: products.length,
      belowMin: products.filter((p) => p.status === "low" || p.status === "critical").length,
      aboveMax: products.filter((p) => p.status === "overstock").length,
      method: "safety stock = avg daily demand x lead time x (1 + backtested error)",
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Product stock levels error:", err?.message, err?.stack);
    return Response.json({ error: err?.message || "Stock level calculation failed" }, { status: 500 });
  }
}
