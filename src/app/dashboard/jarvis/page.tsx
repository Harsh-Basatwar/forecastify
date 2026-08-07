"use client";

import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
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
  "en": { listening: "Listening...", thinking: "Jarvis is thinking...", speaking: "Speaking..." },
  "hi": { listening: "सुन रहे हैं...", thinking: "जार्विस सोच रहा है...", speaking: "बोल रहा है..." },
  "mr": { listening: "ऐकत आहे...", thinking: "जार्विस विचार करत आहे...", speaking: "बोलत आहे..." },
  "ta": { listening: "கேட்கிறது...", thinking: "ஜார்விஸ் யோசிக்கிறார்...", speaking: "பேசுகிறது..." },
  "te": { listening: "వింటోంది...", thinking: "జార్విస్ ఆలోచిస్తోంది...", speaking: "మాట్లాడుతోంది..." },
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

/** How long an auto-dismissing panel stays up. The countdown bar reads the
 *  same number, so what the bar shows is what actually happens. */
const POPUP_DISMISS_MS = 8000;

/**
 * Reveals `text` one character at a time by writing straight into a DOM node.
 * Kept in its own component with no rendered state so the 50Hz tick cannot
 * re-render the (very large) Jarvis page around it.
 */
function Typewriter({ text, caret }: { text: string; caret: boolean }) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    if (!text) { node.textContent = ""; setTyping(false); return; }

    let i = 0;
    node.textContent = "";
    setTyping(true);
    const t = setInterval(() => {
      i++;
      node.textContent = text.slice(0, i);
      if (i >= text.length) { clearInterval(t); setTyping(false); }
    }, 20);
    return () => clearInterval(t);
  }, [text]);

  return (
    <>
      {/* Visible reveal is decorative motion — the full sentence below is what
          gets announced, once, instead of 200 single-character updates. */}
      <span ref={nodeRef} aria-hidden="true" />
      <span className="fx-sr-only">{text}</span>
      {caret && typing && (
        <span
          className="inline-block w-0.5 h-4 ml-1 animate-pulse align-middle"
          style={{ background: "var(--accent)" }}
          aria-hidden="true"
        />
      )}
    </>
  );
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
  const [history, setHistory] = useState<Message[]>([]);
  const [weather, setWeather] = useState<any>(null);
  const [locationName, setLocationName] = useState("");
  const [newsData, setNewsData] = useState<any>(null);
  const [popup, setPopup] = useState<PopupData | null>(null);
  const [inventoryPopup, setInventoryPopup] = useState<any[] | null>(null);
  /* Auto-dismiss is suspended while a panel is hovered OR focused, and can be
     cancelled outright with the "Keep open" control — a pointer-only pause
     fails WCAG 2.2.1. Both flags feed the one timer that actually dismisses,
     and the countdown bar renders only while that timer is running. */
  const [popupHeld, setPopupHeld] = useState(false);
  const [popupPinned, setPopupPinned] = useState(false);
  const [invHeld, setInvHeld] = useState(false);
  const [invPinned, setInvPinned] = useState(false);
  const [invFilter, setInvFilter] = useState<"all" | "low" | "over">("all");

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
  const langTriggerRef = useRef<HTMLButtonElement>(null);
  const langListRef = useRef<HTMLDivElement>(null);
  const [langActiveIdx, setLangActiveIdx] = useState(0);

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
  /* One detection pass, supplied by the audio-graph effect. The rAF loop that
     calls it is owned by a separate effect gated on `state === "sleeping"`, so
     it is not running (and not rescheduling) for the whole session. */
  const clapTickRef = useRef<(() => void) | null>(null);
  const clapResetRef = useRef<(() => void) | null>(null);
  const [clapReady, setClapReady] = useState(false);
  /* Chrome's speech-synthesis keep-alive ticker. Held here so unmount can
     clear it — utt.onend never fires if we navigate away mid-utterance. */
  const keepAliveRef = useRef<NodeJS.Timeout | null>(null);

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

  // Close language dropdown on outside click. Keyboard dismissal (Escape,
  // Tab-out) is handled on the listbox itself — mousedown alone traps keyboards.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    if (langOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [langOpen]);

  // Open the listbox on the current language and move focus into it.
  useEffect(() => {
    if (!langOpen) return;
    const idx = Math.max(0, LANGUAGES.findIndex(l => l.code === lang));
    setLangActiveIdx(idx);
    const option = langListRef.current?.querySelectorAll<HTMLElement>('[role="option"]')[idx];
    option?.focus();
  }, [langOpen, lang]);

  const moveLangFocus = useCallback((next: number) => {
    const total = LANGUAGES.length;
    const idx = ((next % total) + total) % total;
    setLangActiveIdx(idx);
    langListRef.current?.querySelectorAll<HTMLElement>('[role="option"]')[idx]?.focus();
  }, []);

  const closeLangMenu = useCallback(() => {
    setLangOpen(false);
    langTriggerRef.current?.focus();
  }, []);

  // ── Auto-dismiss, honestly ───────────────────────────────────────────
  // Every path that opens a panel goes through these, so new content always
  // starts a fresh countdown and never inherits a hold or pin from the panel
  // it replaced.
  const showPopup = useCallback((next: PopupData) => {
    setPopup(next);
    setPopupHeld(false);
    setPopupPinned(false);
  }, []);

  const showInventory = useCallback((rows: any[]) => {
    setInventoryPopup(rows);
    setInvHeld(false);
    setInvPinned(false);
  }, []);

  // The single owner of feature-popup dismissal. Every code path that opens a
  // popup is covered, so the countdown bar can never run out on a panel that
  // then sits there forever.
  useEffect(() => {
    if (!popup || popup.loading || popupHeld || popupPinned) return;
    const t = setTimeout(() => setPopup(null), POPUP_DISMISS_MS);
    return () => clearTimeout(t);
  }, [popup, popupHeld, popupPinned]);

  useEffect(() => {
    if (!inventoryPopup || invHeld || invPinned) return;
    const t = setTimeout(() => setInventoryPopup(null), POPUP_DISMISS_MS);
    return () => clearTimeout(t);
  }, [inventoryPopup, invHeld, invPinned]);

  // Escape dismisses the topmost panel — a keyboard route out that does not
  // depend on reaching the close button first.
  useEffect(() => {
    if (!popup && !inventoryPopup && !reportCard) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (inventoryPopup) setInventoryPopup(null);
      else if (popup) setPopup(null);
      else if (reportCard) setReportCard(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [popup, inventoryPopup, reportCard]);

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
          supabase.from("profiles").select("store_name, city, state").eq("id", user.id).maybeSingle(),
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
            dashboardData?.store?.city,
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
            body: JSON.stringify({ storeCategory: "Grocery & Supermarket", city, state: st }),
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
    if (keepAliveRef.current) clearInterval(keepAliveRef.current);
    const keepAlive = setInterval(() => {
      if (!synthRef.current?.speaking) { clearInterval(keepAlive); return; }
      synthRef.current.pause();
      synthRef.current.resume();
    }, 5000);
    keepAliveRef.current = keepAlive;
    const origEnd = utt.onend;
    utt.onend = (e) => { clearInterval(keepAlive); keepAliveRef.current = null; (origEnd as any)?.(e); };
    utt.onerror = () => { clearInterval(keepAlive); keepAliveRef.current = null; isSpeakingRef.current = false; setState("idle"); onDone?.(); };
  }, [voiceEnabled, lang]);

  // Neither onend nor onerror fires if the page unmounts mid-utterance, so the
  // 5s ticker would outlive the component. Clear it (and the speech) here.
  useEffect(() => () => {
    if (keepAliveRef.current) clearInterval(keepAliveRef.current);
    keepAliveRef.current = null;
    try { synthRef.current?.cancel(); } catch {}
  }, []);

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
    const { data } = await supabase.from("inventory").select("product_name, category, current_stock:quantity, unit, price, sku:barcode").eq("store_id", user.id);
    return data || [];
  }, [user?.id]);

  const fetchStoreProfile = useCallback(async () => {
    if (!user?.id) return null;
    const { data } = await supabase.from("profiles").select("store_name, city, state").eq("id", user.id).single();
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
      showPopup({ title, content: "<div style='text-align:center;padding:20px;color:var(--muted-foreground);'>Analyzing data...</div>", loading: true });
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
            showPopup({ title: `Product Analysis: ${productName}`, content: `<p style="color:var(--danger);">Error: ${data.error}</p>` });
            return;
          }

          // Response: { analysis: { productName, dailyForecast, summary, totalPredictedSales, stockRequired, ... }, product, weather }
          const a = data.analysis || data;
          const forecast = a.dailyForecast || [];
          let html = `<div style="margin-bottom:10px;">
            <strong style="font-size:14px;">${a.productName || productName}</strong>
            ${a.inInventory ? `<span style="margin-left:8px;color:var(--success);font-size:11px;">In Stock: ${a.currentStock || 0} ${a.unit || "pcs"}</span>` : `<span style="margin-left:8px;color:var(--warning);font-size:11px;">Not in inventory</span>`}
          </div>`;

          if (a.summary) html += `<p style="margin-bottom:10px;color:var(--muted-foreground);font-size:12px;">${a.summary}</p>`;

          if (forecast.length) {
            html += `<table style="width:100%;border-collapse:collapse;font-size:12px;">
              <tr style="border-bottom:1px solid var(--border-strong);"><th style="text-align:left;padding:5px;">Day</th><th style="text-align:right;padding:5px;">Sales</th><th style="text-align:right;padding:5px;">Conf.</th><th style="text-align:left;padding:5px;font-size:11px;">Reason</th></tr>`;
            forecast.forEach((d: any) => {
              html += `<tr style="border-bottom:1px solid var(--border);"><td style="padding:5px;">${d.day}</td><td style="text-align:right;padding:5px;font-weight:bold;">${d.predictedSales || 0}</td><td style="text-align:right;padding:5px;color:${(d.confidence || 0) >= 80 ? "var(--success)" : "var(--warning)"};">${d.confidence || 0}%</td><td style="padding:5px;color:var(--muted-foreground);font-size:10px;">${(d.reason || "").slice(0, 40)}</td></tr>`;
            });
            html += `</table>`;
          }

          html += `<div style="margin-top:8px;display:flex;gap:12px;font-size:11px;">
            <span style="color:var(--success);">Weekly: ${a.totalPredictedSales || 0} units</span>
            <span style="color:var(--warning);">Need: ${a.stockRequired || 0}</span>
            <span style="color:${a.restockUrgency === "High" ? "var(--danger)" : "var(--muted-foreground)"};">Urgency: ${a.restockUrgency || "Low"}</span>
          </div>`;

          if (a.recommendations?.length) {
            html += `<div style="margin-top:8px;border-top:1px solid var(--border-strong);padding-top:6px;"><strong style="font-size:11px;">Recommendations:</strong>`;
            a.recommendations.slice(0, 3).forEach((r: string) => { html += `<p style="color:var(--muted-foreground);font-size:11px;margin:2px 0;">• ${r}</p>`; });
            html += `</div>`;
          }

          showPopup({ title: `Product Analysis: ${a.productName || productName}`, content: html });
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
              storeCategory: "Retail",
              storeSize: "Small",
              city: store?.city || "Pune",
              state: store?.state || "Maharashtra",
              weather: weatherFull?.current || weatherRef.current,
              forecast: weatherFull?.forecast,
              news: newsRef.current,
              events: newsRef.current?.events,
              location: locationRef.current || store?.city || `${store?.city}, ${store?.state}`,
              inventory: inv,
            }),
          });
          const data = await res.json();

          if (data.error) {
            showPopup({ title: "Demand Spike Analysis", content: `<p style="color:var(--danger);">Error: ${data.error}</p>` });
            return;
          }

          // Response: { analysis: { summary, demandSpikes, trendingProducts, weatherImpact, inventoryRecommendations, riskAlerts } }
          const a = data.analysis || {};
          let html = "";

          if (a.summary) html += `<p style="margin-bottom:10px;color:var(--muted-foreground);font-size:12px;">${a.summary}</p>`;

          // Weather impact
          if (a.weatherImpact) {
            const sev = a.weatherImpact.severity;
            html += `<div style="margin-bottom:10px;padding:6px 10px;background:${sev === "High" ? "var(--danger-soft)" : "var(--secondary)"};border-radius:10px;font-size:12px;">
              <strong>Weather Impact (${sev}):</strong> ${a.weatherImpact.description || ""}
            </div>`;
          }

          // Demand spikes table
          const spikes = a.demandSpikes || [];
          if (spikes.length) {
            html += `<table style="width:100%;border-collapse:collapse;font-size:12px;">
              <tr style="border-bottom:1px solid var(--border-strong);"><th style="text-align:left;padding:5px;">Day</th><th style="text-align:right;padding:5px;">Spike %</th><th style="text-align:right;padding:5px;">Prob.</th><th style="text-align:left;padding:5px;">Reason</th></tr>`;
            spikes.slice(0, 7).forEach((s: any) => {
              html += `<tr style="border-bottom:1px solid var(--border);"><td style="padding:5px;">${s.dayName || s.day || "?"}</td><td style="text-align:right;padding:5px;color:var(--success);font-weight:bold;">${s.expectedIncrease || "?"}</td><td style="text-align:right;padding:5px;">${s.spikeProbability || 0}%</td><td style="padding:5px;color:var(--muted-foreground);font-size:10px;">${(s.reason || "").slice(0, 50)}</td></tr>`;
            });
            html += `</table>`;
          }

          // Risk alerts
          if (a.riskAlerts?.length) {
            html += `<div style="margin-top:8px;border-top:1px solid var(--border-strong);padding-top:6px;"><strong style="font-size:11px;">Risk Alerts:</strong>`;
            a.riskAlerts.slice(0, 3).forEach((r: any) => {
              const color = r.severity === "critical" ? "var(--danger)" : r.severity === "warning" ? "var(--warning)" : "var(--info)";
              html += `<p style="color:${color};font-size:11px;margin:3px 0;">${r.message || r.type}</p>`;
            });
            html += `</div>`;
          }

          // Inventory recommendations
          if (a.inventoryRecommendations?.length) {
            html += `<div style="margin-top:8px;border-top:1px solid var(--border-strong);padding-top:6px;"><strong style="font-size:11px;">Stock Actions:</strong>`;
            a.inventoryRecommendations.filter((r: any) => r.action !== "Maintain").slice(0, 5).forEach((r: any) => {
              const color = r.urgency === "High" ? "var(--danger)" : r.urgency === "Medium" ? "var(--warning)" : "var(--success)";
              html += `<p style="font-size:11px;margin:2px 0;"><span style="color:${color};font-weight:bold;">${r.action}</span> ${r.product}: ${r.currentAdvice || ""}</p>`;
            });
            html += `</div>`;
          }

          showPopup({ title: "Demand Spike Analysis", content: html || "<p>No significant spikes detected.</p>" });
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
            showPopup({ title: "Category Analysis", content: `<p style="color:var(--danger);">Error: ${data.error}</p>` });
            return;
          }

          // Response: { analysis: { category, summary, topBrands, products, missingProducts, recommendations }, myProducts }
          const a = data.analysis || {};
          let html = "";

          html += `<div style="margin-bottom:8px;"><strong style="font-size:14px;">${a.category || categoryName || "All"}</strong>
            <span style="margin-left:8px;color:var(--muted-foreground);font-size:11px;">Demand: ${a.totalCategoryDemand || "?"} | Weekly: ~${a.weeklyEstimate || "?"} units</span></div>`;

          if (a.summary) html += `<p style="margin-bottom:10px;color:var(--muted-foreground);font-size:12px;">${a.summary}</p>`;

          // Top brands
          if (a.topBrands?.length) {
            html += `<div style="margin-bottom:8px;"><strong style="font-size:11px;">Top Brands:</strong><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">`;
            a.topBrands.slice(0, 6).forEach((b: any) => {
              html += `<span style="display:inline-block;background:var(--accent-soft);color:var(--accent);padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;">${b.brand} (${b.popularity || "?"}%)</span>`;
            });
            html += `</div></div>`;
          }

          // Products table
          if (a.products?.length) {
            html += `<table style="width:100%;border-collapse:collapse;font-size:11px;">
              <tr style="border-bottom:1px solid var(--border-strong);"><th style="text-align:left;padding:4px;">Product</th><th style="text-align:right;padding:4px;">Daily</th><th style="text-align:center;padding:4px;">Status</th><th style="text-align:right;padding:4px;">Stock</th></tr>`;
            a.products.slice(0, 10).forEach((p: any) => {
              const statusColor = p.stockStatus === "Low" || p.stockStatus === "Out of Stock" ? "var(--danger)" : p.stockStatus === "Sufficient" ? "var(--success)" : "var(--warning)";
              html += `<tr style="border-bottom:1px solid var(--border);"><td style="padding:4px;">${p.name}<br/><span style="color:var(--muted-foreground);font-size:9px;">${p.brand || ""}</span></td><td style="text-align:right;padding:4px;font-weight:bold;">${p.dailyDemand || 0}</td><td style="text-align:center;padding:4px;color:${statusColor};font-size:10px;">${p.stockStatus || "?"}</td><td style="text-align:right;padding:4px;">${p.inMyInventory ? `${p.myStock || 0}${p.myUnit || ""}` : "—"}</td></tr>`;
            });
            html += `</table>`;
          }

          // Missing products
          if (a.missingProducts?.length) {
            html += `<div style="margin-top:6px;"><strong style="font-size:11px;color:var(--warning);">Should Stock:</strong> <span style="font-size:11px;color:var(--muted-foreground);">${a.missingProducts.slice(0, 5).join(", ")}</span></div>`;
          }

          // Recommendations
          if (a.recommendations?.length) {
            html += `<div style="margin-top:6px;border-top:1px solid var(--border-strong);padding-top:4px;">`;
            a.recommendations.slice(0, 3).forEach((r: string) => { html += `<p style="color:var(--muted-foreground);font-size:11px;margin:2px 0;">• ${r}</p>`; });
            html += `</div>`;
          }

          showPopup({ title: `Category: ${a.category || categoryName || "Analysis"}`, content: html });
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
            showPopup({ title: "Stock Alerts", content: "<p style='color:var(--success);text-align:center;padding:20px;'>All clear! No alerts, Sir.</p>" });
            rememberActivity("STOCK_ALERTS", "Stock Alerts Checked", "No urgent stock alerts were found.", { count: 0, summary });
            return;
          }

          let html = "";
          if (summary) {
            html += `<div style="display:flex;gap:12px;margin-bottom:10px;font-size:12px;">
              <span style="color:var(--danger);">Critical: ${summary.critical || 0}</span>
              <span style="color:var(--warning);">Warning: ${summary.warning || 0}</span>
              <span style="color:var(--info);">Info: ${summary.info || 0}</span>
            </div>`;
          }

          html += `<table style="width:100%;border-collapse:collapse;font-size:12px;">
            <tr style="border-bottom:1px solid var(--border-strong);"><th style="text-align:left;padding:5px;">Product</th><th style="text-align:center;padding:5px;">Type</th><th style="text-align:left;padding:5px;">Action</th></tr>`;
          alerts.forEach((a: any) => {
            const color = a.type === "stockout" || a.severity === "critical" ? "var(--danger)" : a.type === "overstock" ? "var(--info)" : "var(--warning)";
            html += `<tr style="border-bottom:1px solid var(--border);"><td style="padding:5px;">${a.productName || a.product_name || a.product || "?"}</td><td style="text-align:center;padding:5px;"><span style="color:${color};font-weight:bold;font-size:10px;text-transform:uppercase;">${a.type || a.severity || "alert"}</span></td><td style="padding:5px;color:var(--muted-foreground);font-size:11px;">${a.action || a.recommendation || a.message || ""}</td></tr>`;
          });
          html += `</table>`;

          showPopup({ title: `Stock Alerts (${alerts.length})`, content: html });
          rememberActivity("STOCK_ALERTS", `Stock Alerts (${alerts.length})`, `${alerts.length} alert signals checked.`, {
            count: alerts.length,
            summary,
          });
          break;
        }

        case "news": {
          showLoading("Fetching Market News...");
          if (!newsRef.current) {
            showPopup({ title: "News & Market Updates", content: "<p style='padding:20px;color:var(--muted-foreground);text-align:center;'>No live news available right now, Sir.</p>" });
            return;
          }
          const allNews = [...(newsRef.current.trending || []), ...(newsRef.current.events || [])].filter((n: any) => n.title && n.link);
          let html = `<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;max-height:400px;overflow-y:auto;padding-right:5px;">`;
          if (allNews.length === 0) {
            html += `<p style='color:var(--muted-foreground);grid-column:1/-1;text-align:center;'>No recent market news found.</p>`;
          } else {
            allNews.forEach(item => {
              html += `<a href="${item.link}" target="_blank" style="display:block;border:1px solid var(--border);border-radius:10px;padding:8px;text-decoration:none;color:inherit;background:var(--card);transition:all 0.2s;">
                ${item.imageUrl ? `<img src="${item.imageUrl}" style="width:100%;height:100px;object-fit:cover;border-radius:4px;margin-bottom:8px;" />` : ''}
                <strong style="font-size:12px;color:var(--accent);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.4;">${item.title}</strong>
                <p style="font-size:10px;color:var(--muted-foreground);margin-top:6px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;line-height:1.4;">${item.snippet || ""}</p>
                <div style="font-size:9px;color:var(--muted-foreground);margin-top:6px;text-align:right;">Read more ↗</div>
              </a>`;
            });
          }
          html += `</div>`;
          showPopup({ title: "Live Market News", content: html });
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
            html += `<p style='color:var(--muted-foreground);grid-column:1/-1;text-align:center;'>No live promotions found right now.</p>`;
          } else {
            offers.forEach((item: any) => {
              html += `<a href="${item.link}" target="_blank" style="display:block;border:1px solid var(--border);border-radius:10px;padding:8px;text-decoration:none;color:inherit;background:var(--card);transition:all 0.2s;">
                ${item.imageUrl ? `<img src="${item.imageUrl}" style="width:100%;height:100px;object-fit:cover;border-radius:4px;margin-bottom:8px;" />` : ''}
                <strong style="font-size:12px;color:var(--accent);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.4;">${item.title}</strong>
                <p style="font-size:10px;color:var(--muted-foreground);margin-top:6px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;line-height:1.4;">${item.snippet || ""}</p>
                <div style="font-size:9px;color:var(--accent);margin-top:6px;text-align:right;">Claim Offer</div>
              </a>`;
            });
          }
          html += `</div>`;
          showPopup({ title: "Live Promotions & Offers", content: html });
          rememberActivity("PROMO_CHECK", "Checked Live Offers", `Found ${offers.length} offers.`);
          break;
        }
      }
    } catch (err: any) {
      showPopup({ title: "Error", content: `<p style="color:var(--danger);">Failed: ${err.message || "Unknown error"}</p>` });
    }
  }, [user, fetchInventory, fetchStoreProfile, fetchWeatherFull, rememberActivity, showPopup]);

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
            showPopup({ title: action.result.title, content: action.result.content });
          }

          if ((action.type === "list" || action.type === "search") && action.result?.data?.length) {
            showInventory(action.result.data);
          }

          if ((action.type === "add" || action.type === "increase" || action.type === "reduce" || action.type === "update" || action.type === "duplicate") && action.result?.data) {
            const item = action.result.data;
            showInventory([item]);
            const verb = action.type === "add" ? "Added" : action.type === "increase" ? "Increased" : action.type === "reduce" ? "Reduced" : action.type === "duplicate" ? "Already in inventory" : "Updated";
            const stockText = `${item.current_stock ?? 0} ${item.unit || "units"}`;
            showPopup({
              title: `${verb}: ${item.product_name}`,
              content: `<div style="font-size:13px;line-height:1.5;">
                <p><strong>${item.product_name}</strong></p>
                <p>Current quantity is <strong style="color:var(--success);">${stockText}</strong>.</p>
                ${action.result.previousQty !== undefined ? `<p style="color:var(--muted-foreground);">Previous quantity: ${action.result.previousQty} ${item.unit || "units"}.</p>` : ""}
              </div>`,
            });
            rememberActivity(
              action.type === "duplicate" ? "INVENTORY_DUPLICATE_CHECK" : "INVENTORY_UPDATED",
              `${verb}: ${item.product_name}`,
              `${item.product_name} current stock is ${stockText}.`,
              { productName: item.product_name, currentStock: item.current_stock, unit: item.unit, actionType: action.type }
            );
          }

          if (action.type === "delete" && !action.result?.error) {
            const deletedName = action.result?.deletedProduct?.product_name || "Product";
            showPopup({
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
  }, [user, speak, unlockAudio, callFeatureAPI, router, lang, triggerJarvisReport, rememberActivity, showPopup, showInventory]);

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
          // "prompt" state — wait for a user gesture. Claiming the microphone
          // and playing a spoken greeting on a 10s timer is not something the
          // visitor asked for; `enableMic` / `wakeUp` do this on request.
          setMicAllowed(null);
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
  // Only start clap detection once mic is already allowed (reuse the existing
  // stream). This effect builds the audio graph and publishes a single
  // detection pass; the rAF loop that drives it lives in the effect below and
  // only runs while Jarvis is asleep, which is the only state that reacts to a
  // clap. Previously the loop rescheduled itself unconditionally and bailed out
  // on the next frame — burning a frame callback for the whole session.
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

        clapTickRef.current = detect;
        clapResetRef.current = () => { clapCount = 0; };
        setClapReady(true);
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
      clapTickRef.current = null;
      clapResetRef.current = null;
      setClapReady(false);
      // Don't stop the shared mic stream — only stop clap-specific resources
      clapCtxRef.current?.close().catch(() => {});
    };
  }, [user, micAllowed]);

  // The rAF loop, started and stopped by state rather than running all session.
  useEffect(() => {
    if (!clapReady || state !== "sleeping") return;
    clapResetRef.current?.();
    let raf = requestAnimationFrame(function loop() {
      clapTickRef.current?.();
      raf = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(raf);
  }, [clapReady, state]);

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

  // Explicit, labelled entry point for the microphone prompt. This used to hang
  // off onClick on the page root, so any click anywhere asked for the mic.
  const enableMic = useCallback(async () => {
    unlockAudio();
    const granted = await requestMicPermission();
    if (granted && !isListeningRef.current) startRecognition();
  }, [unlockAudio, requestMicPermission, startRecognition]);

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
    <div className="h-[calc(100vh-8rem)] max-w-[1400px] mx-auto flex flex-col items-center justify-center relative">
      {/* Context strip · quiet meta, hairline rule */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between gap-3 px-1 py-3 border-b border-border z-10">
        <div className="flex items-center gap-4 min-w-0 text-xs text-muted-foreground">
          {weather && (
            <span className="inline-flex items-center gap-1.5 shrink-0">
              <Cloud className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" />
              <span className="fx-num">{weather.temp}°C</span>, {weather.description}
            </span>
          )}
          {locationName && (
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <MapPin className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              <span className="max-w-[220px] truncate">{locationName}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {state !== "sleeping" && (
            <button
              type="button"
              onClick={state === "paused" ? resumeJarvis : pauseJarvis}
              className="fx-btn"
            >
              {state === "paused" ? <><PlayCircle className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" /> Resume</> : <><PauseCircle className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" /> Pause</>}
            </button>
          )}
          {/* Language selector · a real listbox: arrow keys, Home/End, Escape,
              and focus handed back to the trigger on select. */}
          <div className="relative" ref={langDropdownRef}>
            <button
              type="button"
              ref={langTriggerRef}
              onClick={() => setLangOpen(!langOpen)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setLangOpen(true); }
              }}
              className="fx-btn"
              aria-haspopup="listbox"
              aria-expanded={langOpen}
              aria-label={`Jarvis language: ${LANGUAGES.find(l => l.code === lang)?.name || "English"}`}
            >
              <Globe className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" />
              <span>{LANGUAGES.find(l => l.code === lang)?.nativeName || "English"}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${langOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            {langOpen && (
              <div
                ref={langListRef}
                role="listbox"
                aria-label="Jarvis language"
                className="absolute right-0 top-full mt-1.5 w-44 max-h-64 overflow-y-auto bg-elevated border border-border rounded-[var(--radius-md)] z-50 fx-fade-in"
                style={{ boxShadow: "var(--shadow-md)" }}
                onKeyDown={(e) => {
                  switch (e.key) {
                    case "ArrowDown": e.preventDefault(); moveLangFocus(langActiveIdx + 1); break;
                    case "ArrowUp": e.preventDefault(); moveLangFocus(langActiveIdx - 1); break;
                    case "Home": e.preventDefault(); moveLangFocus(0); break;
                    case "End": e.preventDefault(); moveLangFocus(LANGUAGES.length - 1); break;
                    case "Escape": e.preventDefault(); e.stopPropagation(); closeLangMenu(); break;
                    case "Tab": setLangOpen(false); break;
                  }
                }}
              >
                {LANGUAGES.map((l, i) => (
                  <button key={l.code}
                    type="button"
                    role="option"
                    aria-selected={lang === l.code}
                    tabIndex={langActiveIdx === i ? 0 : -1}
                    onClick={() => { setLang(l.code); closeLangMenu(); }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs hover:bg-secondary transition-colors fx-focus ${
                      lang === l.code ? "bg-[var(--accent-soft)] text-accent font-semibold" : "text-foreground"
                    }`}>
                    <span>{l.flag} {l.nativeName}</span>
                    <span className="text-muted-foreground text-[10px]">{l.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={() => { setVoiceEnabled(!voiceEnabled); if (isSpeakingRef.current) stopSpeaking(); }}
            className="fx-icon-btn"
            style={voiceEnabled ? { color: "var(--accent)" } : undefined}
            aria-label={voiceEnabled ? "Mute voice output" : "Enable voice output"}
            aria-pressed={voiceEnabled}>
            {voiceEnabled ? <Volume2 className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> : <VolumeX className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />}
          </button>
          {/* The one control that asks for the microphone */}
          {micAllowed !== true && (
            <button type="button" onClick={enableMic} className="fx-btn">
              <Mic className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" /> Enable microphone
            </button>
          )}
          {/* Initialize Jarvis Button Top Right */}
          {(state === "sleeping" || state === "paused") && (
            <button type="button" onClick={wakeUp} className="fx-btn fx-btn-accent">
              <Zap className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" /> Initialize
            </button>
          )}
        </div>
      </div>

      {/* Central stage */}
      <div className="flex flex-col items-center gap-7 z-10 w-full relative">
        {user && <ClapDetector onClap={() => {
          if (state === "sleeping" || state === "paused") wakeUp();
        }} enabled={!["listening", "speaking", "thinking"].includes(state)} />}

        <AiOrb
          state={state}
          onClick={state === "sleeping" || state === "paused" ? wakeUp : stopSpeaking}
          actionLabel={
            state === "sleeping" ? "Wake Jarvis and start listening"
              : state === "paused" ? "Resume Jarvis"
              : "Stop Jarvis speaking"
          }
        />

        <div className="text-center">
          <h1 className={`fx-display text-[26px] leading-tight transition-colors duration-200 ${["sleeping","paused"].includes(state) ? "text-muted-foreground" : "text-foreground"}`}>J.A.R.V.I.S.</h1>
          <p className="fx-eyebrow mt-2 flex items-center justify-center gap-2 flex-wrap">
            Your personal store assistant
            <span className="fx-badge fx-badge-accent">
              {LANGUAGES.find(l => l.code === lang)?.nativeName || "English"}
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {metrics.storeName} · <span className="fx-num">{metrics.skuCount}</span> SKUs · event {metrics.festival}
          </p>
        </div>

        {/* User transcript · the shopkeeper's voice, set apart in serif italic.
            A voice assistant that never speaks to a screen reader is unusable,
            so both sides of the conversation are live regions. */}
        <div role="status" aria-live="polite" aria-atomic="true" className="w-full flex flex-col items-center empty:hidden">
          {state === "listening" && transcript && (
            <div className="max-w-lg text-center fx-fade-in">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="fx-signal fx-signal-accent" aria-hidden="true" />
                <span className="fx-eyebrow" style={{ color: "var(--accent)" }}>Listening</span>
              </div>
              <p className="fx-display text-[19px] italic text-foreground leading-snug">&quot;{transcript}&quot;</p>
            </div>
          )}
        </div>

        {/* Jarvis response · reads like a briefing */}
        <div role="status" aria-live="polite" aria-atomic="true" className="w-full flex flex-col items-center empty:hidden">
          {["speaking", "idle", "thinking", "paused"].includes(state) && jarvisText && (
            <div className="max-w-xl w-full fx-fade-in px-4">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="fx-signal fx-signal-accent" aria-hidden="true" />
                <span className="fx-eyebrow">Jarvis</span>
              </div>
              <p className="text-[15px] text-foreground leading-relaxed border-l border-border pl-4">
                <Typewriter text={jarvisText} caret={state === "speaking"} />
              </p>
            </div>
          )}
        </div>

        {/* Thinking */}
        {state === "thinking" && !jarvisText && (
          <div className="flex items-center gap-3 fx-fade-in" role="status" aria-live="polite" aria-atomic="true">
            <div className="flex gap-1.5" aria-hidden="true">
              <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--muted-foreground)", animationDelay: "0ms" }} />
              <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--muted-foreground)", animationDelay: "150ms" }} />
              <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--muted-foreground)", animationDelay: "300ms" }} />
            </div>
            <span className="text-sm text-muted-foreground font-medium">{LANG_STATUS[lang]?.thinking || "Jarvis is thinking..."}</span>
          </div>
        )}

        {/* Sleeping / Paused CTA + Features */}
        {(state === "sleeping" || state === "paused") && !jarvisText && (
          <div className="text-center fx-fade-in max-w-2xl">
            <p className="text-sm text-muted-foreground mb-5">
              {state === "paused" ? "Jarvis is paused. Click resume or the orb to continue." :
                micAllowed === false ? (
                  <span className="flex flex-col items-center gap-2 text-danger" role="alert">
                    <span className="font-medium">Microphone access denied.</span>
                    <span className="text-xs text-muted-foreground">Click the lock/site-settings icon in Chrome&apos;s address bar → Allow Microphone → Reload the page</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2 flex-wrap"><Mic className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" /> Say <strong className="text-foreground">&quot;Hey Jarvis&quot;</strong>, double clap, or click below <span className="text-xs"> ({LANGUAGES.find(l => l.code === lang)?.nativeName || "EN"})</span></span>
                )
              }
            </p>
            <button type="button" onClick={wakeUp} className="fx-btn fx-btn-accent mx-auto mb-8">
              <Zap className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> {state === "paused" ? "Resume Jarvis" : "Initialize Jarvis"}
            </button>
          </div>
        )}

        {/* Quick actions */}
        {state === "idle" && (
          <div className="flex flex-col items-center gap-4 max-w-2xl fx-fade-in">
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
                  type="button"
                  onClick={() => {
                    if (action.label.includes("inventory")) sendToJarvis("show my inventory");
                    else if (action.label.includes("Product")) sendToJarvis("analyze product Milk");
                    else if (action.label.includes("demand")) sendToJarvis("demand spikes analysis");
                    else if (action.label.includes("Category")) sendToJarvis("category analysis for Snacks");
                    else if (action.label.includes("alerts")) sendToJarvis("show stock alerts");
                    else sendToJarvis(action.label);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-[var(--radius-md)] bg-card text-xs text-secondary-foreground hover:bg-secondary hover:text-foreground hover:border-border-strong transition-colors fx-focus">
                  <action.icon className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" /> {action.label}
                </button>
              ))}
            </div>

            {/* Quick Test Buttons */}
            <div className="w-full">
              <button type="button" onClick={() => setShowTestQueries(!showTestQueries)}
                className="flex items-center gap-1.5 mx-auto px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground rounded-[var(--radius-md)] hover:bg-secondary transition-colors fx-focus"
                aria-expanded={showTestQueries}>
                <TestTube className="w-3 h-3" strokeWidth={1.8} aria-hidden="true" /> Test Language Queries
                <ChevronDown className={`w-3 h-3 transition-transform ${showTestQueries ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              {showTestQueries && (
                <div className="flex flex-wrap justify-center gap-2 mt-3 fx-fade-in">
                  {TEST_QUERIES.map(tq => (
                    <button key={tq.code}
                      type="button"
                      onClick={() => {
                        setLang(tq.code);
                        setTimeout(() => sendToJarvis(tq.query), 150);
                      }}
                      className="fx-card fx-card-interactive flex flex-col items-start px-3 py-2 text-left max-w-[200px] cursor-pointer fx-focus">
                      <span className="text-[10px] font-semibold text-accent mb-0.5">{tq.label}</span>
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
        <div className="fixed top-24 right-6 z-40 w-[360px] max-w-[calc(100vw-2rem)] bg-elevated border border-border rounded-[var(--radius-lg)] overflow-hidden fx-fade-in" style={{ boxShadow: "var(--shadow-lg)" }}>
          <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border">
            <div>
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-accent" strokeWidth={1.8} aria-hidden="true" /> {reportCard.title}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 fx-num">
                {new Date(reportCard.generatedAt).toLocaleString("en-IN")} · {reportCard.activityCount || localActivities.length} recent actions
              </p>
            </div>
            <button type="button" onClick={() => setReportCard(null)} className="fx-icon-btn shrink-0 -mr-2 -mt-1" aria-label="Close report card"><X className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /></button>
          </div>
          <div
            className="p-4 max-h-[320px] overflow-y-auto text-xs leading-relaxed text-secondary-foreground [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-accent [&_p]:mb-2 [&_ul]:list-disc [&_ul]:ml-4 [&_li]:mb-1"
            dangerouslySetInnerHTML={{ __html: reportCard.reportHtml }}
          />
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border">
            <span className="text-[10px] text-muted-foreground">Voice: “Jarvis give me today&apos;s report”</span>
            <button
              type="button"
              onClick={() => downloadReportCard(reportCard)}
              className="fx-btn fx-btn-accent"
            >
              <Download className="w-3 h-3" strokeWidth={1.8} aria-hidden="true" /> PDF
            </button>
          </div>
        </div>
      )}

      {/* Feature Popup */}
      {popup && (
        <section
          aria-label={popup.title}
          aria-busy={popup.loading || undefined}
          className="fixed top-4 right-4 z-50 fx-fade-in w-[480px] max-w-[calc(100vw-2rem)] max-h-[75vh] bg-elevated border border-border rounded-[var(--radius-lg)] overflow-hidden"
          style={{ boxShadow: "var(--shadow-lg)" }}
          /* Pointer AND keyboard both suspend the countdown. onFocus/onBlur are
             React's bubbling focusin/focusout, so tabbing in counts. */
          onMouseEnter={() => setPopupHeld(true)}
          onMouseLeave={() => setPopupHeld(false)}
          onFocus={() => setPopupHeld(true)}
          onBlur={() => setPopupHeld(false)}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2 min-w-0">
              {popup.loading ? <Loader2 className="w-3.5 h-3.5 text-accent animate-spin shrink-0" strokeWidth={1.8} aria-hidden="true" /> : <Zap className="w-3.5 h-3.5 text-accent shrink-0" strokeWidth={1.8} aria-hidden="true" />}
              <span className="truncate">{popup.title}</span>
            </h3>
            <div className="flex items-center gap-1 shrink-0">
              {!popup.loading && (
                <button
                  type="button"
                  onClick={() => setPopupPinned(p => !p)}
                  aria-pressed={popupPinned}
                  className="fx-btn fx-btn-ghost text-[11px]"
                >
                  Keep open
                </button>
              )}
              <button type="button" onClick={() => setPopup(null)} className="fx-icon-btn" aria-label={`Close ${popup.title}`}><X className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /></button>
            </div>
          </div>
          <div className="p-4 overflow-y-auto max-h-[60vh] text-sm text-secondary-foreground leading-relaxed [&_table]:w-full [&_th]:text-left [&_th]:text-muted-foreground [&_th]:font-semibold [&_td]:text-secondary-foreground" dangerouslySetInnerHTML={{ __html: popup.content }} />
          {/* Rendered only while the dismissal timer is genuinely running */}
          {!popupHeld && !popupPinned && !popup.loading && (
            <div className="fx-countdown" aria-hidden="true" style={{ "--fx-countdown-duration": `${POPUP_DISMISS_MS}ms` } as CSSProperties}>
              <span />
            </div>
          )}
        </section>
      )}

      {/* Inventory popup */}
      {inventoryPopup && (
        <section
          aria-label="Inventory"
          className="fixed top-4 right-4 z-50 fx-fade-in w-[520px] max-w-[calc(100vw-2rem)] max-h-[75vh] bg-elevated border border-border rounded-[var(--radius-lg)] overflow-hidden"
          style={{ boxShadow: "var(--shadow-lg)" }}
          onMouseEnter={() => setInvHeld(true)}
          onMouseLeave={() => setInvHeld(false)}
          onFocus={() => setInvHeld(true)}
          onBlur={() => setInvHeld(false)}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-accent" strokeWidth={1.8} aria-hidden="true" /> Inventory
            </h3>
            <div className="flex items-center gap-1 shrink-0">
              {/* Scale utilities instead of one-off inline padding/font-size */}
              <select
                value={invFilter}
                onChange={e => setInvFilter(e.target.value as any)}
                className="fx-input w-auto px-2 py-1.5 text-xs"
                aria-label="Filter inventory"
              >
                <option value="all">All Items</option>
                <option value="low">Low Stock (≤5)</option>
                <option value="over">Overstock (≥150)</option>
              </select>
              <button
                type="button"
                onClick={() => setInvPinned(p => !p)}
                aria-pressed={invPinned}
                className="fx-btn fx-btn-ghost text-[11px]"
              >
                Keep open
              </button>
              <button type="button" onClick={() => setInventoryPopup(null)} className="fx-icon-btn" aria-label="Close inventory panel"><X className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /></button>
            </div>
          </div>
          <div className="fx-table-scroll max-h-[60vh]">
            <table className="fx-table">
              <caption className="fx-sr-only">Current inventory with stock quantity, price, and stock status per product.</caption>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Product</th>
                  <th scope="col">Category</th>
                  <th scope="col" className="text-right">Qty</th>
                  <th scope="col" className="text-right">Price</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {inventoryPopup
                  .filter(i => invFilter === "all" ? true : invFilter === "low" ? i.current_stock <= 5 : i.current_stock >= 150)
                  .map((item: any, i: number) => {
                  const status = item.current_stock <= 5 ? { signal: "fx-signal-danger", label: "Low" }
                    : item.current_stock >= 150 ? { signal: "fx-signal-warning", label: "Over" }
                    : { signal: "fx-signal-success", label: "OK" };
                  return (
                  <tr key={i}>
                    <td className="text-muted-foreground fx-num">{i + 1}</td>
                    <td>
                      <p className="font-medium text-foreground">{item.product_name}</p>
                      {item.brand && <p className="text-muted-foreground text-[10px]">{item.brand}</p>}
                    </td>
                    <td className="text-xs text-muted-foreground">{item.category}</td>
                    <td className="text-right fx-num font-semibold text-foreground">{item.current_stock} <span className="text-muted-foreground font-normal">{item.unit || "pcs"}</span></td>
                    <td className="text-right fx-num text-foreground">₹{item.price}</td>
                    <td>
                      {/* Written status alongside the dot — hue alone is not the
                          encoding, and aria-label on a role-less span is dropped */}
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        <span className={`fx-signal ${status.signal}`} aria-hidden="true" />
                        <span className="text-[11px] text-secondary-foreground">{status.label}</span>
                      </span>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!invHeld && !invPinned && (
            <div className="fx-countdown" aria-hidden="true" style={{ "--fx-countdown-duration": `${POPUP_DISMISS_MS}ms` } as CSSProperties}>
              <span />
            </div>
          )}
        </section>
      )}

      {/* Bottom status rail · hairline rule, quiet signal */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-3 px-1 py-3 border-t border-border z-10">
        {/* Mic / listening state — the assistant's only ambient status, so it
            gets announced rather than sitting there silently. */}
        <div role="status" aria-live="polite" aria-atomic="true" className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className={`fx-signal ${
            micAllowed === false ? "fx-signal-danger"
              : state === "listening" || state === "speaking" ? "fx-signal-accent"
              : state === "paused" ? "fx-signal-warning"
              : ""
          }`} aria-hidden="true" />
          <Mic className={`w-3.5 h-3.5 ${micAllowed === false ? "text-danger" : ""}`} strokeWidth={1.8} aria-hidden="true" />
          <span className={micAllowed === false ? "text-danger" : state === "listening" || state === "speaking" ? "text-foreground" : ""}>
            {micAllowed === false ? "Mic blocked — allow in browser"
              : state === "listening" ? (LANG_STATUS[lang]?.listening || "Listening...")
              : state === "speaking" ? (LANG_STATUS[lang]?.speaking || "Speaking...")
              : state === "paused" ? "Paused — 60s auto-resume"
              : state === "sleeping" ? "Click, say \"Hey Jarvis\", or double clap"
              : "Always listening · double clap wake"}
          </span>
        </div>

        {/* Live status */}
        {state !== "sleeping" && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <span className="fx-signal fx-signal-accent" aria-hidden="true" />
            Jarvis online · always listening · double clap wake
          </span>
        )}
      </div>
    </div>
  );
}
