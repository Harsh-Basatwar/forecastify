/* eslint-disable @typescript-eslint/no-explicit-any */
import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";
import {
  resolveStoreScope,
  getStoreProfile,
  getHistoricSales,
  getUpcomingEvents,
  findInInventory,
  inventoryDigest,
  categoriesOf,
  stockOf,
  nextSevenDays,
  safeSelect,
} from "@/lib/analysis/store-data";

const GROQ_KEYS = [
  process.env.GROQ_API_KEY!,
  process.env.GROQ_API_KEY_2!,
  process.env.GROQ_API_KEY_3!,
].filter(Boolean);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      productName,
      userId,
      weather,
      weatherForecast,
      location,
      lang,
    } = body;

    const langMap: Record<string, string> = {
      hi: "Hindi", mr: "Marathi", ta: "Tamil", te: "Telugu",
      kn: "Kannada", bn: "Bengali", gu: "Gujarati",
    };
    const langInstruction =
      lang && langMap[lang]
        ? `\nIMPORTANT: Write summary, reason, recommendations, competitorInsight, seasonalFactors, pricingAdvice.reason in ${langMap[lang]}. Keep product names, numbers, JSON keys in English.`
        : "";

    if (!productName || !userId) {
      return Response.json(
        { error: "productName and userId required" },
        { status: 400 }
      );
    }
    if (!GROQ_KEYS.length) {
      return Response.json(
        { error: "No GROQ_API_KEY configured on the server." },
        { status: 503 }
      );
    }

    /* 1. The shop itself. Everything downstream is grounded in this. */
    const scope = await resolveStoreScope(supabase, userId);
    const product = findInInventory(scope.items, productName);

    /* 2. Catalog and sales history are optional signals, not gates. */
    const catalog = await safeSelect<any>(
      supabase
        .from("products")
        .select("product_name, category, brand, mrp")
        .ilike("product_name", `%${productName}%`)
        .limit(1)
    );

    const profile = await getStoreProfile(supabase, userId, scope.items);
    const city = profile.city;

    const history = await getHistoricSales(supabase, productName);
    const salesData = history.rows;

    /*
      Reject only when there is genuinely nothing to reason about: the shop
      stocks it nowhere, no catalog entry, no sales history. Previously this
      also fired whenever the optional tables were simply absent, which made
      every lookup fail. The reply carries real suggestions so the dead end
      is actionable.
    */
    if (!product && !catalog.rows.length && !salesData.length) {
      const suggestions = scope.items
        .slice(0, 8)
        .map((i) => i.product_name);
      return Response.json(
        {
          error: scope.items.length
            ? `"${productName}" is not in your inventory or catalog.`
            : "No inventory found for this account yet. Add products first, or seed the demo inventory.",
          suggestions,
          inventoryCount: scope.items.length,
        },
        { status: 404 }
      );
    }

    /* 3. Signals */
    const events = await getUpcomingEvents(supabase, 10);
    const allEvents = events.rows;
    const eventsStr = allEvents.length
      ? allEvents
          .map(
            (e) =>
              `${e.event_name} (${e.event_type}, ${e.start_date} to ${e.end_date}) expected demand impact +${e.impact_score}%`
          )
          .join("\n")
      : events.available
        ? "No events in the next 10 days."
        : "Event calendar unavailable.";

    /* 4. Historic statistics, when history exists at all. */
    let historicContext: string;
    if (salesData.length) {
      const total = salesData.reduce((s, r) => s + (r.quantity_sold || 0), 0);
      const avg = (total / salesData.length).toFixed(1);
      const wkday = salesData.filter((r) => !r.is_weekend);
      const wkend = salesData.filter((r) => r.is_weekend);
      const mean = (rows: any[]) =>
        rows.length
          ? (rows.reduce((s, r) => s + (r.quantity_sold || 0), 0) / rows.length).toFixed(1)
          : "N/A";
      const fest = salesData.filter((r) => r.is_festival);
      const recent14 = salesData.slice(0, 14);
      const prior14 = salesData.slice(14, 28);
      const trend =
        prior14.length && recent14.length
          ? (
              ((recent14.reduce((s, r) => s + r.quantity_sold, 0) / recent14.length) /
                (prior14.reduce((s, r) => s + r.quantity_sold, 0) / prior14.length) -
                1) *
              100
            ).toFixed(1)
          : "N/A";

      const last14 = salesData
        .slice(0, 14)
        .map(
          (r) =>
            `${r.date} ${r.day_of_week}: ${r.quantity_sold} units${r.is_festival ? " FESTIVAL:" + r.festival_name : ""}`
        )
        .join("\n");

      historicContext = `HISTORIC SALES from this store's own till (${salesData.length} days with sales, ${history.lineCount} line items, ${city}):
Avg daily: ${avg} | Weekday avg: ${mean(wkday)} | Weekend avg: ${mean(wkend)} | Festival-day avg: ${mean(fest)}
Last 14 days vs the 14 before: ${trend}% change
Daily series, most recent first:\n${last14}`;
    } else {
      /*
        No sales log. The forecast still has to be reasoned, so hand the model
        the shop's own shelf position and tell it what to infer from.
      */
      historicContext = `HISTORIC SALES: none recorded yet for this product.
Estimate a baseline from: the product category, its price point, the stock level the shopkeeper chose to hold, and the reorder level they set. A reorder level is a rough signal of expected weekly turnover.`;
    }

    const next7 = nextSevenDays();
    const weatherPerDay = weatherForecast?.length
      ? weatherForecast
          .slice(0, 7)
          .map(
            (w: any, i: number) =>
              `${next7[i]?.day} ${next7[i]?.date}: ${w.avgTemp || w.maxTemp || "?"}C ${w.weather || "?"} Hum:${w.avgHumidity || "?"}%`
          )
          .join("\n")
      : "No forecast available.";

    const currentStock = stockOf(product);
    const catalogHit = catalog.rows[0];

    const prompt = `Predict demand for "${productName}" for the next 7 days at a real Indian retail store.

DATE: ${new Date().toISOString().split("T")[0]}
PRODUCT: "${productName}"
${
  product
    ? `IN INVENTORY: yes. Stock ${currentStock} ${product.unit} at Rs.${product.price}. Category ${product.category}. Reorder level ${product.reorder_level ?? "not set"}. Supplier ${product.supplier || "unknown"}.${product.expiry_date ? ` Expires ${product.expiry_date}.` : ""}`
    : catalogHit
      ? `IN INVENTORY: no. Present in the product catalog as ${catalogHit.brand || ""} ${catalogHit.product_name} (${catalogHit.category || "uncategorised"}), MRP Rs.${catalogHit.mrp ?? "?"}.`
      : "IN INVENTORY: no, and not in the catalog. Treat as a candidate the shop is considering."
}
STORE: "${profile.store_name}" in ${location || city}, ${profile.state}. Shelf profile: ${profile.store_category}.

THIS SHOP CURRENTLY STOCKS (${scope.items.length} lines):
${inventoryDigest(scope.items, 40)}

WEATHER NOW: ${weather ? `${weather.temp}C ${weather.description} Humidity:${weather.humidity}%` : "N/A"}
7-DAY FORECAST:
${weatherPerDay}

${historicContext}

EVENTS:
${eventsStr}

RULES:
- Ground the baseline in the historic averages when present. Weekday uses weekday average, weekend uses weekend average.
- Adjust for weather: if a day is forecast above 35C and a hot-day average exists, prefer it over the weekday average.
- If a festival falls in the window and the category matches, apply its impact percentage.
- confidence is an INTEGER between 60 and 90. Use the lower half when there is no sales history.
- stockRequired = totalPredictedSales + 15% buffer.
- additionalStockNeeded = max(0, stockRequired - ${currentStock}).
- Typical margins: FMCG 8-15%, beverages 15-25%, snacks 20-30%, dairy 5-12%, ice cream 30-50%, electronics 6-12%.
- Every daily reason must cite a concrete driver, never a generic phrase.

Reply with JSON only:
{"productName":"${productName}","currentStock":${currentStock},"unit":"${product?.unit || catalogHit?.unit || "pcs"}","currentPrice":${product?.price ?? catalogHit?.mrp ?? 0},"inInventory":${!!product},"weatherSummary":"one line","locationContext":"one line","summary":"2 sentences grounded in the data above","dailyForecast":[${next7
      .map(
        (d) =>
          `{"day":"${d.day}","date":"${d.date}","predictedSales":0,"confidence":75,"reason":"why"}`
      )
      .join(",")}],"totalPredictedSales":0,"stockRequired":0,"currentStockStatus":"Sufficient/Insufficient/Critical/Overstocked","additionalStockNeeded":0,"restockUrgency":"High/Medium/Low/None","recommendations":["r1","r2","r3"],"pricingAdvice":{"currentPrice":${product?.price ?? 0},"suggestedPrice":0,"reason":"why"},"seasonalFactors":["f1"],"competitorInsight":"insight","riskFactors":[{"risk":"what","severity":"level","mitigation":"how"}],"demandDrivers":["d1","d2"],"profitAnalysis":{"estimatedRevenue":0,"estimatedProfit":0,"margin":"X%"}}${langInstruction}`;

    /* 5. Inference, with key rotation. */
    let completion: any = null;
    let lastError: any = null;
    for (let i = 0; i < GROQ_KEYS.length; i++) {
      try {
        const groq = new Groq({ apiKey: GROQ_KEYS[i] });
        completion = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "llama-3.3-70b-versatile",
          temperature: 0.2,
          max_tokens: 1800,
          response_format: { type: "json_object" },
        });
        break;
      } catch (e: any) {
        lastError = e;
        console.error(`Groq key ${i + 1} failed:`, e?.message);
      }
    }

    if (!completion) {
      return Response.json(
        {
          error: `Forecast model unavailable: ${lastError?.message || "all API keys failed"}`,
        },
        { status: 502 }
      );
    }

    const content = completion.choices[0]?.message?.content || "";
    let analysis: any;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      return Response.json(
        { error: "Failed to parse the model response", raw: content.slice(0, 500) },
        { status: 502 }
      );
    }

    /* 6. Normalise the numbers the UI binds to. */
    if (Array.isArray(analysis.dailyForecast)) {
      for (const day of analysis.dailyForecast) {
        let c = Number(day.confidence) || 70;
        if (c > 0 && c <= 1) c = c * 100;
        if (c < 10) c = c * 10;
        day.confidence = Math.min(99, Math.max(1, Math.round(c)));
        day.predictedSales = Math.max(0, Math.round(Number(day.predictedSales) || 0));
      }
      const total = analysis.dailyForecast.reduce(
        (s: number, d: any) => s + d.predictedSales,
        0
      );
      if (!analysis.totalPredictedSales) analysis.totalPredictedSales = total;
    }

    // Keep these authoritative: they come from the database, not the model.
    analysis.currentStock = currentStock;
    analysis.inInventory = !!product;
    if (product) {
      analysis.unit = product.unit;
      analysis.currentPrice = product.price;
    }
    if (typeof analysis.stockRequired === "number") {
      analysis.additionalStockNeeded = Math.max(
        0,
        Math.round(analysis.stockRequired - currentStock)
      );
    }

    return Response.json({
      analysis,
      product,
      weather: weather || null,
      location: location || city,
      historicDataPoints: salesData.length,
      historyAvailable: history.available,
      eventsCount: allEvents.length,
      inventoryCount: scope.items.length,
      inventoryScope: scope.source,
      categories: categoriesOf(scope.items),
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Product analysis error:", err?.message, err?.stack);
    return Response.json(
      { error: err?.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
