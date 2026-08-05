"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import {
  Search, Loader2, Tag, TrendingUp, TrendingDown, Minus,
  Package, MapPin, Cloud, CheckCircle2, AlertTriangle, ArrowUpRight,
  ShoppingBag, Star, FileText, Code, RefreshCw, Zap, Crown,
  Newspaper, BadgePercent, ExternalLink, Brain,
} from "lucide-react";
import { chartColor, tooltipStyle, tooltipLabelStyle, gridProps, axisProps, CHART_H } from "@/lib/chart-theme";

/* eslint-disable @typescript-eslint/no-explicit-any */

const DEFAULT_CATEGORIES = [
  "Dairy", "Beverages", "Snacks", "Groceries", "Ice Cream", "Personal Care",
  "Household", "Biscuits", "Chocolates", "Instant Food", "Masala & Spices", "Oils",
];

const demandBadge = (level: string) => {
  if (level === "High") return "fx-badge fx-badge-danger";
  if (level === "Medium") return "fx-badge fx-badge-warning";
  return "fx-badge fx-badge-success";
};

const DemandIcon = ({ level }: { level: string }) => {
  if (level === "High") return <TrendingUp className="w-3 h-3" aria-hidden="true" />;
  if (level === "Medium") return <Minus className="w-3 h-3" aria-hidden="true" />;
  return <TrendingDown className="w-3 h-3" aria-hidden="true" />;
};

