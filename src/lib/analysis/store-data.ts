/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Shared data access for the product and category analysis features.
 *
 * These routes were reading a schema that does not match the database:
 *   - stock lives in `inventory.quantity`, not `inventory.current_stock`
 *   - `profiles` has no `store_category` / `store_size` / `store_address`,
 *     and asking for them fails the whole select, not just those columns
 *   - `historic_sales`, `regional_events` and `weather_history` do not exist
 *     in every deployment, and a missing table is an error, not an empty set
 *
 * Everything here is defensive on purpose: an analysis that degrades to
 * "forecast from inventory alone" is useful, one that 400s is not.
 */

import { SupabaseClient } from "@supabase/supabase-js";

/** Columns that actually exist on `inventory` today. */
export const INVENTORY_COLUMNS =
  "id, store_id, product_name, category, quantity, unit, price, cost_price, mrp, reorder_level, reorder_point, min_stock, max_stock, safety_stock, expiry_date, supplier, barcode, status";

export interface InventoryItem {
  id: string;
  store_id: string;
  product_name: string;
  category: string | null;
  quantity: number | null;
  unit: string | null;
  price: number | null;
  cost_price?: number | null;
  reorder_level?: number | null;
  expiry_date?: string | null;
  supplier?: string | null;
  [key: string]: any;
}

/**
 * Stock on hand. `quantity` is the real column; `current_stock` is accepted
 * so anything still passing the old shape keeps working.
 */
export function stockOf(row: any): number {
  if (!row) return 0;
  const v =
    row.quantity ??
    row.current_stock ??
    row.available_stock ??
    0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Normalises a row so downstream code and prompts see one shape. */
export function normaliseItem(row: any): InventoryItem & { current_stock: number } {
  return {
    ...row,
    quantity: stockOf(row),
    // Kept so existing UI bindings that read `current_stock` still render.
    current_stock: stockOf(row),
    unit: row.unit || "pcs",
    price: Number(row.price) || 0,
  };
}

/**
 * Runs a select that may reference a table or column this deployment lacks.
 * Returns [] on schema errors rather than propagating, and reports whether
 * the source was actually available so callers can tell "no data" from
 * "no table".
 */
export async function safeSelect<T = any>(
  query: any
): Promise<{ rows: T[]; available: boolean; reason?: string }> {
  try {
    const { data, error } = await query;
    if (error) {
      // 42P01 undefined_table, 42703 undefined_column, PGRST205 unknown table
      const schemaIssue =
        error.code === "42P01" ||
        error.code === "42703" ||
        error.code === "PGRST205" ||
        /does not exist|schema cache/i.test(error.message || "");
      return { rows: [], available: !schemaIssue, reason: error.message };
    }
    return { rows: (data || []) as T[], available: true };
  } catch (err: any) {
    return { rows: [], available: false, reason: err?.message };
  }
}

/**
 * Fetches every row matching a query, in pages.
 *
 * PostgREST enforces a server-side `db-max-rows` cap (1000 by default) that
 * silently truncates regardless of `.limit()`. Anything reading a full sales
 * history has to page with `.range()` or it quietly analyses only the most
 * recent slice.
 */
export async function fetchAllRows<T = any>(
  build: (from: number, to: number) => any,
  { pageSize = 1000, maxRows = 50000 } = {}
): Promise<{ rows: T[]; available: boolean; truncated: boolean }> {
  const rows: T[] = [];
  let from = 0;
  let available = true;

  while (from < maxRows) {
    const page = await safeSelect<T>(build(from, from + pageSize - 1));
    if (!page.available) {
      available = from === 0 ? false : available;
      break;
    }
    rows.push(...page.rows);
    if (page.rows.length < pageSize) break;
    from += pageSize;
  }

  return { rows, available, truncated: from >= maxRows };
}

export interface StoreScope {
  storeId: string | null;
  items: InventoryItem[];
  /** "user" when the caller's own id owns the rows, "fallback" when we had
   *  to borrow the only seeded store so the feature still works. */
  source: "user" | "fallback" | "empty";
}

/**
 * Resolves the inventory this user should be analysing.
 *
 * Seeded rows carry a fixed store UUID that happens to equal the demo
 * profile id, so a real signed-up account matches nothing and every lookup
 * came back empty. When the caller owns no rows and the database holds
 * exactly one store's inventory, that store is used and the result is
 * flagged, so the behaviour is visible instead of silent.
 */
export async function resolveStoreScope(
  supabase: SupabaseClient,
  userId: string
): Promise<StoreScope> {
  const owned = await safeSelect<InventoryItem>(
    supabase.from("inventory").select(INVENTORY_COLUMNS).eq("store_id", userId)
  );

  if (owned.rows.length) {
    return {
      storeId: userId,
      items: owned.rows.map(normaliseItem),
      source: "user",
    };
  }

  const all = await safeSelect<InventoryItem>(
    supabase.from("inventory").select(INVENTORY_COLUMNS).limit(500)
  );

  if (!all.rows.length) {
    return { storeId: null, items: [], source: "empty" };
  }

  const distinct = [...new Set(all.rows.map((r) => r.store_id))];
  if (distinct.length === 1) {
    return {
      storeId: distinct[0],
      items: all.rows.map(normaliseItem),
      source: "fallback",
    };
  }

  return { storeId: null, items: [], source: "empty" };
}

/** Profile columns that exist. Asking for more fails the entire select. */
export const PROFILE_COLUMNS =
  "id, full_name, store_name, phone, city, state, pincode, number_of_outlets";

export interface StoreProfile {
  store_name: string;
  city: string;
  state: string;
  /** Derived from what the shop actually stocks, since profiles has no column. */
  store_category: string;
}

export async function getStoreProfile(
  supabase: SupabaseClient,
  userId: string,
  items: InventoryItem[]
): Promise<StoreProfile> {
  const { rows } = await safeSelect<any>(
    supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", userId).limit(1)
  );

  let profile = rows[0];
  if (!profile) {
    // Single-tenant deployments seed one profile; use it rather than
    // defaulting the city to somewhere the shop is not.
    const any = await safeSelect<any>(
      supabase.from("profiles").select(PROFILE_COLUMNS).limit(1)
    );
    profile = any.rows[0];
  }

  return {
    store_name: profile?.store_name || "Your store",
    city: profile?.city || "Mumbai",
    state: profile?.state || "Maharashtra",
    store_category: deriveStoreCategory(items),
  };
}

/** The shop's character, read off its own shelves. */
export function deriveStoreCategory(items: InventoryItem[]): string {
  if (!items.length) return "General store";
  const counts: Record<string, number> = {};
  for (const i of items) {
    const c = i.category || "General";
    counts[c] = (counts[c] || 0) + 1;
  }
  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c);
  return top.join(" / ");
}

