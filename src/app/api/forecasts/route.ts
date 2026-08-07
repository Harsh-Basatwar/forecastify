/* eslint-disable @typescript-eslint/no-explicit-any */
import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";
import {
  resolveStoreScope,
  getStoreProfile,
  getUpcomingEvents,
  stockOf,
} from "@/lib/analysis/store-data";
import { forecastAll, type ProductForecast } from "@/lib/analysis/demand-forecast";

const GROQ_KEYS = [
  process.env.GROQ_API_KEY!,
  process.env.GROQ_API_KEY_2!,
  process.env.GROQ_API_KEY_3!,
].filter(Boolean);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Forecast cache.
 *
 * One request fans out to several Groq calls, and the free tier allows
 * 100k tokens per day. Without this, reopening the page a few times during a
 * demo exhausts the quota and every later call 429s. A forecast for a given
 * store and day does not change minute to minute, so it is served from here.
 */
const CACHE_TTL_MS = 30 * 60 * 1000;
const forecastCache = new Map<string, { at: number; payload: any }>();

function nextSevenDays() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() + i);
    return { day: DAY_NAMES[d.getUTCDay()], date: d.toISOString().split("T")[0] };
  });
}

/**
 * POST /api/forecasts
 *
 * Groq produces the demand forecast; the statistics that ground it are
 * measured from the store's own `sale_items` log first.
 *
 * Splitting it this way matters. The measured averages, day-of-week shape and
 * backtested error are facts, so they are computed in code and handed to the
 * model as evidence. The model's job is the judgement on top: how a festival,
 * a trend break or a stock position should bend those numbers. Anything the
 * database already knows (stock, price, unit) is overwritten afterwards so the
 * model cannot drift on it.
 */
