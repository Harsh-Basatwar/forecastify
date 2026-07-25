"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { useRouter } from "next/navigation";
import {
  Mic, Volume2, VolumeX, Globe, X, Package,
  Cloud, MapPin, Zap, AlertTriangle, ExternalLink,
  PauseCircle, PlayCircle, TrendingUp, BarChart3, Tag, Loader2,
  ChevronDown, TestTube, Download
} from "lucide-react";
import { AiOrb } from "@/components/jarvis/AiOrb";
import { ClapDetector } from "@/components/jarvis/ClapDetector";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-logger";
import { getLocalActivities, recordLocalActivity, type LocalActivity } from "@/lib/local-activity";
import { LANGUAGES } from "@/lib/translations";

/* eslint-disable @typescript-eslint/no-explicit-any */

type LangCode = string;

const LANG_STATUS: Record<string, { listening: string; thinking: string; speaking: string }> = {
  "en": { listening: "🎙️ Listening...", thinking: "🧠 Jarvis is thinking...", speaking: "🔊 Speaking..." },
  "hi": { listening: "🎙️ सुन रहे हैं...", thinking: "🧠 जार्विस सोच रहा है...", speaking: "🔊 बोल रहा है..." },
  "mr": { listening: "🎙️ ऐकत आहे...", thinking: "🧠 जार्विस विचार करत आहे...", speaking: "🔊 बोलत आहे..." },
  "ta": { listening: "🎙️ கேட்கிறது...", thinking: "🧠 ஜார்விஸ் யோசிக்கிறார்...", speaking: "🔊 பேசுகிறது..." },
  "te": { listening: "🎙️ వింటోంది...", thinking: "🧠 జార్విస్ ఆలోచిస్తోంది...", speaking: "🔊 మాట్లాడుతోంది..." },
};

const TEST_QUERIES: { code: string; label: string; query: string }[] = [
  { code: "en", label: "English", query: "How much Parle-G stock is left?" },
  { code: "hi", label: "हिन्दी", query: "बिस्किट का स्टॉक कितना बचा है?" },
  { code: "mr", label: "मराठी", query: "बिस्कीटचा स्टॉक किती आहे?" },
  { code: "ta", label: "தமிழ்", query: "பிஸ்கட் ஸ்டாக் எவ்வளவு உள்ளது?" },
  { code: "te", label: "తెలుగు", query: "బిస్కెట్ స్టాక్ ఎంత మిగిలి ఉంది?" },
];

interface Message { role: "user" | "assistant"; content: string }
interface PopupData { title: string; content: string; loading?: boolean }
interface ActionResult { type: string; result: any }
type JarvisState = "sleeping" | "listening" | "thinking" | "speaking" | "idle" | "paused" | "report";

interface ReportCard {
  title: string;
  reportHtml: string;
  generatedAt: string;
  activityCount: number;
}

