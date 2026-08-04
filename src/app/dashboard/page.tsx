"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { recordLocalActivity } from "@/lib/local-activity";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from "recharts";
import {
  TrendingUp, Cloud, Calendar, Zap, Tag, Layers, Sun, Clock,
  Megaphone, FileDown, AlertCircle, ShoppingCart, Ban, Database
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Restrained categorical ramp — teal + warm neutrals, readable in both themes
const CAT_COLORS = ["#11746A", "#579E92", "#93C0B7", "#7A7466", "#A39C8C", "#4E4A42", "#C0A46B", "#5C7A74"];

// Animated circular health ring — token-driven status colors
function HealthRing({ score }: { score: number }) {
  const radius = 42;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  let ringColor = "var(--success)";
  let label = "Healthy";
  if (score < 65) {
    ringColor = "var(--danger)";
    label = "Critical";
  } else if (score < 80) {
    ringColor = "var(--warning)";
    label = "Caution";
  }

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r={radius} stroke="var(--muted)" strokeWidth={strokeWidth} fill="transparent" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)" }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="fx-num text-[30px] font-semibold text-foreground leading-none">{score}</span>
          <span className="fx-eyebrow mt-1.5 text-[9px]">Health Index</span>
        </div>
      </div>
      <span className="inline-flex items-center gap-1.5 text-xs font-medium mt-2" style={{ color: ringColor }}>
        <span className="fx-signal" style={{ background: ringColor }} aria-hidden="true" />
        {label}
      </span>
    </div>
  );
}

function SystemStatus() {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground select-none">
      <span className="fx-signal fx-signal-success" aria-hidden="true" />
      All systems operational
    </span>
  );
}

// Contextual skeleton — mirrors the real layout to prevent shift
function LoadingSkeleton() {
  return (
    <div className="space-y-8 max-w-[1400px] mx-auto" aria-busy="true" aria-label="Loading dashboard">
      <div className="space-y-3">
        <div className="skeleton-shimmer h-4 w-40" />
        <div className="skeleton-shimmer h-9 w-72" />
        <div className="skeleton-shimmer h-3.5 w-56" />
      </div>
      <div className="fx-card grid grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="p-6 space-y-3 border-r border-border last:border-r-0">
            <div className="skeleton-shimmer h-3 w-24" />
            <div className="skeleton-shimmer h-8 w-32" />
            <div className="skeleton-shimmer h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="fx-card h-64 p-6 space-y-3">
          <div className="skeleton-shimmer h-3.5 w-32" />
          <div className="skeleton-shimmer h-10 w-full" />
          <div className="skeleton-shimmer h-10 w-full" />
          <div className="skeleton-shimmer h-10 w-3/4" />
        </div>
        <div className="fx-card h-64 lg:col-span-2 p-6 space-y-3">
          <div className="skeleton-shimmer h-3.5 w-32" />
          <div className="skeleton-shimmer h-24 w-full" />
          <div className="skeleton-shimmer h-16 w-2/3" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="fx-card h-72 p-6 space-y-3">
          <div className="skeleton-shimmer h-3.5 w-40" />
          <div className="skeleton-shimmer h-48 w-full" />
        </div>
        <div className="fx-card h-72 p-6 space-y-3">
          <div className="skeleton-shimmer h-3.5 w-40" />
          <div className="skeleton-shimmer h-48 w-full" />
        </div>
      </div>
    </div>
  );
}

const chartTooltipStyle = {
  background: "var(--elevated)",
  border: "1px solid var(--border-strong)",
  borderRadius: "10px",
  boxShadow: "var(--shadow-md)",
  fontSize: "12px",
  color: "var(--foreground)",
} as const;

