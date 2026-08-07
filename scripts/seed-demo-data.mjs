/**
 * Demo data seeder.
 *
 * The deployed schema differs from what several routes were written against:
 * there is no `historic_sales`, `regional_events`, `weather_history` or
 * `demand_forecast` table. The real sales log is `sales` + `sale_items`, and
 * the real event calendar is `external_events`. This seeds those, plus the
 * catalog tables that were empty, so the forecasting features have something
 * to reason about.
 *
 * Idempotent: every row it writes is tagged, and tagged rows are cleared
 * before reseeding. Run with:  node scripts/seed-demo-data.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

/* ── env ─────────────────────────────────────────────────────── */
function loadEnv() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* env may already be provided by the shell */
  }
}
loadEnv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(URL, KEY, { auth: { persistSession: false } });

const STORE_ID = "00000000-0000-0000-0000-000000000001";
const HISTORY_DAYS = 120;
const TAG = "DEMO";

/* ── deterministic randomness ────────────────────────────────────
   Seeded so a rerun reproduces the same history. Math.random would make
   every reseed a different dataset and every forecast unreproducible. */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260808);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const jitter = (spread) => 1 + (rand() - 0.5) * spread;

/* Stable UUIDs so reruns overwrite rather than accumulate.
   A UUID is 32 hex digits: an 8-char block prefix plus a 24-char counter. */
const seededId = (block8, n) => {
  const hex = (block8 + String(n).padStart(24, "0")).slice(0, 32);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
};

const dayStr = (d) => d.toISOString().split("T")[0];
const daysAgo = (n) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
};

/* ── festivals ───────────────────────────────────────────────────
   Past entries drive the spikes in the generated history; future ones
   populate the event calendar the forecasts read. */
const FESTIVALS = [
  { name: "Akshaya Tritiya", date: "2026-04-19", impact: 25, cats: ["Groceries", "Electronics"] },
  { name: "Eid al-Adha", date: "2026-05-27", impact: 30, cats: ["Groceries", "Dairy"] },
  { name: "Ashadhi Ekadashi", date: "2026-07-25", impact: 20, cats: ["Groceries", "Dairy"] },
  { name: "Independence Day", date: "2026-08-15", impact: 18, cats: ["Snacks", "Beverages"] },
  { name: "Raksha Bandhan", date: "2026-08-28", impact: 35, cats: ["Snacks", "Dairy"] },
  { name: "Janmashtami", date: "2026-09-04", impact: 40, cats: ["Dairy", "Snacks"] },
  { name: "Ganesh Chaturthi", date: "2026-09-14", impact: 55, cats: ["Dairy", "Snacks", "Groceries"] },
];

/* Base daily units by category, before day-of-week and festival effects. */
const VELOCITY = {
  Dairy: 11,
  Snacks: 8,
  Beverages: 7,
  Groceries: 4.5,
  Electronics: 0.35,
};
/* Sun..Sat. Weekends carry the week in a neighbourhood store. */
const DOW_FACTOR = [1.35, 0.82, 0.86, 0.9, 0.95, 1.08, 1.3];

function festivalBoost(dateStr, category) {
  let boost = 1;
  for (const f of FESTIVALS) {
    const gap = (new Date(dateStr) - new Date(f.date)) / 86400000;
    // Demand builds in the three days before and decays the day after.
    if (gap >= -3 && gap <= 1 && f.cats.includes(category)) {
      const proximity = 1 - Math.abs(gap + 1) / 4;
      boost += (f.impact / 100) * Math.max(0.25, proximity);
    }
  }
  return boost;
}

/** Warm months lift cold drinks and ice cream, damp them in the monsoon. */
function seasonalFactor(dateStr, category) {
  const month = new Date(dateStr).getMonth(); // 0-11
  if (category === "Beverages") return month >= 3 && month <= 5 ? 1.3 : month >= 6 && month <= 8 ? 0.85 : 1;
  if (category === "Dairy") return month >= 6 && month <= 8 ? 1.08 : 1;
  return 1;
}

async function wipe(table, filter) {
  const q = db.from(table).delete();
  const { error } = await filter(q);
  if (error && !/does not exist/i.test(error.message)) {
    console.warn(`  ! clearing ${table}: ${error.message}`);
  }
}

async function insert(table, rows, label = table) {
  if (!rows.length) return 0;
  let done = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await db.from(table).upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error(`  x ${label}: ${error.message}`);
      return done;
    }
    done += chunk.length;
  }
  console.log(`  + ${label}: ${done}`);
  return done;
}

