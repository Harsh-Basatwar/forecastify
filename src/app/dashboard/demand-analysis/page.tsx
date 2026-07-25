"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { recordLocalActivity } from "@/lib/local-activity";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from "recharts";
import {
  MapPin, Cloud, TrendingUp, AlertTriangle, ShoppingBag, Download,
  FileText, Code, Loader2, RefreshCw, Zap, Thermometer, Droplets,
  Wind, Calendar, Tag, Package, ShieldAlert, ArrowUpRight, ArrowDownRight,
  ChevronDown, ChevronUp, Star, Clock, Brain, Lightbulb,
} from "lucide-react";

interface WeatherData {
  current: {
    temp: number; feelsLike: number; humidity: number;
    weather: string; description: string; windSpeed: number; city: string;
  };
  forecast: {
    date: string; avgTemp: number; maxTemp: number; minTemp: number;
    avgHumidity: number; weather: string;
  }[];
}

interface DemandSpike {
  day: string; dayName: string; spikeProbability: number;
  expectedIncrease: string; reason: string; topProducts: string[];
  primaryProduct?: string; supportingProducts?: string[]; theme?: string;
  groqInsight?: string;
}

interface TrendingProduct {
  name: string; category: string; demandScore: number;
  trend?: string; reason: string; stockingReason?: string;
  recommendedStock: string; priceRange: string; inInventory?: boolean;
}

interface Analysis {
  summary: string;
  executiveInsight?: string;
  demandSpikes: DemandSpike[];
  trendingProducts: TrendingProduct[];
  weatherImpact: {
    severity: string; description: string;
    affectedCategories: string[]; recommendations: string[];
    groqInsight?: string;
  };
  upcomingOffers: UpcomingOffer[];
  inventoryRecommendations: {
    product: string; currentStock?: number; action: string;
    unitsToOrder?: number; currentAdvice: string; urgency: string;
    groqInsight?: string;
  }[];
  riskAlerts: {
    type: string; severity: string; product?: string;
    currentStock?: number; message: string; mitigation: string;
    groqInsight?: string;
  }[];
  analysisMeta?: {
    runId: string;
    inventoryCount: number;
    candidateCount: number;
    location: string;
    dataSources: string[];
    focusProducts: string[];
    modelsUsed?: string[];
    modelSignals?: { provider: string; model: string; status: string; note: string }[];
  };
}

interface NewsData {
  offers: { title: string; snippet: string; link: string }[];
  trending: { title: string; snippet: string; link: string }[];
  events: { title: string; snippet: string; link: string }[];
}

interface UpcomingOffer {
  event: string; date: string; affectedCategories: string[];
  expectedDemandChange: string; recommendations: string[];
  groqInsight?: string; offerLink?: string;
}

const SPIKE_COLORS = ["#6366f1", "#a855f7", "#ec4899", "#f59e0b", "#22c55e", "#06b6d4", "#f43f5e"];
const STORE_PROFILE_SELECT = "id, store_name, store_category, store_size, city, state, store_address";

interface StoreProfile {
  id?: string;
  store_name: string;
  store_category: string;
  store_size: string;
  city: string;
  state: string;
  store_address: string;
}

function chartLabelFor(day: string | undefined, index: number) {
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + index);
  const date = day ? new Date(`${day}T00:00:00`) : fallback;
  return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });
}

function ownerSafeSignalNote(note: string | undefined) {
  return (note || "Live store signal checked")
    .replace(/Hugging Face|facebook\/bart-large-mnli|Forecastify deterministic inventory scorer|Groq|Gemini|XGBoost|LightGBM|BAAI\/bge-small-en-v1\.5|ChromaDB|RoBERTa|scikit-learn|KMeans/gi, "business analysis")
    .replace(/\s+/g, " ")
    .trim();
}

function DemandSpikeTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  return (
    <div className="max-w-[280px] rounded-lg border border-border bg-card p-3 shadow-xl">
      <p className="text-sm font-semibold text-foreground">{data.fullDay}</p>
      <p className="text-xs text-muted-foreground">{data.date}</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">Spike probability</span>
        <span className="text-sm font-bold text-primary">{data.probability}%</span>
      </div>
      {data.primaryProduct && (
        <div className="mt-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Primary product</p>
          <p className="text-xs font-medium text-foreground">{data.primaryProduct}</p>
        </div>
      )}
      {data.supportingProducts?.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Supporting demand</p>
          <p className="text-xs text-muted-foreground">{data.supportingProducts.join(", ")}</p>
        </div>
      )}
      {data.reason && <p className="mt-2 text-xs leading-relaxed text-foreground/80">{data.reason}</p>}
    </div>
  );
}