export async function POST(request: Request) {
  try {
    const { userId, horizon, lang, refresh } = await request.json();
    if (!userId) return Response.json({ error: "userId required" }, { status: 400 });

    const cacheKey = `${userId}:${horizon || 7}:${lang || "en"}:${new Date().toISOString().split("T")[0]}`;
    if (!refresh) {
      const hit = forecastCache.get(cacheKey);
      if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
        return Response.json({ ...hit.payload, cached: true });
      }
    }

    const scope = await resolveStoreScope(supabase, userId);
    if (!scope.items.length) {
      return Response.json({
        store: null, productForecasts: [], storeWideForecast: [],
        totalProducts: 0, criticalCount: 0, lowCount: 0, overstockCount: 0,
        message: "No inventory found for this account.",
      });
    }

    const profile = await getStoreProfile(supabase, userId, scope.items);
    const days = nextSevenDays();

    /* 1. Measure. */
    const baseline = await forecastAll(supabase, {
      horizon: Number(horizon) || 7,
      minDays: 5,
    });
    const baseByName = new Map<string, ProductForecast>(
      baseline.map((f) => [f.productName.toLowerCase(), f])
    );

    const events = await getUpcomingEvents(supabase, 14);
    const eventsStr = events.rows.length
      ? events.rows
          .map((e) => `${e.event_name} on ${e.start_date} (impact +${e.impact_score}%)`)
          .join("; ")
      : "No festivals or events in the next 14 days.";

    /* 2. Evidence lines, one per product.
       Each carries a short id. Matching the reply on a token like "p7" is
       reliable; matching on a long product name the model has to retype is
       not, and silently dropped products when it paraphrased them. */
    const evidence = scope.items
      .map((item, i) => {
        const f = baseByName.get(item.product_name.toLowerCase());
        if (!f) return null;
        const id = `p${i + 1}`;
        return {
          id,
          key: item.product_name.toLowerCase(),
          line: `${id} | ${item.product_name} | ${item.category} | stock ${stockOf(item)} ${item.unit} @Rs.${item.price} | avg ${f.avgDaily}/day | weekday ${f.weekdayAvg} | weekend ${f.weekendAvg} | 14d trend ${f.trendPct}% | measured error ${f.mape ?? "n/a"}%`,
        };
      })
      .filter(Boolean) as { id: string; key: string; line: string }[];

    const keyById = new Map(evidence.map((e) => [e.id, e.key]));

    const langMap: Record<string, string> = {
      hi: "Hindi", mr: "Marathi", ta: "Tamil", te: "Telugu",
      kn: "Kannada", bn: "Bengali", gu: "Gujarati",
    };
    const langNote =
      lang && langMap[lang]
        ? `\nWrite every "reason" field in ${langMap[lang]}. Keep product names, numbers and JSON keys in English.`
        : "";

    const buildPrompt = (lines: string[]) => `You are forecasting 7 days of demand for a kirana store in ${profile.city}, ${profile.state}.

STORE: "${profile.store_name}". Shelf profile: ${profile.store_category}.
FORECAST DAYS: ${days.map((d) => `${d.day} ${d.date}`).join(", ")}
UPCOMING EVENTS: ${eventsStr}

MEASURED FROM THIS STORE'S OWN TILL (120 days of sales):
${lines.join("\n")}

Rules:
- Return one entry for EVERY product listed above. ${lines.length} products in, ${lines.length} forecasts out.
- Echo the id exactly as given (p1, p2, ...). Do not rename or paraphrase it.
- The measured weekday and weekend averages are facts. Your daily numbers must stay close to them unless an event or the trend justifies moving.
- Apply the day-of-week shape: this shop sells noticeably more at the weekend.
- If a listed event falls in the window and the category fits, lift those days by roughly the stated impact.
- If the 14-day trend is strongly positive or negative, carry it forward, damped.
- "confidence" is an INTEGER 60-95. Use the measured error to set it: low measured error means high confidence.
- d1..d7 are integers, one per forecast day in the order listed. Each is a separate field.
- Give a short concrete "reason" per product citing the actual driver.

Reply with JSON only:
{"forecasts":[{"id":"p1","d1":0,"d2":0,"d3":0,"d4":0,"d5":0,"d6":0,"d7":0,"confidence":80,"trend":"rising|stable|falling","reason":"short concrete driver"}]}${langNote}`;

    /*
      3. Forecast with Groq.

      Chunked and run in parallel. A single call covering the whole shelf hit
      the token ceiling and silently truncated its JSON, so coverage swung
      between runs. Small batches finish inside the limit every time, and one
      failed batch costs only its own products, which fall back to the
      measured baseline rather than taking the response down.
    */
    const CHUNK = 6;
    const chunks: string[][] = [];
    for (let i = 0; i < evidence.length; i += CHUNK) {
      chunks.push(evidence.slice(i, i + CHUNK).map((e) => e.line));
    }

    let lastError: any = null;
    const runChunk = async (lines: string[], chunkIndex: number): Promise<any[]> => {
      for (let k = 0; k < Math.max(1, GROQ_KEYS.length); k++) {
        // Spread chunks across the available keys to avoid one key rate-limiting.
        const key = GROQ_KEYS[(chunkIndex + k) % GROQ_KEYS.length];
        try {
          const groq = new Groq({ apiKey: key });
          const res = await groq.chat.completions.create({
            messages: [{ role: "user", content: buildPrompt(lines) }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.2,
            max_tokens: 2500,
            response_format: { type: "json_object" },
          });
          const content = res.choices[0]?.message?.content || "";
          const match = content.match(/\{[\s\S]*\}/);
          return JSON.parse(match ? match[0] : content)?.forecasts ?? [];
        } catch (e: any) {
          lastError = e;
          console.error(`Groq chunk ${chunkIndex} attempt ${k + 1}:`, e?.message);
        }
      }
      return [];
    };

    const settled = GROQ_KEYS.length
      ? await Promise.all(chunks.map((c, i) => runChunk(c, i)))
      : [];
    const modelForecasts: any[] = settled.flat();
    const engine: "groq" | "statistical-fallback" =
      modelForecasts.length ? "groq" : "statistical-fallback";
    if (!modelForecasts.length) {
      console.error("Groq unavailable, serving measured baseline:", lastError?.message);
    }

    /* Index the reply by product, resolving the echoed id back to a name. */
    const byModelName = new Map<string, any>();
    for (const f of modelForecasts) {
      if (!f) continue;
      const viaId = typeof f.id === "string" ? keyById.get(f.id.trim()) : undefined;
      const viaName = typeof f.name === "string" ? f.name.toLowerCase().trim() : undefined;
      const key = viaId ?? viaName;
      if (key) byModelName.set(key, f);
    }

    /* 4. Merge: model judgement over measured baseline, DB facts on top. */
    const productForecasts = scope.items.map((item) => {
      const key = item.product_name.toLowerCase();
      const base = baseByName.get(key);
      const m = byModelName.get(key);
      const currentStock = stockOf(item);
      const price = Number(item.price) || 0;

      /* Per-day fields, with the legacy array accepted too. The array form
         proved unreliable: the model sometimes emitted [10161811121110],
         fusing all seven values into a single number. */
      const asInt = (v: any) => Math.max(0, Math.round(Number(v) || 0));
      let modelDaily: number[] | null = null;
      if (m) {
        const named = ["d1", "d2", "d3", "d4", "d5", "d6", "d7"];
        if (named.every((k) => m[k] !== undefined && m[k] !== null)) {
          modelDaily = named.map((k) => asInt(m[k]));
        } else if (Array.isArray(m.daily) && m.daily.length === 7) {
          modelDaily = m.daily.map(asInt);
        }
      }

      const dailyForecast = days.map((d, i) => {
        const predicted = modelDaily
          ? modelDaily[i]
          : (base?.daily[i]?.predicted ?? 0);
        const spread = base?.daily[i]
          ? Math.max(1, base.daily[i].upper - base.daily[i].predicted)
          : Math.round(predicted * 0.3);
        return {
          day: d.day,
          date: d.date,
          predicted,
          lower: Math.max(0, predicted - spread),
          upper: predicted + spread,
          recommended: Math.round(predicted * 1.3),
          confidence: Math.min(95, Math.max(50, Math.round(Number(m?.confidence) || base?.daily[i]?.confidence || 70))),
          festival: base?.daily[i]?.festival ?? null,
        };
      });

      const weeklyDemand = dailyForecast.reduce((s, d) => s + d.predicted, 0);
      const dailyDemand = +(weeklyDemand / 7).toFixed(1);
      const daysOfStock =
        dailyDemand > 0 ? +(currentStock / dailyDemand).toFixed(1) : currentStock > 0 ? 999 : 0;

      let status: "critical" | "low" | "optimal" | "overstock" = "optimal";
      if (daysOfStock < 2) status = "critical";
      else if (daysOfStock < 5) status = "low";
      else if (daysOfStock > 30) status = "overstock";

      return {
        productId: item.id,
        product: item.product_name,
        category: item.category,
        brand: item.supplier ?? null,
        mrp: price,
        currentStock,
        unit: item.unit || "pcs",
        recommendedStock: Math.round(weeklyDemand * 1.3),
        dailyDemand,
        weeklyDemand,
        daysOfStock,
        status,
        trend: m?.trend ?? (base ? (base.trendPct > 8 ? "rising" : base.trendPct < -8 ? "falling" : "stable") : "unknown"),
        trendPct: base?.trendPct ?? 0,
        reason: m?.reason ?? null,
        confidence: dailyForecast[0]?.confidence ?? 70,
        historicAvg: base?.avgDaily ?? 0,
        weekdayAvg: base?.weekdayAvg ?? 0,
        weekendAvg: base?.weekendAvg ?? 0,
        observedDays: base?.observedDays ?? 0,
        accuracy: base?.accuracy ?? null,
        mape: base?.mape ?? null,
        source: modelDaily ? "groq" : "measured",
        dailyForecast,
      };
    });

    const statusOrder: Record<string, number> = { critical: 0, low: 1, overstock: 2, optimal: 3 };
    productForecasts.sort((a, b) => (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3));

    /* Store-wide roll-up. */
    const byDay: Record<string, any> = {};
    for (const p of productForecasts) {
      for (const d of p.dailyForecast) {
        byDay[d.date] ??= { date: d.date, day: d.day, predicted: 0, recommended: 0, revenue: 0 };
        byDay[d.date].predicted += d.predicted;
        byDay[d.date].recommended += d.recommended;
        byDay[d.date].revenue += d.predicted * p.mrp;
      }
    }
    const storeWideForecast = Object.values(byDay)
      .sort((a: any, b: any) => a.date.localeCompare(b.date))
      .map((d: any) => ({ ...d, revenue: Math.round(d.revenue) }));

    const scored = productForecasts.filter((p) => p.mape != null);
    const avgAccuracy = scored.length
      ? +(scored.reduce((s, p) => s + (p.accuracy || 0), 0) / scored.length).toFixed(1)
      : null;

    const payload = {
      store: { name: profile.store_name, city: profile.city, state: profile.state },
      storeId: scope.storeId,
      inventoryScope: scope.source,
      productForecasts,
      storeWideForecast,
      totalProducts: productForecasts.length,
      criticalCount: productForecasts.filter((p) => p.status === "critical").length,
      lowCount: productForecasts.filter((p) => p.status === "low").length,
      overstockCount: productForecasts.filter((p) => p.status === "overstock").length,
      groqForecasted: productForecasts.filter((p) => p.source === "groq").length,
      engine,
      avgAccuracy,
      eventsConsidered: events.rows.length,
      generatedAt: new Date().toISOString(),
    };

    // Only cache a real model result; a fallback should be retried next time.
    if (engine === "groq") forecastCache.set(cacheKey, { at: Date.now(), payload });

    return Response.json({ ...payload, cached: false });
  } catch (err: any) {
    console.error("Forecasts error:", err?.message, err?.stack);
    return Response.json({ error: err?.message || "Forecast failed" }, { status: 500 });
  }
}
