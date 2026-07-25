import { createClient } from "@supabase/supabase-js";

/* eslint-disable @typescript-eslint/no-explicit-any */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CATEGORY_DEMAND: Record<string, number> = {
  "Dairy & Beverages": 8,
  "Biscuits & Snacks": 7,
  "Tea, Coffee & Breakfast": 5,
  "Staples & Grains": 3,
  "Pulses & Dals": 3,
  "Masala & Spices": 2,
  "Instant Food & Condiments": 4,
  "Personal Care & Household": 1,
  "Oils & Ghee": 1,
};

function estimateDailyDemand(product: any, weather?: any, eventBoost = 0) {
  const category = String(product.category || "");
  const name = String(product.product_name || "").toLowerCase();
  let demand = CATEGORY_DEMAND[category] ?? 2;

  if (/milk|curd|lassi|water|drink|maaza|pepsi|juice|buttermilk/.test(name)) demand += 3;
  if (/biscuit|chips|snack|oreo|parle|kurkure|namkeen/.test(name)) demand += 2;
  if (/rice|atta|sugar|salt|dal|oil/.test(name)) demand += 1;
  if (/shampoo|soap|toothpaste|detergent/.test(name)) demand = Math.max(1, demand - 1);

  const temp = Number(weather?.temp || 0);
  const desc = String(weather?.description || "").toLowerCase();
  if (temp >= 30 && /beverage|dairy/i.test(category)) demand += 3;
  if ((desc.includes("rain") || desc.includes("cloud")) && /tea|breakfast|snack|biscuit|instant/i.test(`${category} ${name}`)) demand += 2;
  demand *= 1 + eventBoost / 100;
  return Math.max(1, Math.round(demand));
}

function buildAlert(product: any, dailyDemand: number, eventBoost = 0) {
  const stock = Math.max(0, Number(product.current_stock || 0));
  const unit = product.unit || "units";
  const daysLeft = dailyDemand > 0 ? stock / dailyDemand : 999;
  const factors = [`Estimated demand ${dailyDemand} ${unit}/day`];
  if (eventBoost > 0) factors.push(`Upcoming event demand +${eventBoost}%`);

  let severity: "critical" | "warning" | "info" | null = null;
  let alertType = "";
  let title = "";
  let message = "";
  let recommendation = "";

  if (stock === 0 || daysLeft < 3) {
    severity = "critical";
    alertType = "stockout";
    title = "Stockout risk";
    message = `${product.product_name} may run out very soon based on current stock and expected demand.`;
    recommendation = `Order at least ${Math.max(1, Math.ceil(dailyDemand * 14 * 1.2 - stock))} ${unit} today.`;
  } else if (daysLeft < 7) {
    severity = "warning";
    alertType = "low_stock";
    title = "Low stock";
    message = `${product.product_name} has less than one week of estimated stock cover.`;
    recommendation = `Add ${Math.max(1, Math.ceil(dailyDemand * 14 * 1.15 - stock))} ${unit} in the next purchase.`;
  } else if (eventBoost > 0 && daysLeft < 14) {
    severity = "warning";
    alertType = "demand_spike";
    title = "Event demand risk";
    message = `${product.product_name} has event-driven demand risk and may need extra buffer.`;
    recommendation = `Keep an event buffer of ${Math.max(1, Math.ceil(dailyDemand * 7 * 0.4))} ${unit}.`;
  } else if (daysLeft > 45 && stock > 40) {
    severity = "info";
    alertType = "overstock";
    title = "Overstock watch";
    message = `${product.product_name} has more than 45 days of estimated stock cover.`;
    recommendation = "Avoid fresh purchase and consider a small offer or shelf push.";
  }

  if (!severity) return null;

  const suggestedRestock = alertType === "overstock" ? 0 : Math.max(0, Math.ceil(dailyDemand * 14 * 1.2 - stock));
  return {
    productName: product.product_name,
    category: product.category || "General",
    currentStock: stock,
    unit,
    severity,
    alertType,
    title,
    message,
    daysUntilStockout: alertType === "overstock" ? 999 : Math.max(0, Math.ceil(daysLeft)),
    demandLevel: dailyDemand >= 7 ? "High" : dailyDemand >= 3 ? "Medium" : "Low",
    estimatedDailyDemand: dailyDemand,
    suggestedRestock,
    recommendation,
    factors,
  };
}

export async function POST(request: Request) {
  try {
    const { userId, weather } = await request.json();
    if (!userId) return Response.json({ error: "userId required" }, { status: 400 });

    const { data: inventory, error: inventoryError } = await supabase
      .from("inventory")
      .select("product_name, category, current_stock, unit, price")
      .eq("store_id", userId);
    if (inventoryError) throw inventoryError;

    if (!inventory?.length) {
      return Response.json({ alerts: [], summary: { critical: 0, warning: 0, info: 0 }, generatedAt: new Date().toISOString() });
    }

    const today = new Date().toISOString().split("T")[0];
    const next14 = new Date();
    next14.setDate(next14.getDate() + 14);
    const { data: events } = await supabase
      .from("regional_events")
      .select("demand_impact_percent, affected_categories, start_date")
      .gte("start_date", today)
      .lte("start_date", next14.toISOString().split("T")[0]);

    const alerts = inventory
      .map(product => {
        const category = String(product.category || "");
        const eventBoost = Math.max(0, ...(events || [])
          .filter(event => Array.isArray(event.affected_categories) && event.affected_categories.some((cat: string) => category.toLowerCase().includes(String(cat).toLowerCase()) || String(cat).toLowerCase().includes(category.toLowerCase())))
          .map(event => Number(event.demand_impact_percent || 0)));
        return buildAlert(product, estimateDailyDemand(product, weather, eventBoost), eventBoost);
      })
      .filter(Boolean) as any[];

    const order = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => {
      const sev = (order[a.severity as keyof typeof order] ?? 3) - (order[b.severity as keyof typeof order] ?? 3);
      if (sev !== 0) return sev;
      return (a.daysUntilStockout || 999) - (b.daysUntilStockout || 999);
    });

    const finalAlerts = alerts.slice(0, 18);
    const summary = {
      critical: finalAlerts.filter(a => a.severity === "critical").length,
      warning: finalAlerts.filter(a => a.severity === "warning").length,
      info: finalAlerts.filter(a => a.severity === "info").length,
    };

    return Response.json({ alerts: finalAlerts, summary, generatedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error("Alerts error:", err.message);
    return Response.json({
      alerts: [],
      summary: { critical: 0, warning: 0, info: 0 },
      error: err.message || "Alerts unavailable",
      generatedAt: new Date().toISOString(),
    });
  }
}
