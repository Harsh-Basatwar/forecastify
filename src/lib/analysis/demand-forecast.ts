/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Statistical demand forecast computed from the store's own sales log.
 *
 * Several routes were written against a `demand_forecast` table that does not
 * exist in this schema, so they returned nothing. Rather than depend on a
 * precomputed table, this derives the forecast directly from `sale_items`.
 *
 * The model is deliberately simple and inspectable: a day-of-week seasonal
 * index applied to a recency-weighted level, with a festival multiplier and
 * an interval that widens with horizon. It is a real forecast with real
 * error characteristics, which is what makes backtesting meaningful.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllRows, getFestivalDays, type FestivalDay } from "./store-data";

export interface DayPoint {
  date: string;
  qty: number;
  dow: number;
}

export interface ForecastDay {
  date: string;
  day: string;
  predicted: number;
  lower: number;
  upper: number;
  confidence: number;
  festival: string | null;
}

export interface ProductForecast {
  productName: string;
  category: string | null;
  history: DayPoint[];
  observedDays: number;
  avgDaily: number;
  weekdayAvg: number;
  weekendAvg: number;
  trendPct: number;
  daily: ForecastDay[];
  total: number;
  /** Backtested mean absolute percentage error, when history allows. */
  mape: number | null;
  accuracy: number | null;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Pulls every sale line for a store and buckets it per product per day. */
export async function loadSalesSeries(
  supabase: SupabaseClient,
  opts: { productName?: string; category?: string; limit?: number } = {}
): Promise<Record<string, { category: string | null; days: Record<string, number> }>> {
  /* Paged: PostgREST caps a single response at db-max-rows, so a plain
     .limit() would silently analyse only the newest slice of history. */
  const { rows } = await fetchAllRows<any>((from, to) => {
    let q = supabase
      .from("sale_items")
      .select("product_name, category, quantity, created_at")
      .order("created_at", { ascending: false })
      .range(from, to);
    if (opts.productName) q = q.ilike("product_name", `%${opts.productName}%`);
    if (opts.category) q = q.ilike("category", `%${opts.category}%`);
    return q;
  }, { maxRows: opts.limit ?? 50000 });

  const out: Record<string, { category: string | null; days: Record<string, number> }> = {};
  for (const r of rows) {
    const date = (r.created_at || "").split("T")[0];
    if (!date || !r.product_name) continue;
    out[r.product_name] ??= { category: r.category ?? null, days: {} };
    out[r.product_name].days[date] =
      (out[r.product_name].days[date] || 0) + (Number(r.quantity) || 0);
  }
  return out;
}

function toPoints(days: Record<string, number>): DayPoint[] {
  return Object.entries(days)
    .map(([date, qty]) => ({
      date,
      qty,
      dow: new Date(date + "T00:00:00Z").getUTCDay(),
    }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Mean of the most recent `n` points, weighted toward the newest. */
function weightedLevel(points: DayPoint[], n = 28): number {
  const recent = points.slice(-n);
  if (!recent.length) return 0;
  let num = 0;
  let den = 0;
  recent.forEach((p, i) => {
    const w = i + 1; // linear recency weight
    num += p.qty * w;
    den += w;
  });
  return num / den;
}

/** Day-of-week multipliers relative to the overall mean. */
function seasonalIndex(points: DayPoint[]): number[] {
  const overall = points.reduce((s, p) => s + p.qty, 0) / (points.length || 1);
  const idx: number[] = [];
  for (let d = 0; d < 7; d++) {
    const sub = points.filter((p) => p.dow === d);
    if (!sub.length || overall === 0) {
      idx[d] = 1;
      continue;
    }
    const mean = sub.reduce((s, p) => s + p.qty, 0) / sub.length;
    // Clamped so a single odd day cannot dominate the shape.
    idx[d] = Math.min(2.2, Math.max(0.35, mean / overall));
  }
  return idx;
}

function festivalMultiplier(date: string, festivals: FestivalDay[]): { mult: number; name: string | null } {
  let mult = 1;
  let name: string | null = null;
  for (const f of festivals) {
    const gap = (new Date(date).getTime() - new Date(f.date).getTime()) / 86400000;
    if (gap >= -3 && gap <= 1) {
      const proximity = 1 - Math.abs(gap + 1) / 4;
      mult += (f.impact / 100) * Math.max(0.25, proximity);
      if (Math.abs(gap) <= 1) name = f.name;
    }
  }
  return { mult, name };
}

/**
 * Walk-forward backtest: predict each of the last `window` days using only
 * data available before it, then score. This is what the accuracy figures
 * report, so they mean something rather than being asserted.
 */
function backtest(points: DayPoint[], window = 21): number | null {
  if (points.length < window + 21) return null;
  const errors: number[] = [];
  for (let i = points.length - window; i < points.length; i++) {
    const past = points.slice(0, i);
    if (past.length < 14) continue;
    const level = weightedLevel(past);
    const idx = seasonalIndex(past);
    const pred = level * idx[points[i].dow];
    const actual = points[i].qty;
    if (actual > 0) errors.push(Math.abs(pred - actual) / actual);
  }
  if (!errors.length) return null;
  return +((errors.reduce((s, e) => s + e, 0) / errors.length) * 100).toFixed(1);
}

export function forecastProduct(
  productName: string,
  category: string | null,
  days: Record<string, number>,
  festivals: FestivalDay[],
  horizon = 7
): ProductForecast {
  const points = toPoints(days);
  const observedDays = points.length;

  const level = weightedLevel(points);
  const idx = seasonalIndex(points);

  const weekday = points.filter((p) => p.dow >= 1 && p.dow <= 5);
  const weekend = points.filter((p) => p.dow === 0 || p.dow === 6);
  const mean = (a: DayPoint[]) => (a.length ? a.reduce((s, p) => s + p.qty, 0) / a.length : 0);

  const recent14 = points.slice(-14);
  const prior14 = points.slice(-28, -14);
  const trendPct =
    recent14.length && prior14.length && mean(prior14) > 0
      ? +(((mean(recent14) / mean(prior14)) - 1) * 100).toFixed(1)
      : 0;

  const mape = backtest(points);
  /* Interval half-width starts from measured error, not a guess. */
  const baseErr = mape != null ? mape / 100 : 0.35;

  const daily: ForecastDay[] = [];
  for (let h = 1; h <= horizon; h++) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() + h - 1);
    const date = d.toISOString().split("T")[0];
    const dow = d.getUTCDay();
    const { mult, name } = festivalMultiplier(date, festivals);

    const predicted = Math.max(0, level * idx[dow] * mult);
    // Uncertainty grows with horizon; sqrt keeps the widening honest.
    const spread = predicted * baseErr * Math.sqrt(h);
    const confidence = Math.round(
      Math.min(90, Math.max(55, (mape != null ? 95 - mape : 70) - (h - 1) * 1.8))
    );

    daily.push({
      date,
      day: DAY_NAMES[dow],
      predicted: Math.round(predicted),
      lower: Math.max(0, Math.round(predicted - spread)),
      upper: Math.round(predicted + spread),
      confidence,
      festival: name,
    });
  }

  return {
    productName,
    category,
    history: points,
    observedDays,
    avgDaily: +(points.reduce((s, p) => s + p.qty, 0) / (observedDays || 1)).toFixed(1),
    weekdayAvg: +mean(weekday).toFixed(1),
    weekendAvg: +mean(weekend).toFixed(1),
    trendPct,
    daily,
    total: daily.reduce((s, d) => s + d.predicted, 0),
    mape,
    accuracy: mape != null ? +Math.max(0, 100 - mape).toFixed(1) : null,
  };
}

/** Forecast every product with enough history to support one. */
export async function forecastAll(
  supabase: SupabaseClient,
  opts: { category?: string; horizon?: number; minDays?: number } = {}
): Promise<ProductForecast[]> {
  const series = await loadSalesSeries(supabase, { category: opts.category });
  const names = Object.keys(series);
  if (!names.length) return [];

  const allDates = names.flatMap((n) => Object.keys(series[n].days)).sort();
  const festivals = await getFestivalDays(
    supabase,
    allDates[0],
    new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]
  );

  const minDays = opts.minDays ?? 7;
  return names
    .map((n) =>
      forecastProduct(n, series[n].category, series[n].days, festivals, opts.horizon ?? 7)
    )
    .filter((f) => f.observedDays >= minDays)
    .sort((a, b) => b.total - a.total);
}
