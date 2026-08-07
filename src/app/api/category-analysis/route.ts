/* eslint-disable @typescript-eslint/no-explicit-any */
import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";
import {
  resolveStoreScope,
  getStoreProfile,
  getUpcomingEvents,
  getCategoryHistory,
  categoriesOf,
  inventoryDigest,
  stockOf,
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
    const { category: rawCategory, userId, weather, location, lang } =
      await request.json();

    const langMap: Record<string, string> = {
      hi: "Hindi", mr: "Marathi", ta: "Tamil", te: "Telugu",
      kn: "Kannada", bn: "Bengali", gu: "Gujarati",
    };
    const langInstruction =
      lang && langMap[lang]
        ? `\nIMPORTANT: Write summary, reason, recommendations, competitorInsight, seasonalTrend in ${langMap[lang]}. Keep product/brand names, numbers, JSON keys in English.`
        : "";

    if (!userId) {
      return Response.json({ error: "userId required" }, { status: 400 });
    }
    if (!GROQ_KEYS.length) {
      return Response.json(
        { error: "No GROQ_API_KEY configured on the server." },
        { status: 503 }
      );
    }

    /* 1. The shop. */
    const scope = await resolveStoreScope(supabase, userId);
    const stocked = categoriesOf(scope.items);

    if (!scope.items.length) {
      return Response.json(
        {
          error:
            "No inventory found for this account yet. Add products first, or seed the demo inventory.",
          categories: [],
          inventoryCount: 0,
        },
        { status: 404 }
      );
    }

    /*
      2. Resolve the category against what the shop actually stocks. The old
      version validated against `products` and `historic_sales`, which are
      empty or absent here, so every request was rejected as invalid.
    */
    let category: string = (rawCategory || "").trim();
    if (!category) {
      const counts: Record<string, number> = {};
      for (const i of scope.items) {
        const c = i.category || "General";
        counts[c] = (counts[c] || 0) + 1;
      }
      category = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    } else {
      const exact = stocked.find(
        (c) => c.toLowerCase() === category.toLowerCase()
      );
      const partial = stocked.find(
        (c) =>
          c.toLowerCase().includes(category.toLowerCase()) ||
          category.toLowerCase().includes(c.toLowerCase())
      );
      const resolved = exact || partial;
      if (resolved) {
        category = resolved;
      } else {
        // Unknown category is still analysable as an expansion question, but
        // say so plainly and offer the ones that exist.
        return Response.json(
          {
            error: `"${category}" is not a category you stock.`,
            categories: stocked,
            inventoryCount: scope.items.length,
          },
          { status: 404 }
        );
      }
    }

    const profile = await getStoreProfile(supabase, userId, scope.items);
    const city = profile.city;
    const state = profile.state;

    /* 3. What the shop holds in this category. */
    const myProducts = scope.items.filter(
      (i) => (i.category || "").toLowerCase() === category.toLowerCase()
    );
    const myInvStr = myProducts.length
      ? myProducts
          .map(
            (p) =>
              `${p.product_name}|stock:${stockOf(p)}${p.unit}|Rs.${p.price}|cost:Rs.${p.cost_price ?? "?"}|reorder:${p.reorder_level ?? "?"}|supplier:${p.supplier || "?"}`
          )
          .join("\n")
      : "No products in this category yet.";

    /* 4. Real sales history for this category, rolled up per product. */
    const history = await getCategoryHistory(supabase, category);

    const historicContext = history.rows.length
      ? `Measured from this store's own till (${history.lineCount} line items):\n` +
        history.rows
          .map(
            (r) =>
              `${r.product_name}: avg ${r.avgDaily}/day over ${r.days} selling days, weekend avg ${r.avgWeekend || "N/A"}, revenue Rs.${r.revenue}`
          )
          .join("\n")
      : "No recorded sales history. Infer demand from stock levels, reorder points and regional norms.";

    /* 5. Events. */
    const events = await getUpcomingEvents(supabase, 14);
    const eventsStr =
      events.rows
        .map((e) => `${e.event_name} (${e.start_date}) impact +${e.impact_score}%`)
        .join(", ") || "None";

    const prompt = `Analyze the "${category}" category for a real Indian retail store in ${city}, ${state}.

STORE: "${profile.store_name}" at ${location || city}. Shelf profile: ${profile.store_category}.
CATEGORIES THIS SHOP STOCKS: ${stocked.join(", ")}
${weather ? `WEATHER: ${weather.temp}C ${weather.description} Humidity:${weather.humidity}%` : ""}
EVENTS: ${eventsStr}

MY INVENTORY IN "${category}" (${myProducts.length} lines):
${myInvStr}

FULL SHELF FOR CONTEXT:
${inventoryDigest(scope.items, 30)}

HISTORIC SALES DATA:
${historicContext}

Give the top brands and products that sell well in "${category}" in the ${city}, ${state} region. Cover both what is already stocked and strong products missing from the shelf.

Rules:
- Products already listed in MY INVENTORY must have inMyInventory true and myStock set to the exact stock shown above.
- Products not listed must have inMyInventory false, myStock 0, stockStatus "Not Stocked".
- dailyDemand and weeklyDemand are integers. weeklyDemand should be roughly 7x dailyDemand.
- Be realistic for a neighbourhood store in ${city}, not a supermarket chain.

Reply with JSON only:
{
  "category": "${category}",
  "location": "${city}, ${state}",
  "summary": "2-3 sentences on this category's performance and trend in this region",
  "totalCategoryDemand": "High/Medium/Low",
  "weeklyEstimate": 0,
  "topBrands": [{"brand":"Name","popularity":90,"marketShare":"XX%","priceRange":"Rs.XX - Rs.XX","reason":"why popular here"}],
  "products": [{"name":"Product","brand":"Brand","category":"${category}","demandLevel":"High/Medium/Low","dailyDemand":0,"weeklyDemand":0,"suggestedPrice":0,"inMyInventory":true,"myStock":0,"myUnit":"pcs","stockStatus":"Sufficient/Low/Out of Stock/Not Stocked","restockNeeded":0,"reason":"why it matters","margin":"X%"}],
  "missingProducts": ["product to add"],
  "seasonalTrend": "how the season affects this category now",
  "recommendations": ["rec 1","rec 2","rec 3"],
  "competitorInsight": "what nearby shops stock"
}

Include 6-8 top brands and 10-15 products.${langInstruction}`;

    let completion: any = null;
    let lastError: any = null;
    for (let i = 0; i < GROQ_KEYS.length; i++) {
      try {
        const groq = new Groq({ apiKey: GROQ_KEYS[i] });
        completion = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "llama-3.3-70b-versatile",
          temperature: 0.3,
          max_tokens: 2400,
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
          error: `Analysis model unavailable: ${lastError?.message || "all API keys failed"}`,
        },
        { status: 502 }
      );
    }

    const content = completion.choices[0]?.message?.content || "";
    let analysis: any;
    try {
      const match = content.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(match ? match[0] : content);
    } catch {
      return Response.json(
        { error: "Failed to parse the model response", raw: content.slice(0, 500) },
        { status: 502 }
      );
    }

    /*
      Reconcile the model's product list against the database. Stock numbers
      are a fact, so they are overwritten rather than trusted.
    */
    if (Array.isArray(analysis.products)) {
      for (const p of analysis.products) {
        const match = myProducts.find(
          (m) =>
            m.product_name.toLowerCase() === (p.name || "").toLowerCase() ||
            m.product_name.toLowerCase().includes((p.name || "").toLowerCase()) ||
            (p.name || "").toLowerCase().includes(m.product_name.toLowerCase())
        );
        if (match) {
          p.inMyInventory = true;
          p.myStock = stockOf(match);
          p.myUnit = match.unit;
          p.currentPrice = match.price;
          const reorder = Number(match.reorder_level) || 0;
          p.stockStatus =
            p.myStock <= 0
              ? "Out of Stock"
              : reorder && p.myStock <= reorder
                ? "Low"
                : "Sufficient";
        } else {
          p.inMyInventory = false;
          p.myStock = 0;
          p.stockStatus = "Not Stocked";
        }
        p.dailyDemand = Math.max(0, Math.round(Number(p.dailyDemand) || 0));
        p.weeklyDemand = Math.max(0, Math.round(Number(p.weeklyDemand) || p.dailyDemand * 7));
      }
    }
    analysis.category = category;

    return Response.json({
      analysis,
      myProducts,
      historicCount: history.lineCount,
      historicProducts: history.rows.length,
      historyAvailable: history.available,
      weather: weather || null,
      location: location || `${city}, ${state}`,
      categories: stocked,
      inventoryCount: scope.items.length,
      inventoryScope: scope.source,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Category analysis error:", err?.message, err?.stack);
    return Response.json(
      { error: err?.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
