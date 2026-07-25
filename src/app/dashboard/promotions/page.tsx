"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { BadgePercent, Cloud, Download, ExternalLink, Loader2, MapPin, RefreshCw, Search, Store } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Signal = { title: string; snippet: string; link: string; imageUrl?: string };

export default function PromotionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<any>(null);
  const [weather, setWeather] = useState<any>(null);
  const [location, setLocation] = useState("");
  const [signals, setSignals] = useState<{ offers: Signal[]; promotions: Signal[]; news: Signal[] }>({ offers: [], promotions: [], news: [] });
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  async function loadPromotions(searchTerm = query) {
    if (authLoading) return;
    if (!user?.id) {
      setLoading(false);
      setError("Please sign in to load store-aware promotions.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("store_name, store_category, city, state, store_address")
        .eq("id", user.id)
        .maybeSingle();
      setStore(profile);

      let resolvedLocation = [profile?.city, profile?.state].filter(Boolean).join(", ");
      let currentWeather: any = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 7000 })
        );
        const [locRes, weatherRes] = await Promise.all([
          fetch(`/api/location?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`),
          fetch(`/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`),
        ]);
        if (locRes.ok) {
          const loc = await locRes.json();
          resolvedLocation = loc.formattedAddress || [loc.city, loc.state].filter(Boolean).join(", ") || resolvedLocation;
        }
        if (weatherRes.ok) {
          const w = await weatherRes.json();
          currentWeather = w.current;
          setWeather(w.current);
        }
      } catch {
        resolvedLocation = profile?.store_address || resolvedLocation;
      }
      setLocation(resolvedLocation);

      const query = [
        searchTerm.trim(),
        profile?.store_category || "Grocery supermarket",
        profile?.city,
        profile?.state,
        currentWeather?.description ? `${currentWeather.description} weather` : "",
        "FMCG grocery wholesale distributor promotion offers",
      ].filter(Boolean).join(" ");
      const promoRes = await fetch("/api/search-promos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await promoRes.json();
      if (!promoRes.ok) throw new Error(data.error || "Promotion fetch failed");
      setSignals({ offers: data.offers || [], promotions: data.promotions || [], news: data.news || [] });
    } catch (err: any) {
      setError(err.message || "Unable to load promotions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPromotions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  const basePromos = [...signals.offers, ...signals.promotions, ...signals.news];
  const promoBoosters: Signal[] = [
    "Dairy and beverages", "Biscuits and snacks", "Staples and grains", "Tea and breakfast",
    "Instant food", "Personal care", "Household care", "Masala and spices", "Pulses and dals",
    "Packaged water", "Ready-to-cook", "Festival baskets",
  ].map((category) => ({
    title: `${category} promotion plan`,
    snippet: `${store?.store_name || "This store"} can use ${category.toLowerCase()} for a local promotion in ${location || "the current area"} after checking stock level, margin, expiry, and today's weather.`,
    link: "#",
  })).slice(0, Math.max(0, 24 - basePromos.length));
  const allPromos = [...basePromos, ...promoBoosters].slice(0, 24);

  function downloadPdfFile(title: string, items: Signal[]) {
    const escapePdf = (value: string) => value.replace(/[^\x20-\x7E]/g, " ").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    const wrap = (value: string, max: number) => {
      const words = value.replace(/\s+/g, " ").trim().split(" ");
      const lines: string[] = [];
      let line = "";
      for (const word of words) {
        if ((line + " " + word).trim().length > max) {
          if (line) lines.push(line);
          line = word;
        } else line = `${line} ${word}`.trim();
      }
      if (line) lines.push(line);
      return lines.slice(0, 3);
    };
    const text = (x: number, y: number, size: number, value: string) => `BT /F1 ${size} Tf ${x} ${y} Td (${escapePdf(value)}) Tj ET\n`;
    const pages: string[] = [];
    let content = "30 30 535 782 re S\n";
    let y = 782;
    content += text(42, y, 18, title);
    y -= 20;
    content += text(42, y, 10, `${store?.store_name || "Store"} | ${location || "Location unavailable"} | ${new Date().toLocaleString("en-IN")}`);
    y -= 24;
    items.forEach((item, index) => {
      if (y < 96) {
        pages.push(content);
        content = "30 30 535 782 re S\n";
        y = 782;
        content += text(42, y, 14, `${title} continued`);
        y -= 28;
      }
      content += `40 ${y - 62} 515 56 re S\n`;
      content += text(50, y - 16, 11, `${index + 1}. ${item.title}`.slice(0, 92));
      wrap(item.snippet || "No summary available.", 94).forEach((line, lineIndex) => {
        content += text(58, y - 32 - lineIndex * 11, 9, line);
      });
      y -= 70;
    });
    content += text(42, 44, 8, "Forecastify confidential report");
    pages.push(content);

    const objects: string[] = [];
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = `<< /Type /Pages /Kids [${pages.map((_, i) => `${4 + i * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`;
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    pages.forEach((page, i) => {
      const pageObj = 4 + i * 2;
      const contentObj = pageObj + 1;
      objects[pageObj] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObj} 0 R >>`;
      objects[contentObj] = `<< /Length ${page.length} >>\nstream\n${page}endstream`;
    });
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    for (let i = 1; i < objects.length; i++) {
      offsets[i] = pdf.length;
      pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xrefAt = pdf.length;
    pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < objects.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function downloadPDF() {
    downloadPdfFile("Forecastify Promotions Report", allPromos);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-3 rounded-2xl border border-pink-500/40 bg-pink-500/10 px-5 py-3 shadow-[0_0_30px_rgba(236,72,153,0.28)]">
            <BadgePercent className="w-8 h-8 text-pink-400" />
            <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">Promotions</h1>
          </div>
          <p className="text-muted-foreground mt-3 text-base">Store-aware offers and campaigns using your type, location, and weather.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => loadPromotions(query)} disabled={loading} className="px-4 py-2 rounded-xl bg-secondary text-foreground text-sm font-semibold flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Refresh
          </button>
          <button onClick={downloadPDF} className="px-4 py-2 rounded-xl bg-pink-500/10 text-pink-600 text-sm font-semibold flex items-center gap-2"><Download className="w-4 h-4" /> PDF</button>
        </div>
      </div>

      <div className="bg-card border border-pink-500/30 rounded-2xl p-4 shadow-[0_0_24px_rgba(236,72,153,0.12)]">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void loadPromotions(query); }}
              placeholder="Search promotions by product, category, supplier, brand, or season..."
              className="w-full pl-11 pr-4 py-3 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-pink-500/40"
            />
          </div>
          <button onClick={() => loadPromotions(query)} disabled={loading} className="px-5 py-3 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Search
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-card border border-pink-500/30 rounded-2xl p-5 shadow-[0_0_22px_rgba(236,72,153,0.16)]"><Store className="w-5 h-5 text-pink-500 mb-3" /><p className="font-bold text-lg">{store?.store_name || "Store"}</p><p className="text-sm text-muted-foreground">{store?.store_category || "Grocery & Supermarket"}</p></div>
        <div className="bg-card border border-blue-500/30 rounded-2xl p-5 shadow-[0_0_22px_rgba(59,130,246,0.14)]"><MapPin className="w-5 h-5 text-blue-500 mb-3" /><p className="font-bold text-base">{location || "Detecting location"}</p><p className="text-sm text-muted-foreground mt-1">Used for local offer relevance</p></div>
        <div className="bg-card border border-orange-500/30 rounded-2xl p-5 shadow-[0_0_22px_rgba(249,115,22,0.14)]"><Cloud className="w-5 h-5 text-orange-500 mb-3" /><p className="font-bold text-lg">{weather ? `${weather.temp}C, ${weather.description}` : "Weather unavailable"}</p><p className="text-sm text-muted-foreground">Used for weather-sensitive promos</p></div>
      </div>

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>}
      {loading ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-pink-500 mx-auto mb-3" /><p className="text-muted-foreground">Fetching live promotions...</p></div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-pink-500/30 bg-pink-500/10 px-5 py-4 shadow-[0_0_24px_rgba(236,72,153,0.18)]">
            <h2 className="text-xl font-black text-foreground">Highlighted Promotion Opportunities</h2>
            <span className="text-sm font-semibold text-pink-400">{allPromos.length} cards</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {allPromos.map((item, index) => {
              const validLink = item.link && item.link !== "#" ? item.link : undefined;

              return (
              <a key={index} href={validLink} target={validLink ? "_blank" : undefined} rel={validLink ? "noopener noreferrer" : undefined} className={`group min-h-[220px] bg-card border border-pink-500/30 rounded-2xl p-6 shadow-[0_0_24px_rgba(236,72,153,0.14)] transition-all ${validLink ? "hover:shadow-[0_0_36px_rgba(236,72,153,0.28)] hover:border-pink-400/70 cursor-pointer" : "cursor-default opacity-90"}`}>
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="mb-4 h-36 w-full rounded-xl object-cover border border-pink-500/20 bg-secondary" loading="lazy" />
                )}
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-full bg-pink-500/15 px-3 py-1 text-xs font-bold text-pink-400">PROMO #{index + 1}</span>
                  {validLink && <ExternalLink className="w-4 h-4 text-pink-400 opacity-70 group-hover:opacity-100" />}
                </div>
                <p className="text-base font-bold text-foreground line-clamp-3">{item.title}</p>
                <p className="text-sm text-muted-foreground mt-3 line-clamp-5">{item.snippet}</p>
              </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