/** Distinct categories the shop actually stocks. */
export function categoriesOf(items: InventoryItem[]): string[] {
  return [...new Set(items.map((i) => i.category).filter(Boolean) as string[])].sort();
}

/**
 * Compact inventory listing for the model prompt. This is what makes the
 * analysis aware of the actual shop rather than guessing from a name.
 */
export function inventoryDigest(items: InventoryItem[], limit = 60): string {
  if (!items.length) return "Inventory is empty.";
  return items
    .slice(0, limit)
    .map(
      (i) =>
        `- ${i.product_name} [${i.category || "Uncategorised"}] stock ${stockOf(i)} ${
          i.unit || "pcs"
        } @ Rs.${i.price ?? 0}${
          i.reorder_level ? ` (reorder at ${i.reorder_level})` : ""
        }${i.expiry_date ? ` exp ${i.expiry_date}` : ""}`
    )
    .join("\n");
}

/** Fuzzy match against the shop's own shelves. */
export function findInInventory(
  items: InventoryItem[],
  productName: string
): InventoryItem | null {
  const q = productName.trim().toLowerCase();
  if (!q) return null;
  return (
    items.find((i) => i.product_name?.toLowerCase() === q) ||
    items.find((i) => i.product_name?.toLowerCase().includes(q)) ||
    items.find((i) => q.includes(i.product_name?.toLowerCase() || " ")) ||
    null
  );
}

/* ── Optional signal tables ──────────────────────────────────────
   Present in the full schema, absent in leaner deployments. Each helper
   returns an empty result plus an availability flag instead of throwing. */

const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

export interface DailySale {
  date: string;
  day_of_week: string;
  quantity_sold: number;
  revenue: number;
  is_weekend: boolean;
  is_festival: boolean;
  festival_name: string | null;
}

/**
 * Rolls `sale_items` up into a daily series.
 *
 * The sales log lives in `sales` + `sale_items`; the `historic_sales` table
 * these features were written against does not exist in this schema. Each
 * line carries its own `created_at`, so the daily buckets come straight off
 * `sale_items` without needing to join the invoice.
 */