async function main() {
  console.log("Seeding demo data for store", STORE_ID);

  /* 1. Inventory is the anchor. Everything else references it. */
  const { data: inventory, error: invErr } = await db
    .from("inventory")
    .select("id, product_name, category, quantity, price, cost_price, unit, supplier, reorder_level, expiry_date")
    .eq("store_id", STORE_ID);

  if (invErr || !inventory?.length) {
    console.error("No inventory found:", invErr?.message);
    process.exit(1);
  }
  console.log(`  inventory lines: ${inventory.length}`);

  /* 2. Reference data. */
  const catNames = [...new Set(inventory.map((i) => i.category).filter(Boolean))];
  const categories = catNames.map((name, i) => ({
    id: seededId("c0000000", i + 1),
    store_id: STORE_ID,
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    description: `${name} sold at this store`,
  }));
  await insert("categories", categories);

  const brandNames = [
    ["Amul", "Gujarat Cooperative Milk Marketing Federation"],
    ["PepsiCo India", "PepsiCo"],
    ["Red Bull", "Red Bull GmbH"],
    ["Fortune", "Adani Wilmar"],
    ["Bajaj", "Bajaj Electricals"],
    ["Britannia", "Britannia Industries"],
    ["Parle", "Parle Products"],
    ["Tata", "Tata Consumer Products"],
  ];
  const brands = brandNames.map(([name, manufacturer], i) => ({
    id: seededId("b0000000", i + 1),
    store_id: STORE_ID,
    name,
    manufacturer,
  }));
  await insert("brands", brands);

  const units = [
    ["Piece", "pcs"], ["Kilogram", "kg"], ["Gram", "g"],
    ["Litre", "L"], ["Millilitre", "ml"], ["Packet", "pkt"], ["Box", "box"],
  ].map(([name, abbreviation], i) => ({
    id: seededId("f0000000", i + 1),
    store_id: STORE_ID,
    name,
    abbreviation,
    conversion_factor: 1,
  }));
  await insert("units", units);

  const supplierSeed = [
    ["Amul Dairy Corp", "Rajesh Patel", 1, 4.6, true],
    ["PepsiCo India Distribution", "Sunil Mehra", 3, 4.2, false],
    ["Shree Traders", "Mahesh Shah", 2, 4.4, true],
    ["Mumbai Wholesale Mart", "Imran Qureshi", 4, 3.9, false],
    ["Bajaj Electricals Depot", "Anita Kulkarni", 7, 4.1, false],
  ];
  const suppliers = supplierSeed.map(([name, contact, lead, rating, preferred], i) => ({
    id: seededId("50000000", i + 1),
    store_id: STORE_ID,
    name,
    contact_person: contact,
    phone: `+91 98${String(200000000 + i * 11111).slice(0, 8)}`,
    email: `${name.toLowerCase().split(" ")[0]}@suppliers.example.in`,
    address: "Ghatkopar East, Mumbai 400077",
    lead_time_days: lead,
    payment_terms: pick(["Net 15", "Net 30", "COD"]),
    rating,
    is_preferred: preferred,
    gstin: `27AAB${String(1000 + i)}G1Z${i}`,
    reliability_score: rating * 20,
    avg_lead_time: lead,
    fill_rate: 88 + i,
  }));
  await insert("suppliers", suppliers);

  /* 3. Product catalog mirroring the shelf. */
  const catByName = Object.fromEntries(categories.map((c) => [c.name, c.id]));
  const products = inventory.map((item, i) => {
    const brand = brands.find((b) => item.product_name.toLowerCase().startsWith(b.name.toLowerCase()));
    return {
      id: seededId("70000000", i + 1),
      store_id: STORE_ID,
      name: item.product_name,
      brand_id: brand?.id ?? null,
      category_id: catByName[item.category] ?? null,
      barcode: `890${String(100000000 + i * 7919).slice(0, 9)}`,
      hsn_code: item.category === "Electronics" ? "8516" : "0401",
      gst_rate: item.category === "Electronics" ? 18 : item.category === "Snacks" ? 12 : 5,
      description: `${item.product_name} stocked in ${item.category}`,
      status: "ACTIVE",
      is_archived: false,
    };
  });
  await insert("products", products);

  /* 4. Event calendar. */
  await wipe("external_events", (q) => q.gte("start_date", "2026-01-01"));
  const events = FESTIVALS.map((f, i) => ({
    id: seededId("e0000000", i + 1),
    event_name: f.name,
    event_type: "festival",
    start_date: f.date,
    end_date: dayStr(new Date(new Date(f.date).getTime() + 86400000)),
    impact_score: f.impact,
  }));
  await insert("external_events", events, "external_events");

  /* 5. Sales history. This is what the forecasts actually learn from. */
  console.log(`  generating ${HISTORY_DAYS} days of sales...`);
  await wipe("sale_items", (q) => q.like("sku", `${TAG}-%`));
  await wipe("sales", (q) => q.like("invoice_number", `${TAG}-%`));

  const { data: customers } = await db
    .from("customers").select("id").eq("store_id", STORE_ID);
  const customerIds = (customers || []).map((c) => c.id);

  const sales = [];
  const saleItems = [];
  let invoiceNo = 0;
  let itemNo = 0;

  for (let back = HISTORY_DAYS; back >= 1; back--) {
    const date = daysAgo(back);
    const ds = dayStr(date);
    const dow = date.getDay();

    /* Units sold per product today. */
    const todays = [];
    for (const item of inventory) {
      const base = VELOCITY[item.category] ?? 3;
      const qty = Math.round(
        base *
          DOW_FACTOR[dow] *
          festivalBoost(ds, item.category) *
          seasonalFactor(ds, item.category) *
          jitter(0.45)
      );
      if (qty > 0) todays.push({ item, qty });
    }
    if (!todays.length) continue;

    /* Spread the day's units across a plausible number of bills. */
    const billCount = Math.max(3, Math.round(6 * DOW_FACTOR[dow] * jitter(0.3)));
    const buckets = Array.from({ length: billCount }, () => []);
    for (const { item, qty } of todays) {
      let left = qty;
      while (left > 0) {
        const take = Math.max(1, Math.min(left, Math.ceil(rand() * 3)));
        buckets[Math.floor(rand() * billCount)].push({ item, qty: take });
        left -= take;
      }
    }

    for (const bucket of buckets) {
      if (!bucket.length) continue;
      invoiceNo++;
      const saleId = seededId("a0000000", invoiceNo);
      const at = new Date(date);
      at.setHours(8 + Math.floor(rand() * 13), Math.floor(rand() * 60), 0, 0);

      let subtotal = 0;
      let taxTotal = 0;
      const lines = [];

      for (const { item, qty } of bucket) {
        itemNo++;
        const unitPrice = Number(item.price) || 10;
        const taxPct = item.category === "Electronics" ? 18 : item.category === "Snacks" ? 12 : 5;
        const lineSub = +(unitPrice * qty).toFixed(2);
        const lineTax = +((lineSub * taxPct) / 100).toFixed(2);
        subtotal += lineSub;
        taxTotal += lineTax;
        lines.push({
          id: seededId("d0000000", itemNo),
          sale_id: saleId,
          product_id: item.id,
          product_name: item.product_name,
          sku: `${TAG}-${String(itemNo).padStart(6, "0")}`,
          category: item.category,
          unit: item.unit || "pcs",
          unit_price: unitPrice,
          mrp: unitPrice,
          purchase_price: Number(item.cost_price) || +(unitPrice * 0.82).toFixed(2),
          quantity: qty,
          subtotal: lineSub,
          tax_pct: taxPct,
          tax_amount: lineTax,
          discount_amount: 0,
          total: +(lineSub + lineTax).toFixed(2),
          created_at: at.toISOString(),
        });
      }

      subtotal = +subtotal.toFixed(2);
      taxTotal = +taxTotal.toFixed(2);
      const grand = +(subtotal + taxTotal).toFixed(2);
      const onCredit = rand() < 0.14 && customerIds.length;

      sales.push({
        id: saleId,
        store_id: STORE_ID,
        invoice_number: `${TAG}-${String(1000 + invoiceNo)}`,
        customer_id: onCredit || rand() < 0.35 ? pick(customerIds) ?? null : null,
        status: "COMPLETED",
        subtotal,
        discount_pct: 0,
        discount_amount: 0,
        tax_pct: 0,
        tax_amount: taxTotal,
        round_off: 0,
        grand_total: grand,
        payment_status: onCredit ? "PENDING" : "PAID",
        payment_method: onCredit ? "CREDIT" : pick(["CASH", "UPI", "UPI", "CARD"]),
        notes: null,
        created_at: at.toISOString(),
        updated_at: at.toISOString(),
      });
      saleItems.push(...lines);
    }
  }

  await insert("sales", sales);
  await insert("sale_items", saleItems);

  /* 6. Batches, so expiry tracking has something to track. */
  const batches = inventory.slice(0, 18).map((item, i) => {
    const received = daysAgo(20 + Math.floor(rand() * 40));
    return {
      id: seededId("90000000", i + 1),
      store_id: STORE_ID,
      // FK targets `products`, not `inventory`; products[i] mirrors inventory[i].
      product_id: products[i].id,
      batch_number: `${TAG}-B${String(i + 1).padStart(4, "0")}`,
      mfg_date: dayStr(received),
      expiry_date: item.expiry_date || dayStr(daysAgo(-30 - Math.floor(rand() * 120))),
      received_date: dayStr(received),
      cost_price: Number(item.cost_price) || 0,
      purchase_price: Number(item.cost_price) || 0,
      initial_quantity: Number(item.quantity) || 0,
    };
  });
  await insert("product_batches", batches);

  /* 7. Credit ledger movements for the existing khata accounts. */
  const { data: accounts } = await db
    .from("khata_accounts").select("id, customer_id, outstanding_balance").eq("store_id", STORE_ID);

  if (accounts?.length) {
    await wipe("khata_transactions", (q) => q.like("reference_number", `${TAG}-%`));
    const txns = [];
    let t = 0;
    for (const acc of accounts) {
      let running = 0;
      const count = 3 + Math.floor(rand() * 4);
      for (let k = 0; k < count; k++) {
        t++;
        const credit = k === 0 || rand() < 0.6;
        const amount = +(120 + rand() * 900).toFixed(2);
        running = +(running + (credit ? amount : -Math.min(amount, running))).toFixed(2);
        const when = daysAgo(60 - k * 9);
        txns.push({
          id: seededId("30000000", t),
          account_id: acc.id,
          store_id: STORE_ID,
          type: credit ? "CREDIT" : "PAYMENT",
          amount,
          running_balance: Math.max(0, running),
          payment_method: credit ? null : pick(["CASH", "UPI"]),
          reference_number: `${TAG}-K${String(t).padStart(5, "0")}`,
          due_date: dayStr(daysAgo(-15)),
          notes: credit ? "Goods on credit" : "Part payment received",
          created_at: when.toISOString(),
        });
      }
    }
    await insert("khata_transactions", txns);
  }

  /* 8. Operating expenses. */
  await wipe("expenses", (q) => q.like("receipt_ref", `${TAG}-%`));
  const expenseTypes = [
    ["RENT", 28000], ["ELECTRICITY", 6400], ["SALARY", 34000],
    ["TRANSPORT", 4200], ["MAINTENANCE", 2100], ["PACKAGING", 1800],
  ];
  const expenses = [];
  let e = 0;
  for (let m = 0; m < 4; m++) {
    for (const [type, amt] of expenseTypes) {
      e++;
      expenses.push({
        id: seededId("60000000", e),
        store_id: STORE_ID,
        expense_type: type,
        amount: +(amt * jitter(0.12)).toFixed(2),
        description: `${type.toLowerCase()} for month ${m + 1}`,
        vendor: type === "RENT" ? "Gada Properties" : "Various",
        payment_method: pick(["CASH", "UPI", "BANK"]),
        receipt_ref: `${TAG}-E${String(e).padStart(5, "0")}`,
        expense_date: dayStr(daysAgo(m * 30 + 5)),
        is_recurring: true,
        recurrence_period: "MONTHLY",
        budget_amount: amt,
      });
    }
  }
  await insert("expenses", expenses);

  /* ── summary ─────────────────────────────────────────────── */
  const span = `${dayStr(daysAgo(HISTORY_DAYS))} to ${dayStr(daysAgo(1))}`;
  const units_ = saleItems.reduce((s, i) => s + i.quantity, 0);
  const revenue = sales.reduce((s, r) => s + r.grand_total, 0);
  console.log("\nDone.");
  console.log(`  sales window   ${span}`);
  console.log(`  invoices       ${sales.length}`);
  console.log(`  line items     ${saleItems.length}`);
  console.log(`  units sold     ${units_}`);
  console.log(`  revenue        Rs.${revenue.toFixed(2)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
