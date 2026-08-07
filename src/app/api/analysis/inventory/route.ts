/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";
import {
  resolveStoreScope,
  categoriesOf,
  stockOf,
} from "@/lib/analysis/store-data";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/analysis/inventory?userId=...&q=...
 *
 * One source of truth for "what does this shop stock", used by the product
 * and category analysis screens for their pickers. Both used to query
 * Supabase directly for `inventory.current_stock`, a column that does not
 * exist, so the selects errored and the pickers were always empty.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const limit = Math.min(Number(searchParams.get("limit")) || 200, 500);

    if (!userId) {
      return Response.json({ error: "userId required" }, { status: 400 });
    }

    const scope = await resolveStoreScope(supabase, userId);

    const matched = q
      ? scope.items.filter(
          (i) =>
            i.product_name?.toLowerCase().includes(q) ||
            (i.category || "").toLowerCase().includes(q)
        )
      : scope.items;

    return Response.json({
      count: scope.items.length,
      scope: scope.source,
      categories: categoriesOf(scope.items),
      items: matched.slice(0, limit).map((i) => ({
        product_name: i.product_name,
        category: i.category,
        current_stock: stockOf(i),
        quantity: stockOf(i),
        unit: i.unit || "pcs",
        price: Number(i.price) || 0,
        reorder_level: i.reorder_level ?? null,
        expiry_date: i.expiry_date ?? null,
        supplier: i.supplier ?? null,
        source: "inventory",
      })),
    });
  } catch (err: any) {
    console.error("Inventory scope error:", err?.message);
    return Response.json(
      { error: err?.message || "Failed to load inventory" },
      { status: 500 }
    );
  }
}
