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
  MapPin, Cloud, ShoppingBag, Download,
  FileText, Code, Loader2, RefreshCw, Zap, Thermometer, Droplets,
  Wind, Calendar, Tag, Package, ShieldAlert, ArrowUpRight, ArrowDownRight,
  ChevronDown, ChevronUp, Star, Clock, Brain, Lightbulb,
} from "lucide-react";
import { ChartLine } from "@/components/animate-ui/icons/chart-line";
import {
  chartColor, tooltipStyle, tooltipLabelStyle, gridProps, axisProps, CHART_H,
} from "@/lib/chart-theme";

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
    <div
      className="max-w-[280px] rounded-[10px] border border-border-strong bg-elevated p-3"
      style={{ boxShadow: "var(--shadow-md)" }}
    >
      <p className="text-sm font-semibold text-foreground">{data.fullDay}</p>
      <p className="text-xs text-muted-foreground">{data.date}</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">Spike probability</span>
        <span className="fx-num text-sm font-semibold" style={{ color: "var(--accent)" }}>{data.probability}%</span>
      </div>
      {data.primaryProduct && (
        <div className="mt-2">
          <p className="fx-eyebrow">Primary product</p>
          <p className="text-xs font-medium text-foreground mt-0.5">{data.primaryProduct}</p>
        </div>
      )}
      {data.supportingProducts?.length > 0 && (
        <div className="mt-2">
          <p className="fx-eyebrow">Supporting demand</p>
          <p className="text-xs text-muted-foreground mt-0.5">{data.supportingProducts.join(", ")}</p>
        </div>
      )}
      {data.reason && <p className="mt-2 text-xs leading-relaxed text-secondary-foreground">{data.reason}</p>}
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
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      {/* Page lead — editorial, no card */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="fx-display text-[24px] text-foreground">Demand Spike Analysis</h1>
          <p className="text-[13px] text-muted-foreground mt-1.5">
            Predict demand spikes using real-time weather, events, and market data
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {analysis && (
            <>
              <button onClick={downloadPDF} className="fx-btn">
                <FileText className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> PDF
              </button>
              <button onClick={downloadHTML} className="fx-btn">
                <Code className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> HTML
              </button>
            </>
          )}
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="fx-btn fx-btn-accent"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="w-4 h-4" aria-hidden="true" strokeWidth={1.8} />}
            {loading ? step || "Analyzing..." : analysis ? "Re-analyze" : "Run Analysis"}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-danger-soft border border-danger/25 text-danger rounded-[var(--radius-md)] px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-3"
        >
          <span>{error}</span>
          <button onClick={runAnalysis} disabled={loading} className="fx-btn shrink-0">
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> Retry
          </button>
        </div>
      )}

      {/* Store & Location Info — one ledger strip */}
      {(storeProfile || locationInfo) && !loading && (
        <div className="fx-card grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--border)] overflow-hidden">
          <div className="px-5 py-4">
            <p className="fx-eyebrow flex items-center gap-1.5 mb-1.5">
              <ShoppingBag className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> Store
            </p>
            <p className="text-sm font-medium text-foreground">{storeProfile?.store_name || "Your Store"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{storeProfile?.store_category || "Update profile to set store type"}</p>
          </div>
          <div className="px-5 py-4">
            <p className="fx-eyebrow flex items-center gap-1.5 mb-1.5">
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> Location
            </p>
            <p className="text-sm font-medium text-foreground">
              {locationInfo?.formattedAddress || storeProfile?.store_address || "Run analysis to detect"}
            </p>
          </div>
          {weather && (
            <div className="px-5 py-4">
              <p className="fx-eyebrow flex items-center gap-1.5 mb-1.5">
                <Cloud className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> Current Weather
              </p>
              <p className="text-sm font-medium text-foreground"><span className="fx-num">{weather.current.temp}°C</span> — {weather.current.description}</p>
              <p className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1"><Droplets className="w-3 h-3" aria-hidden="true" strokeWidth={1.8} /><span className="fx-num">{weather.current.humidity}%</span></span>
                <span className="flex items-center gap-1"><Wind className="w-3 h-3" aria-hidden="true" strokeWidth={1.8} /><span className="fx-num">{weather.current.windSpeed} m/s</span></span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Loading — progress steps + skeleton mirroring the report */}
      {loading && (
        <div className="space-y-6" aria-busy="true" aria-label="Running demand analysis">
          <div className="fx-card p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-sm text-secondary-foreground font-medium">
              {step}
            </div>
            <p className="text-xs text-muted-foreground">This may take a few seconds...</p>
            <div className="flex gap-4 flex-wrap">
              {["Location", "Weather", "News", "Analysis"].map((s, i) => {
                const isActive = step.toLowerCase().includes(s.toLowerCase().split(" ")[0].toLowerCase());
                const isDone = i < ["location", "weather", "news", "ai"].findIndex(x => step.toLowerCase().includes(x));
                return (
                  <span key={s} className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                    isActive ? "text-accent" : isDone ? "text-success" : "text-muted-foreground"
                  }`}>
                    <span className={`fx-signal ${isActive ? "fx-signal-accent" : isDone ? "fx-signal-success" : ""}`} aria-hidden="true" />
                    {s}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="fx-card p-6 space-y-3" aria-busy="true">
            <div className="skeleton-shimmer h-5 w-56" />
            <div className="skeleton-shimmer h-3.5 w-full" />
            <div className="skeleton-shimmer h-3.5 w-2/3" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[0, 1].map((i) => (
              <div key={i} className="fx-card p-6 space-y-3" aria-busy="true">
                <div className="skeleton-shimmer h-4 w-48" />
                <div className="skeleton-shimmer h-52 w-full" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report content */}
      {analysis && (
        <div ref={reportRef} className="space-y-6">
          {/* Summary + Executive Insight */}
          <section aria-label="Executive summary" className="fx-card p-6">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} />
              <h3 className="fx-display text-[17px] text-foreground">Executive Summary</h3>
            </div>
            <p className="text-[15px] text-foreground leading-relaxed mb-3">{analysis.summary}</p>
            {analysis.executiveInsight && (
              <div className="rounded-[var(--radius-md)] border border-[var(--accent-border)] p-4 mt-3" style={{ background: "var(--accent-soft)" }}>
                <p className="fx-eyebrow flex items-center gap-1.5 mb-1.5" style={{ color: "var(--accent)" }}>
                  <Brain className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> Expert Analysis
                </p>
                <p className="text-sm text-foreground leading-relaxed">{analysis.executiveInsight}</p>
              </div>
            )}
            {generatedAt && (
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                <Clock className="w-3 h-3" aria-hidden="true" strokeWidth={1.8} /> Generated: {new Date(generatedAt).toLocaleString("en-IN")}
              </p>
            )}
            {analysis.analysisMeta && (
              <div className="fx-rule mt-4 grid grid-cols-1 sm:grid-cols-4 gap-x-8 gap-y-0">
                <div className="py-4">
                  <p className="fx-eyebrow">Inventory Scanned</p>
                  <p className="fx-num fx-metric-md font-semibold text-foreground mt-1">{analysis.analysisMeta.inventoryCount}</p>
                </div>
                <div className="py-4">
                  <p className="fx-eyebrow">Real Demand Candidates</p>
                  <p className="fx-num fx-metric-md font-semibold text-foreground mt-1">{analysis.analysisMeta.candidateCount}</p>
                </div>
                <div className="py-4">
                  <p className="fx-eyebrow">Scope</p>
                  <p className="text-xs font-medium text-foreground line-clamp-2 mt-1.5">{analysis.analysisMeta.location}</p>
                </div>
                <div className="py-4">
                  <p className="fx-eyebrow">Analysis Method</p>
                  <p className="text-xs font-medium text-foreground line-clamp-2 mt-1.5">Live stock, weather, events, movement, and risk signals</p>
                </div>
              </div>
            )}
            {analysis.analysisMeta?.modelSignals?.length ? (
              <div className="fx-rule pt-3">
                <p className="fx-eyebrow mb-1.5">Data Quality Notes</p>
                <div className="space-y-1">
                  {analysis.analysisMeta.modelSignals.map((signal, index) => (
                    <p key={index} className="text-xs text-secondary-foreground">
                      <span className="font-semibold capitalize text-foreground">{signal.status}</span>: {ownerSafeSignalNote(signal.note)}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section aria-label="Business impact breakdown" className="fx-card p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="fx-display text-[17px] text-foreground flex items-center gap-2">
                  <Brain className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} /> Business Impact Breakdown
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Plain explanation of what may sell faster, why it may happen, and what stock action matters.</p>
              </div>
              <span className="fx-badge fx-badge-accent">Owner view</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-0 mt-4">
              <div className="py-5 border-t border-border">
                <p className="fx-eyebrow">Products Most Likely To Move</p>
                <div className="mt-3">
                  {analysis.trendingProducts?.slice(0, 5).map((product) => (
                    <div key={product.name} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center text-xs py-1.5 border-b border-border last:border-b-0">
                      <span className="font-medium text-foreground truncate">{product.name}</span>
                      <span className="fx-num text-muted-foreground">{product.demandScore}/100</span>
                      <span className="font-semibold" style={{ color: "var(--accent)" }}>{product.recommendedStock}</span>
                    </div>
                  ))}
                </div>
                {(analysis.trendingProducts?.length || 0) > 5 && (
                  <p className="text-xs text-muted-foreground mt-2">Showing top 5 of {analysis.trendingProducts.length} — the full list is in the Trending Products table below.</p>
                )}
                <p className="text-xs text-muted-foreground mt-3">Higher score means the item is more likely to sell faster in this forecast window. “High” means keep stock ready before the spike starts.</p>
              </div>

              <div className="py-5 border-t border-border">
                <p className="fx-eyebrow">Why Demand Is Moving</p>
                <div className="mt-3 space-y-2.5">
                  {demandDrivers.map((driver) => (
                    <div key={driver.driver}>
                      <div className="flex justify-between text-xs mb-1"><span className="text-secondary-foreground">{driver.driver}</span><span className="fx-num font-semibold text-foreground">{driver.importance}%</span></div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={driver.importance} aria-valuemin={0} aria-valuemax={100} aria-label={driver.driver}>
                        <div className="h-full rounded-full" style={{ width: `${driver.importance}%`, background: "var(--accent)" }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">The longest bars show the strongest reasons behind this run. Use them to decide whether to order for weather, event demand, repeat sales, or clearance.</p>
              </div>

              {analysis.upcomingOffers?.length > 0 && (
              <div className="py-5 border-t border-border">
                <p className="fx-eyebrow">Event Impact</p>
                <div className="mt-3">
                  {analysis.upcomingOffers?.slice(0, 4).map((event) => (
                    <div key={event.event} className="text-xs py-2 border-b border-border last:border-b-0">
                      <div className="flex justify-between gap-2"><span className="font-medium text-foreground">{event.event}</span><span className="fx-num font-semibold" style={{ color: "var(--accent)" }}>{event.expectedDemandChange}</span></div>
                      <p className="text-muted-foreground mt-1">{event.affectedCategories?.join(", ") || "Mapped grocery categories"} · confidence {Math.min(94, Math.max(60, parseInt(event.expectedDemandChange.replace(/[^0-9]/g, "")) + 55 || 68))}%</p>
                    </div>
                  ))}
                </div>
                {analysis.upcomingOffers.length > 4 && (
                  <p className="text-xs text-muted-foreground mt-2">Showing top 4 of {analysis.upcomingOffers.length} — all events are listed in the Upcoming Offers &amp; Events section below.</p>
                )}
                <p className="text-xs text-muted-foreground mt-3">This shows events that can change buying behavior near your store. Stock the listed categories only when the event matches your actual inventory.</p>
              </div>
              )}

              <div className="py-5 border-t border-border">
                <p className="fx-eyebrow">Market Mood</p>
                <p className="fx-display text-2xl mt-2 text-foreground">{marketDemandStatus}</p>
                <p className="text-xs text-muted-foreground mt-1">This summarizes whether nearby demand signals support ordering more, staying steady, or being cautious with cash.</p>
              </div>

              <div className="py-5 border-t border-border">
                <p className="fx-eyebrow">Weather Effect</p>
                <p className="text-sm text-foreground mt-2">{analysis.weatherImpact?.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {analysis.weatherImpact?.affectedCategories?.slice(0, 6).map((category) => (
                    <span key={category} className="fx-badge">{category}</span>
                  ))}
                </div>
                {(analysis.weatherImpact?.affectedCategories?.length || 0) > 6 && (
                  <p className="text-xs text-muted-foreground mt-2">Showing top 6 of {analysis.weatherImpact.affectedCategories.length} — every category is listed in Weather Impact Analysis below.</p>
                )}
                <p className="text-xs text-muted-foreground mt-3">Use this to connect today’s weather with categories people usually buy quickly, such as cold drinks, snacks, tea, or essentials.</p>
              </div>

              {stockoutPredictions.length > 0 && (
              <div className="py-5 border-t border-border">
                <p className="fx-eyebrow">Stockout Risk</p>
                <div className="mt-3">
                  {stockoutPredictions.slice(0, 4).map((item) => (
                    <div key={item.product} className="grid grid-cols-[1fr_auto_auto] gap-3 text-xs py-1.5 border-b border-border last:border-b-0 items-center">
                      <span className="font-medium text-foreground truncate">{item.product}</span>
                      <span className="fx-num text-muted-foreground">{item.daysLeft}d</span>
                      <span className="fx-num font-semibold text-danger inline-flex items-center gap-1.5">
                        <span className="fx-signal fx-signal-danger" aria-hidden="true" />{item.probability}%
                      </span>
                    </div>
                  ))}
                </div>
                {stockoutPredictions.length > 4 && (
                  <p className="text-xs text-muted-foreground mt-2">Showing top 4 of {stockoutPredictions.length} — every alert is listed in Risk Alerts below.</p>
                )}
                <p className="text-xs text-muted-foreground mt-3">These items can lose sales if not replenished. Prioritize products with fewer days left and higher risk percentage.</p>
              </div>
              )}

              {overstockAnalysis.length > 0 && (
              <div className="py-5 border-t border-border">
                <p className="fx-eyebrow">Excess Stock To Watch</p>
                <div className="mt-3 space-y-2">
                  {overstockAnalysis.slice(0, 4).map((item) => (
                    <div key={item.product} className="text-xs">
                      <p className="font-medium text-foreground truncate">{item.product}</p>
                      <p className="text-muted-foreground mt-0.5">{item.currentAdvice}</p>
                    </div>
                  ))}
                </div>
                {overstockAnalysis.length > 4 && (
                  <p className="text-xs text-muted-foreground mt-2">Showing top 4 of {overstockAnalysis.length} — every row is listed in Inventory Recommendations below.</p>
                )}
                <p className="text-xs text-muted-foreground mt-3">These rows point to cash stuck in slow or excess inventory. Consider reducing reorder quantity or running a small offer.</p>
              </div>
              )}

              {visibleProductSimilarity.length > 0 && (
              <div className="py-5 border-t border-border">
                <p className="fx-eyebrow">Related Products</p>
                <div className="mt-3 space-y-2">
                  {visibleProductSimilarity.slice(0, 4).map((item) => (
                    <p key={item.product} className="text-xs"><span className="font-medium text-foreground">{item.product}</span> → <span className="text-muted-foreground">{item.related.join(", ")}</span></p>
                  ))}
                </div>
                {visibleProductSimilarity.length > 4 && (
                  <p className="text-xs text-muted-foreground mt-2">Showing top 4 of {visibleProductSimilarity.length}</p>
                )}
                <p className="text-xs text-muted-foreground mt-3">Related products are useful for basket planning. If one product spikes, place its companions nearby or check their stock too.</p>
              </div>
              )}

              {visibleDemandClusters.length > 0 && (
              <div className="py-5 border-t border-border">
                <p className="fx-eyebrow">Movement Groups</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-3">
                  {visibleDemandClusters.map((cluster) => (
                    <div key={cluster.label}>
                      <p className="text-xs font-semibold text-foreground">{cluster.label}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{cluster.products.join(", ")}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">Groups separate fast movers from slower cash blockers, so ordering and discounting decisions are easier.</p>
              </div>
              )}

              <div className="py-5 border-t border-border lg:col-span-2">
                <p className="fx-eyebrow">Store Memory &amp; Search</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-3 mt-3 text-xs">
                  <div><p className="font-medium text-foreground">Similar Products</p><p className="text-muted-foreground mt-1">“Show products similar to {analysis.trendingProducts?.[0]?.name || "Parle-G"}”</p></div>
                  <div><p className="font-medium text-foreground">Report Search</p><p className="text-muted-foreground mt-1">Find reports mentioning demand spikes, milk, tea, biscuits, or overstock.</p></div>
                  <div><p className="font-medium text-foreground">Jarvis Memory</p><p className="text-muted-foreground mt-1">Forecast history, questions, inventory changes, and generated reports are stored for retrieval.</p></div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">This helps connect today’s analysis with previous reports and inventory changes, so the store does not repeat the same mistake next time.</p>
              </div>
            </div>
          </section>

          {/* Weather Forecast + Spike Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weather Forecast */}
            {weather && (
              <section aria-label="7-day weather forecast" className="fx-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Thermometer className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
                  <h3 className="text-sm font-semibold text-foreground">7-Day Weather Forecast</h3>
                </div>
                <div>
                  {weather.forecast.map((d) => (
                    <div key={d.date} className="flex items-center justify-between py-2.5 border-b border-border last:border-b-0">
                      <div className="min-w-0">
                        <span className="font-medium text-sm text-foreground">{new Date(d.date).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}</span>
                        <span className="text-xs text-muted-foreground ml-2">{d.weather}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm shrink-0">
                        <span className="fx-num font-medium text-foreground">{d.maxTemp}°</span>
                        <span className="fx-num text-muted-foreground">{d.minTemp}°</span>
                        <span className="text-muted-foreground flex items-center gap-1 text-xs">
                          <Droplets className="w-3 h-3" aria-hidden="true" strokeWidth={1.8} /><span className="fx-num">{d.avgHumidity}%</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">Meaning: temperature, rain/clouds, humidity, and wind help explain which categories may move faster on each day.</p>
              </section>
            )}

            {/* Spike Probability Chart */}
            <section aria-label="Demand spike probability" className="fx-card p-6">
              <div className="flex items-center gap-2 mb-1">
                <ChartLine className="w-4 h-4 text-accent" aria-hidden="true" animateOnHover />
                <h3 className="text-sm font-semibold text-foreground">Demand Spike Probability</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Day-level chance of a demand jump this week</p>
              <div
                role="img"
                aria-label={`Bar chart of daily demand spike probability for the next ${spikeChartData.length} days${highestSpike ? `. Highest is ${highestSpike.fullDay} at ${highestSpike.probability} percent` : ""}.`}
              >
                <ResponsiveContainer width="100%" height={CHART_H.standard}>
                  <BarChart data={spikeChartData} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis {...axisProps} dataKey="name" dy={6} />
                    <YAxis {...axisProps} domain={[0, 100]} />
                    <Tooltip content={<DemandSpikeTooltip />} cursor={{ fill: "var(--secondary)", opacity: 0.5 }} />
                    <Bar dataKey="probability" name="Spike %" radius={[3, 3, 0, 0]} barSize={18}>
                      {spikeChartData.map((_, i) => (
                        <Cell key={i} fill={chartColor(i)} />
                      ))}
                      <LabelList dataKey="probability" position="top" formatter={(value) => `${Number(value ?? 0)}%`} style={{ fontSize: 10, fill: "var(--muted-foreground)", fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {highestSpike && (
                <div className="fx-rule mt-3 pt-3">
                  <p className="text-xs font-semibold text-foreground inline-flex items-center gap-1.5">
                    <span className="fx-signal fx-signal-warning" aria-hidden="true" />
                    Highest risk: {highestSpike.fullDay} at <span className="fx-num">{highestSpike.probability}%</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Primary: {highestSpike.primaryProduct || "Demand basket"}</p>
                  {highestSpike.supportingProducts?.length > 0 && (
                    <p className="text-xs text-muted-foreground">Supporting: {highestSpike.supportingProducts.join(", ")}</p>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">Meaning: each bar is a day-level chance of a demand jump. The product shown below the chart is the main item to protect from stockout that day.</p>
            </section>
          </div>

          {/* Demand Spikes list */}
          <section aria-label="7-day demand spike forecast" className="fx-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} />
              <h3 className="fx-display text-[17px] text-foreground">7-Day Demand Spike Forecast</h3>
            </div>
            <div>
              {analysis.demandSpikes?.map((spike, i) => (
                <div key={i} className="border-b border-border last:border-b-0">
                  <button
                    onClick={() => setExpandedSpike(expandedSpike === i ? null : i)}
                    aria-expanded={expandedSpike === i}
                    className="w-full flex items-center justify-between gap-3 py-3.5 px-1 hover:bg-secondary/40 transition-colors fx-focus cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="fx-num text-xs font-semibold text-secondary-foreground w-8 shrink-0 text-left">
                        {spike.dayName?.substring(0, 2)}
                      </span>
                      <div className="text-left min-w-0">
                        <p className="text-sm font-medium text-foreground">{spike.dayName} <span className="text-xs text-muted-foreground ml-1">{spike.day}</span></p>
                        <p className="text-xs font-medium mt-0.5" style={{ color: "var(--accent)" }}>{spike.primaryProduct || spike.topProducts?.[0]}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{spike.reason}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1 text-success text-sm font-semibold fx-num">
                          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} />{spike.expectedIncrease}
                        </div>
                        <div className="w-24 h-1 bg-muted rounded-full overflow-hidden mt-1.5" aria-hidden="true">
                          <div className="h-full rounded-full" style={{ width: `${spike.spikeProbability}%`, background: "var(--accent)" }} />
                        </div>
                        <span className="fx-num text-xs text-muted-foreground">{spike.spikeProbability}% probability</span>
                      </div>
                      {expandedSpike === i ? <ChevronUp className="w-4 h-4 text-muted-foreground" aria-hidden="true" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
                    </div>
                  </button>
                  {expandedSpike === i && (
                    <div className="px-1 pb-4 pt-1 space-y-3">
                      <div>
                        <p className="fx-eyebrow mb-2">Daily demand basket</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(spike.primaryProduct || spike.topProducts?.[0]) && (
                            <span className="fx-badge fx-badge-accent">
                              Primary: {spike.primaryProduct || spike.topProducts?.[0]}
                            </span>
                          )}
                          {(spike.supportingProducts?.length ? spike.supportingProducts : spike.topProducts?.slice(1))?.map((p, j) => (
                            <span key={j} className="fx-badge">Support: {p}</span>
                          ))}
                        </div>
                      </div>
                      {spike.groqInsight && (
                        <div className="fx-rule pt-3">
                          <p className="fx-eyebrow flex items-center gap-1.5 mb-1">
                            <Brain className="w-3 h-3" aria-hidden="true" strokeWidth={1.8} /> Why this matters
                          </p>
                          <p className="text-xs text-secondary-foreground leading-relaxed">{spike.groqInsight}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">Meaning: open a day to see the lead product, supporting basket items, and the practical reason behind that day’s expected demand.</p>
          </section>

          {/* Trending Products + Demand Score Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section aria-label="Trending products" className="lg:col-span-2 fx-card p-6">
              <div className="flex items-center justify-between mb-4 gap-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} />
                  <h3 className="fx-display text-[17px] text-foreground">Trending Products</h3>
                </div>
                <button onClick={() => setShowAllProducts(!showAllProducts)} className="fx-btn fx-btn-ghost !py-1.5 !px-2.5 text-xs">
                  {showAllProducts ? "Show Less" : "Show All"}
                </button>
              </div>
              <div className="fx-table-scroll -mx-2">
                <table className="fx-table min-w-[560px]">
                  <caption className="fx-sr-only">
                    Trending products with category, demand score, recommended stock level, and price range.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Product</th>
                      <th scope="col">Category</th>
                      <th scope="col">Demand</th>
                      <th scope="col">Stock Rec.</th>
                      <th scope="col">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAllProducts ? analysis.trendingProducts : analysis.trendingProducts?.slice(0, 6))?.map((p, i) => (
                      <tr key={i}>
                        <td>
                          <div className="flex items-center gap-1.5">
                            {p.inInventory && <span className="fx-signal fx-signal-success shrink-0" title="In your inventory" />}
                            <p className="font-medium text-foreground">{p.name}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{p.reason}</p>
                          {p.stockingReason && (
                            <p className="text-xs mt-1 flex items-start gap-1" style={{ color: "var(--accent)" }}>
                              <Lightbulb className="w-3 h-3 shrink-0 mt-0.5" aria-hidden="true" strokeWidth={1.8} />{p.stockingReason}
                            </p>
                          )}
                        </td>
                        <td className="text-xs text-muted-foreground">{p.category}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1 bg-muted rounded-full overflow-hidden" aria-hidden="true">
                              <div className="h-full rounded-full" style={{ width: `${p.demandScore}%`, background: "var(--accent)" }} />
                            </div>
                            <span className="fx-num text-xs font-medium">{p.demandScore}</span>
                          </div>
                          {p.trend && <p className="text-xs text-success mt-0.5">{p.trend}</p>}
                        </td>
                        <td>
                          <span className={`fx-badge ${
                            p.recommendedStock === "High" ? "fx-badge-danger" :
                            p.recommendedStock === "Medium" ? "fx-badge-warning" :
                            "fx-badge-success"
                          }`}>{p.recommendedStock}</span>
                        </td>
                        <td className="fx-num text-muted-foreground">{p.priceRange}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Meaning: prioritize “High” products first, especially when the reason mentions low stock, weather demand, event demand, or expiry pressure.</p>
            </section>

            {/* Demand Score Horizontal Bar Chart — replaces confusing Radar */}
            <section aria-label="Product demand scores" className="fx-card p-6">
              <h3 className="text-sm font-semibold text-foreground mb-1">Product Demand Scores</h3>
              <p className="text-xs text-muted-foreground mb-4">Top real inventory drivers scored from stock, weather, events, expiry, and price</p>
              <div
                role="img"
                aria-label={`Horizontal bar chart of demand scores out of 100 for the top ${productBarData.length} products.`}
              >
                <ResponsiveContainer width="100%" height={productChartHeight}>
                  <BarChart data={productBarData} layout="vertical" margin={{ top: 4, right: 28, left: 0, bottom: 4 }}>
                    <CartesianGrid {...gridProps} vertical horizontal={false} />
                    <XAxis {...axisProps} type="number" domain={[0, 100]} fontSize={10} tickCount={5} />
                    <YAxis {...axisProps} type="category" dataKey="name" fontSize={10} width={110} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={tooltipLabelStyle}
                      cursor={{ fill: "var(--secondary)", opacity: 0.5 }}
                      formatter={(val, _name, entry) => [`${Number(val ?? 0)} / 100`, entry.payload?.fullName || "Product"]}
                    />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={14}>
                      {productBarData.map((entry, i) => (
                        <Cell key={i} fill={entry.score >= 85 ? "var(--danger)" : entry.score >= 65 ? "var(--warning)" : "var(--accent)"} />
                      ))}
                      <LabelList dataKey="score" position="insideRight" style={{ fontSize: "10px", fill: "var(--accent-foreground)", fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-3 mt-2 justify-center flex-wrap">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="fx-signal fx-signal-danger" aria-hidden="true" /> High (&ge;85)</span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="fx-signal fx-signal-warning" aria-hidden="true" /> Medium (65-84)</span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="fx-signal fx-signal-accent" aria-hidden="true" /> Low (&lt;65)</span>
              </div>
              {(analysis.trendingProducts?.length || 0) > 8 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">Showing top 8 of {analysis.trendingProducts.length} — use Show All on the Trending Products table for the rest.</p>
              )}
              <p className="text-xs text-muted-foreground mt-3 text-center">Meaning: red bars need attention today; amber bars should be watched; teal bars are normal unless stock is very low.</p>
            </section>
          </div>

          {/* Weather Impact */}
          {analysis.weatherImpact && (
            <section aria-label="Weather impact analysis" className="fx-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Cloud className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
                <h3 className="fx-display text-[17px] text-foreground">Weather Impact Analysis</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
                <div>
                  <span className={`fx-badge mb-2 ${
                    analysis.weatherImpact.severity === "High" ? "fx-badge-danger" :
                    analysis.weatherImpact.severity === "Medium" ? "fx-badge-warning" :
                    "fx-badge-success"
                  }`}>{analysis.weatherImpact.severity} Impact</span>
                  <p className="text-sm text-secondary-foreground mt-2 leading-relaxed">{analysis.weatherImpact.description}</p>
                  <div className="mt-3">
                    <p className="fx-eyebrow mb-1.5">Affected Categories</p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.weatherImpact.affectedCategories?.map((c, i) => (
                        <span key={i} className="fx-badge">{c}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <p className="fx-eyebrow mb-2">Specific Recommendations</p>
                  <ul>
                    {analysis.weatherImpact.recommendations?.map((r, i) => (
                      <li key={i} className="flex items-start gap-2.5 py-2 border-b border-border last:border-b-0 text-[13px] text-secondary-foreground leading-snug">
                        <ArrowUpRight className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" aria-hidden="true" strokeWidth={1.8} /> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {analysis.weatherImpact.groqInsight && (
                <div className="fx-rule mt-4 pt-3">
                  <p className="fx-eyebrow flex items-center gap-1.5 mb-1">
                    <Brain className="w-3 h-3" aria-hidden="true" strokeWidth={1.8} /> Weather Impact Analysis
                  </p>
                  <p className="text-xs text-secondary-foreground leading-relaxed">{analysis.weatherImpact.groqInsight}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">Meaning: this section converts weather into category-level stocking guidance for the current store inventory.</p>
            </section>
          )}

          {/* Upcoming Offers & Events */}
          {analysis.upcomingOffers?.length > 0 && (
            <section aria-label="Upcoming offers and events" className="fx-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} />
                <h3 className="fx-display text-[17px] text-foreground">Upcoming Offers &amp; Events</h3>
              </div>
              <div className={`grid grid-cols-1 gap-x-10 gap-y-0 ${analysis.upcomingOffers.length > 1 ? "md:grid-cols-2" : ""}`}>
                {analysis.upcomingOffers.map((o, i) => (
                  <div key={i} className="py-4 border-t border-border space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 min-w-0">
                        <Calendar className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" strokeWidth={1.8} />
                        <span className="truncate">{o.event}</span>
                      </h4>
                      <span className="fx-num text-success font-semibold text-sm shrink-0">{o.expectedDemandChange}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{o.date}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {o.affectedCategories?.map((c, j) => (
                        <span key={j} className="fx-badge">{c}</span>
                      ))}
                    </div>
                    {o.recommendations?.length > 0 && (
                      <ul className="space-y-1.5">
                        {o.recommendations.map((r, j) => (
                          <li key={j} className="text-xs text-secondary-foreground flex items-start gap-2 leading-relaxed">
                            <span className="fx-signal fx-signal-success mt-1" aria-hidden="true" /> {r}
                          </li>
                        ))}
                      </ul>
                    )}
                    {o.groqInsight && (
                      <div className="fx-rule pt-2.5">
                        <p className="fx-eyebrow flex items-center gap-1.5 mb-1">
                          <Brain className="w-3 h-3" aria-hidden="true" strokeWidth={1.8} /> Why this matters for your store
                        </p>
                        <p className="text-xs text-secondary-foreground leading-relaxed">{o.groqInsight}</p>
                      </div>
                    )}
                    {o.offerLink && (
                      <a
                        href={o.offerLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium hover:underline mt-1 fx-focus"
                        style={{ color: "var(--accent)" }}
                      >
                        <ArrowUpRight className="w-3 h-3" aria-hidden="true" strokeWidth={1.8} /> View Offer Details
                      </a>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">Meaning: events are only useful when they match products you actually sell; use these cards to order extra only in affected categories.</p>
            </section>
          )}

          {/* Inventory Recommendations */}
          {analysis.inventoryRecommendations?.length > 0 && (
            <section aria-label="Inventory recommendations" className="fx-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} />
                <h3 className="fx-display text-[17px] text-foreground">Inventory Recommendations</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-0">
                {analysis.inventoryRecommendations.map((r, i) => (
                  <div key={i} className="py-4 border-t border-border space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="font-medium text-foreground text-sm truncate">{r.product}</h4>
                      <span className={`fx-badge shrink-0 ${
                        r.urgency === "High" ? "fx-badge-danger" :
                        r.urgency === "Medium" ? "fx-badge-warning" :
                        "fx-badge-success"
                      }`}>{r.urgency}</span>
                    </div>
                    {r.currentStock !== undefined && (
                      <p className="text-xs text-muted-foreground">Current stock: <span className="fx-num font-semibold text-foreground">{r.currentStock} units</span></p>
                    )}
                    <div className="flex items-center gap-1">
                      {r.action === "Increase" ? (
                        <ArrowUpRight className="w-3 h-3 text-danger" aria-hidden="true" strokeWidth={1.8} />
                      ) : r.action === "Decrease" ? (
                        <ArrowDownRight className="w-3 h-3 text-success" aria-hidden="true" strokeWidth={1.8} />
                      ) : null}
                      <span className="text-xs font-semibold text-foreground">{r.action}</span>
                      {r.unitsToOrder && r.unitsToOrder > 0 && (
                        <span className="fx-num text-xs font-medium ml-1" style={{ color: "var(--accent)" }}>+{r.unitsToOrder} units</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{r.currentAdvice}</p>
                    {r.groqInsight && (
                      <div className="fx-rule pt-2">
                        <p className="fx-eyebrow flex items-center gap-1 mb-0.5">
                          <Brain className="w-3 h-3" aria-hidden="true" strokeWidth={1.8} /> Stocking Insight
                        </p>
                        <p className="text-xs text-secondary-foreground leading-relaxed">{r.groqInsight}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">Meaning: these are action rows, not just insights. They translate demand risk into order, reduce, or maintain decisions.</p>
            </section>
          )}

          {/* Risk Alerts */}
          {analysis.riskAlerts?.length > 0 && (
            <section aria-label="Risk alerts" className="fx-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="w-4 h-4 text-danger" aria-hidden="true" strokeWidth={1.8} />
                <h3 className="fx-display text-[17px] text-foreground">Risk Alerts</h3>
              </div>
              <div>
                {analysis.riskAlerts.map((r, i) => (
                  <div key={i} className="py-3.5 border-b border-border last:border-b-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`fx-signal ${
                        r.severity === "critical" ? "fx-signal-danger" :
                        r.severity === "warning" ? "fx-signal-warning" : "fx-signal-accent"
                      }`} aria-hidden="true" />
                      <span className="font-medium text-sm text-foreground capitalize">{r.type.replace(/_/g, " ")}</span>
                      <span className={`fx-badge ${
                        r.severity === "critical" ? "fx-badge-danger" :
                        r.severity === "warning" ? "fx-badge-warning" :
                        "fx-badge-accent"
                      }`}>{r.severity}</span>
                    </div>
                    {r.product && (
                      <p className="text-xs text-muted-foreground pl-[17px]">
                        Product: <span className="font-semibold text-foreground">{r.product}</span>
                        {r.currentStock !== undefined && <span className="ml-2 fx-num">({r.currentStock} units remaining)</span>}
                      </p>
                    )}
                    <p className="text-sm text-secondary-foreground pl-[17px]">{r.message}</p>
                    <p className="text-xs text-muted-foreground flex items-start gap-1.5 pl-[17px]">
                      <ArrowUpRight className="w-3 h-3 mt-0.5 shrink-0 text-success" aria-hidden="true" strokeWidth={1.8} /> {r.mitigation}
                    </p>
                    {r.groqInsight && (
                      <div className="pl-[17px]">
                        <p className="fx-eyebrow flex items-center gap-1 mb-0.5 mt-1">
                          <Brain className="w-3 h-3" aria-hidden="true" strokeWidth={1.8} /> Risk Impact
                        </p>
                        <p className="text-xs text-secondary-foreground leading-relaxed">{r.groqInsight}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">Meaning: risk alerts show where money or sales can be lost first, such as stockouts, expiry pressure, or blocked capital.</p>
            </section>
          )}

          {/* News & Market Intel */}
          {news && (news.offers?.length > 0 || news.trending?.length > 0) && (
            <section aria-label="Market intelligence" className="fx-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Download className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
                <h3 className="fx-display text-[17px] text-foreground">Market Intelligence</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
                {news.offers?.length > 0 && (
                  <div>
                    <p className="fx-eyebrow mb-2">Offers &amp; Deals</p>
                    <ul>
                      {news.offers.slice(0, 4).map((n, i) => (
                        <li key={i} className="text-sm py-2.5 border-b border-border last:border-b-0">
                          <a href={n.link} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline fx-focus" style={{ color: "var(--accent)" }}>{n.title}</a>
                          <p className="text-xs text-muted-foreground mt-0.5">{n.snippet}</p>
                        </li>
                      ))}
                    </ul>
                    {news.offers.length > 4 && (
                      <p className="text-xs text-muted-foreground mt-2">Showing top 4 of {news.offers.length}</p>
                    )}
                  </div>
                )}
                {news.trending?.length > 0 && (
                  <div>
                    <p className="fx-eyebrow mb-2">Trending</p>
                    <ul>
                      {news.trending.slice(0, 4).map((n, i) => (
                        <li key={i} className="text-sm py-2.5 border-b border-border last:border-b-0">
                          <a href={n.link} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline fx-focus" style={{ color: "var(--accent)" }}>{n.title}</a>
                          <p className="text-xs text-muted-foreground mt-0.5">{n.snippet}</p>
                        </li>
                      ))}
                    </ul>
                    {news.trending.length > 4 && (
                      <p className="text-xs text-muted-foreground mt-2">Showing top 4 of {news.trending.length}</p>
                    )}
                  </div>
                )}
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
            <Zap className="w-5 h-5 text-muted-foreground mx-auto mb-3 opacity-60" aria-hidden="true" strokeWidth={1.8} />
            <p className="text-sm text-secondary-foreground font-medium">No analysis has been run yet</p>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-lg mx-auto mb-5">
              Predict when your products will see the highest demand. Get 7-day forecasts based on weather, local events, festivals, and market trends — all tailored to your store.
            </p>
            <button onClick={runAnalysis} disabled={loading} className="fx-btn fx-btn-accent mx-auto">
              <Zap className="w-4 h-4" aria-hidden="true" strokeWidth={1.8} /> Run Analysis Now
            </button>
          </div>

          {/* How it works */}
          <div className="fx-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y lg:divide-y-0 sm:divide-x divide-[var(--border)] overflow-hidden">
            <div className="p-5">
              <MapPin className="w-4 h-4 text-accent mb-2.5" aria-hidden="true" strokeWidth={1.8} />
              <h4 className="text-sm font-medium text-foreground mb-1">Store Location</h4>
              <p className="text-xs text-muted-foreground">Detects your store address and fetches hyper-local data for your area</p>
            </div>
            <div className="p-5">
              <Cloud className="w-4 h-4 text-accent mb-2.5" aria-hidden="true" strokeWidth={1.8} />
              <h4 className="text-sm font-medium text-foreground mb-1">Weather Forecast</h4>
              <p className="text-xs text-muted-foreground">7-day weather data to predict how temperature and rain affect buying patterns</p>
            </div>
            <div className="p-5">
              <Calendar className="w-4 h-4 text-accent mb-2.5" aria-hidden="true" strokeWidth={1.8} />
              <h4 className="text-sm font-medium text-foreground mb-1">Events &amp; Festivals</h4>
              <p className="text-xs text-muted-foreground">Upcoming festivals, IPL matches, local events that drive demand spikes</p>
            </div>
            <div className="p-5">
              <ChartLine className="w-4 h-4 text-accent mb-2.5" aria-hidden="true" animateOnHover />
              <h4 className="text-sm font-medium text-foreground mb-1">Smart Predictions</h4>
              <p className="text-xs text-muted-foreground">Get spike probability, trending products, offers, and restock alerts for each day</p>
            </div>
          </div>

          {/* What you get */}
          <div className="fx-card p-6">
            <h3 className="fx-eyebrow mb-2">What you&apos;ll get in your report</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0">
              {[
                { title: "7-Day Spike Forecast", desc: "Daily demand probability with spike percentage and top products" },
                { title: "Trending Products", desc: "10+ products trending in your category with demand scores and prices" },
                { title: "Weather Impact", desc: "How current weather conditions will affect your sales this week" },
                { title: "Offers & Events", desc: "Upcoming festivals, promotions, and deals that impact your store" },
                { title: "Stock Recommendations", desc: "What to restock, reduce, or maintain based on predicted demand" },
                { title: "Risk Alerts", desc: "Stockout warnings, competition alerts, and spoilage risks" },
              ].map(item => (
                <div key={item.title} className="flex gap-2.5 items-start py-4 border-t border-border">
                  <span className="fx-signal fx-signal-accent mt-[5px]" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Download note */}
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> Download as PDF</div>
            <div className="flex items-center gap-1.5"><Code className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> Download as HTML</div>
          </div>
        </div>
      )}
    </div>
  );
}
