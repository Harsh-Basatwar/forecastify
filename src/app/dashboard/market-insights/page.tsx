"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { BadgePercent, Download, ExternalLink, Loader2, Search, Tag } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

type OfferItem = { title: string; snippet: string; link: string; imageUrl?: string };
type OfferResults = { offers: OfferItem[]; promotions: OfferItem[]; news: OfferItem[] };

const BOOSTER_CATEGORIES = [
  "Dairy beverages", "Biscuits snacks", "Staples grains", "Tea breakfast",
  "Instant food", "Personal care", "Household care", "Masala spices",
  "Pulses dals", "Packaged water", "Ready-to-cook", "Festival baskets",
];

function sourceOf(link?: string) {
  if (!link || link === "#") return null;
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// Skeleton mirrors the deal-list layout to prevent shift
function OffersSkeleton() {
  return (
    <div className="fx-card" aria-busy="true" aria-label="Loading offers and deals">
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
        <div className="skeleton-shimmer h-4 w-52" />
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

export default function MarketInsightsPage() {
  const { user, loading: authLoading } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OfferResults>({ offers: [], promotions: [], news: [] });
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeQuery, setActiveQuery] = useState("grocery FMCG offers");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase.from("inventory").select("category").eq("store_id", user.id);
      const unique = [...new Set((data || []).map((r: any) => r.category).filter(Boolean))].slice(0, 12);
      setCategories(unique);
    })();
  }, [user?.id]);

  async function searchOffers(searchTerm = query || activeQuery) {
    if (authLoading) return;
    const finalQuery = searchTerm.trim() || "grocery FMCG offers";
    setLoading(true);
    setError("");
    setActiveQuery(finalQuery);
    try {
      const res = await fetch("/api/search-promos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: finalQuery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Offers fetch failed");
      setResults({ offers: data.offers || [], promotions: data.promotions || [], news: data.news || [] });
    } catch (err: any) {
      setError(err.message || "Unable to load offers and deals.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading) void searchOffers(activeQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  const baseCards = [...results.offers, ...results.promotions, ...results.news];
  const boosters: OfferItem[] = BOOSTER_CATEGORIES.map(category => ({
    title: `${category} deal opportunity`,
    snippet: `Check supplier schemes, display offers, expiry terms, and margin before running a ${category.toLowerCase()} deal for your store.`,
    link: "#",
  })).slice(0, Math.max(0, 24 - baseCards.length));
  const cards = [...baseCards, ...boosters].slice(0, 24);

  function downloadPDF() {
    const escapePdf = (value: string) => value.replace(/[^\x20-\x7E]/g, " ").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    const text = (x: number, y: number, size: number, value: string) => `BT /F1 ${size} Tf ${x} ${y} Td (${escapePdf(value)}) Tj ET\n`;
    let content = "30 30 535 782 re S\n";
    let y = 780;
    content += text(42, y, 18, "Forecastify Offers and Deals Report");
    y -= 20;
    content += text(42, y, 10, `Search: ${activeQuery} | ${new Date().toLocaleString("en-IN")}`);
    y -= 28;
    cards.forEach((item, index) => {
      if (y < 70) return;
      content += `40 ${y - 52} 515 48 re S\n`;
      content += text(50, y - 16, 11, `${index + 1}. ${item.title}`.slice(0, 92));
      content += text(58, y - 32, 9, (item.snippet || "No summary available.").replace(/\s+/g, " ").slice(0, 118));
      y -= 60;
    });
    const objects = [
      "",
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [4 0 R] /Count 1 >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents 5 0 R >>",
      `<< /Length ${content.length} >>\nstream\n${content}endstream`,
    ];
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
    const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `offers-deals-${new Date().toISOString().slice(0, 10)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">

      {/* ── Page lead · editorial, no card ─────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div className="min-w-0">
          <p className="fx-eyebrow flex items-center gap-1.5">
            <BadgePercent className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> Market Intelligence
          </p>
          <h1 className="fx-display text-[26px] sm:text-[30px] leading-tight text-foreground mt-2">Offers &amp; Deals</h1>
          <p className="text-[13px] text-muted-foreground mt-1.5">Live offer, distributor, promotion, and market deal signals for your grocery store.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={downloadPDF} className="fx-btn">
            <Download className="w-3.5 h-3.5" aria-hidden="true" /> PDF
          </button>
        </div>
      </div>

      {/* ── Search + category rail ──────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void searchOffers(query); }}
              placeholder="Search offers by product, category, supplier, brand, or festival..."
              aria-label="Search offers"
              className="fx-input pl-9"
            />
          </div>
          <button onClick={() => searchOffers(query)} disabled={loading} className="fx-btn fx-btn-accent sm:shrink-0">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Search className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} />} Search
          </button>
        </div>
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1 mr-1">
              <Tag className="w-3 h-3" aria-hidden="true" strokeWidth={1.8} /> Your categories:
            </span>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => { setQuery(cat); void searchOffers(cat); }}
                className="px-2.5 py-1 rounded-[var(--radius-sm)] text-xs font-medium bg-secondary text-secondary-foreground border border-transparent hover:border-border-strong hover:text-foreground transition-colors fx-focus"
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="bg-danger/8 border border-danger/25 text-danger rounded-[var(--radius-md)] px-4 py-3 text-sm flex items-center justify-between gap-3 flex-wrap">
          <span>{error}</span>
          <button onClick={() => searchOffers(query)} className="fx-btn">Retry</button>
        </div>
      )}

      {/* ── Deal ledger ─────────────────────────────────────────── */}
      {loading ? (
        <OffersSkeleton />
      ) : (
        <section aria-label="Offers and deals" className="fx-card">
          <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-4 border-b border-border">
            <h2 className="fx-display text-[17px] text-foreground">Highlighted Offers &amp; Deals</h2>
            <span className="text-xs text-muted-foreground">
              <span className="fx-num font-semibold text-foreground">{cards.length}</span> signals
            </span>
          </div>

          {cards.length === 0 ? (
            <div className="text-center py-10 px-6">
              <BadgePercent className="w-5 h-5 text-muted-foreground mx-auto mb-3 opacity-50" aria-hidden="true" strokeWidth={1.8} />
              <p className="text-sm text-secondary-foreground font-medium">No offers or deals right now</p>
              <p className="text-xs text-muted-foreground mt-1">Try a different search term or pick one of your categories above.</p>
            </div>
          ) : (
            <div className="px-6">
              {cards.map((item, index) => {
                const validLink = item.link && item.link !== "#" ? item.link : undefined;
                const source = sourceOf(validLink);

                return (
                  <a
                    key={`${item.title}-${index}`}
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
