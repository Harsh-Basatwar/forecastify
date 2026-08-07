/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";
import { getFestivalDays } from "@/lib/analysis/store-data";
import { loadSalesSeries } from "@/lib/analysis/demand-forecast";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * POST /api/model-accuracy
 *
 * Walk-forward backtest over the store's real sales log.
 *
 * This used to compare a `demand_forecast` table against a `historic_sales`
 * table, neither of which exists here, so it always reported nothing. It now
 * replays the forecast day by day using only data that predates each target
 * day, which is the only way these numbers mean anything: a model scored on
 * days it trained on would just be reporting its own fit.
 */
export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId) return Response.json({ error: "userId required" }, { status: 400 });

    const series = await loadSalesSeries(supabase, {});
    const names = Object.keys(series);

    if (!names.length) {
      return Response.json({
        mape: 0, rmse: 0, mae: 0, accuracy: 0,
        productAccuracy: [], dailyTrend: [], categoryAccuracy: [],
        matchedCount: 0,
        message: "No sales history to score against.",
      });
    }

    const allDates = names.flatMap((n) => Object.keys(series[n].days)).sort();
    const festivals = await getFestivalDays(
      supabase,
      allDates[0],
      allDates[allDates.length - 1]
    );
    const festDates = new Set(festivals.map((f) => f.date));

    /* One prediction per product per scored day, using only prior data. */
    const matched: {
      product: string; category: string | null; date: string;
      predicted: number; actual: number;
    }[] = [];

    const SCORE_WINDOW = 28;

    for (const name of names) {
      const points = Object.entries(series[name].days)
        .map(([date, qty]) => ({ date, qty, dow: new Date(date + "T00:00:00Z").getUTCDay() }))
        .sort((a, b) => (a.date < b.date ? -1 : 1));

      if (points.length < SCORE_WINDOW + 21) continue;

      for (let i = points.length - SCORE_WINDOW; i < points.length; i++) {
        const past = points.slice(0, i);
        if (past.length < 21) continue;

        // Recency-weighted level over the trailing 28 days.
        const recent = past.slice(-28);
        let num = 0, den = 0;
        recent.forEach((p, k) => { num += p.qty * (k + 1); den += k + 1; });
        const level = den ? num / den : 0;

        // Day-of-week index from prior data only.
        const overall = past.reduce((s, p) => s + p.qty, 0) / past.length;
        const sameDow = past.filter((p) => p.dow === points[i].dow);
        const idx =
          sameDow.length && overall > 0
            ? Math.min(2.2, Math.max(0.35,
                sameDow.reduce((s, p) => s + p.qty, 0) / sameDow.length / overall))
            : 1;

        const festBoost = festDates.has(points[i].date) ? 1.25 : 1;
        const predicted = level * idx * festBoost;
        const actual = points[i].qty;
        if (actual > 0) {
          matched.push({
            product: name,
            category: series[name].category,
            date: points[i].date,
            predicted,
            actual,
          });
        }
      }
    }

    if (!matched.length) {
      return Response.json({
        mape: 0, rmse: 0, mae: 0, accuracy: 0,
        productAccuracy: [], dailyTrend: [], categoryAccuracy: [],
        matchedCount: 0,
        message: "Not enough history yet. At least 49 selling days per product are needed to backtest.",
      });
    }

    /* Headline error metrics. */
    let sumAPE = 0, sumSq = 0, sumAbs = 0;
    for (const m of matched) {
      sumAPE += Math.abs(m.actual - m.predicted) / m.actual;
      sumSq += (m.actual - m.predicted) ** 2;
      sumAbs += Math.abs(m.actual - m.predicted);
    }
    const n = matched.length;
    const mape = (sumAPE / n) * 100;
    const rmse = Math.sqrt(sumSq / n);
    const mae = sumAbs / n;
    const accuracy = Math.min(100, Math.max(0, 100 - mape));

    const round1 = (v: number) => Math.round(v * 10) / 10;

    /* Per product. */
    const productGroups: Record<string, { apeSum: number; count: number; predicted: number; actual: number; category: string | null }> = {};
    for (const m of matched) {
      productGroups[m.product] ??= { apeSum: 0, count: 0, predicted: 0, actual: 0, category: m.category };
      const g = productGroups[m.product];
      g.apeSum += Math.abs(m.actual - m.predicted) / m.actual;
      g.count++;
      g.predicted += m.predicted;
      g.actual += m.actual;
    }
    const productAccuracy = Object.entries(productGroups)
      .map(([product, g]) => {
        const prodMape = (g.apeSum / g.count) * 100;
        return {
          product,
          category: g.category,
          predicted: Math.round(g.predicted),
          actual: Math.round(g.actual),
          errorPct: round1(prodMape),
          accuracy: round1(Math.min(100, Math.max(0, 100 - prodMape))),
          samples: g.count,
        };
      })
      .sort((a, b) => b.accuracy - a.accuracy);

    /* Per day, last 14 scored days. */
    const dailyGroups: Record<string, { apeSum: number; count: number }> = {};
    for (const m of matched) {
      dailyGroups[m.date] ??= { apeSum: 0, count: 0 };
      dailyGroups[m.date].apeSum += Math.abs(m.actual - m.predicted) / m.actual;
      dailyGroups[m.date].count++;
    }
    const dailyTrend = Object.entries(dailyGroups)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([date, g]) => {
        const dayMape = (g.apeSum / g.count) * 100;
        return {
          date,
          label: new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
          day: DAY_NAMES[new Date(date + "T00:00:00Z").getUTCDay()],
          accuracy: round1(Math.min(100, Math.max(0, 100 - dayMape))),
          mape: round1(dayMape),
        };
      });

    /* Per category. */
    const categoryGroups: Record<string, { apeSum: number; count: number }> = {};
    for (const m of matched) {
      const cat = m.category || "Other";
      categoryGroups[cat] ??= { apeSum: 0, count: 0 };
      categoryGroups[cat].apeSum += Math.abs(m.actual - m.predicted) / m.actual;
      categoryGroups[cat].count++;
    }
    const categoryAccuracy = Object.entries(categoryGroups)
      .map(([category, g]) => {
        const catMape = (g.apeSum / g.count) * 100;
        return {
          category,
          accuracy: round1(Math.min(100, Math.max(0, 100 - catMape))),
          mape: round1(catMape),
          samples: g.count,
        };
      })
      .sort((a, b) => b.accuracy - a.accuracy);

    return Response.json({
      mape: round1(mape),
      rmse: round1(rmse),
      mae: round1(mae),
      accuracy: round1(accuracy),
      productAccuracy,
      dailyTrend,
      categoryAccuracy,
      matchedCount: n,
      method: "walk-forward backtest, day-of-week index on recency-weighted level",
      scoredDaysPerProduct: SCORE_WINDOW,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Model accuracy error:", err?.message, err?.stack);
    return Response.json({ error: err?.message || "Accuracy check failed" }, { status: 500 });
  }
}
