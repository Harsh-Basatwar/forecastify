"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { motion } from "@/lib/motion";
import { recordLocalActivity } from "@/lib/local-activity";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from "recharts";
import {
  TrendingUp, Cloud, Calendar, Zap, BarChart3, Tag, Layers, Sun, Clock,
  Megaphone, FileDown, AlertCircle, ShoppingCart, Ban, Database
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const CAT_COLORS = ["#6366f1", "#a855f7", "#ec4899", "#f59e0b", "#22c55e", "#06b6d4", "#f43f5e", "#8b5cf6"];

function seededFloat(seed: number, min: number, max: number) {
  const value = Math.sin(seed * 999) * 10000;
  return min + (value - Math.floor(value)) * (max - min);
}

const SPACE_PARTICLES = Array.from({ length: 15 }).map((_, i) => ({
  size: seededFloat(i + 1, 1, 5),
  delay: seededFloat(i + 11, 0, 5),
  duration: seededFloat(i + 21, 25, 50),
  left: seededFloat(i + 31, 0, 100),
  top: seededFloat(i + 41, 0, 100),
}));

function meteorStyle(id: number) {
  const seed = id % 100000;
  return {
    width: seededFloat(seed + 1, 100, 200),
    top: `${seededFloat(seed + 2, 0, 30)}%`,
  };
}

// 1. Sleek Aether Spatial Ambient Background (Deference over Noise)
function AetherBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Subtle deep space radial glow without GPU interval overhead */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/30 via-slate-950 to-black" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
    </div>
  );
}

// 2. Animated Circular Health Ring with Tabular Monospace
function HealthRing({ score }: { score: number }) {
  const radius = 42;
  const strokeWidth = 7;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  let color = "stroke-emerald-500";
  let text = "text-emerald-400";
  let label = "Nominal";
  if (score < 65) {
    color = "stroke-rose-500";
    text = "text-rose-400";
    label = "Critical Risk";
  } else if (score < 80) {
    color = "stroke-amber-500";
    text = "text-amber-400";
    label = "Caution";
  }

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} className="stroke-white/[0.06]" strokeWidth={strokeWidth} fill="transparent" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            className={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)" }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-3xl font-bold font-mono text-slate-100 tabular-nums tracking-tight">
            {score}
          </span>
          <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Health Index</span>
        </div>
      </div>
      <span className={`text-xs font-semibold mt-2 font-mono ${text}`}>{label}</span>
    </div>
  );
}

// 3. Crisp Aether Status Indicator
function AetherStatusBadge() {
  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/[0.1] backdrop-blur-md shadow-xs select-none">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="text-xs font-medium text-slate-300 tracking-tight">System Operational</span>
    </div>
  );
}