export default function JarvisPage() {
  const { user } = useAuth();
  const { lang: appLang } = useLang();
  const router = useRouter();

  const [state, setState] = useState<JarvisState>("sleeping");
  const [reportCard, setReportCard] = useState<ReportCard | null>(null);
  const [localActivities, setLocalActivities] = useState<LocalActivity[]>([]);
  const [dashboardSnapshot, setDashboardSnapshot] = useState<any>(null);
  const [transcript, setTranscript] = useState("");
  const [jarvisText, setJarvisText] = useState("");
  const [displayedText, setDisplayedText] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const [weather, setWeather] = useState<any>(null);
  const [locationName, setLocationName] = useState("");
  const [newsData, setNewsData] = useState<any>(null);
  const [popup, setPopup] = useState<PopupData | null>(null);
  const [inventoryPopup, setInventoryPopup] = useState<any[] | null>(null);
  const [popupHovered, setPopupHovered] = useState(false);
  const [invHovered, setInvHovered] = useState(false);
  const [invFilter, setInvFilter] = useState<"all" | "low" | "over">("all");
  const popupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const invTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [metrics, setMetrics] = useState({
    health: 0,
    sales: 0,
    lowStock: 0,
    festival: "N/A",
    skuCount: 0,
    inventoryValue: 0,
    storeName: "Store",
  });

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [lang, setLang] = useState<LangCode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("jarvis-lang");
      if (saved && LANGUAGES.some(l => l.code === saved)) return saved;
    }
    return "en";
  });
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [micAllowed, setMicAllowed] = useState<boolean | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [showTestQueries, setShowTestQueries] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const isListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef<JarvisState>("sleeping");
  const weatherRef = useRef<any>(null);
  const locationRef = useRef("");
  const historyRef = useRef<Message[]>([]);
  const newsRef = useRef<any>(null);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latRef = useRef(0);
  const lonRef = useRef(0);
  const clapStreamRef = useRef<MediaStream | null>(null);
  const clapCtxRef = useRef<AudioContext | null>(null);
  const clapAnimRef = useRef<number>(0);

  const micStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { weatherRef.current = weather; }, [weather]);
  useEffect(() => { locationRef.current = locationName; }, [locationName]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { newsRef.current = newsData; }, [newsData]);

  // Persist language to localStorage
  useEffect(() => {
    localStorage.setItem("jarvis-lang", lang);
  }, [lang]);

  // Close language dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    if (langOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [langOpen]);

  // Typewriter
  useEffect(() => {
    if (!jarvisText) { setDisplayedText(""); return; }
    let i = 0;
    setDisplayedText("");
    const t = setInterval(() => { setDisplayedText(jarvisText.slice(0, i + 1)); i++; if (i >= jarvisText.length) clearInterval(t); }, 20);
    return () => clearInterval(t);
  }, [jarvisText]);

  // Init speech + voices
  useEffect(() => {
    if (typeof window === "undefined") return;
    synthRef.current = window.speechSynthesis;
    const load = () => synthRef.current?.getVoices();
    load();
    speechSynthesis.onvoiceschanged = load;
  }, []);

  // Unlock audio
  const unlockAudio = useCallback(() => {
    if (audioUnlocked || !synthRef.current) return;
    const utt = new SpeechSynthesisUtterance(" ");
    utt.volume = 0.01;
    synthRef.current.speak(utt);
    setAudioUnlocked(true);
  }, [audioUnlocked]);

  const refreshLocalActivities = useCallback(() => {
    if (!user?.id) return [];
    const recent = getLocalActivities(user.id, 1);
    setLocalActivities(recent);
    return recent;
  }, [user?.id]);

  const rememberActivity = useCallback((
    activityType: string,
    title: string,
    description?: string,
    metadata?: Record<string, unknown>
  ) => {
    if (!user?.id) return null;
    const entry = recordLocalActivity(user.id, { activityType, title, description, metadata });
    setLocalActivities(getLocalActivities(user.id, 1));
    return entry;
  }, [user?.id]);

  // Fetch live store, location, weather, events, and dashboard metrics on mount/start
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        refreshLocalActivities();
        const [{ data: profile }, dashboardRes] = await Promise.all([
          supabase.from("profiles").select("store_name, store_category, store_size, city, state, store_address").eq("id", user.id).maybeSingle(),
          fetch("/api/dashboard", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.id, lang: appLang }),
          }),
        ]);

        const dashboardData = dashboardRes.ok ? await dashboardRes.json() : null;
        if (!cancelled && dashboardData && !dashboardData.error) {
          setDashboardSnapshot(dashboardData);
          const stats = dashboardData.stats || {};
          const nextEvent = (dashboardData.externalEvents || dashboardData.events || [])
            .filter((event: any) => event?.start_date)
            .sort((a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0];
          let festival = "N/A";
          if (nextEvent?.start_date) {
            const days = Math.max(0, Math.ceil((new Date(`${nextEvent.start_date}T00:00:00`).getTime() - Date.now()) / (1000 * 3600 * 24)));
            festival = days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days`;
          }
          setMetrics({
            health: Number(dashboardData.healthScore?.overall || 0),
            sales: Number(stats.predictedRevenue || stats.totalForecastDemand || 0),
            lowStock: Number(stats.activeAlerts || stats.lowItems || 0),
            festival,
            skuCount: Number(stats.totalSKUs || 0),
            inventoryValue: Number(stats.totalInventoryValue || 0),
            storeName: dashboardData.store?.store_name || profile?.store_name || "Store",
          });
        }

        let lat = 0;
        let lon = 0;
        let city = profile?.city || dashboardData?.store?.city || "";
        let st = profile?.state || dashboardData?.store?.state || "";
        let resolvedAddress = dashboardData?.store?.display_location || "";

        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
          );
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
          const locRes = await fetch(`/api/location?lat=${lat}&lon=${lon}`);
          if (locRes.ok) {
            const loc = await locRes.json();
            city = loc.city || city;
            st = loc.state || st;
            resolvedAddress = loc.formattedAddress || [city, st].filter(Boolean).join(", ");
          }
        } catch {
          const storeAddress = [
            profile?.store_address || dashboardData?.store?.store_address,
            profile?.city || dashboardData?.store?.city,
            profile?.state || dashboardData?.store?.state,
          ].filter(Boolean).join(", ");
          if (storeAddress) {
            const locRes = await fetch(`/api/location?address=${encodeURIComponent(storeAddress)}`);
            if (locRes.ok) {
              const loc = await locRes.json();
              lat = Number(loc.lat || 0);
              lon = Number(loc.lon || 0);
              city = loc.city || city;
              st = loc.state || st;
              resolvedAddress = loc.formattedAddress || storeAddress;
            }
          }
        }

        if (cancelled) return;
        latRef.current = lat;
        lonRef.current = lon;
        setLocationName(resolvedAddress || [city, st].filter(Boolean).join(", "));

        if (lat && lon) {
          const wRes = await fetch(`/api/weather?lat=${lat}&lon=${lon}&city=${encodeURIComponent(city || "")}`);
          if (wRes.ok) {
            const d = await wRes.json();
            if (!cancelled) setWeather(d.current);
          }
        }

        try {
          const nRes = await fetch("/api/news", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storeCategory: profile?.store_category || dashboardData?.store?.store_category || "Grocery & Supermarket", city, state: st }),
          });
          if (nRes.ok && !cancelled) {
            const nd = await nRes.json();
            setNewsData(nd);
          }
        } catch {}
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [user?.id, appLang, refreshLocalActivities]);

  // ---- SPEECH OUTPUT ----
  const speak = useCallback((text: string, onDone?: () => void) => {
    if (!voiceEnabled || !synthRef.current) { onDone?.(); return; }
    synthRef.current.cancel();

    const clean = text.replace(/[*#_`~]/g, "").replace(/\n+/g, ". ").replace(/https?:\/\/\S+/g, "link").replace(/\s+/g, " ").trim();
    if (!clean) { onDone?.(); return; }

    setState("speaking");
    isSpeakingRef.current = true;

    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang = lang;
    utt.rate = 1.0;
    utt.pitch = 1.0;
    utt.volume = 1.0;

    // Find best female voice for selected language
    const voices = synthRef.current.getVoices();
    const langPrefix = lang.split("-")[0]; // e.g. "hi" from "hi-IN"
    const isFemale = (n: string) => /female|woman|samantha|victoria|zira|karen|veena|lekha/i.test(n);
    const voice =
      voices.find(v => v.lang === lang && isFemale(v.name)) ||
      voices.find(v => v.lang.startsWith(langPrefix) && isFemale(v.name)) ||
      voices.find(v => v.lang === lang) ||
      voices.find(v => v.lang.startsWith(langPrefix)) ||
      voices.find(v => isFemale(v.name)) || null;
    if (voice) utt.voice = voice;

    utt.onend = () => { isSpeakingRef.current = false; setState("idle"); onDone?.(); };
    utt.onerror = () => { isSpeakingRef.current = false; setState("idle"); onDone?.(); };

    synthRef.current.speak(utt);

    // Chrome bug fix: pause/resume to prevent cutoff
    const keepAlive = setInterval(() => {
      if (!synthRef.current?.speaking) { clearInterval(keepAlive); return; }
      synthRef.current.pause();
      synthRef.current.resume();
    }, 5000);
    const origEnd = utt.onend;
    utt.onend = (e) => { clearInterval(keepAlive); (origEnd as any)?.(e); };
    utt.onerror = () => { clearInterval(keepAlive); isSpeakingRef.current = false; setState("idle"); onDone?.(); };
  }, [voiceEnabled, lang]);

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    isSpeakingRef.current = false;
    if (stateRef.current === "speaking") setState("idle");
  }, []);

  // ---- PAUSE JARVIS ----
  const pauseJarvis = useCallback(() => {
    stopSpeaking();
    isListeningRef.current = false;
    try { recognitionRef.current?.stop(); } catch {}
    setState("paused");
    setJarvisText("Jarvis paused. Click resume when ready, Sir.");
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => resumeJarvis(), 60000);
  }, [stopSpeaking]);

  const startRecognitionRef = useRef<() => void>(() => {});

  const resumeJarvis = useCallback(() => {
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    setState("idle");
    setJarvisText("Back online, Sir.");
    // Full restart of recognition to ensure clean state
    startRecognitionRef.current();
    speak("Back online, Sir.");
  }, [speak]);

  // ---- FEATURE API CALLS ----
  // Fetch inventory once for reuse
  const fetchInventory = useCallback(async () => {
    if (!user?.id) return [];
    const { data } = await supabase.from("inventory").select("product_name, category, current_stock, unit, price, brand, sku").eq("store_id", user.id);
    return data || [];
  }, [user?.id]);

  const fetchStoreProfile = useCallback(async () => {
    if (!user?.id) return null;
    const { data } = await supabase.from("profiles").select("store_name, store_category, store_size, city, state, store_address").eq("id", user.id).single();
    return data;
  }, [user?.id]);

  const fetchWeatherFull = useCallback(async () => {
    if (!latRef.current) return null;
    try {
      const city = locationRef.current.split(",")[0] || "";
      const res = await fetch(`/api/weather?lat=${latRef.current}&lon=${lonRef.current}&city=${encodeURIComponent(city)}`);
      if (res.ok) return await res.json();
    } catch {}
    return null;
  }, []);

  const downloadReportCard = useCallback((card: ReportCard | null = reportCard) => {
    if (!card) return;
    const html = `<!doctype html><html><head><title>${card.title}</title><style>
      @page{size:A4;margin:14mm}
      *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;border:2px solid #111;padding:16px;font-size:12px;line-height:1.5}
      h1{font-size:22px;margin:0 0 4px} h2{font-size:15px;margin:14px 0 8px;border-bottom:1px solid #111;padding-bottom:4px}
      h3{font-size:13px;margin:10px 0 6px}.meta{border:1px solid #111;padding:8px;margin:10px 0;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
      .meta div{border-right:1px solid #111;padding-right:8px}.meta div:last-child{border-right:0}
      p{margin:6px 0} ul{margin:6px 0 6px 18px;padding:0} li{margin:3px 0}
      table{width:100%;border-collapse:collapse;margin:8px 0} th,td{border:1px solid #111;padding:5px;text-align:left} th{background:#eee}
      .report{border:1px solid #111;padding:10px}.footer{border-top:1px solid #111;margin-top:14px;padding-top:6px;text-align:center;font-size:10px}
      @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style></head><body>
      <h1>${card.title}</h1>
      <div class="meta">
        <div><strong>Store</strong><br/>${metrics.storeName}</div>
        <div><strong>Location</strong><br/>${locationName || "Current location unavailable"}</div>
        <div><strong>Generated</strong><br/>${new Date(card.generatedAt).toLocaleString("en-IN")}</div>
      </div>
      <div class="report">${card.reportHtml}</div>
      <div class="footer">Forecastify Jarvis report. Activities scanned: ${card.activityCount}</div>
    </body></html>`;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 400);
  }, [locationName, metrics.storeName, reportCard]);

  // ---- TRIGGER JARVIS REPORT CARD ----
  const triggerJarvisReport = useCallback(async () => {
    if (!user) return;
    const recentActivities = getLocalActivities(user.id, 1);
    setLocalActivities(recentActivities);
    setState("report");
    setJarvisText("Preparing your last-hour business report...");
    speak("I am preparing your last hour business report, Sir.");

    try {
      const res = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          activities: recentActivities,
          dashboard: dashboardSnapshot,
          metrics,
          location: locationName,
        }),
      });
      const data = await res.json();
      
      if (data.reportHtml) {
        const card = {
          title: data.title || "Jarvis Last-Hour Report",
          reportHtml: data.reportHtml,
          generatedAt: data.generatedAt || new Date().toISOString(),
          activityCount: data.activityCount ?? recentActivities.length,
        };
        setReportCard(card);
        setJarvisText("Your report card is ready. You can download it from the card near the orb.");
        speak("Your report card is ready, Sir.");
        rememberActivity("REPORT_GENERATED", "Generated Jarvis Last-Hour Report", `Report used ${card.activityCount} recent activities.`, {
          activityCount: card.activityCount,
          storeName: metrics.storeName,
        });
        await logActivity(supabase, user.id, "REPORT_DOWNLOADED", "Generated Jarvis Last-Hour Report", `Report used ${card.activityCount} recent activities.`);
        setState("idle");
      } else {
        throw new Error(data.error || "Failed");
      }
    } catch (err) {
      console.error(err);
      setJarvisText("I encountered an error generating the report.");
      setState("idle");
    }
  }, [user, speak, dashboardSnapshot, metrics, locationName, rememberActivity]);

  const callFeatureAPI = useCallback(async (actionType: string, params: any) => {
    if (!user) return;

    const showLoading = (title: string) => {
      setPopup({ title, content: "<div style='text-align:center;padding:20px;color:#94a3b8;'>Analyzing data...</div>", loading: true });
    };

    try {
      switch (actionType) {
        case "product_analysis": {
          const productName = params.product || "Milk";
          showLoading(`Product Analysis: ${productName}`);

          // Fetch weather data for the API
          const weatherFull = await fetchWeatherFull();

          const res = await fetch("/api/product-analysis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productName,
              userId: user.id,
              weather: weatherFull?.current || weatherRef.current,
              weatherForecast: weatherFull?.forecast,
              location: locationRef.current,
            }),
          });
          const data = await res.json();

          if (data.error) {
            setPopup({ title: `Product Analysis: ${productName}`, content: `<p style="color:#ef4444;">Error: ${data.error}</p>` });
            return;
          }

          // Response: { analysis: { productName, dailyForecast, summary, totalPredictedSales, stockRequired, ... }, product, weather }
          const a = data.analysis || data;
          const forecast = a.dailyForecast || [];
          let html = `<div style="margin-bottom:10px;">
            <strong style="font-size:14px;">${a.productName || productName}</strong>
            ${a.inInventory ? `<span style="margin-left:8px;color:#22c55e;font-size:11px;">In Stock: ${a.currentStock || 0} ${a.unit || "pcs"}</span>` : `<span style="margin-left:8px;color:#f59e0b;font-size:11px;">Not in inventory</span>`}
          </div>`;

          if (a.summary) html += `<p style="margin-bottom:10px;color:#94a3b8;font-size:12px;">${a.summary}</p>`;

          if (forecast.length) {
            html += `<table style="width:100%;border-collapse:collapse;font-size:12px;">
              <tr style="border-bottom:1px solid #333;"><th style="text-align:left;padding:5px;">Day</th><th style="text-align:right;padding:5px;">Sales</th><th style="text-align:right;padding:5px;">Conf.</th><th style="text-align:left;padding:5px;font-size:11px;">Reason</th></tr>`;
            forecast.forEach((d: any) => {
              html += `<tr style="border-bottom:1px solid #222;"><td style="padding:5px;">${d.day}</td><td style="text-align:right;padding:5px;font-weight:bold;">${d.predictedSales || 0}</td><td style="text-align:right;padding:5px;color:${(d.confidence || 0) >= 80 ? "#22c55e" : "#f59e0b"};">${d.confidence || 0}%</td><td style="padding:5px;color:#666;font-size:10px;">${(d.reason || "").slice(0, 40)}</td></tr>`;
            });
            html += `</table>`;
          }

          html += `<div style="margin-top:8px;display:flex;gap:12px;font-size:11px;">
            <span style="color:#22c55e;">Weekly: ${a.totalPredictedSales || 0} units</span>
            <span style="color:#f59e0b;">Need: ${a.stockRequired || 0}</span>
            <span style="color:${a.restockUrgency === "High" ? "#ef4444" : "#888"};">Urgency: ${a.restockUrgency || "Low"}</span>
          </div>`;

          if (a.recommendations?.length) {
            html += `<div style="margin-top:8px;border-top:1px solid #333;padding-top:6px;"><strong style="font-size:11px;">Recommendations:</strong>`;
            a.recommendations.slice(0, 3).forEach((r: string) => { html += `<p style="color:#888;font-size:11px;margin:2px 0;">• ${r}</p>`; });
            html += `</div>`;
          }

          setPopup({ title: `Product Analysis: ${a.productName || productName}`, content: html });
          rememberActivity("PRODUCT_ANALYSIS", `Product Analysis: ${a.productName || productName}`, a.summary || `Analyzed ${a.productName || productName}.`, {
            productName: a.productName || productName,
            currentStock: a.currentStock,
            totalPredictedSales: a.totalPredictedSales,
            stockRequired: a.stockRequired,
            urgency: a.restockUrgency,
          });
          await logActivity(supabase, user.id, "ANALYSIS_GENERATED", `Product Analysis: ${productName}`, a.summary, { fullHtml: html });
          break;
        }

        case "demand_analysis": {
          showLoading("Demand Spike Analysis");

          // Demand analysis needs: storeCategory, storeSize, city, state, weather, forecast, news, events, location, inventory
          const [inv, store, weatherFull] = await Promise.all([
            fetchInventory(),
            fetchStoreProfile(),
            fetchWeatherFull(),
          ]);

          const res = await fetch("/api/demand-analysis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              storeCategory: store?.store_category || "Retail",
              storeSize: store?.store_size || "Small",
              city: store?.city || "Pune",
              state: store?.state || "Maharashtra",
              weather: weatherFull?.current || weatherRef.current,
              forecast: weatherFull?.forecast,
              news: newsRef.current,
              events: newsRef.current?.events,
              location: locationRef.current || store?.store_address || `${store?.city}, ${store?.state}`,
              inventory: inv,
            }),
          });
          const data = await res.json();

          if (data.error) {
            setPopup({ title: "Demand Spike Analysis", content: `<p style="color:#ef4444;">Error: ${data.error}</p>` });
            return;
          }

          // Response: { analysis: { summary, demandSpikes, trendingProducts, weatherImpact, inventoryRecommendations, riskAlerts } }
          const a = data.analysis || {};
          let html = "";

          if (a.summary) html += `<p style="margin-bottom:10px;color:#94a3b8;font-size:12px;">${a.summary}</p>`;

          // Weather impact
          if (a.weatherImpact) {
            const sev = a.weatherImpact.severity;
            html += `<div style="margin-bottom:10px;padding:6px 10px;background:${sev === "High" ? "#7f1d1d" : "#1e293b"};border-radius:8px;font-size:12px;">
              <strong>Weather Impact (${sev}):</strong> ${a.weatherImpact.description || ""}
            </div>`;
          }

          // Demand spikes table
          const spikes = a.demandSpikes || [];
          if (spikes.length) {
            html += `<table style="width:100%;border-collapse:collapse;font-size:12px;">
              <tr style="border-bottom:1px solid #333;"><th style="text-align:left;padding:5px;">Day</th><th style="text-align:right;padding:5px;">Spike %</th><th style="text-align:right;padding:5px;">Prob.</th><th style="text-align:left;padding:5px;">Reason</th></tr>`;
            spikes.slice(0, 7).forEach((s: any) => {
              html += `<tr style="border-bottom:1px solid #222;"><td style="padding:5px;">${s.dayName || s.day || "?"}</td><td style="text-align:right;padding:5px;color:#22c55e;font-weight:bold;">${s.expectedIncrease || "?"}</td><td style="text-align:right;padding:5px;">${s.spikeProbability || 0}%</td><td style="padding:5px;color:#888;font-size:10px;">${(s.reason || "").slice(0, 50)}</td></tr>`;
            });
            html += `</table>`;
          }

          // Risk alerts
          if (a.riskAlerts?.length) {
            html += `<div style="margin-top:8px;border-top:1px solid #333;padding-top:6px;"><strong style="font-size:11px;">Risk Alerts:</strong>`;
            a.riskAlerts.slice(0, 3).forEach((r: any) => {
              const color = r.severity === "critical" ? "#ef4444" : r.severity === "warning" ? "#f59e0b" : "#3b82f6";
              html += `<p style="color:${color};font-size:11px;margin:3px 0;">⚠ ${r.message || r.type}</p>`;
            });
            html += `</div>`;
          }

          // Inventory recommendations
          if (a.inventoryRecommendations?.length) {
            html += `<div style="margin-top:8px;border-top:1px solid #333;padding-top:6px;"><strong style="font-size:11px;">Stock Actions:</strong>`;
            a.inventoryRecommendations.filter((r: any) => r.action !== "Maintain").slice(0, 5).forEach((r: any) => {
              const color = r.urgency === "High" ? "#ef4444" : r.urgency === "Medium" ? "#f59e0b" : "#22c55e";
              html += `<p style="font-size:11px;margin:2px 0;"><span style="color:${color};font-weight:bold;">${r.action}</span> ${r.product}: ${r.currentAdvice || ""}</p>`;
            });
            html += `</div>`;
          }

          setPopup({ title: "Demand Spike Analysis", content: html || "<p>No significant spikes detected.</p>" });
          rememberActivity("DEMAND_SPIKE_ANALYSIS", "Demand Spike Analysis", a.summary || "Demand spike analysis completed.", {
            spikeCount: a.demandSpikes?.length || 0,
            topProducts: a.trendingProducts?.slice(0, 5)?.map((p: any) => p.name) || [],
            location: locationRef.current,
          });
          await logActivity(supabase, user.id, "ANALYSIS_GENERATED", "Demand Spike Analysis", a.summary, { fullHtml: html });
          break;
        }

        case "category_analysis": {
          const categoryName = params.category || "";
          showLoading(`Category Analysis${categoryName ? `: ${categoryName}` : ""}`);

          const res = await fetch("/api/category-analysis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              category: categoryName,
              userId: user.id,
              weather: weatherRef.current,
              location: locationRef.current,
            }),
          });
          const data = await res.json();

          if (data.error) {
            setPopup({ title: "Category Analysis", content: `<p style="color:#ef4444;">Error: ${data.error}</p>` });
            return;
          }

          // Response: { analysis: { category, summary, topBrands, products, missingProducts, recommendations }, myProducts }
          const a = data.analysis || {};
          let html = "";

          html += `<div style="margin-bottom:8px;"><strong style="font-size:14px;">${a.category || categoryName || "All"}</strong>
            <span style="margin-left:8px;color:#888;font-size:11px;">Demand: ${a.totalCategoryDemand || "?"} | Weekly: ~${a.weeklyEstimate || "?"} units</span></div>`;

          if (a.summary) html += `<p style="margin-bottom:10px;color:#94a3b8;font-size:12px;">${a.summary}</p>`;

          // Top brands
          if (a.topBrands?.length) {
            html += `<div style="margin-bottom:8px;"><strong style="font-size:11px;">Top Brands:</strong><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">`;
            a.topBrands.slice(0, 6).forEach((b: any) => {
              html += `<span style="display:inline-block;background:#6366f1;color:white;padding:2px 8px;border-radius:12px;font-size:10px;">${b.brand} (${b.popularity || "?"}%)</span>`;
            });
            html += `</div></div>`;
          }

          // Products table
          if (a.products?.length) {
            html += `<table style="width:100%;border-collapse:collapse;font-size:11px;">
              <tr style="border-bottom:1px solid #333;"><th style="text-align:left;padding:4px;">Product</th><th style="text-align:right;padding:4px;">Daily</th><th style="text-align:center;padding:4px;">Status</th><th style="text-align:right;padding:4px;">Stock</th></tr>`;
            a.products.slice(0, 10).forEach((p: any) => {
              const statusColor = p.stockStatus === "Low" || p.stockStatus === "Out of Stock" ? "#ef4444" : p.stockStatus === "Sufficient" ? "#22c55e" : "#f59e0b";
              html += `<tr style="border-bottom:1px solid #222;"><td style="padding:4px;">${p.name}<br/><span style="color:#666;font-size:9px;">${p.brand || ""}</span></td><td style="text-align:right;padding:4px;font-weight:bold;">${p.dailyDemand || 0}</td><td style="text-align:center;padding:4px;color:${statusColor};font-size:10px;">${p.stockStatus || "?"}</td><td style="text-align:right;padding:4px;">${p.inMyInventory ? `${p.myStock || 0}${p.myUnit || ""}` : "—"}</td></tr>`;
            });
            html += `</table>`;
          }

          // Missing products
          if (a.missingProducts?.length) {
            html += `<div style="margin-top:6px;"><strong style="font-size:11px;color:#f59e0b;">Should Stock:</strong> <span style="font-size:11px;color:#888;">${a.missingProducts.slice(0, 5).join(", ")}</span></div>`;
          }

          // Recommendations
          if (a.recommendations?.length) {
            html += `<div style="margin-top:6px;border-top:1px solid #333;padding-top:4px;">`;
            a.recommendations.slice(0, 3).forEach((r: string) => { html += `<p style="color:#888;font-size:11px;margin:2px 0;">• ${r}</p>`; });
            html += `</div>`;
          }

          setPopup({ title: `Category: ${a.category || categoryName || "Analysis"}`, content: html });
          rememberActivity("CATEGORY_ANALYSIS", `Category Analysis${a.category || categoryName ? `: ${a.category || categoryName}` : ""}`, a.summary || "Category analysis completed.", {
            category: a.category || categoryName || "All",
            totalCategoryDemand: a.totalCategoryDemand,
            missingProducts: a.missingProducts?.slice(0, 5) || [],
          });
          break;
        }

        case "alerts": {
          showLoading("Stock Alerts");

          const res = await fetch("/api/alerts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              weather: weatherRef.current,
            }),
          });
          const data = await res.json();

          // Response: { alerts: [...], summary: {critical, warning, info} } or just array
          const alerts = data.alerts || (Array.isArray(data) ? data : []);
          const summary = data.summary;

          if (!alerts.length) {
            setPopup({ title: "Stock Alerts", content: "<p style='color:#22c55e;text-align:center;padding:20px;'>All clear! No alerts, Sir.</p>" });
            rememberActivity("STOCK_ALERTS", "Stock Alerts Checked", "No urgent stock alerts were found.", { count: 0, summary });
            return;
          }

          let html = "";
          if (summary) {
            html += `<div style="display:flex;gap:12px;margin-bottom:10px;font-size:12px;">
              <span style="color:#ef4444;">Critical: ${summary.critical || 0}</span>
              <span style="color:#f59e0b;">Warning: ${summary.warning || 0}</span>
              <span style="color:#3b82f6;">Info: ${summary.info || 0}</span>
            </div>`;
          }

          html += `<table style="width:100%;border-collapse:collapse;font-size:12px;">
            <tr style="border-bottom:1px solid #333;"><th style="text-align:left;padding:5px;">Product</th><th style="text-align:center;padding:5px;">Type</th><th style="text-align:left;padding:5px;">Action</th></tr>`;
          alerts.forEach((a: any) => {
            const color = a.type === "stockout" || a.severity === "critical" ? "#ef4444" : a.type === "overstock" ? "#3b82f6" : "#f59e0b";
            html += `<tr style="border-bottom:1px solid #222;"><td style="padding:5px;">${a.productName || a.product_name || a.product || "?"}</td><td style="text-align:center;padding:5px;"><span style="color:${color};font-weight:bold;font-size:10px;text-transform:uppercase;">${a.type || a.severity || "alert"}</span></td><td style="padding:5px;color:#888;font-size:11px;">${a.action || a.recommendation || a.message || ""}</td></tr>`;
          });
          html += `</table>`;

          setPopup({ title: `Stock Alerts (${alerts.length})`, content: html });
          rememberActivity("STOCK_ALERTS", `Stock Alerts (${alerts.length})`, `${alerts.length} alert signals checked.`, {
            count: alerts.length,
            summary,
          });
          break;
        }

        case "news": {
          showLoading("Fetching Market News...");
          if (!newsRef.current) {
            setPopup({ title: "News & Market Updates", content: "<p style='padding:20px;color:#94a3b8;text-align:center;'>No live news available right now, Sir.</p>" });
            return;
          }
          const allNews = [...(newsRef.current.trending || []), ...(newsRef.current.events || [])].filter((n: any) => n.title && n.link);
          let html = `<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;max-height:400px;overflow-y:auto;padding-right:5px;">`;
          if (allNews.length === 0) {
            html += `<p style='color:#94a3b8;grid-column:1/-1;text-align:center;'>No recent market news found.</p>`;
          } else {
            allNews.forEach(item => {
              html += `<a href="${item.link}" target="_blank" style="display:block;border:1px solid rgba(148,163,184,0.15);border-radius:8px;padding:8px;text-decoration:none;color:inherit;background:rgba(30,41,59,0.5);transition:all 0.2s;">
                ${item.imageUrl ? `<img src="${item.imageUrl}" style="width:100%;height:100px;object-fit:cover;border-radius:4px;margin-bottom:8px;" />` : ''}
                <strong style="font-size:12px;color:#818cf8;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.4;">${item.title}</strong>
                <p style="font-size:10px;color:#94a3b8;margin-top:6px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;line-height:1.4;">${item.snippet || ""}</p>
                <div style="font-size:9px;color:#64748b;margin-top:6px;text-align:right;">Read more ↗</div>
              </a>`;
            });
          }
          html += `</div>`;
          setPopup({ title: "Live Market News", content: html });
          rememberActivity("NEWS_CHECK", "Checked Market News", `Viewed ${allNews.length} news items.`);
          break;
        }

        case "promotions": {
          showLoading("Finding Live Promotions...");
          const res = await fetch("/api/search-promos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: "FMCG Grocery wholesale offers India" }),
          });
          
          let offers = [];
          if (res.ok) {
            const data = await res.json();
            offers = data.offers || [];
          } else if (newsRef.current?.offers) {
            offers = newsRef.current.offers;
          }

          let html = `<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;max-height:400px;overflow-y:auto;padding-right:5px;">`;
          if (offers.length === 0) {
            html += `<p style='color:#94a3b8;grid-column:1/-1;text-align:center;'>No live promotions found right now.</p>`;
          } else {
            offers.forEach((item: any) => {
              html += `<a href="${item.link}" target="_blank" style="display:block;border:1px solid rgba(244,114,182,0.2);border-radius:8px;padding:8px;text-decoration:none;color:inherit;background:rgba(131,24,67,0.1);transition:all 0.2s;">
                ${item.imageUrl ? `<img src="${item.imageUrl}" style="width:100%;height:100px;object-fit:cover;border-radius:4px;margin-bottom:8px;" />` : ''}
                <strong style="font-size:12px;color:#f472b6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.4;">${item.title}</strong>
                <p style="font-size:10px;color:#cbd5e1;margin-top:6px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;line-height:1.4;">${item.snippet || ""}</p>
                <div style="font-size:9px;color:#ec4899;margin-top:6px;text-align:right;">Claim Offer 🛒</div>
              </a>`;
            });
          }
          html += `</div>`;
          setPopup({ title: "Live Promotions & Offers", content: html });
          rememberActivity("PROMO_CHECK", "Checked Live Offers", `Found ${offers.length} offers.`);
          break;
        }
      }
    } catch (err: any) {
      setPopup({ title: "Error", content: `<p style="color:#ef4444;">Failed: ${err.message || "Unknown error"}</p>` });
    }
  }, [user, fetchInventory, fetchStoreProfile, fetchWeatherFull, rememberActivity]);

  // ---- JARVIS CORE ----
  const sendToJarvis = useCallback(async (text: string) => {
    if (!text.trim() || !user || stateRef.current === "paused") return;

    unlockAudio();
    setState("thinking");
    setTranscript("");
    setJarvisText("");

    const userMsg: Message = { role: "user", content: text.trim() };
    const newHistory = [...historyRef.current, userMsg].slice(-8);
    setHistory(newHistory);

    try {
      const res = await fetch("/api/jarvis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          userId: user.id,
          conversationHistory: newHistory.slice(-2),
          weather: weatherRef.current,
          location: locationRef.current,
          news: newsRef.current,
          lang: appLang,
          jarvisLang: lang,
        }),
      });
      const data = await res.json();
      const rawResponse = data.response || "Brief interruption, Sir.";
      const cleanResponse = rawResponse
        .replace(/[<\[]action[>\]][\s\S]*?[<\[]\/?action[>\]]/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim() || "Done, Sir.";

      setHistory(prev => [...prev, { role: "assistant" as const, content: cleanResponse }].slice(-8));
      setJarvisText(cleanResponse);

      // Handle actions
      if (data.actions?.length) {
        for (const action of data.actions as ActionResult[]) {
          if (action.type === "open_url" && action.result?.url) window.open(action.result.url, "_blank");

          if (action.type === "popup" && action.result) {
            setPopup({ title: action.result.title, content: action.result.content });
            setPopupHovered(false);
            if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
            popupTimerRef.current = setTimeout(() => { setPopup(p => popupHovered ? p : null); }, 8000);
          }

          if ((action.type === "list" || action.type === "search") && action.result?.data?.length) {
            setInventoryPopup(action.result.data);
            setInvHovered(false);
            if (invTimerRef.current) clearTimeout(invTimerRef.current);
            invTimerRef.current = setTimeout(() => { setInventoryPopup(p => invHovered ? p : null); }, 8000);
          }

          if ((action.type === "add" || action.type === "increase" || action.type === "reduce" || action.type === "update" || action.type === "duplicate") && action.result?.data) {
            const item = action.result.data;
            setInventoryPopup([item]);
            const verb = action.type === "add" ? "Added" : action.type === "increase" ? "Increased" : action.type === "reduce" ? "Reduced" : action.type === "duplicate" ? "Already in inventory" : "Updated";
            const stockText = `${item.current_stock ?? 0} ${item.unit || "units"}`;
            setPopup({
              title: `${verb}: ${item.product_name}`,
              content: `<div style="font-size:13px;line-height:1.5;">
                <p><strong>${item.product_name}</strong></p>
                <p>Current quantity is <strong style="color:#22c55e;">${stockText}</strong>.</p>
                ${action.result.previousQty !== undefined ? `<p style="color:#94a3b8;">Previous quantity: ${action.result.previousQty} ${item.unit || "units"}.</p>` : ""}
              </div>`,
            });
            rememberActivity(
              action.type === "duplicate" ? "INVENTORY_DUPLICATE_CHECK" : "INVENTORY_UPDATED",
              `${verb}: ${item.product_name}`,
              `${item.product_name} current stock is ${stockText}.`,
              { productName: item.product_name, currentStock: item.current_stock, unit: item.unit, actionType: action.type }
            );
            setInvHovered(false);
            if (invTimerRef.current) clearTimeout(invTimerRef.current);
            invTimerRef.current = setTimeout(() => { setInventoryPopup(p => invHovered ? p : null); }, 8000);
          }

          if (action.type === "delete" && !action.result?.error) {
            const deletedName = action.result?.deletedProduct?.product_name || "Product";
            setPopup({
              title: `Removed: ${deletedName}`,
              content: `<p><strong>${deletedName}</strong> was removed from inventory.</p>`,
            });
            rememberActivity("INVENTORY_UPDATED", `Removed: ${deletedName}`, `${deletedName} was removed from inventory.`, {
              productName: deletedName,
              actionType: "delete",
            });
          }

          // Feature actions — call actual APIs and show in popup
          if (["product_analysis", "demand_analysis", "category_analysis", "alerts"].includes(action.type)) {
            callFeatureAPI(action.type, action.result);
          }
          
          if (action.type === "generate_report") {
            triggerJarvisReport();
          }

          // Navigation actions
          if (action.type === "navigate" && action.result?.path) {
            router.push(action.result.path);
          }
        }
      }

      speak(cleanResponse);
    } catch {
      setJarvisText("Connection lost briefly, Sir.");
      speak("Connection lost briefly, Sir.");
    }
  }, [user, speak, unlockAudio, popupHovered, invHovered, callFeatureAPI, router, lang, triggerJarvisReport, rememberActivity]);

  // ---- REQUEST MIC PERMISSION (must be from user gesture) ----
  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    // If already have a live stream, we're good
    if (micStreamRef.current && micStreamRef.current.active) {
      setMicAllowed(true);
      return true;
    }
    try {
      // Keep the stream alive — Chrome revokes mic permission if all streams are stopped
      // SpeechRecognition needs an active mic permission grant to work
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setMicAllowed(true);
      return true;
    } catch {
      setMicAllowed(false);
      setJarvisText("Microphone blocked. Click the lock icon in Chrome's address bar → allow Microphone → reload.");
      return false;
    }
  }, []);

  // ---- ALWAYS-ON RECOGNITION ----
  const restartCountRef = useRef(0);

  const startRecognition = useCallback(() => {
    const SpeechAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechAPI) return;

    // Abort any existing recognition cleanly
    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    const recognition = new SpeechAPI();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    isListeningRef.current = true;

    let finalTranscript = "";
    let wakeWordCooldown = false;

    recognition.onresult = (event: any) => {
      // Reset restart counter on any successful result — recognition is working
      restartCountRef.current = 0;

      if (stateRef.current === "paused") return;

      let interim = "", newFinal = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) newFinal += t; else interim += t;
      }

      // Wake word check — check every result (interim + final)
      if (stateRef.current === "sleeping") {
        const check = (newFinal + interim).toLowerCase();
        if (!wakeWordCooldown && (check.includes("jarvis") || check.includes("jarv") || check.includes("wake up"))) {
          wakeWordCooldown = true;
          finalTranscript = "";
          setTranscript("");
          sendToJarvis("Hey Jarvis, wake up.");
          setTimeout(() => { wakeWordCooldown = false; }, 3000);
          return;
        }
        if (interim) setTranscript(interim);
        return;
      }

      if (newFinal) {
        finalTranscript += newFinal;
        if (isSpeakingRef.current) stopSpeaking();
        setTranscript(finalTranscript);
        setState("listening");

        // 1.2s silence = send (fast response)
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (finalTranscript.trim()) {
            const t = finalTranscript.trim();
            finalTranscript = "";
            sendToJarvis(t);
          }
        }, 1200);
      }

      if (interim) {
        if (isSpeakingRef.current) stopSpeaking();
        if (stateRef.current !== "thinking") setState("listening");
        setTranscript(finalTranscript + interim);
      }
    };

    recognition.onerror = (event: any) => {
      const err = event.error;
      if (err === "not-allowed" || err === "service-not-allowed") {
        isListeningRef.current = false;
        setMicAllowed(false);
        setJarvisText("Microphone blocked. Click the lock icon in Chrome's address bar → allow Microphone → reload.");
        return;
      }
      // For "no-speech", "audio-capture", "network" — let onend handle restart
      // "aborted" means we intentionally stopped — ignore
    };

    recognition.onend = () => {
      if (!isListeningRef.current || stateRef.current === "paused") return;

      // Exponential backoff restart to avoid rapid loops
      restartCountRef.current++;
      const delay = Math.min(100 * Math.pow(2, restartCountRef.current - 1), 5000);

      setTimeout(() => {
        if (!isListeningRef.current || stateRef.current === "paused") return;
        try {
          recognition.start();
          // If start succeeds, reset counter after a beat
          setTimeout(() => { if (recognitionRef.current === recognition) restartCountRef.current = Math.max(0, restartCountRef.current - 1); }, 1000);
        } catch {
          // If start fails, do a full restart with fresh instance
          startRecognition();
        }
      }, delay);
    };

    try {
      recognition.start();
      restartCountRef.current = 0;
    } catch {
      // If start fails immediately, retry with backoff
      setTimeout(() => startRecognition(), 500);
    }
  }, [lang, stopSpeaking, sendToJarvis]);

  // Keep the ref in sync so resumeJarvis can call startRecognition without circular deps
  useEffect(() => { startRecognitionRef.current = startRecognition; }, [startRecognition]);

  const lastLangRef = useRef(lang);
  useEffect(() => {
    if (lastLangRef.current === lang) return;
    lastLangRef.current = lang;
    stopSpeaking();
    const selected = LANGUAGES.find(l => l.code === lang);
    setJarvisText(`Language set to ${selected?.name || "English"}.`);
    if (isListeningRef.current) {
      try {
        if (recognitionRef.current) {
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        }
      } catch {}
      setTimeout(() => {
        if (isListeningRef.current) startRecognitionRef.current();
      }, 250);
    }
  }, [lang, stopSpeaking]);

  // On mount: check if mic permission is already granted (no prompt), then auto-start
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        // navigator.permissions.query doesn't prompt — it just checks current state
        const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
        if (cancelled) return;

        if (result.state === "granted") {
          // Already granted — get a stream to keep permission alive, then start recognition
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
            micStreamRef.current = stream;
            setMicAllowed(true);
            startRecognition();
          } catch {
            setMicAllowed(false);
          }
        } else if (result.state === "denied") {
          setMicAllowed(false);
          setJarvisText("Microphone blocked. Click the lock icon in Chrome's address bar → allow Microphone → reload.");
        } else {
          // "prompt" state — auto-initialize after 10 seconds if user hasn't clicked
          setMicAllowed(null);
          setTimeout(() => {
            if (cancelled || stateRef.current !== "sleeping") return;
            // Trigger mic permission request + wake up
            (async () => {
              try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
                micStreamRef.current = stream;
                setMicAllowed(true);
                startRecognition();
                unlockAudio();
                sendToJarvis("Hey Jarvis, wake up.");
              } catch {
                setMicAllowed(false);
              }
            })();
          }, 10000);
        }

        // Listen for permission changes (user toggles in browser settings)
        result.onchange = () => {
          if (result.state === "granted" && !cancelled) {
            setMicAllowed(true);
            if (!isListeningRef.current) startRecognition();
          } else if (result.state === "denied") {
            setMicAllowed(false);
            isListeningRef.current = false;
            try { recognitionRef.current?.abort(); } catch {}
          }
        };
      } catch {
        // permissions.query not supported — wait for user gesture
        setMicAllowed(null);
      }
    })();

    return () => {
      cancelled = true;
      isListeningRef.current = false;
      try { if (recognitionRef.current) { recognitionRef.current.onend = null; recognitionRef.current.abort(); } } catch {}
      // Clean up mic stream on unmount
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    };
  }, [user, startRecognition]);

  // ---- CLAP DETECTION (double clap to wake) ----
  // Only start clap detection once mic is already allowed (reuse the existing stream)
  useEffect(() => {
    if (!user || micAllowed !== true) return;
    let cancelled = false;
    let retryCount = 0;

    async function startClapDetection() {
      try {
        // Reuse existing mic stream if available, otherwise request a new one
        let stream = micStreamRef.current;
        if (!stream || !stream.active) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
          if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        }
        clapStreamRef.current = stream;

        const audioCtx = new AudioContext();
        clapCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.1; // fast response for sharp sounds
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let lastClapTime = 0;
        let clapCount = 0;
        let cooldown = false;
        let baselineRms = 0;
        let sampleCount = 0;

        function detect() {
          if (cancelled) return;
          clapAnimRef.current = requestAnimationFrame(detect);

          // Only detect claps when sleeping
          if (stateRef.current !== "sleeping") {
            clapCount = 0;
            return;
          }

          analyser.getByteTimeDomainData(dataArray);
          // Calculate RMS from time domain (better for transient detection like claps)
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const v = (dataArray[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / dataArray.length) * 100;

          // Build baseline from first 60 frames (~1 second)
          if (sampleCount < 60) {
            baselineRms = (baselineRms * sampleCount + rms) / (sampleCount + 1);
            sampleCount++;
            return;
          }

          // Clap = sudden spike 3x above baseline (works for soft claps too)
          const threshold = Math.max(8, baselineRms * 3);
          const now = Date.now();

          if (rms > threshold && !cooldown) {
            cooldown = true;
            clapCount++;

            if (clapCount === 1) {
              lastClapTime = now;
            } else if (clapCount >= 2 && now - lastClapTime < 1200) {
              // Double clap detected!
              clapCount = 0;
              window.dispatchEvent(new CustomEvent("jarvis-clap-wake"));
            }

            // Reset if gap too long
            if (now - lastClapTime > 1500) {
              clapCount = 1;
              lastClapTime = now;
            }

            setTimeout(() => { cooldown = false; }, 200);
          }

          // Slowly adapt baseline to ambient noise
          baselineRms = baselineRms * 0.995 + rms * 0.005;
        }

        detect();
      } catch {
        // Retry after delay if mic not ready yet
        if (!cancelled && retryCount < 3) {
          retryCount++;
          setTimeout(startClapDetection, 3000);
        }
      }
    }

    const timer = setTimeout(startClapDetection, 1500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (clapAnimRef.current) cancelAnimationFrame(clapAnimRef.current);
      // Don't stop the shared mic stream — only stop clap-specific resources
      clapCtxRef.current?.close().catch(() => {});
    };
  }, [user, micAllowed]);

  // Listen for clap wake event
  useEffect(() => {
    function handleClapWake() {
      if (stateRef.current === "sleeping") {
        unlockAudio();
        sendToJarvis("Hey Jarvis, wake up.");
      }
    }
    window.addEventListener("jarvis-clap-wake", handleClapWake);
    return () => window.removeEventListener("jarvis-clap-wake", handleClapWake);
  }, [sendToJarvis, unlockAudio]);

  const wakeUp = useCallback(async () => {
    unlockAudio();
    // Request mic permission on first click (user gesture required by Chrome)
    if (micAllowed !== true) {
      const granted = await requestMicPermission();
      if (!granted) return;
      // Start recognition now that we have permission from user gesture
      startRecognition();
      // Small delay to let recognition initialize before sending wake command
      await new Promise(r => setTimeout(r, 300));
    }
    if (state === "sleeping" || state === "paused") {
      if (state === "paused") resumeJarvis();
      sendToJarvis("Hey Jarvis, wake up.");
    }
  }, [state, sendToJarvis, unlockAudio, resumeJarvis, micAllowed, requestMicPermission, startRecognition]);

  // ---- RENDER ----
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center relative overflow-hidden" onClick={() => {
      unlockAudio();
      // On any click, try to get mic permission if not yet granted (user gesture context)
      if (micAllowed === null) requestMicPermission().then(ok => { if (ok && !isListeningRef.current) startRecognition(); });
    }}>
      {/* Background */}
      <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "40px 40px" }} />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-3 z-10">
        <div className="flex items-center gap-3">
          {weather && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Cloud className="w-3.5 h-3.5 text-cyan-500" />{weather.temp}°C, {weather.description}
            </div>
          )}
          {locationName && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <MapPin className="w-3.5 h-3.5 text-cyan-500" /><span className="max-w-[200px] truncate">{locationName}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {state !== "sleeping" && (
            <button
              onClick={state === "paused" ? resumeJarvis : pauseJarvis}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                state === "paused" ? "bg-green-500/20 text-green-500" : "bg-orange-500/20 text-orange-500"
              }`}
            >
              {state === "paused" ? <><PlayCircle className="w-3.5 h-3.5" /> Resume</> : <><PauseCircle className="w-3.5 h-3.5" /> Pause</>}
            </button>
          )}
          {/* Language selector dropdown */}
          <div className="relative" ref={langDropdownRef}>
            <button onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/50 backdrop-blur-sm rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Globe className="w-3.5 h-3.5" />
              <span>{LANGUAGES.find(l => l.code === lang)?.nativeName || "English"}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${langOpen ? "rotate-180" : ""}`} />
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 max-h-64 overflow-y-auto bg-card border border-border/60 rounded-xl shadow-2xl z-50" style={{ animation: "fadeSlideIn 0.15s ease-out" }}>
                {LANGUAGES.map(l => (
                  <button key={l.code}
                    onClick={() => { setLang(l.code); setLangOpen(false); }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-xs hover:bg-secondary/60 transition-colors ${
                      lang === l.code ? "bg-cyan-500/10 text-cyan-500 font-bold" : "text-foreground"
                    }`}>
                    <span>{l.flag} {l.nativeName}</span>
                    <span className="text-muted-foreground text-[10px]">{l.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => { setVoiceEnabled(!voiceEnabled); if (isSpeakingRef.current) stopSpeaking(); }}
            className={`p-1.5 rounded-full ${voiceEnabled ? "bg-cyan-500/20 text-cyan-500" : "bg-secondary/50 text-muted-foreground"}`}>
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          {/* Initialize Jarvis Button Top Right */}
          {(state === "sleeping" || state === "paused") && (
            <button onClick={wakeUp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full text-xs font-medium hover:shadow-lg hover:shadow-cyan-500/30 transition-all hover:scale-105">
              <Zap className="w-3.5 h-3.5" /> Initialize
            </button>
          )}
        </div>
      </div>

      {/* Central orb */}
      <div className="flex flex-col items-center gap-8 z-10 w-full relative">
        {user && <ClapDetector onClap={() => {
          if (state === "sleeping" || state === "paused") wakeUp();
        }} enabled={!["listening", "speaking", "thinking"].includes(state)} />}
        
        <div className="relative">
          <AiOrb 
            state={state} 
            onClick={state === "sleeping" || state === "paused" ? wakeUp : stopSpeaking} 
            className="mb-4"
          />
          {state !== "sleeping" && (
            <>
              <div className="absolute top-0 -left-16 bg-card/80 backdrop-blur-md border border-border/50 px-3 py-1.5 rounded-full text-[10px] whitespace-nowrap shadow-xl animate-[orb-float_5s_ease-in-out_infinite]">
                <span className="text-cyan-500 font-bold">Store Pulse:</span> Live
              </div>
              <div className="absolute top-10 -right-20 bg-card/80 backdrop-blur-md border border-border/50 px-3 py-1.5 rounded-full text-[10px] whitespace-nowrap shadow-xl animate-[orb-float_4s_ease-in-out_infinite_0.5s]">
                <span className="text-green-500 font-bold">Demand Mood:</span> Watching
              </div>
              <div className="absolute bottom-10 -left-20 bg-card/80 backdrop-blur-md border border-border/50 px-3 py-1.5 rounded-full text-[10px] whitespace-nowrap shadow-xl animate-[orb-float_6s_ease-in-out_infinite_1s]">
                <span className="text-red-500 font-bold">Stock Focus:</span> Review
              </div>
              <div className="absolute -bottom-4 -right-16 bg-card/80 backdrop-blur-md border border-border/50 px-3 py-1.5 rounded-full text-[10px] whitespace-nowrap shadow-xl animate-[orb-float_5.5s_ease-in-out_infinite_1.5s]">
                <span className="text-purple-500 font-bold">Assistant:</span> Ready
              </div>
            </>
          )}
        </div>

        <div className="text-center">
          <h1 className={`text-3xl font-bold tracking-tight transition-colors duration-500 ${["sleeping","paused"].includes(state) ? "text-muted-foreground" : "text-foreground"}`}>J.A.R.V.I.S.</h1>
          <p className="text-xs text-muted-foreground mt-1 tracking-wider flex items-center justify-center gap-2">
            YOUR PERSONAL STORE ASSISTANT
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 text-[10px] font-bold border border-cyan-500/20">
              {LANGUAGES.find(l => l.code === lang)?.nativeName || "English"}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/60 text-muted-foreground text-[10px] font-bold border border-border/40">
              {metrics.storeName} · {metrics.skuCount} SKUs · event {metrics.festival}
            </span>
          </p>
        </div>

        {/* User transcript */}
        {state === "listening" && transcript && (
          <div className="max-w-lg text-center animate-in fade-in">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Mic className="w-4 h-4 text-cyan-500 animate-pulse" />
              <span className="text-xs text-cyan-500 font-medium tracking-wider">LISTENING</span>
            </div>
            <p className="text-lg text-foreground/80 italic">&quot;{transcript}&quot;</p>
          </div>
        )}

        {/* Jarvis response */}
        {["speaking", "idle", "thinking", "paused"].includes(state) && displayedText && (
          <div className="max-w-2xl text-center animate-in fade-in px-4">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-cyan-500" />
              <span className="text-xs text-cyan-500 font-medium tracking-wider">JARVIS</span>
            </div>
            <p className="text-base sm:text-lg text-foreground leading-relaxed">
              {displayedText}
              {state === "speaking" && displayedText.length < jarvisText.length && <span className="inline-block w-0.5 h-5 bg-cyan-500 ml-1 animate-pulse" />}
            </p>
          </div>
        )}

        {/* Thinking */}
        {state === "thinking" && !displayedText && (
          <div className="flex items-center gap-3 animate-in fade-in">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-sm text-amber-500 font-medium">{LANG_STATUS[lang]?.thinking || "Jarvis is thinking..."}</span>
          </div>
        )}

        {/* Sleeping / Paused CTA + Features */}
        {(state === "sleeping" || state === "paused") && !displayedText && (
          <div className="text-center animate-in fade-in max-w-2xl">
            <p className="text-muted-foreground mb-5">
              {state === "paused" ? "Jarvis is paused. Click resume or the orb to continue." :
                micAllowed === false ? (
                  <span className="flex flex-col items-center gap-2 text-red-400">
                    <span>Microphone access denied.</span>
                    <span className="text-xs text-muted-foreground">Click the lock/site-settings icon in Chrome&apos;s address bar → Allow Microphone → Reload the page</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2"><Mic className="w-4 h-4 text-cyan-500/50 animate-pulse" /> Say <strong>&quot;Hey Jarvis&quot;</strong>, double clap, or click below <span className="text-xs text-muted-foreground"> ({LANGUAGES.find(l => l.code === lang)?.nativeName || "EN"})</span></span>
                )
              }
            </p>
            <button onClick={wakeUp}
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all hover:scale-105 flex items-center gap-2 mx-auto mb-8">
              <Zap className="w-4 h-4" /> {state === "paused" ? "Resume Jarvis" : "Initialize Jarvis"}
            </button>
          </div>
        )}

        {/* Quick actions */}
        {state === "idle" && (
          <div className="flex flex-col items-center gap-4 max-w-2xl animate-in fade-in">
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { label: "Show inventory", icon: Package },
                { label: "Product analysis for Milk", icon: TrendingUp },
                { label: "Show demand spikes", icon: BarChart3 },
                { label: "Category analysis", icon: Tag },
                { label: "Show alerts", icon: AlertTriangle },
                { label: "Weather update", icon: Cloud },
                { label: "Show forecasts", icon: TrendingUp },
                { label: "Daily news", icon: ExternalLink },
              ].map((action, i) => (
                <button key={i} 
                  onClick={() => {
                    if (action.label.includes("inventory")) sendToJarvis("show my inventory");
                    else if (action.label.includes("Product")) sendToJarvis("analyze product Milk");
                    else if (action.label.includes("demand")) sendToJarvis("demand spikes analysis");
                    else if (action.label.includes("Category")) sendToJarvis("category analysis for Snacks");
                    else if (action.label.includes("alerts")) sendToJarvis("show stock alerts");
                    else sendToJarvis(action.label);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/50 hover:bg-secondary text-secondary-foreground rounded-full text-xs transition-colors border border-border/50">
                  <action.icon className="w-3 h-3 text-cyan-500" /> {action.label}
                </button>
              ))}
            </div>

            {/* Quick Test Buttons */}
            <div className="w-full">
              <button onClick={() => setShowTestQueries(!showTestQueries)}
                className="flex items-center gap-1.5 mx-auto px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground bg-secondary/30 rounded-full transition-all">
                <TestTube className="w-3 h-3" /> Test Language Queries
                <ChevronDown className={`w-3 h-3 transition-transform ${showTestQueries ? "rotate-180" : ""}`} />
              </button>
              {showTestQueries && (
                <div className="flex flex-wrap justify-center gap-2 mt-3" style={{ animation: "fadeSlideIn 0.2s ease-out" }}>
                  {TEST_QUERIES.map(tq => (
                    <button key={tq.code}
                      onClick={() => {
                        setLang(tq.code);
                        setTimeout(() => sendToJarvis(tq.query), 150);
                      }}
                      className="flex flex-col items-start px-3 py-2 bg-card/60 border border-border/40 rounded-xl text-left hover:bg-secondary/60 hover:border-cyan-500/30 transition-all max-w-[200px]">
                      <span className="text-[10px] font-bold text-cyan-500 mb-0.5">{tq.label}</span>
                      <span className="text-xs text-muted-foreground leading-tight">{tq.query}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Jarvis report card */}
      {reportCard && (
        <div className="fixed top-24 right-6 z-40 w-[360px] max-w-[calc(100vw-2rem)] bg-card/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/10 overflow-hidden animate-in slide-in-from-right">
          <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
            <div>
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-cyan-500" /> {reportCard.title}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {new Date(reportCard.generatedAt).toLocaleString("en-IN")} · {reportCard.activityCount || localActivities.length} recent actions
              </p>
            </div>
            <button onClick={() => setReportCard(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div
            className="p-4 max-h-[320px] overflow-y-auto text-xs leading-relaxed text-foreground/80 [&_h2]:text-sm [&_h2]:font-black [&_h2]:text-foreground [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-cyan-400 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:ml-4 [&_li]:mb-1"
            dangerouslySetInnerHTML={{ __html: reportCard.reportHtml }}
          />
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border bg-secondary/30">
            <span className="text-[10px] text-muted-foreground">Voice: “Jarvis give me today&apos;s report”</span>
            <button
              onClick={() => downloadReportCard(reportCard)}
              className="inline-flex items-center gap-1.5 rounded-full bg-cyan-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-cyan-500"
            >
              <Download className="w-3 h-3" /> PDF
            </button>
          </div>
        </div>
      )}

      {/* Feature Popup */}
      {popup && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right w-[480px] max-h-[75vh] bg-card border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/10 overflow-hidden"
          onMouseEnter={() => { setPopupHovered(true); if (popupTimerRef.current) clearTimeout(popupTimerRef.current); }}
          onMouseLeave={() => { setPopupHovered(false); popupTimerRef.current = setTimeout(() => setPopup(null), 5000); }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
            <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
              {popup.loading ? <Loader2 className="w-3.5 h-3.5 text-cyan-500 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-cyan-500" />}
              {popup.title}
            </h3>
            <button onClick={() => setPopup(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-4 overflow-y-auto max-h-[60vh] text-sm text-foreground/80 leading-relaxed [&_table]:w-full [&_th]:text-left [&_th]:text-muted-foreground [&_th]:font-semibold [&_td]:text-foreground/80" dangerouslySetInnerHTML={{ __html: popup.content }} />
          {!popupHovered && !popup.loading && <div className="h-0.5 bg-cyan-500/30"><div className="h-full bg-cyan-500" style={{ animation: "shrink 8s linear forwards" }} /></div>}
        </div>
      )}

      {/* Inventory popup */}
      {inventoryPopup && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right w-[520px] max-h-[75vh] bg-card border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/10 overflow-hidden"
          onMouseEnter={() => { setInvHovered(true); if (invTimerRef.current) clearTimeout(invTimerRef.current); }}
          onMouseLeave={() => { setInvHovered(false); invTimerRef.current = setTimeout(() => setInventoryPopup(null), 5000); }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
            <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-cyan-500" /> Inventory
            </h3>
            <div className="flex items-center gap-2">
              <select 
                value={invFilter} 
                onChange={e => setInvFilter(e.target.value as any)}
                className="bg-background border border-border text-xs rounded px-2 py-1 outline-none focus:border-cyan-500"
              >
                <option value="all">All Items</option>
                <option value="low">Low Stock (≤5)</option>
                <option value="over">Overstock (≥150)</option>
              </select>
              <button onClick={() => setInventoryPopup(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[60vh]">
            <table className="w-full text-xs">
              <thead className="bg-secondary/60 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2.5 text-muted-foreground font-semibold uppercase tracking-wider">#</th>
                  <th className="text-left px-3 py-2.5 text-muted-foreground font-semibold uppercase tracking-wider">Product</th>
                  <th className="text-left px-3 py-2.5 text-muted-foreground font-semibold uppercase tracking-wider">Category</th>
                  <th className="text-right px-3 py-2.5 text-muted-foreground font-semibold uppercase tracking-wider">Qty</th>
                  <th className="text-right px-3 py-2.5 text-muted-foreground font-semibold uppercase tracking-wider">Price</th>
                  <th className="text-center px-3 py-2.5 text-muted-foreground font-semibold uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {inventoryPopup
                  .filter(i => invFilter === "all" ? true : invFilter === "low" ? i.current_stock <= 5 : i.current_stock >= 150)
                  .map((item: any, i: number) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-cyan-500/5">
                    <td className="px-3 py-2.5 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-foreground">{item.product_name}</p>
                      {item.brand && <p className="text-muted-foreground text-[10px]">{item.brand}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{item.category}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-foreground">{item.current_stock} <span className="text-muted-foreground font-normal">{item.unit || "pcs"}</span></td>
                    <td className="px-3 py-2.5 text-right text-foreground font-medium">₹{item.price}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-block w-2 h-2 rounded-full ${
                        item.current_stock <= 5 ? "bg-red-500" : item.current_stock >= 150 ? "bg-yellow-500" : "bg-green-500"
                      }`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!invHovered && <div className="h-0.5 bg-cyan-500/30"><div className="h-full bg-cyan-500" style={{ animation: "shrink 8s linear forwards" }} /></div>}
        </div>
      )}

      {/* Bottom mic */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${
          state === "listening" ? "bg-cyan-500/20 text-cyan-500" : state === "speaking" ? "bg-indigo-500/20 text-indigo-400" : state === "paused" ? "bg-orange-500/20 text-orange-500" : "bg-secondary/50 text-muted-foreground"
        }`}>
          <Mic className={`w-3.5 h-3.5 ${state === "listening" ? "animate-pulse text-cyan-500" : micAllowed === false ? "text-red-500" : ""}`} />
          {micAllowed === false ? "Mic blocked — allow in browser"
            : state === "listening" ? (LANG_STATUS[lang]?.listening || "Listening...")
            : state === "speaking" ? (LANG_STATUS[lang]?.speaking || "Speaking...")
            : state === "paused" ? "Paused — 60s auto-resume"
            : state === "sleeping" ? "Click, say \"Hey Jarvis\", or double clap"
            : "Always listening · double clap wake"}
        </div>
      </div>

      {/* Corners */}
      <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-cyan-500/10" />
      <div className="absolute top-0 right-0 w-16 h-16 border-r-2 border-t-2 border-cyan-500/10" />
      <div className="absolute bottom-0 left-0 w-16 h-16 border-l-2 border-b-2 border-cyan-500/10" />
      <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-cyan-500/10" />

      {/* Live status */}
      <div className="absolute bottom-6 right-6 z-10 flex flex-col items-end gap-2">
        {state !== "sleeping" && (
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-500 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20 shadow-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            Jarvis Online · always listening · double clap wake
          </div>
        )}
      </div>
    </div>
  );
}
