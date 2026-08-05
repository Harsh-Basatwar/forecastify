"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { BadgePercent, Cloud, Download, ExternalLink, Loader2, MapPin, RefreshCw, Search, Store } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Signal = { title: string; snippet: string; link: string; imageUrl?: string };

function sourceOf(link?: string) {
  if (!link || link === "#") return null;
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// Skeleton mirrors the promotion-list layout to prevent shift
function PromotionsSkeleton() {
  return (
    <div className="fx-card" aria-busy="true" aria-label="Loading promotion signals">
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
        <div className="skeleton-shimmer h-4 w-56" />
        <div className="skeleton-shimmer h-3 w-16" />
      </div>
      <div className="px-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="py-4 border-b border-border last:border-b-0 space-y-2.5">
            <div className="skeleton-shimmer h-4 w-2/3" />
            <div className="skeleton-shimmer h-3 w-full" />
            <div className="skeleton-shimmer h-3 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}

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
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">

      {/* ── Page lead · editorial, no card ─────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div className="min-w-0">
          <p className="fx-eyebrow flex items-center gap-1.5">
            <BadgePercent className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> Market Intelligence
          </p>
          <h1 className="fx-display text-[26px] sm:text-[30px] leading-tight text-foreground mt-2">Promotions</h1>
          <p className="text-[13px] text-muted-foreground mt-1.5">Store-aware offers and campaigns using your type, location, and weather.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => loadPromotions(query)} disabled={loading} className="fx-btn">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" /> Refresh
          </button>
          <button onClick={downloadPDF} className="fx-btn">
            <Download className="w-3.5 h-3.5" aria-hidden="true" /> PDF
          </button>
        </div>
      </div>

      {/* ── Store context · one sheet, hairline-divided ────────── */}
      <section aria-label="Store context" className="fx-card grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)] overflow-hidden">
        <div className="p-5 flex items-start gap-3">
          <Store className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden="true" strokeWidth={1.8} />
          <div className="min-w-0">
            <p className="fx-eyebrow">Store</p>
            <p className="text-sm font-medium text-foreground mt-1 truncate">{store?.store_name || "Store"}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{store?.store_category || "Grocery & Supermarket"}</p>
          </div>
        </div>
        <div className="p-5 flex items-start gap-3">
          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden="true" strokeWidth={1.8} />
          <div className="min-w-0">
            <p className="fx-eyebrow">Location</p>
            <p className="text-sm font-medium text-foreground mt-1 truncate">{location || "Detecting location"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Used for local offer relevance</p>
          </div>
        </div>
        <div className="p-5 flex items-start gap-3">
          <Cloud className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden="true" strokeWidth={1.8} />
          <div className="min-w-0">
            <p className="fx-eyebrow">Weather</p>
            <p className="text-sm font-medium text-foreground mt-1 truncate">{weather ? `${weather.temp}C, ${weather.description}` : "Weather unavailable"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Used for weather-sensitive promos</p>
          </div>
        </div>
      </section>

      {/* ── Search ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void loadPromotions(query); }}
            placeholder="Search promotions by product, category, supplier, brand, or season..."
            aria-label="Search promotions"
            className="fx-input pl-9"
          />
        </div>
        <button onClick={() => loadPromotions(query)} disabled={loading} className="fx-btn fx-btn-accent sm:shrink-0">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Search className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} />} Search
        </button>
      </div>

      {error && (
        <div role="alert" className="bg-danger-soft border border-danger/25 text-danger rounded-[var(--radius-md)] px-4 py-3 text-sm flex items-center justify-between gap-3 flex-wrap">
          <span>{error}</span>
          <button onClick={() => loadPromotions(query)} className="fx-btn">Retry</button>
        </div>
      )}

      {/* ── Promotion ledger ────────────────────────────────────── */}
      {loading ? (
        <PromotionsSkeleton />
      ) : (
        <section aria-label="Promotion signals" className="fx-card">
          <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-4 border-b border-border">
            <h2 className="fx-display text-[17px] text-foreground">Highlighted Promotion Opportunities</h2>
            <span className="text-xs text-muted-foreground">
              <span className="fx-num font-semibold text-foreground">{allPromos.length}</span> signals
            </span>
          </div>

          {allPromos.length === 0 ? (
            <div className="text-center py-10 px-6">
              <BadgePercent className="w-5 h-5 text-muted-foreground mx-auto mb-3 opacity-50" aria-hidden="true" strokeWidth={1.8} />
              <p className="text-sm text-secondary-foreground font-medium">No promotion signals right now</p>
              <p className="text-xs text-muted-foreground mt-1">Try a different search term or refresh to fetch the latest offers.</p>
            </div>
          ) : (
            <div className="px-6">
              {allPromos.map((item, index) => {
                const validLink = item.link && item.link !== "#" ? item.link : undefined;
                const source = sourceOf(validLink);

                return (
                  <a
                    key={index}
                    href={validLink}
                    target={validLink ? "_blank" : undefined}
                    rel={validLink ? "noopener noreferrer" : undefined}
                    className={`group flex items-start gap-4 py-4 border-b border-border last:border-b-0 fx-focus ${validLink ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <span className="fx-num text-[11px] text-muted-foreground w-6 pt-0.5 text-right shrink-0" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt="" className="w-16 h-12 rounded-[var(--radius-sm)] object-cover border border-border bg-secondary shrink-0" loading="lazy" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium text-foreground leading-snug line-clamp-2 transition-colors ${validLink ? "group-hover:text-accent" : ""}`}>
                        {item.title}
                      </p>
                      <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">{item.snippet}</p>
                      <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1.5">
                        <span className={`fx-signal ${validLink ? "fx-signal-accent" : ""}`} aria-hidden="true" />
                        <span className="truncate">{source || "Store-derived signal"}</span>
                      </p>
                    </div>
                    {validLink && (
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity shrink-0 mt-1" aria-hidden="true" strokeWidth={1.8} />
                    )}
                  </a>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
