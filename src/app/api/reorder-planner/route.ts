import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId) return Response.json({ error: "userId required" }, { status: 400 });

    // Get user profile for city
    const { data: profile } = await supabase
      .from("profiles")
      .select("city, state")
      .eq("id", userId)
      .single();

    const city = profile?.city || "Pune";

    // Get inventory for this store
    const { data: inventory } = await supabase
      .from("inventory")
      .select("id, product_name, category, current_stock:quantity, unit, price")
      .eq("store_id", userId);

    if (!inventory?.length) {
      return Response.json({ items: [], summary: { reorderNow: 0, totalCost: 0, avgLeadTime: 0 } });
    }

    // Get demand forecasts for next 7 days
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const next7 = new Date(today);
    next7.setDate(next7.getDate() + 7);
    const next7Str = next7.toISOString().split("T")[0];

    const { data: forecasts } = await supabase
      .from("demand_forecast")
      .select("product_id, predicted_units_sold, date")
      .eq("store_id", 1)
      .gte("date", todayStr)
      .lte("date", next7Str);

    // Get products table for lead_time_days. `product_id` also resolves the
    // forecast rows above, which are keyed by id rather than name.
    const { data: products } = await supabase
      .from("products")
      .select("product_id, product_name, lead_time_days, category");

    // Get historic sales (last 14 days, matched by city)
    const past14 = new Date(today);
    past14.setDate(past14.getDate() - 14);
    const past14Str = past14.toISOString().split("T")[0];

    const { data: historicSales } = await supabase
      .from("historic_sales")
      .select("product_name, quantity_sold, date")
      .eq("city", city)
      .gte("date", past14Str)
      .lte("date", todayStr);

    /* Inventory names are user-typed and rarely match the catalog casing, so
       every lookup below is keyed on a normalized name. */
    const key = (name: unknown) => String(name ?? "").trim().toLowerCase();

    // product_id -> catalog name, so forecast rows can be matched by name.
    const productNameById: Record<string, string> = {};
    const leadTimeMap: Record<string, number> = {};
    products?.forEach((p: any) => {
      productNameById[String(p.product_id)] = key(p.product_name);
      leadTimeMap[key(p.product_name)] = p.lead_time_days || 3;
    });

    // Build lookup maps
    const forecastMap: Record<string, number> = {};
    forecasts?.forEach((f: any) => {
      const name = productNameById[String(f.product_id)];
      if (!name) return;
      forecastMap[name] = (forecastMap[name] || 0) + (f.predicted_units_sold || 0);
    });

    const historicMap: Record<string, number[]> = {};
    historicSales?.forEach((s: any) => {
      const name = key(s.product_name);
      if (!historicMap[name]) historicMap[name] = [];
      historicMap[name].push(s.quantity_sold || 0);
    });

    // Calculate reorder data for each inventory product
    const items = inventory.map((item: any) => {
      const name = key(item.product_name);

      // Daily demand: forecast sum / 7, or historic average
      let dailyDemand = 0;
      let demandSource: "forecast" | "historic" | "estimate";
      if (forecastMap[name]) {
        dailyDemand = forecastMap[name] / 7;
        demandSource = "forecast";
      } else if (historicMap[name]?.length) {
        const total = historicMap[name].reduce((a: number, b: number) => a + b, 0);
        dailyDemand = total / historicMap[name].length;
        demandSource = "historic";
      } else {
        dailyDemand = Math.max(1, Math.round(item.current_stock * 0.05)); // fallback
        demandSource = "estimate";
      }
      // A zero average would make daysUntilReorder divide by zero below.
      dailyDemand = Math.max(dailyDemand, 0.1);

      const leadTimeDays = leadTimeMap[name] || 3;
      const safetyStock = dailyDemand * 2;
      const reorderPoint = (dailyDemand * leadTimeDays) + safetyStock;
      const currentStock = item.current_stock || 0;
      const needsReorder = currentStock <= reorderPoint;
      const daysUntilReorder = needsReorder ? 0 : Math.round((currentStock - reorderPoint) / dailyDemand);

      const reorderDate = new Date(today);
      reorderDate.setDate(reorderDate.getDate() + daysUntilReorder);

      const orderQuantity = Math.max(0, Math.round((dailyDemand * 14) - currentStock + safetyStock));
      const estimatedCost = Math.round(orderQuantity * (item.price || 0));

      let urgency: string;
      if (daysUntilReorder <= 0) urgency = "immediate";
      else if (daysUntilReorder <= 3) urgency = "soon";
      else if (daysUntilReorder <= 7) urgency = "upcoming";
      else urgency = "planned";

      return {
        productName: item.product_name,
        category: item.category,
        currentStock,
        dailyDemand: Math.round(dailyDemand * 10) / 10,
        demandSource,
        leadTimeDays,
        reorderPoint: Math.round(reorderPoint),
        safetyStock: Math.round(safetyStock),
        needsReorder,
        daysUntilReorder,
        reorderDate: reorderDate.toISOString().split("T")[0],
        orderQuantity,
        estimatedCost,
        urgency,
        unit: item.unit || "pcs",
        price: item.price || 0,
      };
    });

    // Sort by urgency priority
    const urgencyOrder: Record<string, number> = { immediate: 0, soon: 1, upcoming: 2, planned: 3 };
    items.sort((a: any, b: any) => (urgencyOrder[a.urgency] ?? 4) - (urgencyOrder[b.urgency] ?? 4));

    // Summary
    const reorderNow = items.filter((i: any) => i.needsReorder).length;
    const totalCost = items.filter((i: any) => i.needsReorder).reduce((s: number, i: any) => s + i.estimatedCost, 0);
    const avgLeadTime = items.length
      ? Math.round((items.reduce((s: number, i: any) => s + i.leadTimeDays, 0) / items.length) * 10) / 10
      : 0;

    /* How many rows are backed by real demand data vs. a stock-based guess —
       the page shows this so the numbers are never mistaken for measured. */
    const demandSources = { forecast: 0, historic: 0, estimate: 0 };
    items.forEach((i: any) => { demandSources[i.demandSource as keyof typeof demandSources]++; });

    return Response.json({
      items,
      summary: { reorderNow, totalCost, avgLeadTime, demandSources },
    });
  } catch (err: any) {
    console.error("Reorder planner error:", err);
    return Response.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