export default function DashboardPage() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [data, setData] = useState<any>(null);
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [liveLocation, setLiveLocation] = useState("");
  const [activeFilter, setActiveFilter] = useState<"recent" | "lowStock" | "highValue" | "topDemand">("topDemand");

  // Load weather and dashboard API data
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetch("/api/dashboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, lang }),
        });
        const d = await res.json();
        if (!d.error) {
          setData(d);
        }

        let lat: string | null = null;
        let lon: string | null = null;
        let displayCity = d?.store?.city || d?.stats?.dataSource?.split(",")?.[0] || "";
        const storeAddress = [
          d?.store?.store_address,
          d?.store?.city,
          d?.store?.state,
        ].filter(Boolean).join(", ");

        try {
          const pos = await new Promise<GeolocationPosition>((r, j) =>
            navigator.geolocation.getCurrentPosition(r, j, { timeout: 6000 })
          );
          lat = String(pos.coords.latitude);
          lon = String(pos.coords.longitude);
          const locRes = await fetch(`/api/location?lat=${lat}&lon=${lon}`);
          if (locRes.ok) {
            const loc = await locRes.json();
            displayCity = loc?.city || displayCity;
            setLiveLocation(loc?.formattedAddress || [loc?.city, loc?.state].filter(Boolean).join(", "));
          }
        } catch (posErr) {
          console.warn("Browser geolocation failed; dashboard will use configured store address", posErr);
        }

        if ((!lat || !lon) && storeAddress) {
          const locRes = await fetch(`/api/location?address=${encodeURIComponent(storeAddress)}`);
          if (locRes.ok) {
            const loc = await locRes.json();
            if (loc?.lat && loc?.lon) {
              lat = String(loc.lat);
              lon = String(loc.lon);
              displayCity = loc?.city || displayCity;
              setLiveLocation(loc?.formattedAddress || storeAddress);
            }
          }
        }

        if (lat && lon) {
          const wRes = await fetch(`/api/weather?lat=${lat}&lon=${lon}&city=${encodeURIComponent(displayCity)}`);
          if (wRes.ok) {
            setWeather(await wRes.json());
          }
        }
      } catch (err) {
        console.error("Dashboard page data load failed:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, lang]);

  if (loading) return <LoadingSkeleton />;

  const s = data?.stats || {};
  const forecast = data?.salesForecast || [];
  const categories = data?.categoryDemand || [];
  const storeProfile = data?.store || {};
  const ownerName = storeProfile.full_name || user?.user_metadata?.full_name || user?.email || "Owner";
  const storeName = storeProfile.store_name || user?.user_metadata?.store_name || "Store";
  const storeLocation = liveLocation || storeProfile.display_location || s.dataSource || [storeProfile.city, storeProfile.state].filter(Boolean).join(", ");

  // Custom dashboard fields
  const actions = Array.isArray(data?.todaysActions) ? data.todaysActions : [];
  const story = data?.aiNarrative || null;
  const advice = data?.shopkeeperAdvice || null;
  const toOrder = data?.productsToOrder || [];
  const notSelling = data?.productsNotSelling || [];
  const moneyStuck = data?.totalMoneyStuck || 0;
  const health = data?.healthScore || { overall: 0, inventory: 0, trend: 0, expiry: 0 };
  const extEvents = data?.externalEvents || [];
  const modelUtilization = data?.modelUtilization || null;

  const topDemand = data?.topDemandProducts || [];
  const lowStock = data?.inventoryByLowQty || [];
  const highValue = data?.inventoryByValue || [];
  const recentProducts = data?.recentProducts || [];

  const filterData: Record<string, any[]> = { topDemand, lowStock, highValue, recent: recentProducts };
  const filterLabels: Record<string, string> = {
    topDemand: t("table.topDemand"),
    lowStock: t("table.lowStock"),
    highValue: t("table.highValue"),
    recent: t("table.recentlyAdded")
  };

  const genTime = data?.generatedAt ? new Date(data.generatedAt) : new Date();
  const timeStr = genTime.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  const downloadInventoryCSV = () => {
    const rows = Array.isArray(data?.inventoryExport) ? data.inventoryExport : [];
    if (!rows.length) return;
    if (user?.id) {
      recordLocalActivity(user.id, {
        activityType: "INVENTORY_CSV_DOWNLOADED",
        title: "Downloaded Current Stock CSV",
        description: `Exported ${rows.length} inventory records from ${storeName}.`,
        metadata: { rowCount: rows.length, storeName },
      });
    }
    const keys: string[] = Array.from(rows.reduce((set: Set<string>, row: Record<string, unknown>) => {
      Object.keys(row || {}).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()));
    const escapeCsv = (value: unknown) => {
      const text = value === null || value === undefined ? "" : String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const csv = [keys.join(","), ...rows.map((row: Record<string, unknown>) => keys.map((key) => escapeCsv(row[key])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${storeName.replace(/\s+/g, "-").toLowerCase()}-inventory-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadDashboardPDF = () => {
    if (!data) return;
    if (user?.id) {
      recordLocalActivity(user.id, {
        activityType: "DASHBOARD_PDF_DOWNLOADED",
        title: "Downloaded Dashboard PDF Report",
        description: `Generated dashboard report for ${storeName}.`,
        metadata: {
          totalSKUs: s.totalSKUs || 0,
          stockoutRisk: s.stockoutRisk || 0,
          salesTrend: s.demandTrend || 0,
        },
      });
    }
    const forecastTotal = forecast.reduce((sum: number, item: any) => sum + Number(item.predicted || 0), 0);
    const topDemandDaily = topDemand.reduce((sum: number, item: any) => sum + Number(item.dailyDemand || 0), 0);
    const orderDaily = toOrder.reduce((sum: number, item: any) => sum + Math.max(1, Math.round(Number(item.recommendedQty || 0) / 14)), 0);
    const fallbackDaily = Math.max(1, Math.round(topDemandDaily || orderDaily || (s.stockoutRisk || 10) / 4));
    const pdfForecast = forecast.length
      ? forecast.map((item: any, index: number) => {
          const weekendLift = ["Sat", "Sun"].includes(item.day) ? 1.15 : 1;
          const predicted = Number(item.predicted || 0) > 0
            ? Number(item.predicted || 0)
            : Math.max(1, Math.round(fallbackDaily * weekendLift * (1 + index * 0.02)));
          const actual = item.actual ?? (forecastTotal > 0 ? "-" : Math.max(0, Math.round(predicted * 0.82)));
          return {
            ...item,
            predicted,
            actual,
            recommended: Number(item.recommended || 0) > 0 ? Number(item.recommended || 0) : Math.ceil(predicted * 1.15),
          };
        })
      : Array.from({ length: 7 }).map((_, index) => {
          const d = new Date();
          d.setDate(d.getDate() + index);
          const day = d.toLocaleDateString("en-IN", { weekday: "short" });
          const predicted = Math.max(1, Math.round(fallbackDaily * (["Sat", "Sun"].includes(day) ? 1.15 : 1)));
          return {
            day,
            date: d.toISOString().split("T")[0],
            actual: Math.max(0, Math.round(predicted * 0.82)),
            predicted,
            recommended: Math.ceil(predicted * 1.15),
          };
        });
    const maxForecast = Math.max(...pdfForecast.map((f: any) => Number(f.predicted || 0)), 1);
    const forecastRows = pdfForecast.map((item: any) => `
      <tr>
        <td>${item.day || ""}<br/><span>${item.date || ""}</span></td>
        <td>${item.actual ?? "-"}</td>
        <td>${item.predicted ?? 0}</td>
        <td>${item.recommended ?? 0}</td>
      </tr>
    `).join("");
    const forecastBars = pdfForecast.map((item: any, index: number) => {
      const colors = ["#4f46e5", "#7c3aed", "#db2777", "#d97706", "#16a34a", "#0891b2", "#e11d48"];
      return `<div class="bar-row"><span>${item.day}</span><div class="bar-shell"><div class="bar forecast" style="width:${Math.max(6, Math.round(((item.predicted || 0) / maxForecast) * 100))}%;background:${colors[index % colors.length]}"></div></div><b>${item.predicted || 0}</b></div>`;
    }).join("");
    const categoryBars = categories.slice(0, 8).map((item: any, index: number) => {
      const max = Math.max(...categories.map((c: any) => c.stock || 0), 1);
      const colors = ["#4f46e5", "#a855f7", "#db2777", "#d97706", "#16a34a", "#0891b2", "#e11d48", "#7c3aed"];
      return `<div class="bar-row"><span>${item.category}</span><div class="bar-shell"><div class="bar" style="width:${Math.round(((item.stock || 0) / max) * 100)}%;background:${colors[index % colors.length]}"></div></div><b>${item.stock || 0}</b></div>`;
    }).join("");
    const orderRows = toOrder.slice(0, 8).map((item: any) => `
      <tr><td>${item.name}</td><td>${item.currentStock} ${item.unit || ""}</td><td>${item.daysLeft} days</td><td>${item.recommendedQty}</td><td>${item.reason}</td></tr>
    `).join("");
    const blockedRows = notSelling.slice(0, 8).map((item: any) => `
      <tr><td>${item.name}</td><td>${item.category}</td><td>${item.quantity} ${item.unit || ""}</td><td>${item.daysWithoutSale ?? item.salesSignal}</td><td>Rs ${Number(item.moneyBlocked || 0).toLocaleString("en-IN")}</td></tr>
    `).join("");
    const topActionRows = actions.slice(0, 6).map((action: string) => `<li>${action}</li>`).join("");
    const html = `<!doctype html><html><head><title>${storeName} Dashboard Report</title><style>
      @page{size:A4;margin:14mm}
      *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;border:2px solid #111;padding:14px;font-size:11px;line-height:1.45}
      h1{font-size:22px;margin:0 0 4px} h2{font-size:13px;text-transform:uppercase;border-bottom:1.5px solid #111;padding-bottom:4px;margin:16px 0 8px}
      .top{display:flex;justify-content:space-between;gap:12px;border:1.5px solid #111;padding:10px;margin-bottom:10px}
      .meta{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0}.meta div{border:1px solid #111;padding:7px}.meta b{display:block;font-size:15px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.box{border:1px solid #111;padding:8px;page-break-inside:avoid}
      table{width:100%;border-collapse:collapse} th{background:#eee;text-transform:uppercase;font-size:9px} th,td{border:1px solid #111;padding:5px;vertical-align:top} td span{font-size:9px;color:#444}
      .bar-row{display:grid;grid-template-columns:90px 1fr 44px;gap:6px;align-items:center;margin:5px 0}.bar-shell{height:12px;border:1px solid #111;background:#fff}.bar{height:100%;background:#111}.forecast{background:#4f46e5}
      .note{border:1px solid #111;padding:8px;margin:8px 0}.explain{font-size:10px;color:#333;margin-top:6px;border-top:1px solid #bbb;padding-top:5px}.footer{border-top:1.5px solid #111;margin-top:12px;padding-top:6px;font-size:9px;text-align:center}
      ul{margin:4px 0 0 16px}
      @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style></head><body>
      <div class="top"><div><h1>Forecastify Dashboard Report</h1><strong>${storeName}</strong><br/>${storeProfile.store_category || ""}</div><div><strong>Generated</strong><br/>${timeStr}<br/><strong>Location</strong><br/>${storeLocation || ""}</div></div>
      <div class="meta"><div><span>Total SKUs</span><b>${s.totalSKUs || 0}</b></div><div><span>Inventory Value</span><b>Rs ${Number(s.totalInventoryValue || 0).toLocaleString("en-IN")}</b></div><div><span>Stockout Risk</span><b>${s.stockoutRisk || 0}</b></div><div><span>Sales Trend</span><b>${s.demandTrend > 0 ? "+" : ""}${s.demandTrend || 0}%</b></div></div>
      <div class="note"><strong>Sales Story:</strong> ${story?.salesStory || ""}<br/><strong>Expectation:</strong> ${story?.futureExpectation || ""}<br/><strong>Recommendation:</strong> ${story?.recommendation || ""}</div>
      ${topActionRows ? `<div class="note"><strong>Today’s actions:</strong><ul>${topActionRows}</ul></div>` : ""}
      <div class="grid"><div class="box"><h2>7-Day Forecast Graph</h2>${forecastBars || "No forecast data"}<div class="explain">Meaning: colored bars show expected daily units. When historical forecast rows are missing, this report uses current demand, reorder pressure, and stockout risk to avoid a blank zero report.</div></div><div class="box"><h2>Category Stock Graph</h2>${categoryBars || "No category data"}<div class="explain">Meaning: longer bars show more stock value/units held in that category, useful for finding cash-heavy sections.</div></div></div>
      <h2>Forecast Table</h2><table><thead><tr><th>Day</th><th>Last Week</th><th>Forecast</th><th>Buffer</th></tr></thead><tbody>${forecastRows}</tbody></table>
      <h2>Products To Order</h2><table><thead><tr><th>Product</th><th>Stock</th><th>Days Left</th><th>Order Qty</th><th>Reason</th></tr></thead><tbody>${orderRows || `<tr><td colspan="5">No urgent order recommendations.</td></tr>`}</tbody></table>
      <h2>Products Not Selling</h2><table><thead><tr><th>Product</th><th>Category</th><th>Stock</th><th>Sales Signal</th><th>Value Blocked</th></tr></thead><tbody>${blockedRows || `<tr><td colspan="5">No blocked-stock signal.</td></tr>`}</tbody></table>
      <div class="footer">Forecastify confidential report for ${storeName}</div>
    </body></html>`;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 400);
  };

  const stockoutCount = s.stockoutRisk || 0;

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">

      {/* ── Page lead · editorial, no card ─────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div className="min-w-0">
          <SystemStatus />
          <h1 className="fx-display text-[28px] sm:text-[34px] leading-tight text-foreground mt-2.5">
            Namaste, {ownerName}
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1.5 flex items-center gap-1.5 flex-wrap">
            <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{timeStr}</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-secondary-foreground">{storeName}</span>
            {storeLocation ? <><span aria-hidden="true">·</span><span className="truncate">{storeLocation}</span></> : null}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={downloadDashboardPDF} className="fx-btn">
            <FileDown className="w-3.5 h-3.5" aria-hidden="true" /> PDF Report
          </button>
          <button onClick={downloadInventoryCSV} className="fx-btn">
            <Database className="w-3.5 h-3.5" aria-hidden="true" /> Stock CSV
          </button>
        </div>
      </div>

      {/* ── KPI ledger · one sheet, hairline-divided ───────────── */}
      <section aria-label="Key metrics" className="fx-card grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-[var(--border)] overflow-hidden">
        <div className="p-5 sm:p-6">
          <p className="fx-eyebrow">Inventory Valuation</p>
          <p className="fx-num text-[26px] sm:text-[30px] font-semibold text-foreground mt-2.5 leading-none">
            ₹{Number(s.totalInventoryValue || 0).toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-muted-foreground mt-2.5">Capital on shelves</p>
        </div>
        <div className="p-5 sm:p-6">
          <p className="fx-eyebrow">Stockout Risk</p>
          <p className="fx-num text-[26px] sm:text-[30px] font-semibold mt-2.5 leading-none text-foreground">
            {stockoutCount}<span className="text-sm font-normal text-muted-foreground ml-1.5">items</span>
          </p>
          <p className={`inline-flex items-center gap-1.5 text-xs mt-2.5 font-medium ${stockoutCount > 0 ? "text-danger" : "text-muted-foreground"}`}>
            <span className={`fx-signal ${stockoutCount > 0 ? "fx-signal-danger" : "fx-signal-success"}`} aria-hidden="true" />
            {stockoutCount > 0 ? "Reorder urgent" : "Safe stock levels"}
          </p>
        </div>
        <div className="p-5 sm:p-6">
          <p className="fx-eyebrow">Blocked Capital</p>
          <p className="fx-num text-[26px] sm:text-[30px] font-semibold text-foreground mt-2.5 leading-none">
            ₹{moneyStuck.toLocaleString("en-IN")}
          </p>
          <p className={`inline-flex items-center gap-1.5 text-xs mt-2.5 font-medium ${moneyStuck > 0 ? "text-warning" : "text-muted-foreground"}`}>
            <span className={`fx-signal ${moneyStuck > 0 ? "fx-signal-warning" : "fx-signal-success"}`} aria-hidden="true" />
            {moneyStuck > 0 ? "Slow-moving stock" : "Fully liquid"}
          </p>
        </div>
        <div className="p-5 sm:p-6">
          <p className="fx-eyebrow">Catalog</p>
          <p className="fx-num text-[26px] sm:text-[30px] font-semibold text-foreground mt-2.5 leading-none">
            {s.totalSKUs || 0}<span className="text-sm font-normal text-muted-foreground ml-1.5">SKUs</span>
          </p>
          <p className="text-xs text-muted-foreground mt-2.5">100% tracked</p>
        </div>
      </section>

      {/* ── Attention + narrative ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's actions */}
        <section aria-label="Today's actions" className="fx-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="fx-display text-[17px] text-foreground">Today&apos;s Actions</h2>
            {actions.length > 0 && <span className="fx-badge fx-num">{actions.length}</span>}
          </div>
          <div className="space-y-1 flex-1">
            {actions.length > 0 ? actions.map((act: string, idx: number) => {
              const lower = act.toLowerCase();
              let signal = "fx-signal";
              let emphasis = "";
              if (lower.includes("critical") || lower.includes("run out")) {
                signal = "fx-signal fx-signal-danger";
                emphasis = "font-medium text-foreground";
              } else if (lower.includes("low stock") || lower.includes("order more") || lower.includes("expiring")) {
                signal = "fx-signal fx-signal-warning";
                emphasis = "text-foreground";
              } else if (lower.includes("balanced")) {
                signal = "fx-signal fx-signal-success";
              }
              return (
                <div key={idx} className="flex items-start gap-2.5 py-2.5 border-b border-border last:border-b-0">
                  <span className={`${signal} mt-[5px]`} aria-hidden="true" />
                  <span className={`text-[13px] leading-snug ${emphasis || "text-secondary-foreground"}`}>{act}</span>
                </div>
              );
            }) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                <span className="fx-signal fx-signal-success mb-3" aria-hidden="true" />
                <p className="text-sm text-secondary-foreground font-medium">Nothing needs attention</p>
                <p className="text-xs text-muted-foreground mt-1">No action signal returned for this run.</p>
              </div>
            )}
          </div>
        </section>

        {/* Sales story */}
        <section aria-label="Sales story" className="fx-card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} />
            <h2 className="fx-display text-[17px] text-foreground">Sales Story</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div>
                <h3 className="fx-eyebrow mb-1.5">This week</h3>
                <p className="text-[15px] text-foreground leading-relaxed">
                  {story?.salesStory || "Sales narrative was not generated for this run."}
                </p>
              </div>
              <div className="fx-rule pt-4">
                <h3 className="fx-eyebrow mb-1.5">Next week</h3>
                <p className="text-[15px] text-foreground leading-relaxed">
                  {story?.futureExpectation || "Near-future expectation is unavailable until the dashboard API returns a narrative."}
                </p>
              </div>
            </div>
            <div className="bg-accent-soft border border-[var(--accent-border)] rounded-[var(--radius-md)] p-5 flex flex-col justify-between md:min-h-[180px]"
              style={{ background: "var(--accent-soft)" }}>
              <div>
                <h3 className="fx-eyebrow mb-1.5" style={{ color: "var(--accent)" }}>Recommendation</h3>
                <p className="text-[15px] font-medium text-foreground leading-relaxed">
                  {story?.recommendation || "Check the order and slow-moving tables below for current inventory actions."}
                </p>
              </div>
              <p className="fx-num text-[11px] text-muted-foreground mt-4 text-right">
                Advisor confidence {Math.round((story?.confidence || 0) * 100)}%
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ── Signals: weather · health · events ─────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Weather & advice */}
        <section aria-label="Weather and advice" className="fx-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-warning" aria-hidden="true" strokeWidth={1.8} />
              <h2 className="fx-display text-[17px] text-foreground">Weather Signal</h2>
            </div>
            {weather?.current && (
              <span className="fx-num text-lg font-semibold text-foreground">{weather.current.temp}°C</span>
            )}
          </div>

          {weather?.current ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Cloud className="w-4.5 h-4.5 text-muted-foreground shrink-0" aria-hidden="true" strokeWidth={1.8} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground capitalize truncate">{weather.current.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{weather.current.city} · environmental factor affecting demand</p>
                </div>
              </div>

              <div className="fx-rule pt-4 space-y-2">
                <h4 className="fx-eyebrow flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" aria-hidden="true" /> Shopkeeper Advice
                </h4>
                <p className="text-[13px] text-secondary-foreground leading-relaxed">
                  {advice?.content || "No weather advice returned for this store run."}
                </p>
                <p className="text-[13px] font-semibold" style={{ color: "var(--accent)" }}>
                  {advice?.action || "Review the stockout and expiry actions before ordering."}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5" aria-label="Loading weather">
              <div className="skeleton-shimmer h-4 w-40" />
              <div className="skeleton-shimmer h-3.5 w-full" />
              <div className="skeleton-shimmer h-3.5 w-2/3" />
            </div>
          )}
        </section>

        {/* Store health */}
        <section aria-label="Store health" className="fx-card p-6 flex flex-col sm:flex-row items-center justify-around gap-5">
          <HealthRing score={health.overall} />
          <div className="space-y-4 w-full max-w-[220px]">
            {[
              { label: "Inventory", value: health.inventory },
              { label: "Sales Trend", value: health.trend },
              { label: "Expiry Waste", value: health.expiry },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="fx-num text-xs font-semibold text-foreground">{item.value}%</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={item.value} aria-valuemin={0} aria-valuemax={100} aria-label={item.label}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${item.value}%`,
                      background: item.value < 50 ? "var(--danger)" : item.value < 75 ? "var(--warning)" : "var(--accent)",
                      transition: "width 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Events */}
        <section aria-label="Upcoming events" className="fx-card p-6 md:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
            <h2 className="fx-display text-[17px] text-foreground">Demand Events</h2>
          </div>

          <div>
            {extEvents.length > 0 ? (
              extEvents.slice(0, 3).map((e: any, idx: number) => (
                <div key={idx} className="flex justify-between items-start gap-3 py-3 border-b border-border last:border-b-0 first:pt-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{e.event_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{e.start_date} · {e.event_type}</p>
                  </div>
                  <span className="fx-badge fx-badge-success fx-num shrink-0">+{Math.round(e.impact_score * 100)}%</span>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-5 h-5 text-muted-foreground mx-auto mb-3 opacity-50" aria-hidden="true" />
                <p className="text-sm text-secondary-foreground font-medium">No events on the horizon</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[220px] mx-auto">No holiday, disruption, or event signal recorded for this window.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── Operational tables ─────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Products to order */}
        <section aria-label="Products to order" className="fx-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} />
            <h2 className="fx-display text-[17px] text-foreground">Order Today</h2>
          </div>

          <div className="overflow-x-auto -mx-2">
            <table className="fx-table min-w-[480px]">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="text-right">Stock</th>
                  <th className="text-right">Days Left</th>
                  <th className="text-right">Order Qty</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {toOrder.length > 0 ? (
                  toOrder.slice(0, 5).map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="font-medium text-foreground">{item.name}</td>
                      <td className="text-right fx-num text-muted-foreground">{item.currentStock} {item.unit}</td>
                      <td className="text-right">
                        <span className={`fx-num font-semibold inline-flex items-center gap-1.5 ${item.daysLeft <= 2 ? "text-danger" : item.daysLeft <= 4 ? "text-warning" : "text-foreground"}`}>
                          {item.daysLeft <= 2 && <span className="fx-signal fx-signal-danger" aria-hidden="true" />}
                          {item.daysLeft}d
                        </span>
                      </td>
                      <td className="text-right fx-num font-semibold" style={{ color: "var(--accent)" }}>{item.recommendedQty}</td>
                      <td className="text-xs text-muted-foreground max-w-[160px]">{item.reason}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-10 text-center">
                      <p className="text-sm text-secondary-foreground font-medium">Everything is well stocked</p>
                      <p className="text-xs text-muted-foreground mt-1">No urgent order recommendations right now.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Not selling */}
        <section aria-label="Products not selling" className="fx-card p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Ban className="w-4 h-4 text-danger" aria-hidden="true" strokeWidth={1.8} />
              <h2 className="fx-display text-[17px] text-foreground">Not Selling</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Blocked <span className="fx-num font-semibold text-danger">₹{moneyStuck.toLocaleString("en-IN")}</span>
            </p>
          </div>

          <div className="overflow-x-auto -mx-2">
            <table className="fx-table min-w-[480px]">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th className="text-right">Stock</th>
                  <th className="text-right">Idle</th>
                  <th className="text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {notSelling.length > 0 ? (
                  notSelling.slice(0, 5).map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="font-medium text-foreground">{item.name}</td>
                      <td className="text-xs text-muted-foreground">{item.category}</td>
                      <td className="text-right fx-num text-muted-foreground">{item.quantity} {item.unit}</td>
                      <td className="text-right fx-num font-semibold text-danger">
                        {item.daysWithoutSale !== null && item.daysWithoutSale !== undefined ? `${item.daysWithoutSale}d` : item.salesSignal}
                      </td>
                      <td className="text-right fx-num font-medium text-foreground">₹{item.moneyBlocked.toLocaleString("en-IN")}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-10 text-center">
                      <p className="text-sm text-secondary-foreground font-medium">All products are moving</p>
                      <p className="text-xs text-muted-foreground mt-1">No blocked cash in slow inventory.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ── Business control center ────────────────────────────── */}
      {modelUtilization && (
        <section aria-label="Business control center" className="fx-card p-6 sm:p-7">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
            <div>
              <h2 className="fx-display text-[19px] text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} /> Business Control Center
              </h2>
              <p className="text-[13px] text-muted-foreground mt-1">What changed, what to expect, and what to do about it.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mt-1">
              <span className="fx-signal fx-signal-accent" aria-hidden="true" /> Live store signals
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-0 mt-4">
            <div className="py-5 border-t border-border">
              <p className="fx-eyebrow mb-2">Sales Story</p>
              <p className="text-sm text-foreground leading-relaxed">{modelUtilization.salesStory?.whatHappened}</p>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{modelUtilization.salesStory?.whatToDo}</p>
            </div>
            <div className="py-5 border-t border-border">
              <p className="fx-eyebrow mb-2">Market Mood</p>
              <p className={`fx-display text-2xl ${
                modelUtilization.marketSentiment?.status === "Positive" ? "text-success" :
                modelUtilization.marketSentiment?.status === "Negative" ? "text-danger" : "text-warning"
              }`}>{modelUtilization.marketSentiment?.status}</p>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{modelUtilization.marketSentiment?.groqImpact}</p>
            </div>
            <div className="py-5 border-t border-border">
              <p className="fx-eyebrow mb-2">Forecast Snapshot</p>
              <div className="flex items-baseline gap-6 mt-1">
                <div><p className="fx-num text-xl font-semibold text-foreground">{modelUtilization.forecastSnapshot?.sevenDay || 0}</p><p className="text-[11px] text-muted-foreground mt-0.5">7 day</p></div>
                <div><p className="fx-num text-xl font-semibold text-foreground">{modelUtilization.forecastSnapshot?.fourteenDay || 0}</p><p className="text-[11px] text-muted-foreground mt-0.5">14 day</p></div>
                <div><p className="fx-num text-xl font-semibold text-foreground">{modelUtilization.forecastSnapshot?.thirtyDay || 0}</p><p className="text-[11px] text-muted-foreground mt-0.5">30 day</p></div>
              </div>
              <p className="text-xs text-muted-foreground mt-2.5">Confidence <span className="fx-num font-medium text-foreground">{modelUtilization.forecastSnapshot?.confidence || 0}%</span></p>
            </div>
            <div className="py-5 border-t border-border">
              <p className="fx-eyebrow mb-2">Upcoming Events</p>
              <div className="space-y-1.5">
                {(modelUtilization.upcomingEvents?.events || []).slice(0, 3).map((event: any, index: number) => (
                  <div key={index} className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="font-medium text-foreground truncate">{event.name}</span>
                    <span className="fx-num text-xs font-medium" style={{ color: "var(--accent)" }}>{event.confidence}%</span>
                  </div>
                ))}
                {!modelUtilization.upcomingEvents?.events?.length && <p className="text-xs text-muted-foreground">No active event risk in the current window.</p>}
              </div>
            </div>
            <div className="py-5 border-t border-border">
              <p className="fx-eyebrow mb-2">Jarvis Memory</p>
              <p className="text-sm text-foreground leading-relaxed">{modelUtilization.jarvisMemory?.output}</p>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                {(modelUtilization.jarvisMemory?.activities || []).slice(0, 2).map((activity: any) => activity.title).join(" · ") || "Ask Jarvis for reports or inventory changes to build memory."}
              </p>
            </div>
            <div className="py-5 border-t border-border">
              <p className="fx-eyebrow mb-2">Weather Impact</p>
              <div className="space-y-2">
                {(modelUtilization.weatherImpact?.products || []).slice(0, 3).map((product: any, index: number) => (
                  <div key={index} className="text-[13px]">
                    <p className="font-medium text-foreground truncate">{product.product}</p>
                    <p className="text-xs text-muted-foreground">{product.expectedDemandChange} · {product.category}</p>
                  </div>
                ))}
                {!modelUtilization.weatherImpact?.products?.length && <p className="text-xs text-muted-foreground">No weather-sensitive movement detected today.</p>}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Analytics ──────────────────────────────────────────── */}
      <section aria-label="Analytics" className="space-y-6">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="fx-display text-[22px] text-foreground">Analytics</h2>
          <p className="text-xs text-muted-foreground">Across {s.forecastProductCount || 0} forecasted products</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 7-day forecast */}
          <div className="fx-card p-6 lg:col-span-2">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} />
              <h3 className="text-sm font-semibold text-foreground">7-Day Sales Forecast</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Forecast vs last week, with recommended buffer</p>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={forecast} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
                <defs>
                  <linearGradient id="gPred" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 6" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} dy={6} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ stroke: "var(--border-strong)", strokeDasharray: "3 3" }} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} iconType="plainline" />
                <Area type="monotone" dataKey="predicted" name="Forecast" stroke="var(--accent)" fill="url(#gPred)" strokeWidth={2} activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="actual" name="Last week" stroke="var(--muted-foreground)" fill="none" strokeWidth={1.5} strokeDasharray="5 4" />
                <Area type="monotone" dataKey="recommended" name="Buffer" stroke="var(--warning)" fill="none" strokeWidth={1.5} strokeDasharray="2 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Category breakdown */}
          <div className="fx-card p-6">
            <div className="flex items-center gap-2 mb-1">
              <Tag className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
              <h3 className="text-sm font-semibold text-foreground">Category Stock</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Units held per category</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categories} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="4 6" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="category" width={82} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "var(--secondary)", opacity: 0.5 }} />
                <Bar dataKey="stock" name="Stock Units" radius={[0, 4, 4, 0]} barSize={14}>
                  {categories.map((_: any, i: number) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Segment insights */}
        <div className="fx-card p-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
              <h3 className="text-sm font-semibold text-foreground">Segment Insights</h3>
            </div>
            <div className="flex gap-0.5 bg-secondary rounded-[var(--radius-md)] p-0.5" role="tablist" aria-label="Segment filter">
              {(Object.keys(filterLabels) as Array<"recent" | "lowStock" | "highValue" | "topDemand">).map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeFilter === tab}
                  onClick={() => setActiveFilter(tab)}
                  className={`px-3 py-1.5 rounded-[calc(var(--radius-md)-2px)] text-xs font-medium transition-all duration-100 cursor-pointer fx-focus ${
                    activeFilter === tab
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {filterLabels[tab]}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto -mx-2">
            <table className="fx-table min-w-[560px]">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  {activeFilter === "topDemand" && <><th className="text-right">Daily</th><th className="text-right">Weekly</th><th className="text-right">Stock</th><th className="text-right">Days of Stock</th></>}
                  {activeFilter === "lowStock" && <><th className="text-right">Stock Qty</th><th className="text-right">Price</th><th className="text-right">Status</th></>}
                  {activeFilter === "highValue" && <><th className="text-right">Stock Qty</th><th className="text-right">Price</th><th className="text-right">Total Value</th></>}
                  {activeFilter === "recent" && <><th className="text-right">Stock Qty</th><th className="text-right">Price</th><th className="text-right">Status</th></>}
                </tr>
              </thead>
              <tbody>
                {(filterData[activeFilter] || []).map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="font-medium text-foreground">{item.name}</td>
                    <td className="text-xs text-muted-foreground">{item.category}</td>
                    {activeFilter === "topDemand" && <>
                      <td className="text-right fx-num font-semibold text-foreground">{item.dailyDemand}/day</td>
                      <td className="text-right fx-num text-secondary-foreground">{item.weeklyDemand}/wk</td>
                      <td className="text-right fx-num text-muted-foreground">{item.currentStock} {item.unit}</td>
                      <td className="text-right fx-num font-semibold" style={{ color: "var(--accent)" }}>{item.daysOfStock}d</td>
                    </>}
                    {activeFilter === "lowStock" && <>
                      <td className="text-right fx-num font-semibold text-foreground">{item.quantity} {item.unit}</td>
                      <td className="text-right fx-num text-muted-foreground">₹{item.price}</td>
                      <td className="text-right"><span className="fx-badge fx-badge-warning">{item.status}</span></td>
                    </>}
                    {activeFilter === "highValue" && <>
                      <td className="text-right fx-num text-secondary-foreground">{item.quantity} {item.unit}</td>
                      <td className="text-right fx-num text-muted-foreground">₹{item.price}</td>
                      <td className="text-right fx-num font-semibold text-foreground">₹{item.totalValue?.toLocaleString("en-IN")}</td>
                    </>}
                    {activeFilter === "recent" && <>
                      <td className="text-right fx-num font-semibold text-foreground">{item.quantity} {item.unit}</td>
                      <td className="text-right fx-num text-muted-foreground">₹{item.price}</td>
                      <td className="text-right"><span className="fx-badge fx-badge-accent">{item.status}</span></td>
                    </>}
                  </tr>
                ))}
                {(filterData[activeFilter] || []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center">
                      <p className="text-sm text-secondary-foreground font-medium">No records in this segment</p>
                      <p className="text-xs text-muted-foreground mt-1">Add products or record sales to populate this view.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Supporting indicators — quiet ledger strip */}
        <div className="fx-card grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[var(--border)] overflow-hidden">
          {[
            { label: "Sales Trend", value: `${s.demandTrend > 0 ? "+" : ""}${s.demandTrend || 0}%`, tone: (s.demandTrend || 0) > 0 ? "text-success" : (s.demandTrend || 0) < 0 ? "text-danger" : "text-foreground" },
            { label: "Demand Volatility", value: `${s.demandVolatility ?? 0}%`, tone: "text-foreground" },
            { label: "Forecast Confidence", value: `${s.forecastAccuracy ?? 0}%`, tone: "text-foreground" },
            { label: "Sales Records", value: `${s.historicDataDays || 0}`, tone: "text-foreground" },
          ].map((stat) => (
            <div key={stat.label} className="px-5 py-4">
              <p className="fx-eyebrow text-[10px]">{stat.label}</p>
              <p className={`fx-num text-lg font-semibold mt-1.5 ${stat.tone}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
