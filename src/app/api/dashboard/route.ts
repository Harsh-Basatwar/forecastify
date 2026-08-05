import { createClient } from "@supabase/supabase-js";
import { getOrGenerateNarrative } from "@/lib/ai-narrative";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* eslint-disable @typescript-eslint/no-explicit-any */

function reorderLevel(item: any) {
  const configured = Number(item?.reorder_level || 0);
  if (configured > 0) return configured;
  const category = String(item?.category || "");
  if (category === "Dairy & Beverages") return 24;
  if (category === "Biscuits & Snacks") return 20;
  if (category === "Instant Food & Condiments") return 18;
  if (category === "Tea, Coffee & Breakfast") return 12;
  return 10;
}

function inventoryStatus(item: any) {
  const stock = Number(item?.current_stock || 0);
  const reorder = reorderLevel(item);
  if (stock <= 0) return "critical";
  if (stock < reorder) return "low";
  if (stock > reorder * 5) return "overstock";
  return "optimal";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = body.userId;
    const lang = body.lang || "en";
    if (!userId) return Response.json({ error: "userId required" }, { status: 400 });

    const { data: store } = await supabase.from("profiles")
      .select("full_name, store_name, store_category, store_size, city, state, store_address")
      .eq("id", userId)
      .maybeSingle();

    const city = store?.city || body.city || "";
    const storeState = store?.state || body.state || "";

    const stateToRegion: Record<string, string> = {
      "Maharashtra": "West", "Gujarat": "West", "Goa": "West", "Rajasthan": "West",
      "West Bengal": "East", "Bihar": "East", "Jharkhand": "East", "Odisha": "East",
      "Tamil Nadu": "South", "Kerala": "South", "Karnataka": "South", "Andhra Pradesh": "South", "Telangana": "South",
      "Uttar Pradesh": "North", "Delhi": "North", "Haryana": "North", "Punjab": "North", "Madhya Pradesh": "North",
    };
    const storeRegion = stateToRegion[storeState] || "West";

    // Match user to stores table (PDF-required table)
    let matchedStore: any = null;
    if (city) {
      const { data } = await supabase.from("stores")
        .select("store_id, store_name, city, state, store_type, store_size_sqft")
        .ilike("city", city).limit(1).maybeSingle();
      matchedStore = data;
    }
    const storeId = matchedStore?.store_id || 1;

    // 1. Full inventory
    const { data: inventory } = await supabase.from("inventory")
      .select("*")
      .eq("store_id", userId).order("created_at", { ascending: false });

    const totalSKUs = inventory?.length || 0;
    const criticalItems = inventory?.filter(i => inventoryStatus(i) === "critical").length || 0;
    const lowItems = inventory?.filter(i => inventoryStatus(i) === "low").length || 0;
    const overstockItems = inventory?.filter(i => inventoryStatus(i) === "overstock").length || 0;
    const totalValue = inventory?.reduce((s, i) => s + (i.current_stock * i.price), 0) || 0;

    // Category demand
    const catMap: Record<string, { stock: number; value: number; count: number }> = {};
    inventory?.forEach(i => {
      if (!catMap[i.category]) catMap[i.category] = { stock: 0, value: 0, count: 0 };
      catMap[i.category].stock += i.current_stock;
      catMap[i.category].value += i.current_stock * i.price;
      catMap[i.category].count++;
    });
    const categoryDemand = Object.entries(catMap)
      .map(([cat, d]) => ({ category: cat, stock: d.stock, value: Math.round(d.value), products: d.count }))
      .sort((a, b) => b.stock - a.stock).slice(0, 8);

    // 2. Recent products
    const recentProducts = (inventory || []).slice(0, 10).map(i => ({
      name: i.product_name, category: i.category, quantity: i.current_stock, unit: i.unit,
      price: i.price, brand: i.brand,
      status: inventoryStatus(i),
    }));

    // 3. Inventory sorted views
    const byLowQty = [...(inventory || [])].sort((a, b) => a.current_stock - b.current_stock).slice(0, 10).map(i => ({
      name: i.product_name, category: i.category, quantity: i.current_stock, unit: i.unit, price: i.price,
      status: inventoryStatus(i),
    }));
    const byHighPrice = [...(inventory || [])].sort((a, b) => (b.current_stock * b.price) - (a.current_stock * a.price)).slice(0, 10).map(i => ({
      name: i.product_name, category: i.category, quantity: i.current_stock, unit: i.unit, price: i.price,
      totalValue: Math.round(i.current_stock * i.price),
    }));

    // 4. Demand forecast (next 7 days)
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const next7end = new Date(now); next7end.setDate(next7end.getDate() + 7);
    const { data: forecasts } = await supabase.from("demand_forecast")
      .select("date, product_id, predicted_units_sold, recommended_inventory_level, confidence")
      .eq("store_id", storeId).gte("date", today).lte("date", next7end.toISOString().split("T")[0]);

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const forecastByDay: Record<string, { predicted: number; recommended: number; count: number; date: string }> = {};
    forecasts?.forEach(f => {
      const key = f.date; // use date as key for proper ordering
      if (!forecastByDay[key]) forecastByDay[key] = { predicted: 0, recommended: 0, count: 0, date: f.date };
      forecastByDay[key].predicted += f.predicted_units_sold;
      forecastByDay[key].recommended += f.recommended_inventory_level;
      forecastByDay[key].count++;
    });

    let salesForecast = Object.entries(forecastByDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, v]) => {
        const d = new Date(v.date);
        return {
          day: dayNames[d.getDay()],
          date: v.date,
          predicted: Math.round(v.predicted),
          recommended: Math.round(v.recommended),
          productCount: v.count,
        };
      });

    // 5. Products info
    const { data: allProducts } = await supabase.from("products").select("product_id, product_name, category, mrp, brand");
    const productInfoMap: Record<number, any> = {};
    const productNameMap: Record<number, string> = {};
    allProducts?.forEach(p => { productInfoMap[p.product_id] = p; productNameMap[p.product_id] = p.product_name; });

    // Top demanded products
    const demandByProduct: Record<number, number> = {};
    forecasts?.forEach(f => { demandByProduct[f.product_id] = (demandByProduct[f.product_id] || 0) + f.predicted_units_sold; });
    let topDemandProducts = Object.entries(demandByProduct)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([pid, demand]) => {
        const p = productInfoMap[Number(pid)];
        const inv = inventory?.find(i => i.product_name === p?.product_name);
        const dailyD = Math.round(demand / 7);
        return {
          name: p?.product_name || `Product #${pid}`, category: p?.category || "?",
          brand: p?.brand || "?", weeklyDemand: Math.round(demand), dailyDemand: dailyD,
          currentStock: inv?.current_stock || 0, unit: inv?.unit || "pcs",
          daysOfStock: dailyD > 0 ? Math.round((inv?.current_stock || 0) / dailyD) : 0,
          price: p?.mrp || inv?.price || 0,
          gap: inv ? Math.round(demand * 1.2) - inv.current_stock : Math.round(demand * 1.2),
        };
      });

    if (!topDemandProducts.length) {
      topDemandProducts = [...(inventory || [])]
        .sort((a, b) => {
          const statusWeight: Record<string, number> = { critical: 4, low: 3, optimal: 2, overstock: 1 };
          return (statusWeight[inventoryStatus(b)] - statusWeight[inventoryStatus(a)]) ||
            (reorderLevel(b) - reorderLevel(a)) ||
            (Number(a.current_stock || 0) - Number(b.current_stock || 0));
        })
        .slice(0, 10)
        .map((i) => {
          const reorder = reorderLevel(i);
          const dailyDemand = Math.max(1, Math.ceil(reorder / 7));
          return {
            name: i.product_name,
            category: i.category,
            brand: i.brand || "",
            weeklyDemand: dailyDemand * 7,
            dailyDemand,
            currentStock: i.current_stock || 0,
            unit: i.unit || "units",
            daysOfStock: i.current_stock > 0 ? Math.floor(i.current_stock / dailyDemand) : 0,
            price: i.price || 0,
            gap: Math.max(0, reorder * 2 - Number(i.current_stock || 0)),
            source: "inventory_reorder_signal",
          };
        });
    }

    // 6. Historic sales — last 14 days for proper matching
    const last14Start = new Date(now); last14Start.setDate(last14Start.getDate() - 14);
    const { data: recentSales } = await supabase.from("historic_sales")
      .select("date, day_of_week, quantity_sold, product_name, category, temperature, weather_condition, is_weekend, is_festival, festival_name")
      .eq("city", city).gte("date", last14Start.toISOString().split("T")[0])
      .order("date", { ascending: true });

    // If no data for this city, try without city filter
    let salesData = recentSales;
    if (!salesData?.length) {
      const { data: fallback } = await supabase.from("historic_sales")
        .select("date, day_of_week, quantity_sold, product_name, category, temperature, weather_condition, is_weekend, is_festival, festival_name")
        .gte("date", last14Start.toISOString().split("T")[0])
        .order("date", { ascending: true }).limit(500);
      salesData = fallback;
    }

    // Group by day_of_week (full name -> 3-letter)
    const historicByDay: Record<string, { total: number; count: number }> = {};
    salesData?.forEach(s => {
      const day = s.day_of_week?.slice(0, 3) || "?";
      if (!historicByDay[day]) historicByDay[day] = { total: 0, count: 0 };
      historicByDay[day].total += s.quantity_sold;
      historicByDay[day].count++;
    });

    // Also group by date for the last 7 days
    const last7Start = new Date(now); last7Start.setDate(last7Start.getDate() - 7);
    const historicByDate: Record<string, number> = {};
    salesData?.forEach(s => {
      if (s.date >= last7Start.toISOString().split("T")[0]) {
        historicByDate[s.date] = (historicByDate[s.date] || 0) + s.quantity_sold;
      }
    });

    // Build last week data for chart (7 days before forecast starts)
    const lastWeekData: { day: string; date: string; sales: number }[] = [];
    for (let i = 7; i >= 1; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayStr = dayNames[d.getDay()];
      const daySales = historicByDate[dateStr] || 0;
      // If no data for exact date, use avg for that day_of_week
      const h = historicByDay[dayStr];
      lastWeekData.push({
        day: dayStr, date: dateStr,
        sales: daySales > 0 ? daySales : (h ? Math.round(h.total / h.count) : 0),
      });
    }

    // Total last week sales
    const totalLastWeek = lastWeekData.reduce((s, d) => s + d.sales, 0);

    if (!salesForecast.length) {
      const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const averageDailySales = lastWeekData.length
        ? Math.round(totalLastWeek / Math.max(1, lastWeekData.length))
        : 0;
      salesForecast = Array.from({ length: 7 }).map((_, index) => {
        const d = new Date(now);
        d.setDate(d.getDate() + index);
        const day = dayNames[d.getDay()];
        const historic = historicByDay[day];
        const predicted = historic ? Math.round(historic.total / historic.count) : averageDailySales;
        return {
          day,
          date: localDate(d),
          predicted,
          recommended: Math.round(predicted * 1.15),
          productCount: topDemandProducts.length,
          source: "historic_sales_reorder_fallback",
        };
      });
    }
    if (salesForecast.length && salesForecast.every((item: any) => Number(item.predicted || 0) === 0)) {
      const reorderDaily = topDemandProducts.reduce((sum: number, item: any) => sum + Number(item.dailyDemand || 0), 0);
      const averageDailySales = totalLastWeek > 0
        ? Math.round(totalLastWeek / Math.max(1, lastWeekData.length))
        : 0;
      const fallbackDaily = Math.max(1, Math.round(reorderDaily || averageDailySales || (criticalItems * 2) || (lowItems / 2) || 8));
      const indiaParts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date());
      const part = (type: string) => Number(indiaParts.find((entry) => entry.type === type)?.value || 1);
      const indiaNow = new Date(part("year"), part("month") - 1, part("day"));
      const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      salesForecast = salesForecast.map((item: any, index: number) => {
        const d = new Date(indiaNow);
        d.setDate(d.getDate() + index);
        const day = dayNames[d.getDay()];
        const weekendLift = ["Sat", "Sun"].includes(day) ? 1.15 : 1;
        const predicted = Math.max(1, Math.round(fallbackDaily * weekendLift * (1 + index * 0.02)));
        return {
          ...item,
          day,
          date: localDate(d),
          predicted,
          recommended: Math.ceil(predicted * 1.15),
          productCount: item.productCount || topDemandProducts.length,
          source: "live_inventory_reorder_fallback",
        };
      });
    }

    // Merge forecast with last week's same-day average
    const forecastVsHistoric = salesForecast.map(f => {
      const h = historicByDay[f.day];
      const lastWeekAvg = h ? Math.round(h.total / h.count) : 0;
      return { ...f, actual: lastWeekAvg || null };
    });

    // 7. Weather impact
    const weatherImpact: { condition: string; avgSales: number; count: number }[] = [];
    const weatherGroups: Record<string, { total: number; count: number }> = {};
    salesData?.forEach(s => {
      const cond = s.weather_condition || "Unknown";
      if (!weatherGroups[cond]) weatherGroups[cond] = { total: 0, count: 0 };
      weatherGroups[cond].total += s.quantity_sold;
      weatherGroups[cond].count++;
    });
    Object.entries(weatherGroups).forEach(([cond, d]) => {
      weatherImpact.push({ condition: cond, avgSales: Math.round(d.total / d.count), count: d.count });
    });
    weatherImpact.sort((a, b) => b.avgSales - a.avgSales);

    const weekendSales = salesData?.filter(s => s.is_weekend) || [];
    const weekdaySales = salesData?.filter(s => !s.is_weekend) || [];
    const avgWeekendSales = weekendSales.length ? Math.round(weekendSales.reduce((s, r) => s + r.quantity_sold, 0) / weekendSales.length) : 0;
    const avgWeekdaySales = weekdaySales.length ? Math.round(weekdaySales.reduce((s, r) => s + r.quantity_sold, 0) / weekdaySales.length) : 0;

    const hotDaySales = salesData?.filter(s => s.temperature && s.temperature > 35) || [];
    const coldDaySales = salesData?.filter(s => s.temperature && s.temperature < 20) || [];
    const avgHotSales = hotDaySales.length ? Math.round(hotDaySales.reduce((s, r) => s + r.quantity_sold, 0) / hotDaySales.length) : 0;
    const avgColdSales = coldDaySales.length ? Math.round(coldDaySales.reduce((s, r) => s + r.quantity_sold, 0) / coldDaySales.length) : 0;

    // 8. Promotions
    const promoLastMonth = new Date(now); promoLastMonth.setDate(promoLastMonth.getDate() - 30);
    const { data: activePromos } = await supabase.from("promotions")
      .select("date, product_id, promo_type, discount_pct, campaign_name")
      .gte("date", promoLastMonth.toISOString().split("T")[0])
      .order("date", { ascending: false }).limit(20);
    const promotions = activePromos?.map(p => ({
      date: p.date, product: productNameMap[p.product_id] || `Product #${p.product_id}`,
      type: p.promo_type, discount: p.discount_pct, campaign: p.campaign_name,
    })) || [];
    const promoTypeSummary: Record<string, { count: number; avgDiscount: number }> = {};
    activePromos?.forEach(p => {
      if (!promoTypeSummary[p.promo_type]) promoTypeSummary[p.promo_type] = { count: 0, avgDiscount: 0 };
      promoTypeSummary[p.promo_type].count++;
      promoTypeSummary[p.promo_type].avgDiscount += p.discount_pct;
    });
    const promotionImpact = Object.entries(promoTypeSummary).map(([type, d]) => ({
      type, count: d.count, avgDiscount: Math.round(d.avgDiscount / d.count),
    }));

    // 9. Events
    const next14 = new Date(now); next14.setDate(next14.getDate() + 14);
    const { data: allEvents } = await supabase.from("regional_events")
      .select("event_name, start_date, demand_impact_percent, affected_categories, event_type, is_national, region")
      .gte("start_date", today).lte("start_date", next14.toISOString().split("T")[0]).order("start_date");
    const events = allEvents?.filter(e => e.is_national || !e.region || e.region === "All India" || e.region === storeRegion) || [];

    // 10. Realtime signals
    const signalsSince = new Date(now); signalsSince.setHours(signalsSince.getHours() - 24);
    const { data: signals } = await supabase.from("realtime_signals")
      .select("timestamp, product_id, signal_type, signal_strength, notes")
      .gte("timestamp", signalsSince.toISOString()).order("timestamp", { ascending: false }).limit(5);
    const realtimeSignals = signals?.map(s => ({
      time: s.timestamp, product: productNameMap[s.product_id] || `Product #${s.product_id}`,
      type: s.signal_type, strength: s.signal_strength, notes: s.notes,
    })) || [];

    // 11. Risk — per-product stockout probability + demand volatility
    // Calculate daily demand from forecast per product
    const dailyDemandByProduct: Record<string, number> = {};
    topDemandProducts.forEach(p => { dailyDemandByProduct[p.name.toLowerCase()] = p.dailyDemand; });

    // Stockout risk: products where stock / daily_demand < 3 days
    const stockoutProducts = (inventory || []).map(i => {
      const forecastDemand = dailyDemandByProduct[i.product_name.toLowerCase()] || 0;
      const itemReorder = reorderLevel(i);
      const dailyDemand = forecastDemand > 0 ? forecastDemand : Math.max(1, Math.ceil(itemReorder / 7));
      const daysLeft = i.current_stock > 0 && dailyDemand > 0 ? Math.floor(i.current_stock / dailyDemand) : 0;
      const probability = daysLeft <= 1 ? 95 : daysLeft <= 2 ? 80 : daysLeft <= 3 ? 60 : daysLeft <= 5 ? 30 : 5;
      return {
        name: i.product_name, category: i.category, currentStock: i.current_stock, unit: i.unit,
        dailyDemand, daysLeft, probability, price: i.price, reorderLevel: itemReorder,
        risk: probability >= 70 ? "high" : probability >= 40 ? "medium" : "low",
      };
    }).sort((a, b) => b.probability - a.probability);

    const stockoutRisk = stockoutProducts.filter(p => p.daysLeft < 3).length;

    // Demand volatility per product from historic data
    const volatilityByProduct: Record<string, { sales: number[] }> = {};
    salesData?.forEach(s => {
      const key = s.product_name?.toLowerCase() || "";
      if (!volatilityByProduct[key]) volatilityByProduct[key] = { sales: [] };
      volatilityByProduct[key].sales.push(s.quantity_sold);
    });

    const volatilityProducts = Object.entries(volatilityByProduct).map(([name, d]) => {
      const mean = d.sales.reduce((s, v) => s + v, 0) / d.sales.length;
      const variance = d.sales.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / d.sales.length;
      const cv = mean > 0 ? Math.round(Math.sqrt(variance) / mean * 100) : 0;
      return {
        name: name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        avgSales: Math.round(mean),
        volatility: cv,
        dataPoints: d.sales.length,
        level: cv > 40 ? "high" : cv > 20 ? "medium" : "low",
      };
    }).sort((a, b) => b.volatility - a.volatility);

    const demandVolatility = salesData?.length
      ? (() => {
          const daily = Object.values(historicByDay).map(d => Math.round(d.total / d.count));
          if (!daily.length) return 0;
          const mean = daily.reduce((s, v) => s + v, 0) / daily.length;
          if (mean === 0) return 0;
          const variance = daily.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / daily.length;
          return Math.round(Math.sqrt(variance) / mean * 100);
        })() : 0;

    // Revenue
    const totalForecastDemand = forecasts?.length
      ? forecasts.reduce((s, f) => s + f.predicted_units_sold, 0)
      : salesForecast.reduce((s, f) => s + (f.predicted || 0), 0);
    const demandTrend = totalLastWeek > 0
      ? Math.round(((totalForecastDemand - totalLastWeek) / totalLastWeek) * 100) : 0;

    const productPriceMap: Record<number, number> = {};
    allProducts?.forEach(p => { productPriceMap[p.product_id] = p.mrp || 0; });
    inventory?.forEach(i => {
      const mp = allProducts?.find(p => p.product_name === i.product_name);
      if (mp && !productPriceMap[mp.product_id]) productPriceMap[mp.product_id] = i.price || 0;
    });
    const averageInventoryPrice = inventory?.length
      ? inventory.reduce((sum, item) => sum + Number(item.price || 0), 0) / inventory.length
      : 0;
    const predictedRevenue = forecasts?.length
      ? forecasts.reduce((sum, f) => sum + (f.predicted_units_sold * (productPriceMap[f.product_id] || 0)), 0)
      : totalForecastDemand * averageInventoryPrice;

    const avgConfidence = forecasts?.length
      ? Math.round((forecasts.reduce((s, f) => s + (f.confidence || 0.75), 0) / forecasts.length) * 100)
      : (salesData?.length ? 65 : 0);

    // Weather data from database (weather_history table — PDF's "weather" table)
    const last7W = new Date(now); last7W.setDate(last7W.getDate() - 7);
    const { data: dbWeatherData } = await supabase.from("weather_history")
      .select("date, avg_temp, max_temp, min_temp, humidity, weather_condition, rainfall_mm")
      .eq("city", city).gte("date", last7W.toISOString().split("T")[0])
      .order("date", { ascending: false }).limit(7);

    // Test inputs — records the system must predict (test_input table)
    const { data: testInputs } = await supabase.from("test_input")
      .select("date, store_id, product_id")
      .eq("store_id", storeId).gte("date", today).order("date");
    const testFulfilled = testInputs?.filter(ti =>
      forecasts?.some(f => f.date === ti.date && f.product_id === ti.product_id)
    ).length || 0;

    // Per-product 7-day forecast with min/max/current for the product selector chart
    const perProductForecast: any[] = [];
    const forecastByProduct: Record<number, { days: { day: string; date: string; predicted: number; recommended: number }[]; total: number }> = {};
    forecasts?.forEach(f => {
      if (!forecastByProduct[f.product_id]) forecastByProduct[f.product_id] = { days: [], total: 0 };
      const d = new Date(f.date);
      forecastByProduct[f.product_id].days.push({
        day: dayNames[d.getDay()],
        date: f.date,
        predicted: Math.round(f.predicted_units_sold),
        recommended: Math.round(f.recommended_inventory_level),
      });
      forecastByProduct[f.product_id].total += f.predicted_units_sold;
    });
    Object.entries(forecastByProduct).forEach(([pidStr, fData]) => {
      const pid = Number(pidStr);
      const p = productInfoMap[pid];
      if (!p) return;
      const inv = inventory?.find(i => i.product_name === p.product_name);
      const dailyAvg = Math.round(fData.total / 7);
      // Calculate min/max from forecast demand data
      const minStock = Math.max(1, Math.round(dailyAvg * 3)); // 3 days safety stock
      const maxStock = Math.max(minStock + 5, Math.round(dailyAvg * 14)); // 2 weeks max
      fData.days.sort((a, b) => a.date.localeCompare(b.date));
      perProductForecast.push({
        name: p.product_name,
        category: p.category || "",
        currentStock: inv?.current_stock || 0,
        unit: inv?.unit || "pcs",
        minStock,
        maxStock,
        days: fData.days,
      });
    });

    // Query external_events table
    let extEvents: any[] = [];
    try {
      const { data } = await supabase.from("external_events")
        .select("event_name, event_type, start_date, end_date, impact_score")
        .gte("end_date", today)
        .order("start_date");
      extEvents = data || [];
    } catch (e) {
      console.warn("Error loading external_events:", e);
    }

    // Dynamic Shopkeeper Actions
    const todayDate = new Date(today);
    const expiringCount = inventory?.filter(i => {
      if (!i.expiry_date) return false;
      const exp = new Date(i.expiry_date);
      const diff = Math.ceil((exp.getTime() - todayDate.getTime()) / (1000 * 3600 * 24));
      return diff >= 0 && diff <= 7;
    }).length || 0;

    const todaysActions: string[] = [];
    stockoutProducts.slice(0, 3).forEach(p => {
      if (p.daysLeft <= 2) {
        todaysActions.push(`Critical stock: ${p.name} may run out in ${p.daysLeft} days`);
      } else if (p.daysLeft <= 4) {
        todaysActions.push(`Low stock: order more ${p.name} soon`);
      }
    });

    const slowMovingItems = inventory
      ?.filter(i => inventoryStatus(i) === "overstock")
      .sort((a, b) => (b.current_stock * b.price) - (a.current_stock * a.price))
      .slice(0, 2) || [];
    slowMovingItems.forEach(item => {
      todaysActions.push(`High stock: ${item.product_name} has ${item.current_stock} ${item.unit || "units"} in inventory`);
    });

    if (expiringCount > 0) {
      todaysActions.push(`${expiringCount} product${expiringCount > 1 ? 's' : ''} expiring this week`);
    }
    if (todaysActions.length === 0) {
      todaysActions.push("Store is balanced today based on current stock and expiry checks.");
    }

    // AI Shopkeeper Advice
    let shopkeeperAdvice = {
      title: "Weather record unavailable",
      content: "No recent database weather record was found for this store location.",
      action: "Suggested Action: Use the order and slow-moving lists as the primary inventory signals today."
    };
    const latestDbW = dbWeatherData?.[0];
    if (latestDbW) {
      const cond = latestDbW.weather_condition?.toLowerCase() || "";
      const temp = latestDbW.avg_temp || 30;
      if (cond.includes("rain") || cond.includes("drizzle") || cond.includes("shower")) {
        shopkeeperAdvice = {
          title: "Rainy weather expected",
          content: "Rain expected. Tea, coffee, and quick-snacks (biscuits) usually sell more.",
          action: "Suggested Action: Keep extra stock of tea and biscuits."
        };
      } else if (temp > 35) {
        shopkeeperAdvice = {
          title: "Hot weather expected",
          content: "Hot day expected. Ice creams, cold drinks, juices, and curd will be in high demand.",
          action: "Suggested Action: Keep cold drinks fridge fully loaded."
        };
      } else if (temp < 20) {
        shopkeeperAdvice = {
          title: "Cold weather expected",
          content: "Cold weather expected. Tea, coffee, and biscuits may sell more.",
          action: "Suggested Action: Increase stock by 10%."
        };
      }
    }

    // Products to Order List
    const orderList = stockoutProducts
      .filter((p: any) => p.daysLeft < 7)
      .slice(0, 10)
      .map((p: any) => {
        const targetStock = Math.max(p.reorderLevel * 2, Math.round(p.dailyDemand * 14));
        const gap = Math.max(p.reorderLevel, targetStock - p.currentStock);
        let reason = "Regular weekly stock need";
        if (p.daysLeft <= 2) reason = "Urgent: running out in less than 2 days!";
        else if (p.daysLeft <= 4) reason = "Attention: low stock level";
        
        return {
          name: p.name,
          currentStock: p.currentStock,
          unit: p.unit,
          daysLeft: p.daysLeft,
          recommendedQty: gap,
          reason
        };
      });

    // Products Not Selling List
    const lastSaleByProduct = new Map<string, string>();
    salesData?.forEach((sale) => {
      const key = String(sale.product_name || "").toLowerCase();
      if (!key || !sale.date) return;
      const existing = lastSaleByProduct.get(key);
      if (!existing || sale.date > existing) lastSaleByProduct.set(key, sale.date);
    });

    const slowMoving = (inventory || [])
      .map(i => {
        const forecastDemand = dailyDemandByProduct[i.product_name.toLowerCase()] || 0;
        const lastSaleDate = lastSaleByProduct.get(i.product_name.toLowerCase()) || null;
        const daysWithoutSale = lastSaleDate
          ? Math.max(0, Math.floor((todayDate.getTime() - new Date(lastSaleDate).getTime()) / (1000 * 3600 * 24)))
          : null;
        const moneyBlocked = Math.round(i.current_stock * i.price);
        return {
          name: i.product_name,
          category: i.category,
          quantity: i.current_stock,
          unit: i.unit,
          reorderLevel: reorderLevel(i),
          forecastDemand,
          lastSaleDate,
          daysWithoutSale,
          salesSignal: lastSaleDate
            ? `${daysWithoutSale} days since last sale`
            : "No matching recent sales record",
          moneyBlocked
        };
      })
      .filter(item =>
        item.quantity >= Math.max(item.reorderLevel * 3, 50) &&
        (item.forecastDemand === 0 || (item.daysWithoutSale !== null && item.daysWithoutSale >= 7))
      )
      .sort((a, b) => b.moneyBlocked - a.moneyBlocked)
      .slice(0, 5);

    const totalMoneyStuck = slowMoving.reduce((sum, item) => sum + item.moneyBlocked, 0);

    // Business Health Score
    const invHealth = Math.max(40, 100 - (criticalItems * 5) - (lowItems * 2));
    const expHealth = Math.max(50, 100 - (expiringCount * 10));
    const trendHealth = Math.min(100, Math.max(50, 90 + (demandTrend > 0 ? 10 : demandTrend < -10 ? -15 : 0)));
    const overallStoreHealth = Math.round((invHealth + expHealth + trendHealth) / 3);

    // Generate AI Narrative
    const resolvedStoreName = store?.store_name || matchedStore?.store_name || "Store";
    const resolvedLocation = [city, storeState].filter(Boolean).join(", ") || store?.store_address || "store location not configured";
    const externalSummary = extEvents.map(e => `${e.event_name} (${e.event_type || "event"}, impact ${e.impact_score ?? "n/a"})`).join("; ") ||
      events.map(e => `${e.event_name} (${e.event_type || "event"}, +${e.demand_impact_percent || 0}%)`).join("; ") ||
      "No upcoming external event recorded for this store area";
    const signalSummary = realtimeSignals.slice(0, 3).map(s => `${s.product}: ${s.notes || s.type}`).join("; ") ||
      "No realtime anomaly signal recorded in the last 24 hours";
    const aiNarrative = await getOrGenerateNarrative(
      userId,
      resolvedStoreName,
      resolvedLocation,
      `${totalSKUs} products, total value ₹${totalValue}, ${criticalItems} critical items, ${lowItems} low items`,
      `7-day predicted sales expected to be ${totalForecastDemand} units, last week actual was ${totalLastWeek} units, trend is ${demandTrend > 0 ? '+' : ''}${demandTrend}%`,
      latestDbW
        ? `Recent weather record: avg ${latestDbW.avg_temp}°C, max ${latestDbW.max_temp}°C, ${latestDbW.weather_condition}, rainfall ${latestDbW.rainfall_mm || 0} mm`
        : `Weather sales pattern: hot-day avg ${avgHotSales}, cold-day avg ${avgColdSales}, weekend avg ${avgWeekendSales}`,
      externalSummary,
      signalSummary,
      lang,
      /* Use the once-a-day cache in ai_narratives. Forcing a refresh here made
         every dashboard load pay for a Groq call and insert a duplicate row,
         which is also why the narrative changed on every navigation. */
      false
    );

    const sinceOneHour = new Date(now);
    sinceOneHour.setHours(sinceOneHour.getHours() - 1);
    const { data: recentActivities } = await supabase
      .from("activity_logs")
      .select("activity_type, activity_title, created_at")
      .eq("user_id", userId)
      .gte("created_at", sinceOneHour.toISOString())
      .order("created_at", { ascending: false })
      .limit(12);

    const marketTone = demandTrend > 5 || events.length > 0
      ? "Positive"
      : demandTrend < -8 || criticalItems > 5
      ? "Negative"
      : "Neutral";
    const forecast7 = Math.round(totalForecastDemand);
    const trendFactor = 1 + Math.max(-0.25, Math.min(0.25, demandTrend / 100));
    const forecastSnapshot = {
      sevenDay: forecast7,
      fourteenDay: Math.round(forecast7 * 2 * trendFactor),
      thirtyDay: Math.round((forecast7 / 7) * 30 * trendFactor),
      confidence: avgConfidence,
      validationGap: Math.abs(Math.round((totalForecastDemand || 0) - (totalLastWeek || 0))),
    };
    const eventImpactCards = [...events, ...extEvents].slice(0, 4).map((event: any) => ({
      name: event.event_name || event.title || "External event",
      type: event.event_type || "event",
      date: event.start_date || "",
      affectsGroceryDemand: Number(event.demand_impact_percent || event.impact_score || 0) !== 0 || Boolean(event.affected_categories?.length),
      confidence: Math.min(96, Math.max(52, Math.round(Math.abs(Number(event.demand_impact_percent || event.impact_score || 0)) || 68))),
      affectedCategories: event.affected_categories || [],
      impactLevel: Number(event.demand_impact_percent || 0) >= 15 || Number(event.impact_score || 0) >= 0.7 ? "High" : "Medium",
    }));
    const weatherImpactProducts = topDemandProducts.slice(0, 5).map((product: any) => ({
      product: product.name,
      category: product.category,
      expectedDemandChange: product.gap > 0 ? `+${Math.min(35, Math.max(5, product.dailyDemand * 2))}%` : "Stable",
      reason: latestDbW
        ? `${latestDbW.weather_condition || "Weather"} at ${latestDbW.avg_temp || "current"}C paired with forecast demand`
        : "Forecast demand paired with current stock position",
    }));
    const modelUtilization = {
      salesStory: {
        model: "Business narrative",
        inputs: ["Forecast table", "Weather data", "Event data", "Inventory signals"],
        whatHappened: aiNarrative.salesStory,
        whyItHappened: aiNarrative.futureExpectation,
        whatToDo: aiNarrative.recommendation,
      },
      todaysActions: {
        model: "Demand versus inventory rules",
        actions: todaysActions.slice(0, 5),
        reason: "Generated from forecast demand, reorder levels, expiry windows, and inventory status.",
      },
      marketSentiment: {
        model: "Market mood check",
        status: marketTone,
        inputs: ["Retail signals", "Inflation/supply proxy from stock risk", "Local events"],
        groqImpact: marketTone === "Positive"
          ? "Demand conditions are supportive; prepare stock for fast-moving categories."
          : marketTone === "Negative"
          ? "Risk is defensive; prioritize essentials and avoid adding slow-moving stock."
          : "Market signal is balanced; focus on proven reorder items.",
      },
      upcomingEvents: {
        model: "Event relevance check",
        events: eventImpactCards,
      },
      jarvisMemory: {
        model: "Store memory",
        activities: (recentActivities || []).map((activity: any) => ({
          type: activity.activity_type,
          title: activity.activity_title,
          time: activity.created_at,
        })),
        output: recentActivities?.length
          ? `Today you completed ${recentActivities.length} tracked action${recentActivities.length === 1 ? "" : "s"}.`
          : "No tracked action in the last hour.",
      },
      weatherImpact: {
        model: "Weather demand check",
        products: weatherImpactProducts,
      },
      forecastSnapshot: {
        models: ["Primary forecast", "Validation forecast"],
        ...forecastSnapshot,
      },
      responsibilityMatrix: [
        { model: "Demand forecast", responsibility: "Demand forecasting, stockout prediction, overstock analysis, weather correlation" },
        { model: "Forecast validation", responsibility: "Secondary forecast validation and confidence estimation" },
        { model: "Event relevance", responsibility: "Event relevance and grocery impact classification" },
        { model: "Market mood", responsibility: "News, market, inflation, and supply-chain sentiment" },
        { model: "Store memory", responsibility: "Memory retrieval, product similarity, semantic search, report search" },
        { model: "Business narrative", responsibility: "Narratives, explanations, executive summary, recommendations" },
      ],
    };

    return Response.json({
      store: store ? { ...store, display_location: resolvedLocation } : null,
      stats: {
        totalSKUs, predictedRevenue: Math.round(predictedRevenue), forecastAccuracy: avgConfidence,
        activeAlerts: criticalItems + lowItems, criticalItems, lowItems, overstockItems,
        totalInventoryValue: Math.round(totalValue), stockoutRisk, demandVolatility, demandTrend,
        avgWeekendSales, avgWeekdaySales, avgHotSales, avgColdSales,
        totalForecastDemand: Math.round(totalForecastDemand),
        totalLastWeek: Math.round(totalLastWeek),
        forecastProductCount: forecasts?.length ? new Set(forecasts.map(f => f.product_id)).size : 0,
        dataSource: resolvedLocation,
        historicDataDays: salesData?.length || 0,
      },
      salesForecast: forecastVsHistoric,
      perProductForecast,
      lastWeekData,
      inventoryExport: inventory || [],
      categoryDemand,
      recentProducts,
      topDemandProducts,
      inventoryByLowQty: byLowQty,
      inventoryByValue: byHighPrice,
      weatherImpact,
      promotionImpact,
      promotions,
      events,
      realtimeSignals,
      stockoutProducts: stockoutProducts.slice(0, 15),
      volatilityProducts: volatilityProducts.slice(0, 15),
      matchedStore: matchedStore || null,
      storeId,
      dbWeather: dbWeatherData || [],
      testInputs: { total: testInputs?.length || 0, fulfilled: testFulfilled, pending: (testInputs?.length || 0) - testFulfilled },
      generatedAt: new Date().toISOString(),
      todaysActions,
      shopkeeperAdvice,
      productsToOrder: orderList,
      productsNotSelling: slowMoving,
      totalMoneyStuck,
      healthScore: {
        overall: overallStoreHealth,
        inventory: invHealth,
        trend: trendHealth,
        expiry: expHealth
      },
      aiNarrative,
      externalEvents: extEvents,
      modelUtilization
    });
  } catch (err: any) {
    console.error("Dashboard error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