export default function CategoryAnalysisPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [weather, setWeather] = useState<any>(null);
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");
  const [generatedAt, setGeneratedAt] = useState("");
  const [realCategories, setRealCategories] = useState<string[]>([]);
  const [externalSignals, setExternalSignals] = useState<Record<string, any[]>>({});

  // Fetch real categories from inventory + products table
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: inv } = await (await import("@/lib/supabase")).supabase
        .from("inventory").select("category").eq("store_id", user.id);
      const { data: prods } = await (await import("@/lib/supabase")).supabase
        .from("products").select("category");
      const cats = new Set<string>();
      inv?.forEach(i => { if (i.category) cats.add(i.category); });
      prods?.forEach(p => { if (p.category) cats.add(p.category); });
      setRealCategories([...cats].sort());
    })();
  }, [user]);

  const CATEGORIES = realCategories.length > 0 ? realCategories : DEFAULT_CATEGORIES;

  useEffect(() => {
    (async () => {
      try {
        const pos = await new Promise<GeolocationPosition>((r, j) => navigator.geolocation.getCurrentPosition(r, j, { timeout: 10000 }));
        const [wRes, lRes] = await Promise.all([
          fetch(`/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`),
          fetch(`/api/location?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`),
        ]);
        if (wRes.ok) { const d = await wRes.json(); setWeather(d.current); }
        if (lRes.ok) { const d = await lRes.json(); setLocation(d.formattedAddress || d.city || ""); }
      } catch {}
    })();
  }, []);

  const analyze = async (cat: string) => {
    if (!cat.trim() || !user) return;
    setLoading(true);
    setError("");
    setAnalysis(null);
    setExternalSignals({});
    setQuery(cat);

    try {
      const res = await fetch("/api/category-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: cat.trim(), userId: user.id, weather, location }),
      });
      const data = await res.json();
      if (data.analysis) {
        setAnalysis(data.analysis);
        setGeneratedAt(data.generatedAt);
        if (data.location) setLocation(data.location);
        const signalQuery = [
          cat.trim(),
          "grocery category",
          location || data.location || "",
          weather?.description ? `${weather.description} weather` : "",
          "offers promotions retail demand India",
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
    } catch { setError("Something went wrong."); }
    finally { setLoading(false); }
  };

  // Charts
  const brandChartData = analysis?.topBrands?.map((b: any) => ({ name: b.brand, popularity: b.popularity })) || [];
  const productDemandData = analysis?.products?.slice(0, 8).map((p: any) => ({ name: p.name?.length > 15 ? p.name.slice(0, 15) + "..." : p.name, demand: p.weeklyDemand || p.dailyDemand * 7 })) || [];
  const signalSections = [
    { key: "news", title: "News", icon: Newspaper, description: "Category news and retail demand signals." },
    { key: "promotions", title: "Promotion", icon: BadgePercent, description: "Offer and campaign ideas for this category." },
  ];
  const analysisParameters = [
    { title: "Category Demand", detail: "Inventory products, historic sales, city, weather", output: "Demand level and weekly estimate" },
    { title: "Brand Ranking", detail: "Brand popularity, price range, local fit, stock status", output: "Products to stock or add" },
    { title: "External Search", detail: "Category + location + weather + retail offers", output: "News and promotion cards" },
  ];

  // PDF/HTML
  const buildReport = (forPrint: boolean) => {
    if (!analysis) return "";
    const a = analysis;
    const date = generatedAt ? new Date(generatedAt).toLocaleString("en-IN") : new Date().toLocaleString("en-IN");
    const brandRows = a.topBrands?.map((b: any) => `<tr><td><strong>${b.brand}</strong></td><td>${b.popularity}/100</td><td>${b.marketShare}</td><td>${b.priceRange}</td><td style="font-size:11px">${b.reason}</td></tr>`).join("") || "";
    const prodRows = a.products?.map((p: any) => `<tr><td><strong>${p.name}</strong></td><td>${p.brand}</td><td><span style="padding:2px 8px;border-radius:8px;font-size:10px;font-weight:600;background:${p.demandLevel === "High" ? "#fee2e2;color:#dc2626" : p.demandLevel === "Medium" ? "#fef3c7;color:#d97706" : "#dcfce7;color:#16a34a"}">${p.demandLevel}</span></td><td>${p.dailyDemand}/day</td><td>₹${p.suggestedPrice}</td><td>${p.inMyInventory ? "✅ " + p.myStock + " " + (p.myUnit || "") : "❌ Not stocked"}</td><td>${p.margin}</td></tr>`).join("") || "";
    const engineRows = [
      ["Category demand", "Inventory products, historic category sales, city, weather", "Demand level and weekly estimate"],
      ["Brand/product ranking", "Top brands, stock status, margins, local category fit", "Products to stock, maintain, or add"],
      ["External search", "Category + location + weather + retail offers", "News and promotion cards"],
    ].map((row) => `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td></tr>`).join("");
    const signalRows = ["offers", "promotions", "news"].flatMap((key) =>
      (externalSignals[key] || []).slice(0, 3).map((item: any) =>
        `<tr><td>${key}</td><td>${item.title}</td><td>${item.snippet || ""}</td></tr>`
      )
    ).join("");

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Category Analysis - ${a.category}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:${forPrint ? "Georgia,serif" : "'Segoe UI',system-ui,sans-serif"};color:#1e293b;font-size:${forPrint ? "11px" : "13px"};line-height:1.5;padding:${forPrint ? "0" : "32px"};background:#fff}
.cover{background:linear-gradient(135deg,#6d28d9,#7c3aed,#a855f7);color:#fff;padding:${forPrint ? "20px 28px" : "28px 32px"};${forPrint ? "margin:-16mm -16mm 16px -16mm" : "border-radius:16px 16px 0 0"}}
.cover h1{font-size:${forPrint ? "20px" : "24px"};font-weight:700}.cover p{font-size:12px;opacity:.85;margin-top:2px}
.content{${!forPrint ? "max-width:900px;margin:0 auto;background:#fff;border-radius:0 0 16px 16px;box-shadow:0 4px 24px rgba(0,0,0,.08);padding:24px 32px" : ""}}
.summary{background:#f5f3ff;border-left:4px solid #7c3aed;padding:12px 16px;border-radius:8px;margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:${forPrint ? "10px" : "12px"};margin-top:6px}th{background:#f1f5f9;color:#475569;font-size:9px;text-transform:uppercase;letter-spacing:.5px;padding:6px 8px;text-align:left;border-bottom:2px solid #cbd5e1}td{padding:6px 8px;border-bottom:1px solid #e2e8f0}tr:nth-child(even){background:#f8fafc}
.section{margin-bottom:16px;${forPrint ? "page-break-inside:avoid" : ""}}.section-title{font-size:${forPrint ? "13px" : "15px"};font-weight:700;color:#6d28d9;border-bottom:2px solid #e5e7eb;padding-bottom:4px;margin-bottom:8px}
.footer{text-align:center;padding:16px;border-top:2px solid #e5e7eb;color:#94a3b8;font-size:10px;margin-top:20px}
</style></head><body>
<div class="cover"><h1>Category Analysis: ${a.category}</h1><p>${location} | ${date}</p></div>
<div class="content">
<div class="summary"><strong>Summary:</strong> ${a.summary}</div>
<div class="section"><div class="section-title">Analysis Engines & Parameters</div><table><thead><tr><th>Engine</th><th>Parameters Used</th><th>Output</th></tr></thead><tbody>${engineRows}</tbody></table></div>
${signalRows ? `<div class="section"><div class="section-title">News & Promotion Signals</div><table><thead><tr><th>Type</th><th>Signal</th><th>Retail Meaning</th></tr></thead><tbody>${signalRows}</tbody></table></div>` : ""}
<div class="section"><div class="section-title">Top Brands</div><table><thead><tr><th>Brand</th><th>Popularity</th><th>Market Share</th><th>Price Range</th><th>Why Popular</th></tr></thead><tbody>${brandRows}</tbody></table></div>
<div class="section"><div class="section-title">Product Analysis</div><table><thead><tr><th>Product</th><th>Brand</th><th>Demand</th><th>Daily</th><th>Price</th><th>My Stock</th><th>Margin</th></tr></thead><tbody>${prodRows}</tbody></table></div>
${a.missingProducts?.length ? `<div class="section"><div class="section-title">Products to Consider Adding</div><ul style="margin-left:18px">${a.missingProducts.map((m: string) => `<li>${m}</li>`).join("")}</ul></div>` : ""}
<div class="section"><div class="section-title">Recommendations</div><ul style="margin-left:18px">${a.recommendations?.map((r: string) => `<li>${r}</li>`).join("") || ""}</ul></div>
</div><div class="footer">Forecastify — Category Intelligence Report | ${date}</div></body></html>`;
  };

  const downloadPDF = () => { const w = window.open("", "_blank"); if (!w) return; w.document.write(buildReport(true)); w.document.close(); setTimeout(() => w.print(), 500); };
  const downloadHTML = () => {
    const blob = new Blob([buildReport(false)], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `category-${(query || "report").replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.html`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      {/* Page lead — editorial, no card */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="fx-display text-[24px] text-foreground">Category Analysis</h1>
          <p className="text-[13px] text-muted-foreground mt-1.5">Explore top brands and product demand by category for your region</p>
        </div>
        {analysis && (
          <div className="flex gap-2 shrink-0">
            <button onClick={downloadPDF} className="fx-btn"><FileText className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> PDF</button>
            <button onClick={downloadHTML} className="fx-btn"><Code className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> HTML</button>
          </div>
        )}
      </div>

      {/* Search + Category chips */}
      <div>
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && analyze(query)}
              placeholder="Search category — e.g. Dairy, Beverages, Snacks..."
              aria-label="Search category"
              className="fx-input pl-10" />
          </div>
          <button onClick={() => analyze(query)} disabled={loading || !query.trim()}
            className="fx-btn fx-btn-accent">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Search className="w-4 h-4" aria-hidden="true" strokeWidth={1.8} />} Analyze
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => { setQuery(c); analyze(c); }}
              aria-pressed={query === c}
              className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-colors cursor-pointer fx-focus ${
                query === c
                  ? "bg-[var(--accent-soft)] text-accent border border-[var(--accent-border)] font-semibold"
                  : "bg-secondary text-muted-foreground border border-transparent hover:text-foreground"
              }`}>{c}</button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-danger-soft border border-danger/25 text-danger rounded-[var(--radius-md)] px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm">{error}</span>
          <button onClick={() => analyze(query)} className="fx-btn">Retry</button>
        </div>
      )}

      {/* Loading — skeleton mirrors the result layout */}
      {loading && (
        <div className="space-y-6" aria-busy="true" aria-label={`Analyzing ${query} category`}>
          <div className="fx-card p-6 space-y-3">
            <p className="text-sm text-secondary-foreground font-medium">Analyzing &quot;{query}&quot; category…</p>
            <p className="text-xs text-muted-foreground">Fetching regional brands, historic sales, and market data</p>
            <div className="skeleton-shimmer h-5 w-56" />
            <div className="skeleton-shimmer h-3.5 w-full" />
            <div className="skeleton-shimmer h-3.5 w-2/3" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[0, 1].map((i) => (
              <div key={i} className="fx-card p-6 space-y-3">
                <div className="skeleton-shimmer h-4 w-48" />
                <div className="skeleton-shimmer h-56 w-full" />
              </div>
            ))}
          </div>
          <div className="fx-card p-6 space-y-3">
            <div className="skeleton-shimmer h-4 w-56" />
            {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton-shimmer h-9 w-full" />)}
          </div>
        </div>
      )}

      {/* Results */}
      {analysis && !loading && (
        <div className="space-y-6">
          {/* Summary header */}
          <section aria-label="Category summary" className="fx-card p-6">
            <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
              <div className="min-w-0">
                <h2 className="fx-display text-[19px] text-foreground flex items-center gap-2">
                  <Tag className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} />{analysis.category}
                </h2>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                  {location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} />{location}</span>}
                  {weather && <span className="flex items-center gap-1"><Cloud className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /><span className="fx-num">{weather.temp}°C</span> {weather.description}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={demandBadge(analysis.totalCategoryDemand)}>{analysis.totalCategoryDemand} Demand</span>
                <button onClick={() => analyze(query)} className="fx-icon-btn" aria-label="Re-run analysis"><RefreshCw className="w-4 h-4" aria-hidden="true" strokeWidth={1.8} /></button>
              </div>
            </div>
            <p className="text-sm text-secondary-foreground leading-relaxed">{analysis.summary}</p>
            {analysis.seasonalTrend && (
              <p className="text-xs text-muted-foreground mt-2.5 flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-accent" aria-hidden="true" strokeWidth={1.8} />{analysis.seasonalTrend}
              </p>
            )}

            <div className="fx-rule mt-5 pt-4">
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
                const items = (externalSignals[section.key] || []).slice(0, 3);
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
                          className="group border border-border rounded-[var(--radius-md)] p-4 hover:border-border-strong transition-colors fx-focus">
                          <p className="text-sm font-medium text-foreground line-clamp-2">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">{item.snippet}</p>
                          <span className="inline-flex items-center gap-1 text-xs font-medium mt-2.5" style={{ color: "var(--accent)" }}>
                            Open <ExternalLink className="w-3 h-3" aria-hidden="true" strokeWidth={1.8} />
                          </span>
                        </a>
                      ))}
                    </div>
                    {(externalSignals[section.key] || []).length > 3 && (
                      <p className="text-xs text-muted-foreground mt-4 fx-rule pt-3">
                        Showing top <span className="fx-num">3</span> of <span className="fx-num">{(externalSignals[section.key] || []).length}</span> {section.title.toLowerCase()} signals
                      </p>
                    )}
                  </section>
                );
              })}
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Brand popularity */}
            <section aria-label="Top brands by popularity" className="fx-card p-6">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} />
                <h3 className="text-sm font-semibold text-foreground">Top Brands by Popularity</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Popularity score out of 100, ranked for your region</p>
              <div role="img" aria-label={`Horizontal bar chart ranking top brands in ${analysis.category} by popularity score out of 100`}>
                <ResponsiveContainer width="100%" height={CHART_H.standard}>
                  <BarChart data={brandChartData} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid {...gridProps} vertical horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} {...axisProps} />
                    <YAxis type="category" dataKey="name" width={80} {...axisProps} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} cursor={{ fill: "var(--secondary)", opacity: 0.5 }} />
                    <Bar dataKey="popularity" name="Popularity" radius={[0, 4, 4, 0]} barSize={14}>
                      {brandChartData.map((_: any, i: number) => <Cell key={i} fill={chartColor(i)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Weekly demand by product */}
            <section aria-label="Weekly demand by product" className="fx-card p-6">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} />
                <h3 className="text-sm font-semibold text-foreground">Weekly Demand by Product</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Estimated weekly units — showing top <span className="fx-num">{productDemandData.length}</span> of <span className="fx-num">{analysis.products?.length || 0}</span> products
              </p>
              <div role="img" aria-label="Bar chart of estimated weekly unit demand for the top products in this category">
                <ResponsiveContainer width="100%" height={CHART_H.standard}>
                  <BarChart data={productDemandData} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="name" {...axisProps} fontSize={10} angle={-25} textAnchor="end" height={60} />
                    <YAxis {...axisProps} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} cursor={{ fill: "var(--secondary)", opacity: 0.5 }} />
                    <Bar dataKey="demand" name="Weekly Units" radius={[3, 3, 0, 0]} barSize={14} fill="var(--accent)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {/* Brand analysis — hairline ledger rows */}
          <section aria-label="Brand analysis" className="fx-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
              <h3 className="fx-display text-[17px] text-foreground">Brand Analysis — {analysis.category}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
              {analysis.topBrands?.map((b: any, i: number) => (
                <div key={i} className="py-4 border-b border-border">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{b.brand}</span>
                      {i === 0 && <Crown className="w-3.5 h-3.5 text-accent shrink-0" aria-hidden="true" strokeWidth={1.8} />}
                    </p>
                    <span className="fx-num text-xs font-semibold text-foreground shrink-0">{b.popularity}/100</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={b.popularity} aria-valuemin={0} aria-valuemax={100} aria-label={`${b.brand} popularity`}>
                    <div className="h-full rounded-full" style={{ width: `${b.popularity}%`, background: "var(--accent)" }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{b.marketShare} market share · {b.priceRange}</p>
                  <p className="text-xs text-muted-foreground mt-1">{b.reason}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Products table */}
          <section aria-label="Product-wise demand" className="fx-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} />
              <h3 className="fx-display text-[17px] text-foreground">Product-wise Demand Analysis</h3>
            </div>
            <div className="fx-table-scroll -mx-2">
              <table className="fx-table min-w-[720px]">
                <caption className="fx-sr-only">
                  Product-wise demand analysis for {analysis.category}: brand, demand level, daily and weekly units, suggested price, your stock on hand, stock status, and margin.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col">Brand</th>
                    <th scope="col" className="text-center">Demand</th>
                    <th scope="col" className="text-right">Daily</th>
                    <th scope="col" className="text-right">Weekly</th>
                    <th scope="col" className="text-right">Price</th>
                    <th scope="col" className="text-right">My Stock</th>
                    <th scope="col" className="text-center">Status</th>
                    <th scope="col" className="text-right">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.products?.map((p: any, i: number) => (
                    <tr key={i}>
                      <td><p className="font-medium text-foreground">{p.name}</p><p className="text-xs text-muted-foreground mt-0.5">{p.reason}</p></td>
                      <td className="text-xs text-muted-foreground">{p.brand}</td>
                      <td className="text-center"><span className={demandBadge(p.demandLevel)}><DemandIcon level={p.demandLevel} />{p.demandLevel}</span></td>
                      <td className="text-right fx-num font-semibold text-foreground">{p.dailyDemand}</td>
                      <td className="text-right fx-num text-secondary-foreground">{p.weeklyDemand}</td>
                      <td className="text-right fx-num text-foreground">₹{p.suggestedPrice}</td>
                      <td className="text-right">{p.inMyInventory ? <span className="fx-num font-semibold text-foreground">{p.myStock} {p.myUnit}</span> : <span className="text-muted-foreground text-xs">—</span>}</td>
                      <td className="text-center">
                        {p.stockStatus === "Sufficient" && <span className="text-xs text-success inline-flex items-center justify-center gap-1"><CheckCircle2 className="w-3 h-3" aria-hidden="true" />OK</span>}
                        {p.stockStatus === "Low" && <span className="text-xs text-warning inline-flex items-center justify-center gap-1"><AlertTriangle className="w-3 h-3" aria-hidden="true" />Low</span>}
                        {(p.stockStatus === "Out of Stock" || p.stockStatus === "Not Stocked") && <span className="text-xs text-danger inline-flex items-center justify-center gap-1"><AlertTriangle className="w-3 h-3" aria-hidden="true" />{p.inMyInventory ? "Out" : "Add"}</span>}
                      </td>
                      <td className="text-right fx-num font-medium text-foreground">{p.margin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Missing products + Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {analysis.missingProducts?.length > 0 && (
              <section aria-label="Products to consider adding" className="fx-card p-6">
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingBag className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} />
                  <h3 className="text-sm font-semibold text-foreground">Products to Consider Adding</h3>
                </div>
                <ul>
                  {analysis.missingProducts.map((m: string, i: number) => (
                    <li key={i} className="flex items-start gap-2.5 py-2.5 border-b border-border last:border-b-0 text-[13px] text-secondary-foreground leading-snug">
                      <span className="fx-signal fx-signal-accent mt-[5px]" aria-hidden="true" />{m}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section aria-label="Recommendations" className="fx-card p-6">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} />
                <h3 className="text-sm font-semibold text-foreground">Recommendations</h3>
              </div>
              <ul>
                {analysis.recommendations?.map((r: string, i: number) => (
                  <li key={i} className="flex items-start gap-2.5 py-2.5 border-b border-border last:border-b-0 text-[13px] text-secondary-foreground leading-snug">
                    <ArrowUpRight className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" aria-hidden="true" strokeWidth={1.8} />{r}
                  </li>
                ))}
              </ul>
              {analysis.competitorInsight && <p className="text-xs text-muted-foreground mt-4 fx-rule pt-3"><strong className="font-semibold text-secondary-foreground">Competitor:</strong> {analysis.competitorInsight}</p>}
            </section>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !analysis && (
        <div className="space-y-6">
          <div className="fx-card text-center py-12 px-6">
            <Tag className="w-5 h-5 text-muted-foreground mx-auto mb-3 opacity-60" aria-hidden="true" strokeWidth={1.8} />
            <p className="text-sm text-secondary-foreground font-medium">Select a category to analyze</p>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-md mx-auto">Discover top brands in your region, compare product demand, find gaps in your inventory, and get restocking recommendations.</p>
          </div>
          <div className="fx-card p-6">
            <h3 className="fx-eyebrow mb-2">What you&apos;ll get</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0">
              {[
                { icon: Crown, title: "Top Regional Brands", desc: "Discover the most popular brands for each category in your city with market share data" },
                { icon: TrendingUp, title: "Product-wise Demand", desc: "See daily and weekly demand for every product with demand level scoring" },
                { icon: ShoppingBag, title: "Inventory Gap Analysis", desc: "Find out which products you should add to capture more sales in your area" },
                { icon: Star, title: "Competitor Insights", desc: "Know what other stores in your area stock and how to stay competitive" },
                { icon: Package, title: "Stock Recommendations", desc: "Exact restock quantities based on demand patterns and your current inventory" },
                { icon: FileText, title: "Export Reports", desc: "Download professional PDF or HTML reports to share with your team" },
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
        </div>
      )}
    </div>
  );
}