function bucketByDay(rows: any[], festivals: FestivalDay[]): DailySale[] {
  const byDate: Record<string, { qty: number; revenue: number }> = {};
  for (const r of rows) {
    const date = (r.created_at || "").split("T")[0];
    if (!date) continue;
    if (!byDate[date]) byDate[date] = { qty: 0, revenue: 0 };
    byDate[date].qty += Number(r.quantity) || 0;
    byDate[date].revenue += Number(r.total) || 0;
  }

  return Object.entries(byDate)
    .map(([date, v]) => {
      const d = new Date(date + "T00:00:00Z");
      const dow = d.getUTCDay();
      const fest = festivals.find((f) => f.date === date);
      return {
        date,
        day_of_week: DAY_NAMES[dow],
        quantity_sold: Math.round(v.qty),
        revenue: +v.revenue.toFixed(2),
        is_weekend: dow === 0 || dow === 6,
        is_festival: !!fest,
        festival_name: fest?.name ?? null,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export interface FestivalDay {
  date: string;
  name: string;
  impact: number;
}

/** Festival days across a window, used to flag spikes in the history. */
export async function getFestivalDays(
  supabase: SupabaseClient,
  fromDate: string,
  toDate: string
): Promise<FestivalDay[]> {
  const { rows } = await safeSelect<any>(
    supabase
      .from("external_events")
      .select("event_name, event_type, start_date, end_date, impact_score")
      .gte("start_date", fromDate)
      .lte("start_date", toDate)
  );
  const out: FestivalDay[] = [];
  for (const e of rows) {
    const start = new Date(e.start_date + "T00:00:00Z");
    const end = new Date((e.end_date || e.start_date) + "T00:00:00Z");
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      out.push({
        date: d.toISOString().split("T")[0],
        name: e.event_name,
        impact: Number(e.impact_score) || 0,
      });
    }
  }
  return out;
}

/** Daily sales series for one product, newest first. */
export async function getHistoricSales(
  supabase: SupabaseClient,
  productName: string
): Promise<{ rows: DailySale[]; available: boolean; lineCount: number }> {
  const res = await fetchAllRows<any>((from, to) =>
    supabase
      .from("sale_items")
      .select("product_name, category, quantity, total, created_at")
      .ilike("product_name", `%${productName}%`)
      .order("created_at", { ascending: false })
      .range(from, to)
  );
  if (!res.available || !res.rows.length) {
    return { rows: [], available: res.available, lineCount: 0 };
  }

  const dates = res.rows.map((r) => (r.created_at || "").split("T")[0]).filter(Boolean).sort();
  const festivals = await getFestivalDays(
    supabase,
    dates[0],
    dates[dates.length - 1]
  );

  return {
    rows: bucketByDay(res.rows, festivals).slice(0, 120),
    available: true,
    lineCount: res.rows.length,
  };
}

/** Per-product daily averages within a category. */
export async function getCategoryHistory(
  supabase: SupabaseClient,
  category: string
): Promise<{
  rows: { product_name: string; avgDaily: number; avgWeekend: number; days: number; revenue: number }[];
  available: boolean;
  lineCount: number;
}> {
  const res = await fetchAllRows<any>((from, to) =>
    supabase
      .from("sale_items")
      .select("product_name, category, quantity, total, created_at")
      .ilike("category", `%${category}%`)
      .order("created_at", { ascending: false })
      .range(from, to)
  );
  if (!res.available || !res.rows.length) {
    return { rows: [], available: res.available, lineCount: 0 };
  }

  const byProduct: Record<string, Record<string, { qty: number; rev: number; weekend: boolean }>> = {};
  for (const r of res.rows) {
    const date = (r.created_at || "").split("T")[0];
    if (!date) continue;
    const name = r.product_name;
    byProduct[name] ??= {};
    if (!byProduct[name][date]) {
      const dow = new Date(date + "T00:00:00Z").getUTCDay();
      byProduct[name][date] = { qty: 0, rev: 0, weekend: dow === 0 || dow === 6 };
    }
    byProduct[name][date].qty += Number(r.quantity) || 0;
    byProduct[name][date].rev += Number(r.total) || 0;
  }

  const rows = Object.entries(byProduct)
    .map(([product_name, days]) => {
      const entries = Object.values(days);
      const weekend = entries.filter((d) => d.weekend);
      const totalQty = entries.reduce((s, d) => s + d.qty, 0);
      return {
        product_name,
        avgDaily: +(totalQty / entries.length).toFixed(1),
        avgWeekend: weekend.length
          ? +(weekend.reduce((s, d) => s + d.qty, 0) / weekend.length).toFixed(1)
          : 0,
        days: entries.length,
        revenue: +entries.reduce((s, d) => s + d.rev, 0).toFixed(2),
      };
    })
    .sort((a, b) => b.avgDaily - a.avgDaily);

  return { rows, available: true, lineCount: res.rows.length };
}

/** Events starting within the window, plus any already running. */
export async function getUpcomingEvents(supabase: SupabaseClient, days = 10) {
  const today = new Date().toISOString().split("T")[0];
  const until = new Date();
  until.setDate(until.getDate() + days);
  const untilStr = until.toISOString().split("T")[0];
  const cols = "event_name, event_type, start_date, end_date, impact_score";

  const upcoming = await safeSelect<any>(
    supabase
      .from("external_events")
      .select(cols)
      .gte("start_date", today)
      .lte("start_date", untilStr)
  );
  if (!upcoming.available) return { rows: [], available: false };

  const ongoing = await safeSelect<any>(
    supabase
      .from("external_events")
      .select(cols)
      .lte("start_date", today)
      .gte("end_date", today)
  );

  const seen = new Set<string>();
  const rows = [...upcoming.rows, ...ongoing.rows].filter((e) => {
    const k = `${e.event_name}:${e.start_date}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return { rows, available: true };
}

/** Next seven calendar days, labelled. */
export function nextSevenDays(): { day: string; date: string }[] {
  const names = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return { day: names[d.getDay()], date: d.toISOString().split("T")[0] };
  });
}