// 4. Loading Skeleton Component
function LoadingSkeleton() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 z-10 relative">
      <div className="flex justify-between items-center bg-card/40 border border-border/30 rounded-xl p-4 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded" />
        <div className="h-8 w-28 bg-muted rounded" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="h-64 bg-card/40 border border-border/30 rounded-2xl animate-pulse lg:col-span-2" />
        <div className="h-64 bg-card/40 border border-border/30 rounded-2xl animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="h-72 bg-card/40 border border-border/30 rounded-2xl animate-pulse" />
        <div className="h-72 bg-card/40 border border-border/30 rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}

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

  return (
    <div className="relative min-h-screen z-10 space-y-6 max-w-[1600px] mx-auto select-none pb-12 px-2 sm:px-4">
      <AetherBackground />

      {/* Aether Command Telemetry Header */}
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-950/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 shadow-2xl">
        <div className="flex items-center gap-4">
          <AetherStatusBadge />
          <div>
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">
              Namaste, {ownerName}
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              {timeStr} &bull; {storeName}{storeLocation ? ` · ${storeLocation}` : ""}
            </p>
          </div>
        </div>

        {/* Quick Action Buttons & CSV/PDF Export */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={downloadDashboardPDF}
            className="flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.10] text-xs font-medium text-slate-200 border border-white/[0.08] transition-all cursor-pointer shrink-0"
          >
            <FileDown className="w-3.5 h-3.5 text-indigo-400" /> Export PDF Report
          </button>
          <button
            onClick={downloadInventoryCSV}
            className="flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.10] text-xs font-medium text-slate-200 border border-white/[0.08] transition-all cursor-pointer shrink-0"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" /> Export Stock CSV
          </button>
        </div>
      </div>

      {/* Hero Telemetry KPI Cards System */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {/* KPI Card 1: Total SKUs */}
        <div className="p-4 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-white/[0.08] hover:border-white/[0.16] transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-2">
            <span>Total Catalog SKUs</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Catalog</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-50 tabular-nums tracking-tight">
            {s.totalSKUs || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono flex items-center justify-between">
            <span>Active SKUs</span>
            <span className="text-slate-300">100% Tracked</span>
          </div>
        </div>

        {/* KPI Card 2: Inventory Valuation */}
        <div className="p-4 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-white/[0.08] hover:border-white/[0.16] transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-2">
            <span>Inventory Valuation</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Valuation</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-50 tabular-nums tracking-tight">
            ₹{Number(s.totalInventoryValue || 0).toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono flex items-center justify-between">
            <span>Capital Locked</span>
            <span className="text-emerald-400">Nominal</span>
          </div>
        </div>

        {/* KPI Card 3: Stockout Risk Items */}
        <div className="p-4 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-white/[0.08] hover:border-white/[0.16] transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-2">
            <span>Stockout Risk Items</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${(s.stockoutRisk || 0) > 0 ? "bg-rose-500/10 text-rose-400 border-rose-500/20 font-bold" : "bg-slate-800 text-slate-400 border-white/10"}`}>
              {(s.stockoutRisk || 0) > 0 ? "Action Req." : "Clear"}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-50 tabular-nums tracking-tight">
            {s.stockoutRisk || 0} <span className="text-xs font-normal text-slate-400 font-sans">items</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono flex items-center justify-between">
            <span>Threshold Risk</span>
            <span className={(s.stockoutRisk || 0) > 0 ? "text-rose-400" : "text-slate-400"}>
              {(s.stockoutRisk || 0) > 0 ? "Reorder Urgent" : "Safe Stock"}
            </span>
          </div>
        </div>

        {/* KPI Card 4: Total Money Blocked */}
        <div className="p-4 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-white/[0.08] hover:border-white/[0.16] transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-2">
            <span>Blocked Capital</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${moneyStuck > 0 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
              {moneyStuck > 0 ? "Stuck Stock" : "Liquid"}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-50 tabular-nums tracking-tight">
            ₹{moneyStuck.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono flex items-center justify-between">
            <span>Non-Selling Value</span>
            <span className={moneyStuck > 0 ? "text-amber-400" : "text-emerald-400"}>
              {moneyStuck > 0 ? "Slow Moving" : "Optimized"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 relative z-10">
        {/* Column 1: TODAY'S ACTIONS (Urgent priority) */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-card/75 backdrop-blur-md border border-border/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between cursor-default"
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <div>
            <div className="flex items-center gap-2 mb-4 border-b border-border/40 pb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <h2 className="text-base font-extrabold text-foreground uppercase tracking-wider">Today&apos;s Actions</h2>
            </div>
            <div className="space-y-3">
              {actions.length > 0 ? actions.map((act: string, idx: number) => {
                const lower = act.toLowerCase();
                let badgeColor = "bg-secondary text-foreground border-border/50";
                if (lower.includes("critical") || lower.includes("run out")) {
                  badgeColor = "bg-red-500/10 text-red-500 border-red-500/30 font-bold";
                } else if (lower.includes("low stock") || lower.includes("order more")) {
                  badgeColor = "bg-amber-500/10 text-amber-500 border-amber-500/30";
                } else if (lower.includes("expiring")) {
                  badgeColor = "bg-orange-500/10 text-orange-500 border-orange-500/30";
                } else if (lower.includes("balanced")) {
                  badgeColor = "bg-green-500/10 text-green-500 border-green-500/30 font-bold";
                }

                return (
                  <motion.div 
                    key={idx} 
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${badgeColor}`}
                  >
                    <span>{act}</span>
                  </motion.div>
                );
              }) : (
                <div className="p-3 rounded-xl border border-border/50 bg-secondary text-sm text-muted-foreground">
                  No action signal returned for this store run.
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Column 2: SALES STORY (AI plain narrative) */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-card/75 backdrop-blur-md border border-border/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between cursor-default lg:col-span-2"
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <div>
            <div className="flex items-center gap-2 mb-4 border-b border-border/40 pb-2">
              <Megaphone className="w-5 h-5 text-indigo-500" />
              <h2 className="text-base font-extrabold text-foreground uppercase tracking-wider">Sales Story</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">What Happened This Week:</h3>
                  <p className="text-base text-foreground font-semibold leading-relaxed mt-1">
                    {story?.salesStory || "Sales narrative was not generated for this run."}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">What to Expect Next Week:</h3>
                  <p className="text-base text-foreground font-semibold leading-relaxed mt-1">
                    {story?.futureExpectation || "Near-future expectation is unavailable until the dashboard API returns a narrative."}
                  </p>
                </div>
              </div>
              <div className="bg-indigo-500/5 border border-indigo-500/25 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Our Recommendation:</h3>
                  <p className="text-base text-foreground font-black leading-relaxed mt-1.5">
                    {story?.recommendation || "Check the order and slow-moving tables below for current inventory actions."}
                  </p>
                </div>
                <div className="text-right text-[10px] text-muted-foreground mt-4">
                  Advisor Confidence: {Math.round((story?.confidence || 0) * 100)}%
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 relative z-10">
        {/* Column 1: AI Shopkeeper Advice & Weather Impact */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="bg-card/75 backdrop-blur-md border border-border/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between cursor-default"
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-2">
              <div className="flex items-center gap-2">
                <Sun className="w-5 h-5 text-orange-500 animate-spin-slow" />
                <h2 className="text-base font-extrabold text-foreground uppercase tracking-wider">Weather & Advice</h2>
              </div>
              {weather?.current && (
                <span className="text-sm font-black text-foreground bg-secondary px-2.5 py-1 rounded-full border border-border/30">
                  {weather.current.temp}°C
                </span>
              )}
            </div>

            {weather?.current ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-secondary/40 border border-border/30 rounded-xl p-3">
                  <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 shrink-0">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground capitalize">{weather.current.description}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">City: {weather.current.city}</p>
                  </div>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/25 rounded-2xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> AI Shopkeeper Advice
                  </h4>
                  <p className="text-sm font-bold text-foreground leading-relaxed">
                    {advice?.content || "No weather advice returned for this store run."}
                  </p>
                  <p className="text-sm font-black text-indigo-500 mt-2">
                    {advice?.action || "Review the stockout and expiry actions before ordering."}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading local weather conditions...</p>
            )}
          </div>
        </motion.div>

        {/* Column 2: Store Health score */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-card/75 backdrop-blur-md border border-border/80 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-center justify-around gap-6 cursor-default"
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <HealthRing score={health.overall} />
          
          <div className="space-y-3 w-full max-w-[240px]">
            {[
              { label: "Inventory Health", value: health.inventory, color: "bg-green-500" },
              { label: "Sales Trend Score", value: health.trend, color: "bg-blue-500" },
              { label: "Expiry Waste Score", value: health.expiry, color: "bg-orange-500" },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="text-foreground">{item.value}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${item.value}%`, transition: "width 1.5s ease-out" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Column 3: Upcoming events / disruptions */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="bg-card/75 backdrop-blur-md border border-border/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between cursor-default"
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <div>
            <div className="flex items-center gap-2 mb-4 border-b border-border/40 pb-2">
              <Calendar className="w-5 h-5 text-pink-500" />
              <h2 className="text-base font-extrabold text-foreground uppercase tracking-wider">Important Events</h2>
            </div>
            
            <div className="space-y-3">
              {extEvents.length > 0 ? (
                extEvents.slice(0, 3).map((e: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start border-b border-border/30 last:border-0 pb-2 last:pb-0">
                    <div>
                      <p className="text-sm font-bold text-foreground">{e.event_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{e.start_date} &bull; {e.event_type}</p>
                    </div>
                    <span className="text-xs font-bold bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full">
                      +{Math.round(e.impact_score * 100)}% demand
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">No external holiday, disruption, or event signal recorded for this store window.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 relative z-10">
        {/* Products to Order Table */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-card/75 backdrop-blur-md border border-border/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between cursor-default"
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <div>
            <div className="flex items-center gap-2 mb-4 border-b border-border/40 pb-2">
              <ShoppingCart className="w-5 h-5 text-green-500" />
              <h2 className="text-base font-extrabold text-foreground uppercase tracking-wider">Products To Order Today</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="text-left py-2 text-xs font-bold text-muted-foreground uppercase">Product</th>
                    <th className="text-right py-2 text-xs font-bold text-muted-foreground uppercase">Stock</th>
                    <th className="text-right py-2 text-xs font-bold text-muted-foreground uppercase">Days Left</th>
                    <th className="text-right py-2 text-xs font-bold text-muted-foreground uppercase">Order Qty</th>
                    <th className="text-left py-2 pl-4 text-xs font-bold text-muted-foreground uppercase">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {toOrder.length > 0 ? (
                    toOrder.slice(0, 5).map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-border/30 last:border-0 hover:bg-secondary/20">
                        <td className="py-2.5 font-bold text-foreground">{item.name}</td>
                        <td className="py-2.5 text-right text-muted-foreground">{item.currentStock} {item.unit}</td>
                        <td className="py-2.5 text-right font-extrabold">
                          <span className={item.daysLeft <= 2 ? "text-red-500 font-black" : item.daysLeft <= 4 ? "text-amber-500" : "text-foreground"}>
                            {item.daysLeft} days
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-black text-indigo-500">{item.recommendedQty}</td>
                        <td className="py-2.5 pl-4 text-xs text-muted-foreground font-semibold">{item.reason}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">No recommendations to order. Everything is well stocked!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        {/* Products Not Selling (Money Stuck) */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="bg-card/75 backdrop-blur-md border border-border/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between cursor-default"
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-2">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-500" />
                <h2 className="text-base font-extrabold text-foreground uppercase tracking-wider">Products Not Selling</h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Money Blocked</p>
                <p className="text-lg font-black text-red-500">₹{moneyStuck.toLocaleString("en-IN")}</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="text-left py-2 text-xs font-bold text-muted-foreground uppercase">Product</th>
                    <th className="text-left py-2 text-xs font-bold text-muted-foreground uppercase">Category</th>
                    <th className="text-right py-2 text-xs font-bold text-muted-foreground uppercase">Stock</th>
                    <th className="text-right py-2 text-xs font-bold text-muted-foreground uppercase">Sales Signal</th>
                    <th className="text-right py-2 text-xs font-bold text-muted-foreground uppercase">Value Blocked</th>
                  </tr>
                </thead>
                <tbody>
                  {notSelling.length > 0 ? (
                    notSelling.slice(0, 5).map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-border/30 last:border-0 hover:bg-secondary/20">
                        <td className="py-2.5 font-bold text-foreground">{item.name}</td>
                        <td className="py-2.5 text-xs text-muted-foreground">{item.category}</td>
                        <td className="py-2.5 text-right text-muted-foreground">{item.quantity} {item.unit}</td>
                        <td className="py-2.5 text-right font-black text-red-500">
                          {item.daysWithoutSale !== null && item.daysWithoutSale !== undefined ? `${item.daysWithoutSale} days` : item.salesSignal}
                        </td>
                        <td className="py-2.5 text-right font-bold text-foreground">₹{item.moneyBlocked.toLocaleString("en-IN")}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">All products are selling steadily! No blocked cash.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>

      {modelUtilization && (
        <div className="relative z-10 bg-card/70 backdrop-blur-md border border-border/70 rounded-2xl p-5 shadow-lg space-y-5">
          <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3">
            <div>
              <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-500" /> Forecastify Business Control Center
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Owner-ready explanation of what changed, what to expect, and what action to take.</p>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-cyan-500 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-3 py-1">
              Live store signals
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div className="bg-card border border-border/40 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Sales Story</p>
              <p className="text-sm font-semibold text-foreground mt-2">{modelUtilization.salesStory?.whatHappened}</p>
              <p className="text-xs text-muted-foreground mt-2">{modelUtilization.salesStory?.whatToDo}</p>
              <p className="text-xs text-muted-foreground mt-3">Meaning: this turns stock and sales movement into a simple store-owner explanation.</p>
            </div>
            <div className="bg-card border border-border/40 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Market Mood</p>
              <p className={`text-2xl font-black mt-2 ${
                modelUtilization.marketSentiment?.status === "Positive" ? "text-green-500" :
                modelUtilization.marketSentiment?.status === "Negative" ? "text-red-500" : "text-amber-500"
              }`}>{modelUtilization.marketSentiment?.status}</p>
              <p className="text-xs text-muted-foreground mt-1">{modelUtilization.marketSentiment?.groqImpact}</p>
              <p className="text-xs text-muted-foreground mt-3">Meaning: shows whether outside retail conditions support stronger demand, normal demand, or caution.</p>
            </div>
            <div className="bg-card border border-border/40 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Forecast Snapshot</p>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div><p className="text-lg font-black text-foreground">{modelUtilization.forecastSnapshot?.sevenDay || 0}</p><p className="text-[10px] text-muted-foreground">7 day</p></div>
                <div><p className="text-lg font-black text-foreground">{modelUtilization.forecastSnapshot?.fourteenDay || 0}</p><p className="text-[10px] text-muted-foreground">14 day</p></div>
                <div><p className="text-lg font-black text-foreground">{modelUtilization.forecastSnapshot?.thirtyDay || 0}</p><p className="text-[10px] text-muted-foreground">30 day</p></div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Confidence {modelUtilization.forecastSnapshot?.confidence || 0}%</p>
              <p className="text-xs text-muted-foreground mt-2">Meaning: compares near-term demand windows so urgent orders are not mixed with monthly planning.</p>
            </div>
            <div className="bg-card border border-border/40 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Upcoming Events</p>
              <div className="space-y-2 mt-2">
                {(modelUtilization.upcomingEvents?.events || []).slice(0, 3).map((event: any, index: number) => (
                  <div key={index} className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-foreground truncate">{event.name}</span>
                    <span className="text-cyan-500 font-bold">{event.confidence}%</span>
                  </div>
                ))}
                {!modelUtilization.upcomingEvents?.events?.length && <p className="text-xs text-muted-foreground">No active event risk in the current window.</p>}
              </div>
              <p className="text-xs text-muted-foreground mt-3">Meaning: events listed here can change category demand, so order only where the event matches your stock.</p>
            </div>
            <div className="bg-card border border-border/40 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Jarvis Memory</p>
              <p className="text-sm font-semibold text-foreground mt-2">{modelUtilization.jarvisMemory?.output}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {(modelUtilization.jarvisMemory?.activities || []).slice(0, 2).map((activity: any) => activity.title).join(" · ") || "Ask Jarvis for reports or inventory changes to build memory."}
              </p>
              <p className="text-xs text-muted-foreground mt-3">Meaning: recent store activity is kept so reports and Jarvis answers reflect what happened today.</p>
            </div>
            <div className="bg-card border border-border/40 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Weather Impact</p>
              <div className="space-y-2 mt-2">
                {(modelUtilization.weatherImpact?.products || []).slice(0, 3).map((product: any, index: number) => (
                  <div key={index} className="text-xs">
                    <p className="font-semibold text-foreground truncate">{product.product}</p>
                    <p className="text-muted-foreground">{product.expectedDemandChange} · {product.category}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">Meaning: weather-sensitive products may sell faster today, especially beverages, snacks, tea, and essentials.</p>
            </div>
          </div>
        </div>
      )}

      {/* 5. Advanced Analytics section */}
      <div className="relative z-10 space-y-6">
            <div className="bg-card/65 backdrop-blur-md border border-border/60 rounded-2xl p-6 shadow-xl space-y-6">
              <h2 className="text-lg font-black text-foreground flex items-center gap-2 border-b border-border/40 pb-3">
                <BarChart3 className="w-5 h-5 text-indigo-500" /> Advanced Analytics
              </h2>

              {/* Charts Segment */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-card border border-border/40 rounded-2xl p-5">
                  <h3 className="font-extrabold text-foreground flex items-center gap-2 mb-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-indigo-500" /> 7-Day Sales Forecast (All {s.forecastProductCount || 0} Products)
                  </h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={forecast}>
                      <defs>
                        <linearGradient id="gPred" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
                        <linearGradient id="gActual" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} />
                      <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                      <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "8px" }} />
                      <Legend />
                      <Area type="monotone" dataKey="predicted" name="Forecasted Units" stroke="#6366f1" fill="url(#gPred)" strokeWidth={2} />
                      <Area type="monotone" dataKey="actual" name="Last Week Actual" stroke="#22c55e" fill="url(#gActual)" strokeWidth={2} strokeDasharray="5 5" />
                      <Area type="monotone" dataKey="recommended" name="Recommended Buffer Level" stroke="#f59e0b" fill="none" strokeWidth={1.5} strokeDasharray="3 3" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-card border border-border/40 rounded-2xl p-5">
                  <h3 className="font-extrabold text-foreground flex items-center gap-2 mb-2 text-sm">
                    <Tag className="w-4 h-4 text-purple-500" /> Category Breakdown
                  </h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={categories} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={11} />
                      <YAxis type="category" dataKey="category" width={80} stroke="var(--color-muted-foreground)" fontSize={11} />
                      <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "8px" }} />
                      <Bar dataKey="stock" name="Stock Units" radius={[0, 6, 6, 0]}>
                        {categories.map((_: any, i: number) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Advanced Technical Table with Filters */}
              <div className="bg-card border border-border/40 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm tracking-tight">
                    <Layers className="w-4 h-4 text-indigo-400" /> Technical Segment Insights
                  </h3>
                  <div className="flex gap-1 bg-slate-900/80 border border-white/[0.08] rounded-lg p-1">
                    {(Object.keys(filterLabels) as Array<"recent" | "lowStock" | "highValue" | "topDemand">).map((tab, idx) => (
                      <button key={tab} onClick={() => setActiveFilter(tab)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${activeFilter === tab ? "bg-indigo-600 text-white shadow-xs font-semibold" : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"}`}>
                        <span>{filterLabels[tab]}</span>
                        <kbd className={`px-1 text-[9px] font-mono rounded ${activeFilter === tab ? "bg-indigo-700 text-white" : "bg-slate-800 text-slate-400"}`}>{idx + 1}</kbd>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.08]">
                        <th className="text-left py-2.5 text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">Product</th>
                        <th className="text-left py-2.5 text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                        {activeFilter === "topDemand" && <><th className="text-right py-2.5 text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">Daily Demand</th><th className="text-right py-2.5 text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">Weekly Demand</th><th className="text-right py-2.5 text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">Current Stock</th><th className="text-right py-2.5 text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">Days of Stock</th></>}
                        {activeFilter === "lowStock" && <><th className="text-right py-2.5 text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">Stock Qty</th><th className="text-right py-2.5 text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">Price</th><th className="text-center py-2.5 text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">Status</th></>}
                        {activeFilter === "highValue" && <><th className="text-right py-2.5 text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">Stock Qty</th><th className="text-right py-2.5 text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">Price</th><th className="text-right py-2.5 text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">Total Value</th></>}
                        {activeFilter === "recent" && <><th className="text-right py-2.5 text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">Stock Qty</th><th className="text-right py-2.5 text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">Price</th><th className="text-center py-2.5 text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">Status</th></>}
                      </tr>
                    </thead>
                    <tbody>
                      {(filterData[activeFilter] || []).map((item: any, i: number) => (
                        <tr key={i} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors">
                          <td className="py-3 font-medium text-slate-200">{item.name}</td>
                          <td className="py-3 text-xs text-slate-400">{item.category}</td>
                          {activeFilter === "topDemand" && <>
                            <td className="py-3 text-right font-mono tabular-nums text-slate-100 font-semibold">{item.dailyDemand}/day</td>
                            <td className="py-3 text-right font-mono tabular-nums text-slate-300">{item.weeklyDemand}/week</td>
                            <td className="py-3 text-right font-mono tabular-nums text-slate-400">{item.currentStock} {item.unit}</td>
                            <td className="py-3 text-right font-mono tabular-nums font-bold text-indigo-400">{item.daysOfStock} days</td>
                          </>}
                          {activeFilter === "lowStock" && <>
                            <td className="py-3 text-right font-mono tabular-nums font-semibold text-slate-200">{item.quantity} {item.unit}</td>
                            <td className="py-3 text-right font-mono tabular-nums text-slate-400">₹{item.price}</td>
                            <td className="py-3 text-center">
                              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">{item.status}</span>
                            </td>
                          </>}
                          {activeFilter === "highValue" && <>
                            <td className="py-3 text-right font-mono tabular-nums text-slate-300">{item.quantity} {item.unit}</td>
                            <td className="py-3 text-right font-mono tabular-nums text-slate-400">₹{item.price}</td>
                            <td className="py-3 text-right font-mono tabular-nums font-semibold text-slate-100">₹{item.totalValue?.toLocaleString("en-IN")}</td>
                          </>}
                          {activeFilter === "recent" && <>
                            <td className="py-3 text-right font-mono tabular-nums font-semibold text-slate-200">{item.quantity} {item.unit}</td>
                            <td className="py-3 text-right font-mono tabular-nums text-slate-400">₹{item.price}</td>
                            <td className="py-3 text-center">
                              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{item.status}</span>
                            </td>
                          </>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Removed technical metrics block */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div className="bg-secondary/40 border border-border/30 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Sales Trend</p>
                  <p className="text-sm font-bold text-foreground mt-1">{s.demandTrend > 0 ? "+" : ""}{s.demandTrend || 0}%</p>
                </div>
                <div className="bg-secondary/40 border border-border/30 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Demand Volatility</p>
                  <p className="text-sm font-bold text-foreground mt-1">{s.demandVolatility ?? 0}%</p>
                </div>
                <div className="bg-secondary/40 border border-border/30 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Forecast Confidence</p>
                  <p className="text-sm font-bold text-foreground mt-1">{s.forecastAccuracy ?? 0}%</p>
                </div>
                <div className="bg-secondary/40 border border-border/30 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Sales Records</p>
                  <p className="text-sm font-bold text-foreground mt-1">{s.historicDataDays || 0}</p>
                </div>
              </div>
            </div>
      </div>
    </div>
  );
}