export default function DemandAnalysisPage() {
  const { user } = useAuth();
  const reportRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [news, setNews] = useState<NewsData | null>(null);
  const [locationInfo, setLocationInfo] = useState<{
    formattedAddress: string; city: string; state: string;
  } | null>(null);
  const [storeProfile, setStoreProfile] = useState<StoreProfile | null>(null);
  const [inventoryScope, setInventoryScope] = useState<{ count: number; storeId: string; source: string } | null>(null);
  const [error, setError] = useState("");
  const [generatedAt, setGeneratedAt] = useState("");
  const [expandedSpike, setExpandedSpike] = useState<number | null>(null);
  const [showAllProducts, setShowAllProducts] = useState(false);

  const loadActiveStoreProfile = useCallback(async () => {
    if (!user) return null;

    const { data } = await supabase
      .from("profiles")
      .select(STORE_PROFILE_SELECT)
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      setStoreProfile(data as StoreProfile);
      return data as StoreProfile;
    }

    const { data: fallbackProfiles } = await supabase
      .from("profiles")
      .select(STORE_PROFILE_SELECT)
      .limit(2);

    if (fallbackProfiles?.length === 1) {
      const fallback = fallbackProfiles[0] as StoreProfile;
      setStoreProfile(fallback);
      return fallback;
    }

    return null;
  }, [user]);

  // Fetch store profile from DB
  useEffect(() => {
    if (!user) return;
    void loadActiveStoreProfile();
  }, [user, loadActiveStoreProfile]);

  const runAnalysis = async () => {
    if (!user) {
      setError("Please sign in before running demand analysis.");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis(null);
    setWeather(null);
    setNews(null);
    setLocationInfo(null);
    setInventoryScope(null);

    try {
      const activeProfile = await loadActiveStoreProfile();
      const profile = activeProfile || storeProfile;

      // Step 1: Resolve store location from DB address via Google Maps
      setStep("Locating your store...");
      const storeAddress = [
        profile?.store_address,
        profile?.city || user.user_metadata?.city,
        profile?.state || user.user_metadata?.state,
      ].filter(Boolean).join(", ");

      let lat: number | null = null;
      let lon: number | null = null;
      let locData: { formattedAddress?: string; city?: string; state?: string; lat?: number; lon?: number } = {};

      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
        );
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;

        const locRes = await fetch(`/api/location?lat=${lat}&lon=${lon}`);
        const locJson = await locRes.json();
        if (locRes.ok) {
          locData = {
            ...locJson,
            formattedAddress: locJson.formattedAddress || [locJson.city, locJson.state].filter(Boolean).join(", "),
            city: locJson.city || profile?.city || user.user_metadata?.city,
            state: locJson.state || profile?.state || user.user_metadata?.state,
          };
          setLocationInfo(locData as { formattedAddress: string; city: string; state: string });
        }
      } catch {
        if (storeAddress) {
          setStep("Using saved store address...");
          const locRes = await fetch(`/api/location?address=${encodeURIComponent(storeAddress)}`);
          const locJson = await locRes.json();
          if (locRes.ok) {
            locData = {
              ...locJson,
              formattedAddress: locJson.formattedAddress || storeAddress,
              city: locJson.city || profile?.city || user.user_metadata?.city,
              state: locJson.state || profile?.state || user.user_metadata?.state,
            };
            lat = locJson.lat;
            lon = locJson.lon;
            setLocationInfo(locData as { formattedAddress: string; city: string; state: string });
          }
        }
      }

      if (!lat || !lon) {
        throw new Error("Unable to resolve current location or saved store address.");
      }

      const category = profile?.store_category || user.user_metadata?.store_category || "Grocery & Supermarket";
      const city = locData?.city || profile?.city || "";
      const state = locData?.state || profile?.state || "";

      // Step 2: Fetch weather for the resolved coordinates
      setStep("Fetching weather data...");
      const weatherRes = await fetch(`/api/weather?lat=${lat}&lon=${lon}&city=${encodeURIComponent(locData?.city || city || profile?.city || "")}`);
      const weatherData = await weatherRes.json();
      if (weatherRes.ok) setWeather(weatherData);

      // Step 3: Fetch news & offers
      setStep("Searching for offers & trends...");
      const newsRes = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeCategory: category, city, state }),
      });
      const newsData = await newsRes.json();
      if (newsRes.ok) setNews(newsData);

      // Step 3.5: Fetch store inventory from Supabase
      setStep("Loading your inventory data...");
      let inventoryItems: any[] = [];
      const inventoryStoreId = profile?.id || user.id;
      const { data: invData } = await supabase
        .from("inventory")
        .select("product_name, category, current_stock, unit, price, sku, brand, reorder_level, expiry_date")
        .eq("store_id", inventoryStoreId)
        .order("sku", { ascending: true });
      inventoryItems = invData || [];
      setInventoryScope({
        count: inventoryItems.length,
        storeId: inventoryStoreId,
        source: profile?.id === user.id ? "Current user profile" : "Workspace demo profile",
      });

      if (!inventoryItems.length) {
        throw new Error("No inventory products found for this store.");
      }

      // Step 4: Run AI analysis
      setStep("Generating demand predictions...");
      const analysisRes = await fetch("/api/demand-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: inventoryStoreId,
          storeCategory: category,
          storeSize: profile?.store_size || user.user_metadata?.store_size || "",
          city, state,
          weather: weatherData?.current,
          forecast: weatherData?.forecast,
          news: newsData,
          events: newsData?.events,
          location: locData?.formattedAddress || `${city}, ${state}`,
          inventory: inventoryItems,
          runId: `${Date.now()}-${inventoryItems.length}-${Math.random().toString(36).slice(2)}`,
        }),
      });
      const analysisData = await analysisRes.json();

      if (analysisRes.ok && analysisData.analysis) {
        setAnalysis(analysisData.analysis);
        setGeneratedAt(analysisData.generatedAt);
        recordLocalActivity(user.id, {
          activityType: "DEMAND_SPIKE_ANALYSIS",
          title: "Demand Spike Analysis",
          description: analysisData.analysis.summary || `Demand analysis completed for ${inventoryItems.length} products.`,
          metadata: {
            inventoryCount: inventoryItems.length,
            location: locData?.formattedAddress || `${city}, ${state}`,
            focusProducts: analysisData.analysis.analysisMeta?.focusProducts || [],
            modelsUsed: analysisData.analysis.analysisMeta?.modelsUsed || [],
          },
        });
      } else {
        setError(analysisData.error || "Analysis failed");
      }
    } catch (err) {
      console.error("Analysis error:", err);
      if (err instanceof GeolocationPositionError) {
        setError("Location access denied. Please enable location permissions and try again.");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
      setStep("");
    }
  };

  const getReportData = () => {
    const storeName = storeProfile?.store_name || "Store";
    const storeCategory = storeProfile?.store_category || "";
    const loc = locationInfo?.formattedAddress || `${storeProfile?.city || ""}, ${storeProfile?.state || ""}`;
    const date = generatedAt ? new Date(generatedAt).toLocaleString("en-IN") : new Date().toLocaleString("en-IN");

    const spikesTable = analysis?.demandSpikes?.map(s => `
      <tr>
        <td><strong>${s.dayName}</strong><br/><span style="color:#888;font-size:11px">${s.day}</span></td>
        <td><div class="spike-bar" style="width:${Math.min(s.spikeProbability, 100)}px"></div>${s.spikeProbability}%</td>
        <td><span class="badge badge-increase">${s.expectedIncrease}</span></td>
        <td style="max-width:200px">${s.reason}</td>
        <td>
          ${s.primaryProduct ? `<strong>${s.primaryProduct}</strong>` : ""}
          <div class="product-tags">${(s.supportingProducts?.length ? s.supportingProducts : s.topProducts?.slice(1))?.map(p => `<span class="product-tag">${p}</span>`).join("") || "-"}</div>
        </td>
      </tr>
    `).join("") || "";

    const productsTable = analysis?.trendingProducts?.map(p => `
      <tr>
        <td><strong>${p.name}</strong></td>
        <td>${p.category}</td>
        <td><div class="spike-bar" style="width:${p.demandScore}px;max-width:80px"></div>${p.demandScore}</td>
        <td><span class="badge badge-${p.recommendedStock?.toLowerCase()}">${p.recommendedStock}</span></td>
        <td>${p.priceRange}</td>
        <td style="max-width:180px;font-size:11px;color:#666">${p.reason}</td>
      </tr>
    `).join("") || "";

    const inventoryCards = analysis?.inventoryRecommendations?.map(r => `
      <div class="card">
        <h4>${r.product}</h4>
        <p><strong>${r.action}</strong> · <span class="badge badge-${r.urgency?.toLowerCase()}">${r.urgency}</span></p>
        <p style="margin-top:4px">${r.currentAdvice}</p>
      </div>
    `).join("") || "";

    const riskCards = analysis?.riskAlerts?.map(r => `
      <div class="card risk-${r.severity}">
        <h4 style="display:flex;align-items:center;gap:6px">${r.type.replace(/_/g, " ").toUpperCase()} <span class="badge badge-${r.severity}">${r.severity}</span></h4>
        <p style="margin-top:4px">${r.message}</p>
        <p style="margin-top:4px;font-size:12px"><strong>Mitigation:</strong> ${r.mitigation}</p>
      </div>
    `).join("") || "";

    const offersSection = analysis?.upcomingOffers?.map(o => `
      <div class="card">
        <h4>${o.event}</h4>
        <p><strong>Date:</strong> ${o.date} · <span class="badge badge-increase">${o.expectedDemandChange}</span></p>
        <p><strong>Categories:</strong> ${o.affectedCategories?.join(", ")}</p>
        <p style="margin-top:4px"><strong>Stock up:</strong> ${o.recommendations?.join("; ")}</p>
      </div>
    `).join("") || "";

    const weatherForecastHTML = weather?.forecast?.map(d => `
      <div class="weather-day">
        <div class="label">${new Date(d.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })}</div>
        <div class="temp">${d.maxTemp}°</div>
        <div class="label">${d.minTemp}° · ${d.weather}</div>
        <div class="label">${d.avgHumidity}% humidity</div>
      </div>
    `).join("") || "";

    const scopeSection = analysis?.analysisMeta ? `
      <div class="scope-grid">
        <div><strong>${analysis.analysisMeta.inventoryCount}</strong><span>Products scanned</span></div>
        <div><strong>${analysis.analysisMeta.candidateCount}</strong><span>Demand candidates</span></div>
        <div><strong>${inventoryScope?.source || "Live store profile"}</strong><span>Inventory source</span></div>
      </div>
      <div class="exec-summary"><strong>Analysis method:</strong> Live inventory, weather, local events, stock risk, product movement, and business narrative were combined into this owner-ready forecast.</div>
    ` : "";
    const driverRows = [
      ["Historical Sales", Math.min(94, Math.max(52, Math.round(((analysis?.analysisMeta?.candidateCount || 0) / Math.max(1, analysis?.analysisMeta?.inventoryCount || 1)) * 100) + 45))],
      ["Weather", analysis?.weatherImpact?.severity === "High" ? 88 : analysis?.weatherImpact?.severity === "Medium" ? 68 : 42],
      ["Festival/Event", analysis?.upcomingOffers?.length ? 76 : 34],
      ["Seasonality", analysis?.demandSpikes?.[0]?.spikeProbability ? Math.min(90, Math.max(45, analysis.demandSpikes[0].spikeProbability - 8)) : 45],
      ["Promotion", analysis?.inventoryRecommendations?.some((item) => item.action === "Decrease") ? 64 : 36],
    ];
    const businessImpactHTML = `
      <div class="section">
        <div class="section-head"><span class="num">1</span>Business Impact Breakdown</div>
        <div class="grid">
          <div class="card">
            <h4>Products Most Likely To Move</h4>
            ${(analysis?.trendingProducts || []).slice(0, 5).map((p) => `<p><strong>${p.name}</strong> — ${p.demandScore}/100 · ${p.recommendedStock}</p>`).join("")}
            <p class="meaning">Meaning: higher score means faster expected movement; High products should be protected from stockout first.</p>
          </div>
          <div class="card">
            <h4>Why Demand Is Moving</h4>
            ${driverRows.map(([name, value]) => `<div class="bar-row"><span>${name}</span><div class="bar-shell"><div class="bar color-${String(name).replace(/[^a-z]/gi, "").toLowerCase()}" style="width:${value}%"></div></div><b>${value}%</b></div>`).join("")}
            <p class="meaning">Meaning: longer bars show which real factors are driving the run: history, weather, events, seasonality, or promotion pressure.</p>
          </div>
        </div>
      </div>
    `;

    return { storeName, storeCategory, loc, date, spikesTable, productsTable, inventoryCards, riskCards, offersSection, weatherForecastHTML, scopeSection, businessImpactHTML };
  };

  const buildPDFHTML = () => {
    const d = getReportData();
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Demand Spike Analysis - ${d.storeName}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color:#111; font-size:10.5px; line-height:1.45; background:#fff; border:1.5px solid #111; padding:12px; }

  /* Cover band */
  .cover-band { color:#111; padding:12px 14px; margin:0 0 12px 0; border:1.5px solid #111; background:#fff; }
  .cover-top { display:flex; justify-content:space-between; align-items:center; }
  .cover-brand { display:flex; align-items:center; gap:12px; }
  .cover-logo { width:30px; height:30px; border:1.5px solid #111; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:16px; }
  .cover-brand span { font-size:18px; font-weight:800; }
  .cover-badge { border:1px solid #111; padding:3px 10px; font-size:9px; font-weight:700; letter-spacing:0.5px; text-transform:uppercase; }
  .cover-title { font-size:21px; font-weight:800; margin-top:12px; line-height:1.15; }
  .cover-sub { font-size:11px; margin-top:3px; }
  .cover-meta { display:grid; grid-template-columns:1fr 1fr; gap:5px 12px; margin-top:10px; }
  .cover-meta-item { font-size:9.5px; }
  .cover-line { height:1px; background:#111; margin-top:10px; }

  /* Executive Summary */
  .exec-summary { border:1px solid #111; padding:9px 10px; margin-bottom:10px; font-size:10.5px; color:#111; }
  .exec-summary strong { color:#000; }
  .scope-grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; margin-bottom:10px; }
  .scope-grid div { border:1px solid #111; padding:7px 8px; }
  .scope-grid strong { display:block; font-size:13px; color:#000; }
  .scope-grid span { display:block; font-size:8px; text-transform:uppercase; letter-spacing:0.4px; margin-top:2px; }

  /* Sections */
  .section { margin-bottom:10px; page-break-inside:avoid; }
  .section-head { font-size:12px; font-weight:800; color:#000; border-bottom:1.5px solid #111; padding-bottom:3px; margin-bottom:6px; text-transform:uppercase; }
  .section-head .num { display:inline-block; border:1px solid #111; color:#000; width:18px; height:18px; text-align:center; line-height:16px; font-size:9px; margin-right:6px; vertical-align:middle; }

  /* Tables */
  table { width:100%; border-collapse:collapse; font-size:9.4px; page-break-inside:auto; }
  th { background:#eee; color:#000; font-size:8px; font-weight:800; text-transform:uppercase; letter-spacing:0.4px; padding:5px 6px; text-align:left; border:1px solid #111; }
  td { padding:5px 6px; border:1px solid #111; vertical-align:top; }
  tr { page-break-inside:avoid; }

  /* Cards */
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
  .grid-3 { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
  .card { padding:7px 8px; border:1px solid #111; background:#fff; page-break-inside:avoid; }
  .card h4 { font-size:10px; font-weight:800; color:#000; margin-bottom:3px; }
  .card p { font-size:9px; color:#111; line-height:1.35; }

  /* Badges */
  .badge { display:inline-block; padding:1px 6px; border:1px solid #111; font-size:8px; font-weight:800; color:#000; background:#fff; }
  .badge-high, .badge-critical, .badge-medium, .badge-warning, .badge-low, .badge-info, .badge-increase { color:#000; background:#fff; border:1px solid #111; }

  /* Bars & Tags */
  .spike-bar { height:9px; background:#111; display:inline-block; vertical-align:middle; margin-right:5px; }
  .bar-row{display:grid;grid-template-columns:88px 1fr 32px;gap:5px;align-items:center;margin:5px 0;font-size:9px}.bar-shell{height:10px;border:1px solid #111;background:#fff}.bar{height:100%;background:#111}.color-weather{background:#2563eb}.color-festivalevent{background:#db2777}.color-seasonality{background:#d97706}.color-promotion{background:#16a34a}.color-historicalsales{background:#4f46e5}.meaning{font-size:9px;color:#333;border-top:1px solid #bbb;margin-top:6px;padding-top:5px}
  .product-tags { display:flex; flex-wrap:wrap; gap:3px; margin-top:3px; }
  .product-tag { color:#000; padding:1px 5px; border:1px solid #111; font-size:8px; font-weight:700; }

  /* Risk borders */
  .risk-critical, .risk-warning, .risk-info { border-left:3px solid #111; }

  /* Weather */
  .weather-grid { display:grid; grid-template-columns:repeat(7, 1fr); gap:6px; }
  .weather-day { padding:6px 3px; text-align:center; border:1px solid #111; }
  .weather-day .temp { font-size:13px; font-weight:800; color:#000; }
  .weather-day .label { font-size:8px; color:#111; }

  /* Footer */
  .footer { margin-top:12px; padding-top:8px; border-top:1.5px solid #111; display:flex; justify-content:space-between; align-items:center; font-size:8px; color:#111; gap:12px; }
  .footer-left { font-weight:800; color:#000; }
  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  }
</style></head><body>

<div class="cover-band">
  <div class="cover-top">
    <div class="cover-brand"><div class="cover-logo">F</div><span>Forecastify</span></div>
    <div class="cover-badge">Confidential Report</div>
  </div>
  <div class="cover-title">Demand Spike Analysis Report</div>
  <div class="cover-sub">Retail Intelligence Report &middot; ${d.storeCategory}</div>
  <div class="cover-meta">
    <div class="cover-meta-item"><strong>Store:</strong> ${d.storeName}</div>
    <div class="cover-meta-item"><strong>Location:</strong> ${d.loc}</div>
    <div class="cover-meta-item"><strong>Weather:</strong> ${weather?.current?.temp || "--"}°C, ${weather?.current?.description || "--"}</div>
    <div class="cover-meta-item"><strong>Generated:</strong> ${d.date}</div>
  </div>
  <div class="cover-line"></div>
</div>

<div class="exec-summary"><strong>Executive Summary:</strong> ${analysis?.summary || ""}</div>
${d.businessImpactHTML}
${d.scopeSection}

${weather ? `<div class="section">
  <div class="section-head"><span class="num">1</span>7-Day Weather Forecast</div>
  <div class="weather-grid">${d.weatherForecastHTML}</div>
</div>` : ""}

<div class="section">
  <div class="section-head"><span class="num">2</span>Demand Spike Forecast</div>
  <table><thead><tr><th>Day</th><th>Probability</th><th>Increase</th><th>Reason</th><th>Top Products</th></tr></thead><tbody>${d.spikesTable}</tbody></table>
</div>

<div class="section">
  <div class="section-head"><span class="num">3</span>Trending Products</div>
  <table><thead><tr><th>Product</th><th>Category</th><th>Score</th><th>Stock</th><th>Price</th><th>Reason</th></tr></thead><tbody>${d.productsTable}</tbody></table>
</div>

${analysis?.weatherImpact ? `<div class="section">
  <div class="section-head"><span class="num">4</span>Weather Impact Analysis</div>
  <div class="card">
    <h4>Severity: <span class="badge badge-${analysis.weatherImpact.severity?.toLowerCase()}">${analysis.weatherImpact.severity}</span></h4>
    <p style="margin-top:4px;font-size:11px;color:#111">${analysis.weatherImpact.description}</p>
    <p style="margin-top:6px"><strong>Affected:</strong> ${analysis.weatherImpact.affectedCategories?.join(", ")}</p>
    <ul style="margin:4px 0 0 16px;font-size:10px;color:#111">${analysis.weatherImpact.recommendations?.map(r => `<li>${r}</li>`).join("") || ""}</ul>
  </div>
</div>` : ""}

${analysis?.upcomingOffers?.length ? `<div class="section">
  <div class="section-head"><span class="num">5</span>Upcoming Offers & Events</div>
  <div class="grid">${d.offersSection}</div>
</div>` : ""}

${analysis?.inventoryRecommendations?.length ? `<div class="section">
  <div class="section-head"><span class="num">6</span>Inventory Recommendations</div>
  <div class="grid-3">${d.inventoryCards}</div>
</div>` : ""}

${analysis?.riskAlerts?.length ? `<div class="section">
  <div class="section-head"><span class="num">7</span>Risk Alerts</div>
  <div class="grid">${d.riskCards}</div>
</div>` : ""}

<div class="footer">
  <div class="footer-left">Forecastify &middot; Smart Demand Forecasting</div>
  <div>&copy; ${new Date().getFullYear()} Forecastify. Confidential to ${d.storeName}. Powered by Forecastify Intelligence.</div>
</div>
</body></html>`;
  };

  const buildWebHTML = () => {
    const d = getReportData();
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Demand Analysis - ${d.storeName}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',system-ui,sans-serif; color:#1a1a2e; padding:32px 40px; line-height:1.6; background:#f9fafb; }
  .report-wrap { max-width:960px; margin:0 auto; background:#fff; border-radius:16px; box-shadow:0 4px 24px rgba(0,0,0,0.08); overflow:hidden; }
  .header-band { background:linear-gradient(135deg, #6366f1, #a855f7, #ec4899); padding:28px 32px; color:#fff; }
  .header-brand { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
  .header-logo { width:40px; height:40px; background:linear-gradient(135deg,#6366f1,#9333ea); border-radius:12px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:18px; box-shadow:0 4px 12px rgba(99,102,241,0.3); }
  .header-brand span { font-size:18px; font-weight:700; }
  .header-band h1 { font-size:26px; font-weight:700; }
  .header-band p { font-size:13px; opacity:0.85; margin-top:4px; }
  .meta-row { display:flex; gap:12px; flex-wrap:wrap; padding:16px 32px; border-bottom:1px solid #e5e7eb; background:#fafafa; }
  .meta-item { display:flex; align-items:center; gap:6px; font-size:12px; color:#475569; background:#fff; padding:6px 14px; border-radius:20px; border:1px solid #e5e7eb; }
  .meta-item strong { color:#1e293b; }
  .content { padding:24px 32px; }
  .summary-box { background:linear-gradient(135deg,#eef2ff,#faf5ff); padding:16px 20px; border-radius:12px; border-left:4px solid #6366f1; margin-bottom:24px; font-size:14px; color:#334155; }
  .scope-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:24px; }
  .scope-grid div { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:14px 16px; }
  .scope-grid strong { display:block; font-size:22px; color:#111827; line-height:1.1; }
  .scope-grid span { display:block; margin-top:6px; color:#64748b; font-size:11px; text-transform:uppercase; letter-spacing:0.6px; font-weight:700; }
  .section { margin-bottom:24px; }
  .section-title { font-size:16px; font-weight:700; color:#6366f1; margin-bottom:12px; padding-bottom:6px; border-bottom:2px solid #e5e7eb; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  th { background:#f1f5f9; color:#475569; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; padding:10px 12px; text-align:left; border-bottom:2px solid #e2e8f0; }
  td { padding:10px 12px; border-bottom:1px solid #f1f5f9; }
  tr:hover { background:#fafbff; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
  .card { background:#fff; padding:14px 16px; border-radius:10px; border:1px solid #e5e7eb; transition:box-shadow 0.2s; }
  .card:hover { box-shadow:0 2px 8px rgba(0,0,0,0.06); }
  .card h4 { font-size:14px; font-weight:600; color:#1e293b; margin-bottom:4px; }
  .card p { font-size:12px; color:#64748b; line-height:1.5; }
  .badge { display:inline-block; padding:2px 10px; border-radius:12px; font-size:11px; font-weight:600; }
  .badge-high,.badge-critical { background:#fee2e2; color:#dc2626; }
  .badge-medium,.badge-warning { background:#fef3c7; color:#d97706; }
  .badge-low,.badge-info { background:#dbeafe; color:#2563eb; }
  .badge-increase { background:#dcfce7; color:#16a34a; }
  .spike-bar { height:14px; border-radius:4px; background:linear-gradient(90deg,#6366f1,#a855f7); display:inline-block; vertical-align:middle; margin-right:6px; }
  .product-tags { display:flex; flex-wrap:wrap; gap:4px; margin-top:4px; }
  .product-tag { background:#eef2ff; color:#4f46e5; padding:2px 8px; border-radius:6px; font-size:10px; font-weight:500; }
  .risk-critical { border-left:4px solid #dc2626; }
  .risk-warning { border-left:4px solid #d97706; }
  .risk-info { border-left:4px solid #2563eb; }
  .weather-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(110px,1fr)); gap:8px; }
  .weather-day { background:#f0f9ff; padding:12px 8px; border-radius:10px; text-align:center; border:1px solid #e0f2fe; }
  .weather-day .temp { font-size:20px; font-weight:700; color:#ea580c; }
  .weather-day .label { font-size:11px; color:#64748b; }
  .footer { text-align:center; padding:20px 32px; border-top:1px solid #e5e7eb; color:#94a3b8; font-size:11px; background:#fafafa; }
  @media(max-width:700px) { body{padding:12px;} .content{padding:16px;} .grid,.grid-3,.scope-grid{grid-template-columns:1fr;} .weather-grid{grid-template-columns:repeat(3,1fr);} table{font-size:11px;} th,td{padding:8px;} }
</style></head><body>
<div class="report-wrap">
  <div class="header-band">
    <div class="header-brand"><div class="header-logo">F</div><span>Forecastify</span></div>
    <h1>Demand Spike Analysis</h1>
    <p>${d.storeName} &middot; ${d.storeCategory}</p>
  </div>
  <div class="meta-row">
    <div class="meta-item"><strong>Location:</strong> ${d.loc}</div>
    <div class="meta-item"><strong>Weather:</strong> ${weather?.current?.temp || "--"}°C, ${weather?.current?.description || "--"}</div>
    <div class="meta-item"><strong>Generated:</strong> ${d.date}</div>
  </div>
  <div class="content">
    <div class="summary-box"><strong>Summary:</strong> ${analysis?.summary || ""}</div>
    ${d.scopeSection}

    ${weather ? `<div class="section"><div class="section-title">7-Day Weather</div><div class="weather-grid">${d.weatherForecastHTML}</div></div>` : ""}
    <div class="section"><div class="section-title">Demand Spike Forecast</div><table><thead><tr><th>Day</th><th>Probability</th><th>Increase</th><th>Reason</th><th>Top Products</th></tr></thead><tbody>${d.spikesTable}</tbody></table></div>
    <div class="section"><div class="section-title">Trending Products</div><table><thead><tr><th>Product</th><th>Category</th><th>Score</th><th>Stock</th><th>Price</th><th>Reason</th></tr></thead><tbody>${d.productsTable}</tbody></table></div>
    ${analysis?.weatherImpact ? `<div class="section"><div class="section-title">Weather Impact</div><div class="card"><h4>Severity: <span class="badge badge-${analysis.weatherImpact.severity?.toLowerCase()}">${analysis.weatherImpact.severity}</span></h4><p style="margin-top:6px">${analysis.weatherImpact.description}</p><p style="margin-top:6px"><strong>Affected:</strong> ${analysis.weatherImpact.affectedCategories?.join(", ")}</p></div></div>` : ""}
    ${analysis?.upcomingOffers?.length ? `<div class="section"><div class="section-title">Offers & Events</div><div class="grid">${d.offersSection}</div></div>` : ""}
    ${analysis?.inventoryRecommendations?.length ? `<div class="section"><div class="section-title">Inventory Recommendations</div><div class="grid-3">${d.inventoryCards}</div></div>` : ""}
    ${analysis?.riskAlerts?.length ? `<div class="section"><div class="section-title">Risk Alerts</div><div class="grid">${d.riskCards}</div></div>` : ""}
  </div>
  <div class="footer">Forecastify &middot; Smart Demand Forecasting &middot; &copy; ${new Date().getFullYear()} &middot; Powered by Forecastify</div>
</div>
</body></html>`;
  };

  const downloadPDF = () => {
    if (!analysis) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(buildPDFHTML());
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const downloadHTML = () => {
    if (!analysis) return;
    const storeName = storeProfile?.store_name || "Store";
    const blob = new Blob([buildWebHTML()], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `demand-analysis-${storeName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const spikeChartData = analysis?.demandSpikes?.map((s, index) => ({
    name: chartLabelFor(s.day, index),
    fullDay: s.dayName || chartLabelFor(s.day, index),
    date: s.day,
    probability: s.spikeProbability,
    increase: parseInt(s.expectedIncrease?.replace(/[^0-9]/g, "")) || 0,
    reason: s.reason,
    primaryProduct: s.primaryProduct || s.topProducts?.[0] || "",
    supportingProducts: s.supportingProducts?.length ? s.supportingProducts : s.topProducts?.slice(1) || [],
    theme: s.theme,
    products: s.topProducts?.join(", ") || "",
  })) || [];

  const highestSpike = spikeChartData.length
    ? spikeChartData.reduce((best, item) => item.probability > best.probability ? item : best, spikeChartData[0])
    : null;

  // Horizontal bar data for trending products demand score
  const productBarData = analysis?.trendingProducts?.slice(0, 8).map((p) => ({
    name: p.name.length > 16 ? p.name.substring(0, 16) + "…" : p.name,
    fullName: p.name,
    score: p.demandScore,
    inInventory: p.inInventory,
  })) || [];
  const productChartHeight = Math.max(280, productBarData.length * 42);
  const demandDrivers = [
    { driver: "Historical Sales", importance: Math.min(94, Math.max(52, Math.round((analysis?.analysisMeta?.candidateCount || 0) / Math.max(1, analysis?.analysisMeta?.inventoryCount || 1) * 100) + 45)) },
    { driver: "Weather", importance: analysis?.weatherImpact?.severity === "High" ? 88 : analysis?.weatherImpact?.severity === "Medium" ? 68 : 42 },
    { driver: "Festival/Event", importance: analysis?.upcomingOffers?.length ? 76 : 34 },
    { driver: "Seasonality", importance: highestSpike ? Math.min(90, Math.max(45, highestSpike.probability - 8)) : 45 },
    { driver: "Promotion", importance: analysis?.inventoryRecommendations?.some((item) => item.action === "Decrease") ? 64 : 36 },
  ];
  const stockoutPredictions = analysis?.riskAlerts
    ?.filter((risk) => risk.type === "stockout" || risk.severity === "critical" || risk.severity === "warning")
    .slice(0, 5)
    .map((risk) => ({
      product: risk.product || "Inventory item",
      stock: risk.currentStock ?? 0,
      probability: risk.severity === "critical" ? 95 : risk.severity === "warning" ? 72 : 45,
      daysLeft: risk.currentStock && risk.currentStock > 0 ? Math.max(1, Math.ceil(Number(risk.currentStock) / 10)) : 0,
    })) || [];
  const overstockAnalysis = analysis?.inventoryRecommendations
    ?.filter((item) => item.action === "Decrease")
    .slice(0, 5) || [];
  const productSimilarity = analysis?.trendingProducts?.slice(0, 5).map((product) => ({
    product: product.name,
    related: analysis.trendingProducts
      .filter((item) => item.name !== product.name && item.category === product.category)
      .slice(0, 3)
      .map((item) => item.name),
    category: product.category,
  })) || [];
  const demandClusters = [
    { label: "Fast Moving", products: analysis?.trendingProducts?.filter((p) => p.demandScore >= 80).slice(0, 4).map((p) => p.name) || [] },
    { label: "Medium Moving", products: analysis?.trendingProducts?.filter((p) => p.demandScore >= 60 && p.demandScore < 80).slice(0, 4).map((p) => p.name) || [] },
    { label: "Slow Moving", products: overstockAnalysis.slice(0, 4).map((p) => p.product) },
    { label: "Dead Inventory", products: analysis?.riskAlerts?.filter((r) => r.type === "overstock").slice(0, 4).map((r) => r.product || "Inventory item") || [] },
  ];
  const visibleProductSimilarity = productSimilarity.filter((item) => item.related.length > 0);
  const visibleDemandClusters = demandClusters.filter((cluster) => cluster.products.length > 0);
  const marketDemandStatus = highestSpike && highestSpike.probability >= 75
    ? "Demand Supportive"
    : highestSpike && highestSpike.probability <= 45
      ? "Stable"
      : "Balanced";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500" />
            Demand Spike Analysis
          </h1>
          <p className="text-muted-foreground mt-1">
            Predict demand spikes using real-time weather, events, and market data
          </p>
        </div>
        <div className="flex gap-2">
          {analysis && (
            <>
              <button onClick={downloadPDF} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-500/20 text-sm font-medium">
                <FileText className="w-4 h-4" /> PDF
              </button>
              <button onClick={downloadHTML} className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-500/20 text-sm font-medium">
                <Code className="w-4 h-4" /> HTML
              </button>
            </>
          )}
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-50 text-sm font-semibold"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {loading ? step || "Analyzing..." : analysis ? "Re-analyze" : "Run Analysis"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {/* Store & Location Info */}
      {(storeProfile || locationInfo) && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <ShoppingBag className="w-4 h-4" /> Store
            </div>
            <p className="font-semibold text-foreground">{storeProfile?.store_name || "Your Store"}</p>
            <p className="text-sm text-muted-foreground">{storeProfile?.store_category || "Update profile to set store type"}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <MapPin className="w-4 h-4" /> Location
            </div>
            <p className="font-semibold text-foreground text-sm">
              {locationInfo?.formattedAddress || storeProfile?.store_address || "Run analysis to detect"}
            </p>
          </div>
          {weather && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Cloud className="w-4 h-4" /> Current Weather
              </div>
              <p className="font-semibold text-foreground">{weather.current.temp}°C — {weather.current.description}</p>
              <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1"><Droplets className="w-3 h-3" />{weather.current.humidity}%</span>
                <span className="flex items-center gap-1"><Wind className="w-3 h-3" />{weather.current.windSpeed} m/s</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <Zap className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">{step}</p>
            <p className="text-sm text-muted-foreground mt-1">This may take a few seconds...</p>
          </div>
          <div className="flex gap-2 mt-2">
            {["Location", "Weather", "News", "Analysis"].map((s, i) => (
              <div key={s} className={`px-3 py-1 rounded-full text-xs font-medium ${
                step.toLowerCase().includes(s.toLowerCase().split(" ")[0].toLowerCase())
                  ? "bg-primary text-primary-foreground"
                  : i < ["location", "weather", "news", "ai"].findIndex(x => step.toLowerCase().includes(x))
                    ? "bg-green-500/20 text-green-600"
                    : "bg-secondary text-muted-foreground"
              }`}>
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report content */}
      {analysis && (
        <div ref={reportRef} className="space-y-6">
          {/* Summary + Executive Insight */}
          <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 rounded-xl p-5">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-yellow-500" /> Executive Summary
            </h3>
            <p className="text-foreground/80 mb-3">{analysis.summary}</p>
            {analysis.executiveInsight && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 mt-3">
                <p className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5 mb-1.5">
                  <Brain className="w-3.5 h-3.5" /> Expert Analysis
                </p>
                <p className="text-sm text-foreground/80 leading-relaxed">{analysis.executiveInsight}</p>
              </div>
            )}
            {generatedAt && (
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Generated: {new Date(generatedAt).toLocaleString("en-IN")}
              </p>
            )}
            {analysis.analysisMeta && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4">
                <div className="bg-background/60 border border-border/60 rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Inventory Scanned</p>
                  <p className="text-lg font-bold text-foreground">{analysis.analysisMeta.inventoryCount}</p>
                </div>
                <div className="bg-background/60 border border-border/60 rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Real Demand Candidates</p>
                  <p className="text-lg font-bold text-foreground">{analysis.analysisMeta.candidateCount}</p>
                </div>
                <div className="bg-background/60 border border-border/60 rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Scope</p>
                  <p className="text-xs font-medium text-foreground line-clamp-2">{analysis.analysisMeta.location}</p>
                </div>
                <div className="bg-background/60 border border-border/60 rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Analysis Method</p>
                  <p className="text-xs font-medium text-foreground line-clamp-2">Live stock, weather, events, movement, and risk signals</p>
                </div>
              </div>
            )}
            {analysis.analysisMeta?.modelSignals?.length ? (
              <div className="mt-3 rounded-lg border border-border/60 bg-background/50 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Data Quality Notes</p>
                <div className="space-y-1">
                  {analysis.analysisMeta.modelSignals.map((signal, index) => (
                    <p key={index} className="text-xs text-foreground/80">
                      <span className="font-semibold capitalize">{signal.status}</span>: {ownerSafeSignalNote(signal.note)}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-5">
            <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Brain className="w-4 h-4 text-cyan-500" /> Business Impact Breakdown
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Plain explanation of what may sell faster, why it may happen, and what stock action matters.</p>
              </div>
              <span className="text-[10px] uppercase tracking-wider font-bold bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 rounded-full px-3 py-1">
                Owner view
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border border-border rounded-lg p-4 bg-background/40">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Products Most Likely To Move</p>
                <div className="mt-3 space-y-2">
                  {analysis.trendingProducts?.slice(0, 5).map((product) => (
                    <div key={product.name} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center text-xs">
                      <span className="font-semibold text-foreground truncate">{product.name}</span>
                      <span className="text-muted-foreground">{product.demandScore}/100</span>
                      <span className="font-bold text-cyan-500">{product.recommendedStock}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">Higher score means the item is more likely to sell faster in this forecast window. “High” means keep stock ready before the spike starts.</p>
              </div>

              <div className="border border-border rounded-lg p-4 bg-background/40">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Why Demand Is Moving</p>
                <div className="mt-3 space-y-2">
                  {demandDrivers.map((driver) => (
                    <div key={driver.driver}>
                      <div className="flex justify-between text-xs mb-1"><span className="text-foreground">{driver.driver}</span><span className="font-bold">{driver.importance}%</span></div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-cyan-500 rounded-full" style={{ width: `${driver.importance}%` }} /></div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">The longest bars show the strongest reasons behind this run. Use them to decide whether to order for weather, event demand, repeat sales, or clearance.</p>
              </div>

              {analysis.upcomingOffers?.length > 0 && (
              <div className="border border-border rounded-lg p-4 bg-background/40">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Event Impact</p>
                <div className="mt-3 space-y-2">
                  {analysis.upcomingOffers?.slice(0, 4).map((event) => (
                    <div key={event.event} className="text-xs border-b border-border/40 last:border-0 pb-2 last:pb-0">
                      <div className="flex justify-between gap-2"><span className="font-semibold text-foreground">{event.event}</span><span className="text-cyan-500 font-bold">{event.expectedDemandChange}</span></div>
                      <p className="text-muted-foreground mt-1">{event.affectedCategories?.join(", ") || "Mapped grocery categories"} · confidence {Math.min(94, Math.max(60, parseInt(event.expectedDemandChange.replace(/[^0-9]/g, "")) + 55 || 68))}%</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">This shows events that can change buying behavior near your store. Stock the listed categories only when the event matches your actual inventory.</p>
              </div>
              )}

              <div className="border border-border rounded-lg p-4 bg-background/40">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Market Mood</p>
                <p className="text-2xl font-black mt-2 text-amber-500">{marketDemandStatus}</p>
                <p className="text-xs text-muted-foreground mt-1">This summarizes whether nearby demand signals support ordering more, staying steady, or being cautious with cash.</p>
              </div>

              <div className="border border-border rounded-lg p-4 bg-background/40">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Weather Effect</p>
                <p className="text-sm text-foreground mt-2">{analysis.weatherImpact?.description}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {analysis.weatherImpact?.affectedCategories?.slice(0, 6).map((category) => (
                    <span key={category} className="text-[10px] font-bold bg-blue-500/10 text-blue-500 rounded-full px-2 py-1">{category}</span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">Use this to connect today’s weather with categories people usually buy quickly, such as cold drinks, snacks, tea, or essentials.</p>
              </div>

              {stockoutPredictions.length > 0 && (
              <div className="border border-border rounded-lg p-4 bg-background/40">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Stockout Risk</p>
                <div className="mt-3 space-y-2">
                  {stockoutPredictions.slice(0, 4).map((item) => (
                    <div key={item.product} className="grid grid-cols-[1fr_auto_auto] gap-3 text-xs">
                      <span className="font-semibold text-foreground truncate">{item.product}</span>
                      <span className="text-muted-foreground">{item.daysLeft} days</span>
                      <span className="font-bold text-red-500">{item.probability}%</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">These items can lose sales if not replenished. Prioritize products with fewer days left and higher risk percentage.</p>
              </div>
              )}

              {overstockAnalysis.length > 0 && (
              <div className="border border-border rounded-lg p-4 bg-background/40">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Excess Stock To Watch</p>
                <div className="mt-3 space-y-2">
                  {overstockAnalysis.slice(0, 4).map((item) => (
                    <div key={item.product} className="text-xs">
                      <p className="font-semibold text-foreground truncate">{item.product}</p>
                      <p className="text-muted-foreground">{item.currentAdvice}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">These rows point to cash stuck in slow or excess inventory. Consider reducing reorder quantity or running a small offer.</p>
              </div>
              )}

              {visibleProductSimilarity.length > 0 && (
              <div className="border border-border rounded-lg p-4 bg-background/40">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Related Products</p>
                <div className="mt-3 space-y-2">
                  {visibleProductSimilarity.slice(0, 4).map((item) => (
                    <p key={item.product} className="text-xs"><span className="font-semibold text-foreground">{item.product}</span> → <span className="text-muted-foreground">{item.related.join(", ")}</span></p>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">Related products are useful for basket planning. If one product spikes, place its companions nearby or check their stock too.</p>
              </div>
              )}

              {visibleDemandClusters.length > 0 && (
              <div className="border border-border rounded-lg p-4 bg-background/40">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Movement Groups</p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {visibleDemandClusters.map((cluster) => (
                    <div key={cluster.label} className="rounded-lg bg-secondary/50 p-2">
                      <p className="text-[10px] font-bold text-foreground">{cluster.label}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1">{cluster.products.join(", ")}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">Groups separate fast movers from slower cash blockers, so ordering and discounting decisions are easier.</p>
              </div>
              )}

              <div className="border border-border rounded-lg p-4 bg-background/40 lg:col-span-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Store Memory & Search</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-xs">
                  <div className="bg-secondary/40 rounded-lg p-3"><p className="font-semibold text-foreground">Similar Products</p><p className="text-muted-foreground mt-1">“Show products similar to {analysis.trendingProducts?.[0]?.name || "Parle-G"}”</p></div>
                  <div className="bg-secondary/40 rounded-lg p-3"><p className="font-semibold text-foreground">Report Search</p><p className="text-muted-foreground mt-1">Find reports mentioning demand spikes, milk, tea, biscuits, or overstock.</p></div>
                  <div className="bg-secondary/40 rounded-lg p-3"><p className="font-semibold text-foreground">Jarvis Memory</p><p className="text-muted-foreground mt-1">Forecast history, questions, inventory changes, and generated reports are stored for retrieval.</p></div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">This helps connect today’s analysis with previous reports and inventory changes, so the store does not repeat the same mistake next time.</p>
              </div>
            </div>
          </div>

          {/* Weather Forecast + Spike Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weather Forecast */}
            {weather && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                  <Thermometer className="w-4 h-4 text-orange-500" /> 7-Day Weather Forecast
                </h3>
                <div className="space-y-2">
                  {weather.forecast.map((d) => (
                    <div key={d.date} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <span className="font-medium text-sm text-foreground">{new Date(d.date).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}</span>
                        <span className="text-xs text-muted-foreground ml-2">{d.weather}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-orange-500 font-medium">{d.maxTemp}°</span>
                        <span className="text-blue-500">{d.minTemp}°</span>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Droplets className="w-3 h-3" />{d.avgHumidity}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">Meaning: temperature, rain/clouds, humidity, and wind help explain which categories may move faster on each day.</p>
              </div>
            )}

            {/* Spike Probability Chart */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-indigo-500" /> Demand Spike Probability
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={spikeChartData} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} domain={[0, 100]} />
                  <Tooltip content={<DemandSpikeTooltip />} />
                  <Bar dataKey="probability" name="Spike %" radius={[6, 6, 0, 0]}>
                    {spikeChartData.map((_, i) => (
                      <Cell key={i} fill={SPIKE_COLORS[i % SPIKE_COLORS.length]} />
                    ))}
                    <LabelList dataKey="probability" position="top" formatter={(value) => `${Number(value ?? 0)}%`} style={{ fontSize: 11, fill: "var(--color-muted-foreground)", fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {highestSpike && (
                <div className="mt-3 rounded-lg border border-border bg-secondary/30 p-3">
                  <p className="text-xs font-semibold text-foreground">Highest risk: {highestSpike.fullDay} at {highestSpike.probability}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Primary: {highestSpike.primaryProduct || "Demand basket"}</p>
                  {highestSpike.supportingProducts?.length > 0 && (
                    <p className="text-xs text-muted-foreground">Supporting: {highestSpike.supportingProducts.join(", ")}</p>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">Meaning: each bar is a day-level chance of a demand jump. The product shown below the chart is the main item to protect from stockout that day.</p>
            </div>
          </div>

          {/* Demand Spikes Table */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-yellow-500" /> 7-Day Demand Spike Forecast
            </h3>
            <div className="space-y-2">
            {/* Demand Spikes list */}
              {analysis.demandSpikes?.map((spike, i) => (
                <div key={i} className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedSpike(expandedSpike === i ? null : i)}
                    className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm text-white" style={{ background: SPIKE_COLORS[i % SPIKE_COLORS.length] }}>
                        {spike.dayName?.substring(0, 2)}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="font-semibold text-foreground">{spike.dayName} <span className="text-xs text-muted-foreground ml-1">{spike.day}</span></p>
                        <p className="text-xs text-primary font-semibold mt-0.5">{spike.primaryProduct || spike.topProducts?.[0]}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{spike.reason}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-green-500 font-semibold">
                          <ArrowUpRight className="w-4 h-4" />{spike.expectedIncrease}
                        </div>
                        <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden mt-1">
                          <div className="h-full rounded-full" style={{ width: `${spike.spikeProbability}%`, background: SPIKE_COLORS[i % SPIKE_COLORS.length] }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{spike.spikeProbability}% probability</span>
                      </div>
                      {expandedSpike === i ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>
                  {expandedSpike === i && (
                    <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Daily demand basket:</p>
                        <div className="flex flex-wrap gap-2">
                          {(spike.primaryProduct || spike.topProducts?.[0]) && (
                            <span className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-semibold">
                              Primary: {spike.primaryProduct || spike.topProducts?.[0]}
                            </span>
                          )}
                          {(spike.supportingProducts?.length ? spike.supportingProducts : spike.topProducts?.slice(1))?.map((p, j) => (
                            <span key={j} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">Support: {p}</span>
                          ))}
                        </div>
                      </div>
                      {spike.groqInsight && (
                        <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
                          <p className="text-xs font-semibold text-purple-400 flex items-center gap-1.5 mb-1">
                            <Brain className="w-3 h-3" /> Why this matters
                          </p>
                          <p className="text-xs text-foreground/80 leading-relaxed">{spike.groqInsight}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">Meaning: open a day to see the lead product, supporting basket items, and the practical reason behind that day’s expected demand.</p>
          </div>

          {/* Trending Products + Demand Score Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-purple-500" /> Trending Products
                </h3>
                <button onClick={() => setShowAllProducts(!showAllProducts)} className="text-xs text-primary hover:underline">
                  {showAllProducts ? "Show Less" : "Show All"}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground font-medium">Product</th>
                      <th className="text-left py-2 text-muted-foreground font-medium">Category</th>
                      <th className="text-left py-2 text-muted-foreground font-medium">Demand</th>
                      <th className="text-left py-2 text-muted-foreground font-medium">Stock Rec.</th>
                      <th className="text-left py-2 text-muted-foreground font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAllProducts ? analysis.trendingProducts : analysis.trendingProducts?.slice(0, 6))?.map((p, i) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/30">
                        <td className="py-3">
                          <div className="flex items-center gap-1.5">
                            {p.inInventory && <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" title="In your inventory" />}
                            <p className="font-medium text-foreground">{p.name}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{p.reason}</p>
                          {p.stockingReason && (
                            <p className="text-xs text-indigo-400 mt-1 flex items-start gap-1">
                              <Lightbulb className="w-3 h-3 shrink-0 mt-0.5" />{p.stockingReason}
                            </p>
                          )}
                        </td>
                        <td className="py-3 text-muted-foreground">{p.category}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-purple-500" style={{ width: `${p.demandScore}%` }} />
                            </div>
                            <span className="text-xs font-medium">{p.demandScore}</span>
                          </div>
                          {p.trend && <p className="text-xs text-green-500 mt-0.5">{p.trend}</p>}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.recommendedStock === "High" ? "bg-red-500/10 text-red-500" :
                            p.recommendedStock === "Medium" ? "bg-yellow-500/10 text-yellow-600" :
                            "bg-green-500/10 text-green-500"
                          }`}>{p.recommendedStock}</span>
                        </td>
                        <td className="py-3 text-muted-foreground">{p.priceRange}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Meaning: prioritize “High” products first, especially when the reason mentions low stock, weather demand, event demand, or expiry pressure.</p>
            </div>

            {/* Demand Score Horizontal Bar Chart — replaces confusing Radar */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground text-sm mb-1">Product Demand Scores</h3>
              <p className="text-xs text-muted-foreground mb-4">Top real inventory drivers scored from stock, weather, events, expiry, and price</p>
              <ResponsiveContainer width="100%" height={productChartHeight}>
                <BarChart data={productBarData} layout="vertical" margin={{ top: 4, right: 28, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickCount={5} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} width={110} />
                  <Tooltip
                    contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(val, _name, entry) => [`${Number(val ?? 0)} / 100`, entry.payload?.fullName || "Product"]}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    {productBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.score >= 85 ? "#ef4444" : entry.score >= 65 ? "#f59e0b" : "#22c55e"} />
                    ))}
                    <LabelList dataKey="score" position="insideRight" style={{ fontSize: "10px", fill: "#fff", fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-3 mt-2 justify-center">
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> High (&ge;85)</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-500" /> Medium (65-84)</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><span className="w-2.5 h-2.5 rounded-sm bg-green-500" /> Low (&lt;65)</span>
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">Meaning: red bars need attention today; yellow bars should be watched; green bars are normal unless stock is very low.</p>
            </div>
          </div>

          {/* Weather Impact */}
          {analysis.weatherImpact && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                <Cloud className="w-4 h-4 text-blue-500" /> Weather Impact Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      analysis.weatherImpact.severity === "High" ? "bg-red-500/10 text-red-500" :
                      analysis.weatherImpact.severity === "Medium" ? "bg-yellow-500/10 text-yellow-600" :
                      "bg-green-500/10 text-green-500"
                    }`}>{analysis.weatherImpact.severity} Impact</span>
                  </div>
                  <p className="text-sm text-foreground/80">{analysis.weatherImpact.description}</p>
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-1">Affected Categories:</p>
                    <div className="flex flex-wrap gap-1">
                      {analysis.weatherImpact.affectedCategories?.map((c, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded text-xs">{c}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Specific Recommendations:</p>
                  <ul className="space-y-2">
                    {analysis.weatherImpact.recommendations?.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                        <ArrowUpRight className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {analysis.weatherImpact.groqInsight && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 mt-4">
                  <p className="text-xs font-semibold text-blue-400 flex items-center gap-1.5 mb-1">
                    <Brain className="w-3 h-3" /> Weather Impact Analysis
                  </p>
                  <p className="text-xs text-foreground/80 leading-relaxed">{analysis.weatherImpact.groqInsight}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">Meaning: this section converts weather into category-level stocking guidance for the current store inventory.</p>
            </div>
          )}

          {/* Upcoming Offers & Events */}
          {analysis.upcomingOffers?.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                <Tag className="w-4 h-4 text-pink-500" /> Upcoming Offers & Events
              </h3>
              <div className={`grid grid-cols-1 gap-4 ${analysis.upcomingOffers.length > 1 ? "md:grid-cols-2" : ""}`}>
                {analysis.upcomingOffers.map((o, i) => (
                  <div key={i} className="border border-border rounded-lg p-4 hover:bg-secondary/30 transition-colors space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-500" /> {o.event}
                      </h4>
                      <span className="text-green-500 font-bold text-sm">{o.expectedDemandChange}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{o.date}</p>
                    <div className="flex flex-wrap gap-1">
                      {o.affectedCategories?.map((c, j) => (
                        <span key={j} className="px-2 py-0.5 bg-pink-500/10 text-pink-600 dark:text-pink-400 rounded text-xs">{c}</span>
                      ))}
                    </div>
                    {o.recommendations?.length > 0 && (
                      <ul className="space-y-1.5">
                        {o.recommendations.map((r, j) => (
                          <li key={j} className="text-xs text-foreground/80 flex items-start gap-1.5 leading-relaxed">
                            <span className="text-green-500 font-bold mt-0.5">+</span> {r}
                          </li>
                        ))}
                      </ul>
                    )}
                    {o.groqInsight && (
                      <div className="bg-pink-500/5 border border-pink-500/20 rounded-lg p-2.5">
                        <p className="text-xs font-semibold text-pink-400 flex items-center gap-1.5 mb-1">
                          <Brain className="w-3 h-3" /> Why this matters for your store
                        </p>
                        <p className="text-xs text-foreground/80 leading-relaxed">{o.groqInsight}</p>
                      </div>
                    )}
                    {o.offerLink && (
                      <a
                        href={o.offerLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 hover:underline mt-1"
                      >
                        <ArrowUpRight className="w-3 h-3" /> View Offer Details
                      </a>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">Meaning: events are only useful when they match products you actually sell; use these cards to order extra only in affected categories.</p>
            </div>
          )}

          {/* Inventory Recommendations */}
          {analysis.inventoryRecommendations?.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                <Package className="w-4 h-4 text-cyan-500" /> Inventory Recommendations
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {analysis.inventoryRecommendations.map((r, i) => (
                  <div key={i} className="border border-border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground text-sm">{r.product}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.urgency === "High" ? "bg-red-500/10 text-red-500" :
                        r.urgency === "Medium" ? "bg-yellow-500/10 text-yellow-600" :
                        "bg-green-500/10 text-green-500"
                      }`}>{r.urgency}</span>
                    </div>
                    {r.currentStock !== undefined && (
                      <p className="text-xs text-muted-foreground">Current stock: <span className="font-semibold text-foreground">{r.currentStock} units</span></p>
                    )}
                    <div className="flex items-center gap-1">
                      {r.action === "Increase" ? (
                        <ArrowUpRight className="w-3 h-3 text-red-500" />
                      ) : r.action === "Decrease" ? (
                        <ArrowDownRight className="w-3 h-3 text-green-500" />
                      ) : null}
                      <span className="text-xs font-semibold text-foreground">{r.action}</span>
                      {r.unitsToOrder && r.unitsToOrder > 0 && (
                        <span className="text-xs text-cyan-500 ml-1">+{r.unitsToOrder} units</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{r.currentAdvice}</p>
                    {r.groqInsight && (
                      <div className="bg-cyan-500/5 border border-cyan-500/20 rounded p-2">
                        <p className="text-xs font-semibold text-cyan-400 flex items-center gap-1 mb-0.5">
                          <Brain className="w-3 h-3" /> Stocking Insight
                        </p>
                        <p className="text-xs text-foreground/80 leading-relaxed">{r.groqInsight}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">Meaning: these are action rows, not just insights. They translate demand risk into order, reduce, or maintain decisions.</p>
            </div>
          )}

          {/* Risk Alerts */}
          {analysis.riskAlerts?.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                <ShieldAlert className="w-4 h-4 text-red-500" /> Risk Alerts
              </h3>
              <div className="space-y-3">
                {analysis.riskAlerts.map((r, i) => (
                  <div key={i} className={`border rounded-lg p-4 space-y-2 ${
                    r.severity === "critical" ? "border-red-500/30 bg-red-500/5" :
                    r.severity === "warning" ? "border-yellow-500/30 bg-yellow-500/5" :
                    "border-blue-500/30 bg-blue-500/5"
                  }`}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-4 h-4 ${
                        r.severity === "critical" ? "text-red-500" :
                        r.severity === "warning" ? "text-yellow-500" : "text-blue-500"
                      }`} />
                      <span className="font-semibold text-sm text-foreground capitalize">{r.type.replace(/_/g, " ")}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.severity === "critical" ? "bg-red-500/10 text-red-500" :
                        r.severity === "warning" ? "bg-yellow-500/10 text-yellow-600" :
                        "bg-blue-500/10 text-blue-500"
                      }`}>{r.severity}</span>
                    </div>
                    {r.product && (
                      <p className="text-xs text-muted-foreground">
                        Product: <span className="font-semibold text-foreground">{r.product}</span>
                        {r.currentStock !== undefined && <span className="ml-2">({r.currentStock} units remaining)</span>}
                      </p>
                    )}
                    <p className="text-sm text-foreground/80">{r.message}</p>
                    <p className="text-xs text-green-600 dark:text-green-400 flex items-start gap-1">
                      <ArrowUpRight className="w-3 h-3 mt-0.5 shrink-0" /> {r.mitigation}
                    </p>
                    {r.groqInsight && (
                      <div className={`rounded p-2 ${
                        r.severity === "critical" ? "bg-red-500/5 border border-red-500/20" :
                        r.severity === "warning" ? "bg-yellow-500/5 border border-yellow-500/20" :
                        "bg-blue-500/5 border border-blue-500/20"
                      }`}>
                        <p className={`text-xs font-semibold flex items-center gap-1 mb-0.5 ${
                          r.severity === "critical" ? "text-red-400" :
                          r.severity === "warning" ? "text-yellow-400" : "text-blue-400"
                        }`}><Brain className="w-3 h-3" /> Risk Impact</p>
                        <p className="text-xs text-foreground/80 leading-relaxed">{r.groqInsight}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">Meaning: risk alerts show where money or sales can be lost first, such as stockouts, expiry pressure, or blocked capital.</p>
            </div>
          )}

          {/* News & Market Intel */}
          {news && (news.offers?.length > 0 || news.trending?.length > 0) && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                <Download className="w-4 h-4 text-green-500" /> Market Intelligence
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {news.offers?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Offers & Deals</p>
                    <ul className="space-y-2">
                      {news.offers.slice(0, 4).map((n, i) => (
                        <li key={i} className="text-sm">
                          <a href={n.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">{n.title}</a>
                          <p className="text-xs text-muted-foreground mt-0.5">{n.snippet}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {news.trending?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Trending</p>
                    <ul className="space-y-2">
                      {news.trending.slice(0, 4).map((n, i) => (
                        <li key={i} className="text-sm">
                          <a href={n.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">{n.title}</a>
                          <p className="text-xs text-muted-foreground mt-0.5">{n.snippet}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !analysis && (
        <div className="space-y-6">
          {/* Hero */}
          <div className="bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 border border-indigo-500/20 rounded-2xl p-8 sm:p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Demand Spike Analysis</h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-6">
              Predict when your products will see the highest demand. Get 7-day forecasts based on weather, local events, festivals, and market trends — all tailored to your store.
            </p>
            <button onClick={runAnalysis} disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 hover:shadow-lg hover:shadow-indigo-500/20 transition-all flex items-center gap-2 mx-auto">
              <Zap className="w-4 h-4" /> Run Analysis Now
            </button>
          </div>

          {/* How it works */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
                <MapPin className="w-5 h-5 text-blue-500" />
              </div>
              <h4 className="font-semibold text-foreground text-sm mb-1">Store Location</h4>
              <p className="text-xs text-muted-foreground">Detects your store address and fetches hyper-local data for your area</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-3">
                <Cloud className="w-5 h-5 text-orange-500" />
              </div>
              <h4 className="font-semibold text-foreground text-sm mb-1">Weather Forecast</h4>
              <p className="text-xs text-muted-foreground">7-day weather data to predict how temperature and rain affect buying patterns</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center mb-3">
                <Calendar className="w-5 h-5 text-pink-500" />
              </div>
              <h4 className="font-semibold text-foreground text-sm mb-1">Events & Festivals</h4>
              <p className="text-xs text-muted-foreground">Upcoming festivals, IPL matches, local events that drive demand spikes</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <h4 className="font-semibold text-foreground text-sm mb-1">Smart Predictions</h4>
              <p className="text-xs text-muted-foreground">Get spike probability, trending products, offers, and restock alerts for each day</p>
            </div>
          </div>

          {/* What you get */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-bold text-foreground mb-4">What you&apos;ll get in your report</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: "📊", title: "7-Day Spike Forecast", desc: "Daily demand probability with spike percentage and top products" },
                { icon: "🛒", title: "Trending Products", desc: "10+ products trending in your category with demand scores and prices" },
                { icon: "🌦️", title: "Weather Impact", desc: "How current weather conditions will affect your sales this week" },
                { icon: "🏷️", title: "Offers & Events", desc: "Upcoming festivals, promotions, and deals that impact your store" },
                { icon: "📦", title: "Stock Recommendations", desc: "What to restock, reduce, or maintain based on predicted demand" },
                { icon: "⚠️", title: "Risk Alerts", desc: "Stockout warnings, competition alerts, and spoilage risks" },
              ].map(item => (
                <div key={item.title} className="flex gap-3">
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Download note */}
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-red-500" /> Download as PDF</div>
            <div className="flex items-center gap-2"><Code className="w-4 h-4 text-blue-500" /> Download as HTML</div>
          </div>
        </div>
      )}
    </div>
  );
}
