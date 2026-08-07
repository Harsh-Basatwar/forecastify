/**
 * Smoke test across the API surface.
 *
 * Hits every route with a plausible payload and reports whether it returns
 * usable data, an empty result, or an error. Used to find the features still
 * pointing at tables or columns the deployed schema does not have.
 *
 *   node scripts/smoke-test.mjs [baseUrl]
 */

const BASE = process.argv[2] || "http://localhost:3000";
const STORE = "00000000-0000-0000-0000-000000000001";

/* [method, path, body] */
const ROUTES = [
  ["POST", `/api/dashboard`, { userId: STORE }],
  ["GET", `/api/inventory?storeId=${STORE}`],
  ["GET", `/api/inventory/dashboard-summary?storeId=${STORE}`],
  ["GET", `/api/inventory/categories?storeId=${STORE}`],
  ["GET", `/api/inventory/suppliers?storeId=${STORE}`],
  ["GET", `/api/inventory/batches?storeId=${STORE}`],
  ["GET", `/api/inventory/audit-logs?storeId=${STORE}`],
  ["POST", `/api/inventory-health`, { userId: STORE }],
  ["GET", `/api/sales?storeId=${STORE}`],
  ["GET", `/api/sales/analytics?storeId=${STORE}`],
  ["GET", `/api/sales/customers?storeId=${STORE}`],
  ["POST", `/api/alerts`, { userId: STORE }],
  ["GET", `/api/audit-log?storeId=${STORE}`],
  ["POST", `/api/expiry-risk`, { userId: STORE }],
  ["POST", `/api/product-stock-levels`, { userId: STORE }],
  ["POST", `/api/reorder-planner`, { userId: STORE }],
  ["POST", `/api/model-accuracy`, { userId: STORE }],
  ["GET", `/api/forecast?storeId=${STORE}&horizon=7d`],
  ["GET", `/api/forecast/config?storeId=${STORE}`],
  ["GET", `/api/forecast/models?storeId=${STORE}`],
  ["GET", `/api/forecast/jobs?storeId=${STORE}`],
  ["GET", `/api/forecast/features/latest?storeId=${STORE}`],
  ["GET", `/api/forecast/recommendations?storeId=${STORE}`],
  ["GET", `/api/procurement/suppliers?storeId=${STORE}`],
  ["GET", `/api/procurement/purchase-orders?storeId=${STORE}`],
  ["GET", `/api/procurement/analytics?storeId=${STORE}`],
  ["GET", `/api/procurement/recommendations?storeId=${STORE}`],
  ["GET", `/api/procurement/grn?storeId=${STORE}`],
  ["GET", `/api/procurement/price-history?storeId=${STORE}`],
  ["GET", `/api/communications/threads?storeId=${STORE}`],
  ["GET", `/api/communications/analytics?storeId=${STORE}`],
  ["GET", `/api/background/health`],
  ["GET", `/api/background/jobs`],
  ["GET", `/api/background/metrics`],
  ["GET", `/api/background/workers`],
  ["GET", `/api/background/alerts`],
  ["GET", `/api/analysis/inventory?userId=${STORE}`],
  ["GET", `/health`],
  ["POST", `/api/forecasts`, { userId: STORE }],
  ["POST", `/api/store-assistant`, { action: "brief.morning", storeId: STORE }],
  ["POST", `/api/store-assistant`, { action: "khata.summary", storeId: STORE }],
  ["POST", `/api/store-assistant`, { action: "tasks.list", storeId: STORE }],
  ["POST", `/api/what-if`, { userId: STORE, scenario: "price drop 10%" }],
  ["POST", `/api/demand-analysis`, { userId: STORE }],
  ["POST", `/api/bulk-analysis`, { userId: STORE, products: [{ name: "Amul Butter 100g" }] }],
  ["POST", `/api/federated-intelligence`, { userId: STORE, action: "get_groups" }],
];

const TIMEOUT = 90_000;

function classify(status, body) {
  if (status >= 500) return ["FAIL", body?.error || `HTTP ${status}`];
  if (status === 404) return ["MISS", body?.error || "not found"];
  if (status >= 400) return ["WARN", body?.error || `HTTP ${status}`];

  if (body == null) return ["EMPTY", "null body"];
  if (Array.isArray(body)) {
    return body.length ? ["OK", `${body.length} rows`] : ["EMPTY", "0 rows"];
  }
  if (typeof body === "object") {
    if (body.error) return ["WARN", String(body.error).slice(0, 70)];
    // Find the most informative field.
    const arrays = Object.entries(body).filter(([, v]) => Array.isArray(v));
    if (arrays.length) {
      const desc = arrays
        .map(([k, v]) => `${k}:${v.length}`)
        .slice(0, 4)
        .join(" ");
      const total = arrays.reduce((s, [, v]) => s + v.length, 0);
      return [total ? "OK" : "EMPTY", desc];
    }
    const keys = Object.keys(body);
    return keys.length ? ["OK", keys.slice(0, 5).join(",")] : ["EMPTY", "{}"];
  }
  return ["OK", String(body).slice(0, 40)];
}

async function hit(method, path, payload) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(BASE + path, {
      method,
      signal: ctrl.signal,
      headers: payload ? { "Content-Type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const text = await res.text();
    let body = null;
    try { body = JSON.parse(text); } catch { body = text.slice(0, 120); }
    return classify(res.status, body);
  } catch (e) {
    return ["FAIL", e.name === "AbortError" ? "timeout" : e.message.slice(0, 60)];
  } finally {
    clearTimeout(timer);
  }
}

const tally = { OK: 0, EMPTY: 0, WARN: 0, MISS: 0, FAIL: 0 };

console.log(`Smoke testing ${ROUTES.length} routes against ${BASE}\n`);
for (const [method, path, payload] of ROUTES) {
  const [verdict, detail] = await hit(method, path, payload);
  tally[verdict] = (tally[verdict] || 0) + 1;
  const label = `${method} ${path.split("?")[0]}`;
  console.log(`${verdict.padEnd(6)} ${label.padEnd(46)} ${detail}`);
}

console.log("\n" + Object.entries(tally).map(([k, v]) => `${k}:${v}`).join("  "));
