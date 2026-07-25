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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 shadow-[0_0_30px_rgba(16,185,129,0.25)]">
            <BadgePercent className="w-8 h-8 text-emerald-400" />
            <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">Offers & Deals</h1>
          </div>
          <p className="text-muted-foreground mt-3 text-base">Live offer, distributor, promotion, and market deal signals for your grocery store.</p>
        </div>
        <button onClick={downloadPDF} className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 text-sm font-semibold flex items-center gap-2"><Download className="w-4 h-4" /> PDF</button>
      </div>

      <div className="bg-card border border-emerald-500/30 rounded-2xl p-4 shadow-[0_0_24px_rgba(16,185,129,0.12)]">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void searchOffers(query); }} placeholder="Search offers by product, category, supplier, brand, or festival..." className="w-full pl-11 pr-4 py-3 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
          </div>
          <button onClick={() => searchOffers(query)} disabled={loading} className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Search
          </button>
        </div>
        {categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1 mr-1"><Tag className="w-3 h-3" /> Your categories:</span>
            {categories.map(cat => (
              <button key={cat} onClick={() => { setQuery(cat); void searchOffers(cat); }} className="px-3 py-1 rounded-full text-xs font-medium bg-secondary text-foreground border border-border hover:border-emerald-500/60 transition-colors">{cat}</button>
            ))}
          </div>
        )}
      </div>

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>}
      {loading ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-3" /><p className="text-muted-foreground">Fetching offers and deals...</p></div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 shadow-[0_0_24px_rgba(16,185,129,0.16)]">
            <h2 className="text-xl font-black text-foreground">Highlighted Offers & Deals</h2>
            <span className="text-sm font-semibold text-emerald-400">{cards.length} cards</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {cards.map((item, index) => {
              const validLink = item.link && item.link !== "#" ? item.link : undefined;

              return (
              <a key={`${item.title}-${index}`} href={validLink} target={validLink ? "_blank" : undefined} rel={validLink ? "noopener noreferrer" : undefined} className={`group min-h-[220px] bg-card border border-emerald-500/30 rounded-2xl p-6 shadow-[0_0_24px_rgba(16,185,129,0.12)] transition-all ${validLink ? "hover:shadow-[0_0_36px_rgba(16,185,129,0.24)] hover:border-emerald-400/70 cursor-pointer" : "cursor-default opacity-90"}`}>
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="mb-4 h-36 w-full rounded-xl object-cover border border-emerald-500/20 bg-secondary" loading="lazy" />
                )}
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400">DEAL #{index + 1}</span>
                  {validLink && <ExternalLink className="w-4 h-4 text-emerald-400 opacity-70 group-hover:opacity-100" />}
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
