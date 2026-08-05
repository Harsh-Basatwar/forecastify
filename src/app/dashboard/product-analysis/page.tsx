"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Search, Loader2, Package, TrendingUp, ShoppingBag,
  FileText, Code, ArrowUpRight, ArrowDownRight, Box, DollarSign,
  Calendar, Shield, Zap, RefreshCw, Cloud, MapPin, Newspaper,
  BadgePercent, ExternalLink, Brain,
} from "lucide-react";
import {
  SERIES, tooltipStyle, tooltipLabelStyle, gridProps, axisProps, CHART_H,
} from "@/lib/chart-theme";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ProductAnalysisPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [generatedAt, setGeneratedAt] = useState("");
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [weather, setWeather] = useState<any>(null);
  const [weatherForecast, setWeatherForecast] = useState<any[]>([]);
  const [location, setLocation] = useState("");
  const [storeProfile, setStoreProfile] = useState<any>(null);
  const [externalSignals, setExternalSignals] = useState<Record<string, any[]>>({});

  // Fetch store profile
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("store_name, store_category, store_size, city, state").eq("id", user.id).single();
      if (data) setStoreProfile(data);
    })();
  }, [user]);

  // Fetch weather on mount
  useEffect(() => {
    (async () => {
      try {
        const pos = await new Promise<GeolocationPosition>((r, j) => navigator.geolocation.getCurrentPosition(r, j, { timeout: 10000 }));
        const [wRes, lRes] = await Promise.all([
          fetch(`/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`),
          fetch(`/api/location?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`),
        ]);
        if (wRes.ok) { const d = await wRes.json(); setWeather(d.current); setWeatherForecast(d.forecast || []); }
        if (lRes.ok) { const d = await lRes.json(); setLocation(d.formattedAddress || d.city || ""); }
      } catch {}
    })();
  }, []);

  // Search inventory + products catalog for suggestions
  const searchInventory = useCallback(async (q: string) => {
    if (!q.trim() || !user) { setSuggestions([]); return; }
    // Search user's inventory
    const { data: invData } = await supabase.from("inventory").select("product_name, category, current_stock, price, unit")
      .eq("store_id", user.id).ilike("product_name", `%${q}%`).limit(5);
    // Also search products catalog
    const { data: catData } = await supabase.from("products").select("product_name, category, mrp")
      .ilike("product_name", `%${q}%`).limit(5);

    const invItems = (invData || []).map(i => ({ ...i, source: "inventory" }));
    const catItems = (catData || []).filter(c => !invItems.some(i => i.product_name === c.product_name))
      .map(c => ({ product_name: c.product_name, category: c.category, current_stock: 0, price: c.mrp, unit: "pcs", source: "catalog" }));

    setSuggestions([...invItems, ...catItems].slice(0, 8));
  }, [user]);

  useEffect(() => {
    const t = setTimeout(() => searchInventory(query), 300);
    return () => clearTimeout(t);
  }, [query, searchInventory]);

  const analyze = async (productName: string) => {
    if (!productName.trim() || !user) return;
    setLoading(true);
    setError("");
    setAnalysis(null);
    setExternalSignals({});
    setQuery(productName);
    setSuggestions([]);

    try {
      const res = await fetch("/api/product-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: productName.trim(),
          userId: user.id,
          weather,
          weatherForecast,
          location,
          storeCategory: storeProfile?.store_category,
        }),
      });
      const data = await res.json();
      if (data.analysis) {
        setAnalysis(data.analysis);
        setProduct(data.product);
        setGeneratedAt(data.generatedAt);
        if (data.weather) setWeather(data.weather);
        if (data.location) setLocation(data.location);
        const signalQuery = [
          productName.trim(),
          data.product?.category || data.analysis?.productName || "",
          location || data.location || storeProfile?.city || "",
          weather?.description ? `${weather.description} weather` : "",
          "grocery retail promotions news demand",
        ].filter(Boolean).join(" ");
        fetch("/api/search-promos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: signalQuery }),
        })
          .then((signalRes) => signalRes.ok ? signalRes.json() : null)
          .then((signals) => setExternalSignals(signals || {}))
          .catch(() => setExternalSignals({}));
      } else {
        setError(data.error || "Analysis failed");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); analyze(query); };

  // ---- PDF / HTML ----
  const buildReportHTML = (forPrint: boolean) => {
    if (!analysis) return "";
    const a = analysis;
    const storeName = storeProfile?.store_name || "Store";
    const date = generatedAt ? new Date(generatedAt).toLocaleString("en-IN") : new Date().toLocaleString("en-IN");
    const loc = location || `${storeProfile?.city || ""}, ${storeProfile?.state || ""}`;

    const forecastRows = a.dailyForecast?.map((d: any) => `
      <tr>
        <td><strong>${d.day}</strong><br/><span style="color:#888;font-size:10px">${d.date || ""}</span></td>
        <td style="text-align:center"><div style="background:linear-gradient(90deg,#6366f1,#a78bfa);height:14px;width:${Math.min(d.predictedSales * 2, 120)}px;border-radius:3px;display:inline-block;vertical-align:middle;margin-right:6px"></div>${d.predictedSales} ${a.unit || "pcs"}</td>
        <td style="text-align:center">${d.confidence}%</td>
        <td style="font-size:11px;color:#555">${d.reason}</td>
      </tr>
    `).join("") || "";

    const riskRows = a.riskFactors?.map((r: any) => `
      <tr>
        <td>${r.risk}</td>
        <td><span class="badge badge-${r.severity?.toLowerCase()}">${r.severity}</span></td>
        <td style="color:#16a34a">${r.mitigation}</td>
      </tr>
    `).join("") || "";

    const recommendations = a.recommendations?.map((r: string) => `<li>${r}</li>`).join("") || "";
    const engineRows = [
      ["Forecasting", "Historic sales, current stock, price, weather, event fit", "Daily units and stock requirement"],
      ["Narrative", "Demand drivers, risk, margin, local store context", "Owner-ready summary and recommendations"],
      ["External search", "Product, category, weather, location", "News and promotion signals"],
    ].map((row) => `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td></tr>`).join("");
    const signalRows = ["offers", "promotions", "news"].flatMap((key) =>
      (externalSignals[key] || []).slice(0, 3).map((item: any) =>
        `<tr><td>${key}</td><td>${item.title}</td><td>${item.snippet || ""}</td></tr>`
      )
    ).join("");

    const styles = `<style>
      @page { size: A4; margin: ${forPrint ? "16mm" : "0"}; }
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: ${forPrint ? "'Georgia',serif" : "'Segoe UI',system-ui,sans-serif"}; color:#1e293b; font-size:${forPrint ? "11px" : "13px"}; line-height:1.55; background:#fff; padding:${forPrint ? "0" : "32px 40px"}; }
      ${!forPrint ? `.report-wrap { max-width:900px; margin:0 auto; background:#fff; border-radius:16px; box-shadow:0 4px 24px rgba(0,0,0,0.08); overflow:hidden; }` : ""}
      .cover { background:linear-gradient(135deg,#312e81,#6366f1,#7c3aed); color:#fff; padding:${forPrint ? "20px 28px" : "28px 32px"}; ${forPrint ? "margin:-16mm -16mm 0 -16mm; margin-bottom:16px;" : ""} }
      .cover h1 { font-size:${forPrint ? "20px" : "24px"}; font-weight:700; }
      .cover p { font-size:12px; opacity:0.85; margin-top:2px; }
      .cover-meta { display:flex; gap:16px; margin-top:10px; flex-wrap:wrap; font-size:10px; opacity:0.9; }
      .content { padding:${forPrint ? "0" : "24px 32px"}; }
      .summary { background:#f0f0ff; border-left:4px solid #6366f1; padding:12px 16px; border-radius:8px; margin-bottom:16px; font-size:${forPrint ? "11px" : "13px"}; }
      .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:16px; }
      .stat { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; text-align:center; }
      .stat .val { font-size:${forPrint ? "18px" : "22px"}; font-weight:700; color:#312e81; }
      .stat .lbl { font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin-top:2px; }
      .section { margin-bottom:16px; ${forPrint ? "page-break-inside:avoid;" : ""} }
      .section-title { font-size:${forPrint ? "13px" : "15px"}; font-weight:700; color:#312e81; border-bottom:2px solid #e5e7eb; padding-bottom:4px; margin-bottom:8px; }
      table { width:100%; border-collapse:collapse; font-size:${forPrint ? "10.5px" : "12px"}; }
      th { background:#f1f5f9; color:#475569; font-size:${forPrint ? "9px" : "10px"}; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; padding:6px 8px; text-align:left; border-bottom:2px solid #cbd5e1; }
      td { padding:6px 8px; border-bottom:1px solid #e2e8f0; }
      tr:nth-child(even) { background:#f8fafc; }
      .badge { display:inline-block; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:600; }
      .badge-high, .badge-critical { background:#fee2e2; color:#dc2626; }
      .badge-medium, .badge-warning { background:#fef3c7; color:#d97706; }
      .badge-low { background:#dbeafe; color:#2563eb; }
      .badge-none { background:#dcfce7; color:#16a34a; }
      .badge-sufficient { background:#dcfce7; color:#16a34a; }
      .badge-insufficient { background:#fef3c7; color:#d97706; }
      .badge-overstocked { background:#dbeafe; color:#2563eb; }
      .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
      .card { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; }
      .card h4 { font-size:12px; font-weight:700; margin-bottom:4px; }
      .card p { font-size:11px; color:#555; }
      ul { margin-left:18px; }
      li { margin-bottom:4px; font-size:${forPrint ? "10.5px" : "12px"}; }
      .footer { text-align:center; padding:16px; border-top:2px solid #e5e7eb; color:#94a3b8; font-size:10px; margin-top:20px; }
    </style>`;

    const urgencyBadge = `<span class="badge badge-${(a.restockUrgency || "none").toLowerCase()}">${a.restockUrgency || "None"}</span>`;
    const statusBadge = `<span class="badge badge-${(a.currentStockStatus || "sufficient").toLowerCase().replace(/ /g,"")}">${a.currentStockStatus}</span>`;

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Product Analysis - ${a.productName}</title>${styles}</head><body>
${!forPrint ? '<div class="report-wrap">' : ""}
<div class="cover">
  <h1>Product Analysis: ${a.productName}</h1>
  <p>${storeName} — 7-Day Demand Forecast Report</p>
  <div class="cover-meta">
    <span>Store: ${storeName}</span>
    <span>Location: ${loc}</span>
    ${weather ? `<span>Weather: ${weather.temp}°C, ${weather.description}</span>` : ""}
    <span>Generated: ${date}</span>
  </div>
</div>
<div class="content">
  <div class="summary"><strong>Summary:</strong> ${a.summary}</div>

  <div class="stats">
    <div class="stat"><div class="val">${a.currentStock} ${a.unit}</div><div class="lbl">Current Stock</div></div>
    <div class="stat"><div class="val">${a.totalPredictedSales} ${a.unit}</div><div class="lbl">7-Day Predicted Sales</div></div>
    <div class="stat"><div class="val">${a.stockRequired} ${a.unit}</div><div class="lbl">Stock Required</div></div>
    <div class="stat"><div class="val" style="color:${a.additionalStockNeeded > 0 ? "#dc2626" : "#16a34a"}">${a.additionalStockNeeded > 0 ? "+" + a.additionalStockNeeded : "0"} ${a.unit}</div><div class="lbl">Additional Needed</div></div>
  </div>

  <div class="grid2" style="margin-bottom:16px">
    <div class="card"><h4>Stock Status</h4><p>${statusBadge} — Urgency: ${urgencyBadge}</p></div>
    <div class="card"><h4>Pricing</h4><p>Current: ₹${a.pricingAdvice?.currentPrice || a.currentPrice} → Suggested: ₹${a.pricingAdvice?.suggestedPrice || a.currentPrice}<br/><span style="font-size:10px;color:#888">${a.pricingAdvice?.reason || ""}</span></p></div>
  </div>

  <div class="section">
    <div class="section-title">7-Day Sales Forecast</div>
    <table><thead><tr><th>Day</th><th style="text-align:center">Predicted Sales</th><th style="text-align:center">Confidence</th><th>Reason</th></tr></thead><tbody>${forecastRows}</tbody></table>
    <p style="font-size:10px;color:#64748b;margin-top:6px">Meaning: predicted sales show expected unit movement; confidence shows how strongly stock, weather, location, and history agree.</p>
  </div>

  <div class="section">
    <div class="section-title">Analysis Engines & Parameters</div>
    <table><thead><tr><th>Engine</th><th>Parameters Used</th><th>Output</th></tr></thead><tbody>${engineRows}</tbody></table>
  </div>

  ${signalRows ? `<div class="section">
    <div class="section-title">News & Promotion Signals</div>
    <table><thead><tr><th>Type</th><th>Signal</th><th>Retail Meaning</th></tr></thead><tbody>${signalRows}</tbody></table>
  </div>` : ""}

  <div class="grid2">
    <div class="section">
      <div class="section-title">Profit Analysis</div>
      <div class="card">
        <p><strong>Est. Revenue:</strong> ₹${a.profitAnalysis?.estimatedRevenue || 0}</p>
        <p><strong>Est. Profit:</strong> ₹${a.profitAnalysis?.estimatedProfit || 0}</p>
        <p><strong>Margin:</strong> ${a.profitAnalysis?.margin || "N/A"}</p>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Competitor Insight</div>
      <div class="card"><p>${a.competitorInsight || "No data"}</p></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Recommendations</div>
    <ul>${recommendations}</ul>
  </div>

  <div class="grid2">
    <div class="section">
      <div class="section-title">Demand Drivers</div>
      <div class="card"><ul>${a.demandDrivers?.map((d: string) => `<li>${d}</li>`).join("") || ""}</ul></div>
    </div>
    <div class="section">
      <div class="section-title">Seasonal Factors</div>
      <div class="card"><ul>${a.seasonalFactors?.map((f: string) => `<li>${f}</li>`).join("") || ""}</ul></div>
    </div>
  </div>

  ${a.riskFactors?.length ? `<div class="section">
    <div class="section-title">Risk Assessment</div>
    <table><thead><tr><th>Risk</th><th>Severity</th><th>Mitigation</th></tr></thead><tbody>${riskRows}</tbody></table>
  </div>` : ""}
</div>
<div class="footer">Forecastify — Product Demand Analysis | &copy; ${new Date().getFullYear()}</div>
${!forPrint ? "</div>" : ""}
</body></html>`;
  };

  const downloadPDF = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(buildReportHTML(true));
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const downloadHTML = () => {
    const blob = new Blob([buildReportHTML(false)], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `product-analysis-${(analysis?.productName || "product").replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Chart data
  const chartData = analysis?.dailyForecast?.map((d: any) => ({
    name: d.day?.substring(0, 3),
    sales: d.predictedSales,
    confidence: d.confidence,
  })) || [];
  const signalSections = [
    { key: "news", title: "News", icon: Newspaper, description: "Market demand and retail movement around this product." },
    { key: "promotions", title: "Promotion", icon: BadgePercent, description: "Brand campaigns, discounts, and offer opportunities." },
  ];
  const analysisParameters = [
    { title: "Forecasting", detail: "Historic sales, current stock, price, weather, event fit", output: "Daily units and stock requirement" },
    { title: "Narrative", detail: "Demand drivers, risks, margin, local store context", output: "Owner-ready recommendations" },
    { title: "External Search", detail: "Product + category + weather + location", output: "News and promotion cards" },
  ];

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      {/* Page lead — editorial, no card */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="fx-display text-[24px] text-foreground">Product Analysis</h1>
          <p className="text-[13px] text-muted-foreground mt-1.5">7-day demand forecast for any product</p>
        </div>
        {analysis && (
          <div className="flex gap-2 shrink-0">
            <button onClick={downloadPDF} className="fx-btn"><FileText className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> PDF</button>
            <button onClick={downloadHTML} className="fx-btn"><Code className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> HTML</button>
          </div>
        )}
      </div>

      {/* Search */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter product name — e.g. Maggi Noodles, Amul Butter, Coca Cola..."
              aria-label="Product name"
              className="fx-input pl-10" />
          </div>
          <button type="submit" disabled={loading || !query.trim()}
            className="fx-btn fx-btn-accent">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Search className="w-4 h-4" aria-hidden="true" strokeWidth={1.8} />}
            Analyze
          </button>
        </div>

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-elevated border border-border rounded-[var(--radius-md)] z-20" style={{ boxShadow: "var(--shadow-md)" }}>
            {suggestions.map((s, i) => (
              <button key={i} type="button" onClick={() => { setQuery(s.product_name); setSuggestions([]); analyze(s.product_name); }}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary text-left border-b border-border last:border-0 transition-colors cursor-pointer fx-focus">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.product_name}</p>
                  <p className="text-xs text-muted-foreground">{s.category}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="fx-num text-sm font-semibold text-foreground">{s.current_stock} {s.unit}</p>
                  <p className="fx-num text-xs text-muted-foreground">₹{s.price}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </form>

      {error && (
        <div role="alert" className="bg-danger-soft border border-danger/25 text-danger rounded-[var(--radius-md)] px-4 py-3 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => analyze(query)} className="fx-btn shrink-0">
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> Retry
          </button>
        </div>
      )}

      {/* Loading — skeleton mirrors the result layout */}
      {loading && (
        <div className="space-y-6" aria-busy="true" aria-label={`Analyzing ${query}`}>
          <div className="fx-card p-6 space-y-3" aria-busy="true">
            <div className="flex items-center gap-2 text-sm text-secondary-foreground font-medium">
              Analyzing &quot;{query}&quot;…
            </div>
            <p className="text-xs text-muted-foreground">Fetching inventory, weather, and generating predictions</p>
            <div className="skeleton-shimmer h-5 w-64" />
            <div className="skeleton-shimmer h-3.5 w-full" />
          </div>
          <div className="fx-card grid grid-cols-2 md:grid-cols-4" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="p-5 space-y-2.5 border-r border-border last:border-r-0">
                <div className="skeleton-shimmer h-3 w-20" />
                <div className="skeleton-shimmer h-7 w-16" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" aria-busy="true">
            {[0, 1].map((i) => (
              <div key={i} className="fx-card p-6 space-y-3">
                <div className="skeleton-shimmer h-4 w-44" />
                <div className="skeleton-shimmer h-52 w-full" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {analysis && !loading && (
        <div className="space-y-6">
          {/* Product header */}
          <section aria-label="Product summary" className="fx-card p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <h2 className="fx-display text-[19px] text-foreground">{analysis.productName}</h2>
                <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1.5">
                  <span className={`fx-signal ${analysis.inInventory ? "fx-signal-success" : ""}`} aria-hidden="true" />
                  {analysis.inInventory ? `In inventory — ${product?.category || ""}` : "Not in inventory"}
                </p>
              </div>
              <button onClick={() => analyze(query)} className="fx-btn fx-btn-ghost !p-2 shrink-0" aria-label="Re-run analysis"><RefreshCw className="w-4 h-4" strokeWidth={1.8} /></button>
            </div>
            <p className="text-sm text-secondary-foreground leading-relaxed">{analysis.summary}</p>

            {/* Context row */}
            {(weather || location || analysis.weatherSummary) && (
              <div className="fx-rule mt-5 pt-4 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-3">
                {weather && (
                  <div className="flex items-start gap-2.5">
                    <Cloud className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" strokeWidth={1.8} />
                    <div className="min-w-0">
                      <p className="fx-eyebrow">Current Weather</p>
                      <p className="text-sm text-foreground mt-0.5"><span className="fx-num font-medium">{weather.temp}°C</span> — {weather.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Humidity: <span className="fx-num">{weather.humidity}%</span></p>
                    </div>
                  </div>
                )}
                {location && (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" strokeWidth={1.8} />
                    <div className="min-w-0">
                      <p className="fx-eyebrow">Store Location</p>
                      <p className="text-sm text-foreground mt-0.5 truncate">{location}</p>
                      {analysis.locationContext && <p className="text-xs text-muted-foreground mt-0.5">{analysis.locationContext}</p>}
                    </div>
                  </div>
                )}
                {analysis.weatherSummary && (
                  <div className="flex items-start gap-2.5">
                    <Zap className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" strokeWidth={1.8} />
                    <div className="min-w-0">
                      <p className="fx-eyebrow">Weather Impact</p>
                      <p className="text-sm text-foreground mt-0.5">{analysis.weatherSummary}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Engines */}
            <div className="fx-rule mt-4 pt-4">
              <h3 className="fx-eyebrow flex items-center gap-1.5 mb-3">
                <Brain className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> Analysis Engines &amp; Parameters
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-3">
                {analysisParameters.map((item) => (
                  <div key={item.title}>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.detail}</p>
                    <p className="text-xs font-medium mt-1.5" style={{ color: "var(--accent)" }}>{item.output}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {signalSections.some((section) => externalSignals[section.key]?.length) && (
            <div className="space-y-6">
              {signalSections.map((section) => {
                const allItems = externalSignals[section.key] || [];
                const items = allItems.slice(0, 3);
                if (!items.length) return null;
                const Icon = section.icon;
                return (
                  <section key={section.key} aria-label={section.title} className="fx-card p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} /> {section.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">{section.description}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {items.map((item: any, index: number) => (
                        <a key={index} href={item.link} target="_blank" rel="noopener noreferrer"
                          className="border border-border rounded-[var(--radius-md)] p-4 hover:border-border-strong transition-colors fx-focus">
                          <p className="text-sm font-medium text-foreground line-clamp-2">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">{item.snippet}</p>
                          <span className="inline-flex items-center gap-1 text-xs font-medium mt-2.5" style={{ color: "var(--accent)" }}>
                            Open <ExternalLink className="w-3 h-3" aria-hidden="true" strokeWidth={1.8} />
                          </span>
                        </a>
                      ))}
                    </div>
                    {allItems.length > 3 && (
                      <p className="text-xs text-muted-foreground mt-3">Showing top 3 of {allItems.length}</p>
                    )}
                  </section>
                );
              })}
            </div>
          )}

          {/* Stock ledger — one sheet */}
          <section aria-label="Stock metrics" className="fx-card grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-[var(--border)] overflow-hidden">
            <div className="p-5">
              <div className="flex items-center justify-between">
                <p className="fx-eyebrow">Current Stock</p>
                <Package className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
              </div>
              <p className="fx-num fx-metric-lg text-foreground mt-2 leading-none">{analysis.currentStock} <span className="text-sm font-normal text-muted-foreground">{analysis.unit}</span></p>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between">
                <p className="fx-eyebrow">7-Day Predicted</p>
                <TrendingUp className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
              </div>
              <p className="fx-num fx-metric-lg text-foreground mt-2 leading-none">{analysis.totalPredictedSales} <span className="text-sm font-normal text-muted-foreground">{analysis.unit}</span></p>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between">
                <p className="fx-eyebrow">Stock Required</p>
                <ShoppingBag className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
              </div>
              <p className="fx-num fx-metric-lg text-foreground mt-2 leading-none">{analysis.stockRequired} <span className="text-sm font-normal text-muted-foreground">{analysis.unit}</span></p>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between">
                <p className="fx-eyebrow">Additional Needed</p>
                {analysis.additionalStockNeeded > 0
                  ? <ArrowUpRight className="w-4 h-4 text-danger" aria-hidden="true" strokeWidth={1.8} />
                  : <ArrowDownRight className="w-4 h-4 text-success" aria-hidden="true" strokeWidth={1.8} />}
              </div>
              <p className={`fx-num fx-metric-lg mt-2 leading-none ${analysis.additionalStockNeeded > 0 ? "text-danger" : "text-success"}`}>
                {analysis.additionalStockNeeded > 0 ? "+" : ""}{analysis.additionalStockNeeded} <span className="text-sm font-normal text-muted-foreground">{analysis.unit}</span>
              </p>
            </div>
          </section>

          {/* Status + Urgency + Pricing strip */}
          <section aria-label="Status and pricing" className="fx-card grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--border)] overflow-hidden">
            <div className="px-5 py-4">
              <p className="fx-eyebrow mb-2">Stock Status</p>
              <span className={`fx-badge ${
                analysis.currentStockStatus === "Sufficient" ? "fx-badge-success" :
                analysis.currentStockStatus === "Overstocked" ? "fx-badge-accent" :
                analysis.currentStockStatus === "Critical" ? "fx-badge-danger" :
                "fx-badge-warning"
              }`}>{analysis.currentStockStatus}</span>
            </div>
            <div className="px-5 py-4">
              <p className="fx-eyebrow mb-2">Restock Urgency</p>
              <span className={`fx-badge ${
                analysis.restockUrgency === "High" ? "fx-badge-danger" :
                analysis.restockUrgency === "Medium" ? "fx-badge-warning" :
                analysis.restockUrgency === "None" ? "fx-badge-success" :
                "fx-badge-accent"
              }`}>{analysis.restockUrgency}</span>
            </div>
            <div className="px-5 py-4">
              <p className="fx-eyebrow mb-2">Pricing Advice</p>
              <p className="fx-num text-sm font-semibold text-foreground">
                ₹{analysis.pricingAdvice?.currentPrice} → ₹{analysis.pricingAdvice?.suggestedPrice}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{analysis.pricingAdvice?.reason}</p>
            </div>
          </section>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section aria-label="Daily sales forecast" className="fx-card p-6">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} />
                <h3 className="text-sm font-semibold text-foreground">Daily Sales Forecast</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Predicted units per day for the next week</p>
              <div role="img" aria-label={`Bar chart of predicted daily sales in ${analysis.unit || "units"} for each of the next 7 days${analysis.totalPredictedSales ? `, totalling ${analysis.totalPredictedSales}` : ""}.`}>
                <ResponsiveContainer width="100%" height={CHART_H.standard}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis {...axisProps} dataKey="name" dy={6} />
                    <YAxis {...axisProps} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} cursor={{ fill: "var(--secondary)", opacity: 0.5 }} />
                    <Bar dataKey="sales" name="Predicted Sales" radius={[3, 3, 0, 0]} barSize={14} fill={SERIES.primary} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section aria-label="Confidence level" className="fx-card p-6">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
                <h3 className="text-sm font-semibold text-foreground">Confidence Level</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">How strongly the signals agree per day</p>
              <div role="img" aria-label="Line chart of forecast confidence, as a percentage from 0 to 100, for each of the next 7 days.">
                <ResponsiveContainer width="100%" height={CHART_H.standard}>
                  <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis {...axisProps} dataKey="name" dy={6} />
                    <YAxis {...axisProps} domain={[0, 100]} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} cursor={{ stroke: "var(--border-strong)", strokeDasharray: "3 3" }} />
                    <Line type="monotone" dataKey="confidence" name="Confidence %" stroke={SERIES.primary} strokeWidth={2} dot={{ fill: SERIES.primary, r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {/* Forecast table */}
          <section aria-label="Detailed 7-day forecast" className="fx-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} />
              <h3 className="fx-display text-[17px] text-foreground">Detailed 7-Day Forecast</h3>
            </div>
            <div className="fx-table-scroll -mx-2">
              <table className="fx-table min-w-[560px]">
                <caption className="fx-sr-only">Day-by-day forecast for the next 7 days, listing predicted sales, forecast confidence, and the reason behind each prediction.</caption>
                <thead>
                  <tr>
                    <th scope="col">Day</th>
                    <th scope="col" className="text-right">Predicted Sales</th>
                    <th scope="col" className="text-right">Confidence</th>
                    <th scope="col">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.dailyForecast?.map((d: any, i: number) => (
                    <tr key={i}>
                      <td><p className="font-medium text-foreground">{d.day}</p><p className="text-xs text-muted-foreground mt-0.5">{d.date}</p></td>
                      <td className="text-right">
                        <span className="fx-num font-semibold text-foreground">{d.predictedSales}</span>
                        <span className="text-muted-foreground text-xs ml-1">{analysis.unit}</span>
                      </td>
                      <td className="text-right">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-12 h-1 bg-muted rounded-full overflow-hidden" aria-hidden="true">
                            <span className="block h-full rounded-full" style={{ width: `${d.confidence}%`, background: "var(--accent)" }} />
                          </span>
                          <span className="fx-num text-xs font-medium">{d.confidence}%</span>
                        </span>
                      </td>
                      <td className="text-xs text-muted-foreground">{d.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Profit + Competitor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section aria-label="Profit analysis" className="fx-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-4 h-4 text-success" aria-hidden="true" strokeWidth={1.8} />
                <h3 className="text-sm font-semibold text-foreground">Profit Analysis</h3>
              </div>
              <div>
                <div className="flex justify-between py-2.5 border-b border-border"><span className="text-sm text-muted-foreground">Est. Revenue</span><span className="fx-num text-sm font-semibold text-foreground">₹{analysis.profitAnalysis?.estimatedRevenue || 0}</span></div>
                <div className="flex justify-between py-2.5 border-b border-border"><span className="text-sm text-muted-foreground">Est. Profit</span><span className="fx-num text-sm font-semibold text-success">₹{analysis.profitAnalysis?.estimatedProfit || 0}</span></div>
                <div className="flex justify-between py-2.5"><span className="text-sm text-muted-foreground">Margin</span><span className="fx-num text-sm font-semibold text-foreground">{analysis.profitAnalysis?.margin || "N/A"}</span></div>
              </div>
            </section>
            <section aria-label="Competitor insight" className="fx-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingBag className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
                <h3 className="text-sm font-semibold text-foreground">Competitor Insight</h3>
              </div>
              <p className="text-sm text-secondary-foreground leading-relaxed">{analysis.competitorInsight || "No data available"}</p>
            </section>
          </div>

          {/* Recommendations + Drivers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section aria-label="Recommendations" className="fx-card p-6">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} />
                <h3 className="text-sm font-semibold text-foreground">Recommendations</h3>
              </div>
              <ul>
                {analysis.recommendations?.map((r: string, i: number) => (
                  <li key={i} className="flex items-start gap-2.5 py-2.5 border-b border-border last:border-b-0 text-[13px] text-secondary-foreground leading-snug">
                    <span className="fx-signal fx-signal-accent mt-[5px]" aria-hidden="true" /> {r}
                  </li>
                ))}
              </ul>
            </section>
            <section aria-label="Demand drivers and seasonal factors" className="fx-card p-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
                <h3 className="text-sm font-semibold text-foreground">Demand Drivers &amp; Seasonal</h3>
              </div>
              <div className="mb-4">
                <p className="fx-eyebrow mb-2">Demand Drivers</p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.demandDrivers?.map((d: string, i: number) => (
                    <span key={i} className="fx-badge">{d}</span>
                  ))}
                </div>
              </div>
              <div className="fx-rule pt-3">
                <p className="fx-eyebrow mb-2">Seasonal Factors</p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.seasonalFactors?.map((f: string, i: number) => (
                    <span key={i} className="fx-badge">{f}</span>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Risks */}
          {analysis.riskFactors?.length > 0 && (
            <section aria-label="Risk assessment" className="fx-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-danger" aria-hidden="true" strokeWidth={1.8} />
                <h3 className="text-sm font-semibold text-foreground">Risk Assessment</h3>
              </div>
              <div>
                {analysis.riskFactors.map((r: any, i: number) => (
                  <div key={i} className="py-3 border-b border-border last:border-b-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`fx-signal ${r.severity === "High" ? "fx-signal-danger" : r.severity === "Medium" ? "fx-signal-warning" : "fx-signal-accent"}`} aria-hidden="true" />
                      <span className="text-sm font-medium text-foreground">{r.risk}</span>
                      <span className={`fx-badge ${
                        r.severity === "High" ? "fx-badge-danger" : r.severity === "Medium" ? "fx-badge-warning" : "fx-badge-accent"
                      }`}>{r.severity}</span>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-start gap-1.5 pl-[17px]">
                      <ArrowUpRight className="w-3 h-3 mt-0.5 shrink-0 text-success" aria-hidden="true" strokeWidth={1.8} /> {r.mitigation}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !analysis && (
        <div className="space-y-6">
          {/* Intro */}
          <div className="fx-card text-center py-12 px-6">
            <Box className="w-5 h-5 text-muted-foreground mx-auto mb-3 opacity-60" aria-hidden="true" strokeWidth={1.8} />
            <p className="text-sm text-secondary-foreground font-medium">Analyze any product</p>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-lg mx-auto">
              Enter any product to get a detailed 7-day sales forecast, stock recommendations, pricing strategy, and risk assessment — all based on your real inventory data.
            </p>
            <div className="flex flex-wrap justify-center gap-1.5 mt-5 mb-3">
              {["Maggi Noodles", "Amul Butter", "Coca Cola", "Tata Salt", "Parle G"].map(p => (
                <button key={p} onClick={() => { setQuery(p); analyze(p); }}
                  className="fx-btn !py-1.5 !px-3 text-xs">{p}</button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Click any product above or type your own in the search bar</p>
          </div>

          {/* Features */}
          <div className="fx-card p-6">
            <h3 className="fx-eyebrow mb-2">What you&apos;ll get</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0">
              {[
                { icon: TrendingUp, title: "7-Day Sales Prediction", desc: "Daily predicted sales with confidence percentage, visualized in charts and detailed tables" },
                { icon: Package, title: "Inventory Gap Analysis", desc: "Compares your current stock against predicted demand — tells you exactly how many units to reorder" },
                { icon: DollarSign, title: "Pricing & Profit", desc: "Smart pricing suggestions with estimated revenue, profit margins, and competitor pricing insights" },
                { icon: Calendar, title: "Seasonal & Event Impact", desc: "Factors in weather, festivals, weekends, and local events that affect this product's demand" },
                { icon: Shield, title: "Risk Assessment", desc: "Identifies stockout risks, spoilage concerns, and competition threats with mitigation plans" },
                { icon: FileText, title: "Export Reports", desc: "Download your analysis as a professional PDF report or a styled HTML document to share" },
              ].map(f => (
                <div key={f.title} className="flex gap-3 items-start py-4 border-t border-border">
                  <f.icon className="w-4 h-4 text-accent shrink-0 mt-0.5" aria-hidden="true" strokeWidth={1.8} />
                  <div>
                    <h4 className="text-sm font-medium text-foreground">{f.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="fx-card p-6">
            <h3 className="fx-eyebrow mb-4">How it works</h3>
            <div className="flex flex-col sm:flex-row gap-6">
              {[
                { step: "1", title: "Search Product", desc: "Type a product name — auto-suggests from your inventory" },
                { step: "2", title: "Fetch Data", desc: "Pulls your inventory stock, weather, and market conditions" },
                { step: "3", title: "Generate Report", desc: "Creates a full 7-day forecast with charts and recommendations" },
              ].map(s => (
                <div key={s.step} className="flex-1 flex gap-3 items-start">
                  <span className="fx-num text-sm font-semibold text-accent border border-[var(--accent-border)] bg-[var(--accent-soft)] rounded-[var(--radius-xs)] w-6 h-6 flex items-center justify-center shrink-0">{s.step}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
