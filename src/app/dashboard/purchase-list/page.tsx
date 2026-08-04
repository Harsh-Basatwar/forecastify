"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Upload, FileText, Camera, Loader2, Package, TrendingUp, ChevronDown,
  ChevronUp, CheckCircle2, ArrowUpRight,
  X, Zap, Star, Clipboard, MessageSquare, Database,
  Save, Download, Edit3,
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Priority reads quiet-first: only High earns an amber badge
function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "High") return <span className="fx-badge fx-badge-warning">High</span>;
  if (priority === "Medium") return <span className="fx-badge">Medium</span>;
  return <span className="fx-badge">Low</span>;
}

const chartTooltipStyle = {
  background: "var(--elevated)",
  border: "1px solid var(--border-strong)",
  borderRadius: "10px",
  boxShadow: "var(--shadow-md)",
  fontSize: "12px",
  color: "var(--foreground)",
} as const;

type DbDraftRow = {
  product_name: string;
  brand: string;
  category: string;
  current_stock: number | "";
  unit: string;
  price: number | "";
  sku: string;
  expiry_date: string;
};

export default function PurchaseListPage() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "review" | "analysis">("upload");
  const [extracting, setExtracting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [weather, setWeather] = useState<any>(null);
  const [weatherForecast, setWeatherForecast] = useState<any[]>([]);
  const [location, setLocation] = useState("");
  const [fileName, setFileName] = useState("");
  const [generatedAt, setGeneratedAt] = useState("");
  const [rawText, setRawText] = useState("");
  const [unrecognized, setUnrecognized] = useState<string[]>([]);
  const [extraPrompt, setExtraPrompt] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [draftRows, setDraftRows] = useState<DbDraftRow[]>([]);
  const [savingToDb, setSavingToDb] = useState(false);
  const [dbResult, setDbResult] = useState<{ inserted: number; skipped: number; message: string } | null>(null);

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

  // Upload file or text
  const handleExtract = async (file?: File) => {
    setExtracting(true);
    setError("");
    try {
      const form = new FormData();
      if (file) { form.append("file", file); setFileName(file.name); }
      else { form.append("text", textInput); setFileName("Manual input"); }

      const res = await fetch("/api/extract-list", { method: "POST", body: form });
      const data = await res.json();
      if (data.products?.length) {
        setProducts(data.products);
        setRawText(data.rawText || "");
        setUnrecognized(Array.isArray(data.unrecognized) ? data.unrecognized : []);
        setExtraPrompt("");
        setAnalysis(null);
        setShowAddForm(false);
        setDbResult(null);
        setStep("review");
      } else {
        setError(data.error || "No products found in the file.");
      }
    } catch { setError("Failed to extract products."); }
    finally { setExtracting(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleExtract(file);
  };

  // Remove product from review list
  const removeProduct = (idx: number) => setProducts(p => p.filter((_, i) => i !== idx));

  const updateProduct = (idx: number, field: string, value: string) => {
    setProducts(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      const numericFields = ["quantity", "price"];
      return { ...p, [field]: numericFields.includes(field) ? Number(value) || 0 : value };
    }));
  };

  // Run bulk analysis
  const runAnalysis = async () => {
    if (!user || !products.length) return;
    setAnalyzing(true);
    setError("");
    try {
      const res = await fetch("/api/bulk-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products, userId: user.id, weather, weatherForecast, location, extraPrompt }),
      });
      const data = await res.json();
      if (data.analysis) {
        setAnalysis(data);
        setGeneratedAt(data.generatedAt);
        setShowAddForm(false);
        setDbResult(null);
        setStep("analysis");
      } else { setError(data.error || "Analysis failed."); }
    } catch { setError("Analysis failed."); }
    finally { setAnalyzing(false); }
  };

  const esc = (value: any) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const printWindow = (html: string) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const reportShell = (title: string, subtitle: string, body: string) => {
    const date = new Date().toLocaleString("en-IN");
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${esc(title)}</title>
<style>
  *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;margin:0;padding:18mm;font-size:11px;line-height:1.45}
  .report{border:2px solid #111;padding:14px;min-height:calc(100vh - 36mm)}
  .header{border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:12px;display:flex;justify-content:space-between;gap:12px}
  h1{font-size:21px;margin:0 0 4px 0;letter-spacing:.2px}.sub{font-size:11px;color:#333}.meta{text-align:right;font-size:10px;color:#333}
  .section{border:1px solid #111;margin:10px 0;padding:10px;page-break-inside:avoid}.section h2{font-size:13px;margin:0 0 8px 0;text-transform:uppercase}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.stat{border:1px solid #111;padding:8px;text-align:center}.stat b{display:block;font-size:16px}.stat span{font-size:9px;text-transform:uppercase}
  table{width:100%;border-collapse:collapse;margin-top:6px}th,td{border:1px solid #111;padding:5px;vertical-align:top}th{font-size:9px;text-transform:uppercase;background:#f4f4f4;text-align:left}
  ul,ol{margin:6px 0 0 18px;padding:0}li{margin-bottom:4px}.note{border:1px solid #111;padding:8px;white-space:pre-wrap}.footer{border-top:1px solid #111;margin-top:12px;padding-top:8px;text-align:center;font-size:9px;color:#333}
  @media print{body{padding:12mm}.report{min-height:auto}.no-print{display:none}}
</style></head><body><div class="report"><div class="header"><div><h1>${esc(title)}</h1><div class="sub">${esc(subtitle)}</div></div><div class="meta">Generated<br>${date}<br>${esc(location || "Location not available")}</div></div>${body}<div class="footer">Forecastify confidential purchase workflow report</div></div></body></html>`;
  };

  const buildExtractReport = () => {
    const productRows = products.map((p, i) => `<tr><td>${i + 1}</td><td><strong>${esc(p.name)}</strong><br>${esc(p.originalText || "")}</td><td>${esc(p.brand)}</td><td>${esc(p.category)}</td><td>${esc(p.quantity)} ${esc(p.unit || "pcs")}</td><td>Rs ${esc(p.price || 0)}</td></tr>`).join("");
    const body = `<div class="section"><h2>Extracted Purchase List</h2><div class="grid"><div class="stat"><b>${products.length}</b><span>Products</span></div><div class="stat"><b>${unrecognized.length}</b><span>Unrecognized</span></div><div class="stat"><b>${esc(fileName || "Manual")}</b><span>Source</span></div><div class="stat"><b>${extraPrompt ? "Yes" : "No"}</b><span>Extra Notes</span></div></div><table><thead><tr><th>#</th><th>Product</th><th>Brand</th><th>Category</th><th>Quantity</th><th>Price</th></tr></thead><tbody>${productRows}</tbody></table></div>${rawText ? `<div class="section"><h2>Extracted Text</h2><div class="note">${esc(rawText)}</div></div>` : ""}${unrecognized.length ? `<div class="section"><h2>Unrecognized Lines</h2><ul>${unrecognized.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}${extraPrompt ? `<div class="section"><h2>Shopkeeper Notes</h2><div class="note">${esc(extraPrompt)}</div></div>` : ""}`;
    return reportShell("Purchase List Extraction Report", "OCR and manual review data", body);
  };

  // PDF / HTML export
  const buildReport = () => {
    if (!analysis) return "";
    const a = analysis;
    const date = generatedAt ? new Date(generatedAt).toLocaleString("en-IN") : new Date().toLocaleString("en-IN");

    const rows = a.analysis?.map((p: any, i: number) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${esc(p.name)}</strong><br/><span>${esc(p.category)}</span></td>
        <td style="text-align:center">${esc(p.requestedQty)} ${esc(p.unit)}</td>
        <td style="text-align:center">${esc(p.currentInventory)} ${esc(p.unit)}</td>
        <td style="text-align:center;font-weight:700">${esc(p.weeklyDemand)}</td>
        <td style="text-align:center;font-weight:700">${esc(p.recommendedQty)} ${esc(p.unit)}</td>
        <td style="text-align:center">${esc(p.priority)}</td>
        <td style="text-align:right">Rs ${esc(p.estimatedCost)}</td>
        <td>${esc(p.adjustmentReason)}</td>
      </tr>`).join("") || "";

    const buyFirst = a.buyFirstList?.map((b: string) => `<li>${esc(b)}</li>`).join("") || "";
    const body = `<div class="section"><h2>Summary</h2><div class="grid"><div class="stat"><b>${a.analysis?.length || 0}</b><span>Products</span></div><div class="stat"><b>${a.analysis?.filter((p: any) => p.priority === "High").length || 0}</b><span>High Priority</span></div><div class="stat"><b>Rs ${esc(a.totalEstimatedCost || 0)}</b><span>Estimated Cost</span></div><div class="stat"><b>${a.analysis?.filter((p: any) => p.recommendedQty > p.requestedQty).length || 0}</b><span>Qty Increased</span></div></div></div><div class="section"><h2>Buy First Priority Order</h2><ol>${buyFirst}</ol></div><div class="section"><h2>Detailed Product Analysis</h2><table><thead><tr><th>#</th><th>Product</th><th>Requested</th><th>In Stock</th><th>7-Day Need</th><th>Recommended</th><th>Priority</th><th>Cost</th><th>Reason</th></tr></thead><tbody>${rows}</tbody></table></div>${a.suggestions?.length ? `<div class="section"><h2>Suggestions</h2><ul>${a.suggestions.map((s: string) => `<li>${esc(s)}</li>`).join("")}</ul></div>` : ""}${extraPrompt ? `<div class="section"><h2>Shopkeeper Notes Used</h2><div class="note">${esc(extraPrompt)}</div></div>` : ""}`;
    return reportShell("Purchase List Analysis Report", `Smart restock recommendations | ${date}`, body);
  };

  const downloadPDF = () => printWindow(buildReport());
  const downloadHTML = () => {
    const blob = new Blob([buildReport()], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `purchase-analysis-${new Date().toISOString().split("T")[0]}.html`; a.click(); URL.revokeObjectURL(url);
  };

  const downloadExtractPDF = () => printWindow(buildExtractReport());

  const prepareDatabaseDraft = () => {
    const source = analysis?.analysis?.length ? analysis.analysis : products;
    const rows: DbDraftRow[] = source.map((p: any) => ({
      product_name: p.name || p.product_name || "",
      brand: p.brand || "",
      category: p.category || "",
      current_stock: Number(p.recommendedQty ?? p.requestedQty ?? p.quantity ?? p.current_stock ?? 0),
      unit: p.unit || "pcs",
      price: Number(p.price || 0),
      sku: "",
      expiry_date: "",
    }));
    setDraftRows(rows);
    setShowAddForm(true);
    setDbResult(null);
  };

  const updateDraftRow = (idx: number, field: keyof DbDraftRow, value: string) => {
    setDraftRows(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      if (field === "current_stock" || field === "price") return { ...row, [field]: value === "" ? "" : Number(value) };
      return { ...row, [field]: value };
    }));
  };

  const saveDraftToDatabase = async () => {
    if (!user) return;
    const validRows = draftRows.filter(r => r.product_name.trim() && r.category.trim() && r.unit.trim() && r.current_stock !== "" && r.price !== "");
    if (!validRows.length) {
      setError("Fill product name, category, stock, unit, and price for at least one row.");
      return;
    }
    setSavingToDb(true);
    setError("");
    try {
      const rows = validRows.map(row => ({
        store_id: user.id,
        product_name: row.product_name.trim(),
        brand: row.brand.trim() || null,
        category: row.category.trim(),
        current_stock: Number(row.current_stock),
        unit: row.unit.trim(),
        price: Number(row.price),
        sku: row.sku.trim() || null,
        expiry_date: row.expiry_date || null,
      }));
      const { error: insertError } = await supabase.from("inventory").insert(rows);
      if (insertError) throw insertError;
      setDbResult({ inserted: rows.length, skipped: draftRows.length - rows.length, message: "Products added to inventory." });
    } catch (err: any) {
      setError(err.message || "Could not add products to database.");
    } finally {
      setSavingToDb(false);
    }
  };

  const buildDatabaseReport = () => {
    const rows = draftRows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.product_name)}</td><td>${esc(r.brand || "-")}</td><td>${esc(r.category)}</td><td>${esc(r.current_stock)} ${esc(r.unit)}</td><td>Rs ${esc(r.price)}</td><td>${esc(r.sku || "-")}</td><td>${esc(r.expiry_date || "-")}</td></tr>`).join("");
    const body = `<div class="section"><h2>Database Add Review</h2><div class="grid"><div class="stat"><b>${draftRows.length}</b><span>Prepared Rows</span></div><div class="stat"><b>${dbResult?.inserted || 0}</b><span>Inserted</span></div><div class="stat"><b>${dbResult?.skipped || 0}</b><span>Skipped</span></div><div class="stat"><b>${dbResult ? "Done" : "Pending"}</b><span>Status</span></div></div><table><thead><tr><th>#</th><th>Product</th><th>Brand</th><th>Category</th><th>Stock</th><th>Price</th><th>SKU</th><th>Expiry</th></tr></thead><tbody>${rows}</tbody></table></div>${dbResult ? `<div class="section"><h2>Result</h2><div class="note">${esc(dbResult.message)} Inserted: ${dbResult.inserted}. Skipped: ${dbResult.skipped}.</div></div>` : ""}`;
    return reportShell("Purchase List Database Report", "Inventory rows prepared from purchase-list analysis", body);
  };

  const downloadDatabasePDF = () => printWindow(buildDatabaseReport());

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      {/* ── Page lead · editorial, no card ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="fx-display text-[24px] text-foreground">Smart Purchase List</h1>
          <p className="text-[13px] text-muted-foreground mt-1.5">
            Upload your purchase list — get demand-based restock recommendations
          </p>
        </div>
        {analysis && (
          <div className="flex gap-2 shrink-0">
            <button onClick={downloadPDF} className="fx-btn"><FileText className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> Analysis PDF</button>
            <button onClick={downloadHTML} className="fx-btn"><Download className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> HTML</button>
          </div>
        )}
      </div>

      {/* Steps indicator — quiet progress rail */}
      <div className="flex items-center gap-2.5" aria-label="Workflow steps">
        {["Upload", "Review", "Analysis"].map((s, i) => {
          const stages = ["upload", "review", "analysis"];
          const current = stages.indexOf(step);
          const reached = i <= current;
          return (
            <div key={s} className="flex items-center gap-2.5">
              <span
                aria-current={i === current ? "step" : undefined}
                className={`fx-num w-6 h-6 rounded-[var(--radius-sm)] flex items-center justify-center text-[11px] font-semibold ${
                  reached ? "text-[var(--accent-foreground)]" : "bg-secondary text-muted-foreground"
                }`}
                style={reached ? { background: "var(--accent)" } : undefined}
              >
                {i + 1}
              </span>
              <span className={`text-[13px] ${reached ? "font-semibold text-foreground" : "font-medium text-muted-foreground"}`}>{s}</span>
              {i < 2 && <span aria-hidden="true" className={`w-10 h-px ${i < current ? "bg-[var(--accent)]" : "bg-border"}`} />}
            </div>
          );
        })}
      </div>

      {error && (
        <div role="alert" className="bg-danger/8 border border-danger/25 text-danger rounded-[var(--radius-md)] px-4 py-3 text-sm">{error}</div>
      )}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="space-y-6">
          {/* Upload zone */}
          <div className="fx-card border-dashed border-border-strong p-8 sm:p-12 text-center">
            <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-4" aria-hidden="true" strokeWidth={1.8} />
            <h3 className="fx-display text-[17px] text-foreground mb-2">Upload your purchase list</h3>
            <p className="text-[13px] text-muted-foreground mb-6 max-w-md mx-auto">
              Drop a photo of your handwritten list, a PDF, or type it below. We&apos;ll extract products and analyze demand.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-5">
              <button onClick={() => fileRef.current?.click()} disabled={extracting} className="fx-btn fx-btn-accent">
                {extracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Camera className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} />}
                Photo / PDF
              </button>
              <button onClick={() => fileRef.current?.click()} disabled={extracting} className="fx-btn">
                <FileText className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> Text File
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*,.pdf,.txt" onChange={handleFileChange} className="hidden" />
            <p className="text-xs text-muted-foreground">Supports: JPG, PNG, PDF, TXT</p>
          </div>

          {/* Or type manually */}
          <div className="fx-card p-6">
            <h4 className="fx-display text-[17px] text-foreground flex items-center gap-2 mb-3">
              <Clipboard className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} /> Or type / paste your list
            </h4>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              aria-label="Type or paste your purchase list"
              placeholder={"Maggi 50 packets ₹14 each\nAmul Butter 20 pcs ₹56\nBisleri 1L 100 bottles ₹20\nTata Salt 30 kg ₹28\nLays 40 packets ₹10"}
              rows={6}
              className="fx-input font-mono resize-none"
            />
            <button onClick={() => handleExtract()} disabled={extracting || !textInput.trim()} className="fx-btn fx-btn-accent mt-3">
              {extracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Zap className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} />}
              Extract Products
            </button>
          </div>

          {/* Features — one sheet, hairline-divided */}
          <div className="fx-card grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)] overflow-hidden">
            {[
              { icon: Camera, title: "OCR Recognition", desc: "Reads handwritten lists from photos using optical character recognition" },
              { icon: TrendingUp, title: "Demand Analysis", desc: "7-day forecast for each product using historic sales and weather data" },
              { icon: Star, title: "Smart Priority", desc: "Tells you what to buy first based on stock urgency and demand level" },
            ].map(f => (
              <div key={f.title} className="p-5">
                <f.icon className="w-4 h-4 text-accent mb-2.5" aria-hidden="true" strokeWidth={1.8} />
                <p className="text-sm font-semibold text-foreground">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Review extracted products */}
      {step === "review" && (
        <div className="space-y-6">
          <div className="fx-card p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <h3 className="fx-display text-[17px] text-foreground flex items-center gap-2">
                <Package className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} /> Extracted Products
                <span className="fx-badge fx-num">{products.length}</span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">From: {fileName}</span>
                <button onClick={downloadExtractPDF} className="fx-btn"><Download className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> Step PDF</button>
              </div>
            </div>
            {rawText && (
              <div className="mb-4 rounded-[var(--radius-md)] border border-border bg-background-subtle/60 p-3">
                <p className="fx-eyebrow mb-1.5">Extracted text</p>
                <p className="text-xs text-secondary-foreground whitespace-pre-wrap line-clamp-4">{rawText}</p>
              </div>
            )}
            {unrecognized.length > 0 && (
              <div className="mb-4 rounded-[var(--radius-md)] border border-warning/25 bg-warning/8 p-3">
                <p className="text-xs font-semibold text-warning mb-1 inline-flex items-center gap-1.5">
                  <span className="fx-signal fx-signal-warning" aria-hidden="true" /> Needs attention
                </p>
                <p className="text-xs text-secondary-foreground">{unrecognized.join(", ")}</p>
              </div>
            )}
            <div>
              {products.map((p, i) => (
                <div key={i} className="py-4 border-b border-border last:border-b-0">
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <span className="fx-num w-6 h-6 rounded-[var(--radius-sm)] bg-secondary flex items-center justify-center text-[11px] font-semibold text-secondary-foreground shrink-0">{i + 1}</span>
                    <p className="flex-1 text-xs text-muted-foreground pt-1">{p.originalText || "Extracted row"}</p>
                    <button onClick={() => removeProduct(i)} aria-label={`Remove ${p.name || "product"}`} className="fx-btn-ghost fx-focus rounded-[var(--radius-sm)] p-1 text-muted-foreground hover:text-danger">
                      <X className="w-4 h-4" aria-hidden="true" strokeWidth={1.8} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                    <input value={p.name || ""} onChange={(e) => updateProduct(i, "name", e.target.value)} placeholder="Product name" aria-label="Product name" className="fx-input md:col-span-2" />
                    <input value={p.category || ""} onChange={(e) => updateProduct(i, "category", e.target.value)} placeholder="Category" aria-label="Category" className="fx-input" />
                    <input value={p.brand || ""} onChange={(e) => updateProduct(i, "brand", e.target.value)} placeholder="Brand" aria-label="Brand" className="fx-input" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" value={p.quantity || ""} onChange={(e) => updateProduct(i, "quantity", e.target.value)} placeholder="Qty" aria-label="Quantity" className="fx-input" />
                      <input value={p.unit || ""} onChange={(e) => updateProduct(i, "unit", e.target.value)} placeholder="Unit" aria-label="Unit" className="fx-input" />
                    </div>
                    <input type="number" value={p.price || ""} onChange={(e) => updateProduct(i, "price", e.target.value)} placeholder="Price" aria-label="Price" className="fx-input" />
                  </div>
                </div>
              ))}
            </div>
            <div className="fx-rule mt-4 pt-4">
              <label htmlFor="extra-prompt" className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} /> Extra prompt for analysis
              </label>
              <textarea
                id="extra-prompt"
                value={extraPrompt}
                onChange={(e) => setExtraPrompt(e.target.value)}
                rows={3}
                placeholder="Example: Supplier has only 20 cartons today, prioritize fast-moving snacks, avoid items expiring soon, add festival demand context..."
                className="fx-input resize-none"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setStep("upload"); setProducts([]); }} className="fx-btn">Back</button>
              <button onClick={runAnalysis} disabled={analyzing || !products.length} className="fx-btn fx-btn-accent flex-1">
                {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} />}
                {analyzing ? "Analyzing..." : "Analyze Demand"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Analysis results */}
      {step === "analysis" && analysis && (
        <div className="space-y-8">
          {/* Stats — one ledger strip */}
          <section aria-label="Analysis summary" className="fx-card grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-[var(--border)] overflow-hidden">
            <div className="p-5">
              <p className="fx-eyebrow">Products</p>
              <p className="fx-num text-[26px] font-semibold text-foreground mt-2 leading-none">{analysis.analysis?.length || 0}</p>
            </div>
            <div className="p-5">
              <p className="fx-eyebrow">High Priority</p>
              <p className="fx-num text-[26px] font-semibold text-foreground mt-2 leading-none">{analysis.analysis?.filter((p: any) => p.priority === "High").length || 0}</p>
              <p className={`inline-flex items-center gap-1.5 text-xs mt-2 font-medium ${(analysis.analysis?.filter((p: any) => p.priority === "High").length || 0) > 0 ? "text-warning" : "text-muted-foreground"}`}>
                <span className={`fx-signal ${(analysis.analysis?.filter((p: any) => p.priority === "High").length || 0) > 0 ? "fx-signal-warning" : "fx-signal-success"}`} aria-hidden="true" />
                {(analysis.analysis?.filter((p: any) => p.priority === "High").length || 0) > 0 ? "Buy these first" : "No urgent buys"}
              </p>
            </div>
            <div className="p-5">
              <p className="fx-eyebrow">Est. Total Cost</p>
              <p className="fx-num text-[26px] font-semibold text-foreground mt-2 leading-none">₹{analysis.totalEstimatedCost || 0}</p>
            </div>
            <div className="p-5">
              <p className="fx-eyebrow">Qty Increased</p>
              <p className="fx-num text-[26px] font-semibold text-foreground mt-2 leading-none">{analysis.analysis?.filter((p: any) => p.recommendedQty > p.requestedQty).length || 0}</p>
              <p className="text-xs text-muted-foreground mt-2">Raised above requested</p>
            </div>
          </section>

          {/* Buy first */}
          {analysis.buyFirstList?.length > 0 && (
            <section aria-label="Buy these first" className="fx-card p-6">
              <h3 className="fx-display text-[17px] text-foreground flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} /> Buy These First
              </h3>
              <ol>
                {analysis.buyFirstList.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-secondary-foreground py-2.5 border-b border-border last:border-b-0">
                    <span className="fx-num text-xs font-semibold shrink-0 mt-0.5" style={{ color: "var(--accent)" }}>{String(i + 1).padStart(2, "0")}</span>
                    {item}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Product cards with expandable 7-day forecast */}
          <div className="space-y-3">
            {analysis.analysis?.map((p: any, idx: number) => {
              const isExpanded = expandedIdx === idx;
              const chartData = p.dailyForecast?.map((d: any) => ({ name: d.day?.slice(0, 3), sales: d.sales })) || [];
              return (
                <div key={idx} className="fx-card fx-card-interactive overflow-hidden">
                  <button onClick={() => setExpandedIdx(isExpanded ? null : idx)} aria-expanded={isExpanded} className="w-full text-left p-4 sm:p-5 fx-focus">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="fx-num w-7 h-7 rounded-[var(--radius-sm)] bg-secondary flex items-center justify-center text-xs font-semibold text-secondary-foreground shrink-0">{idx + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="fx-num text-sm text-muted-foreground">{p.requestedQty}</span>
                            {p.recommendedQty !== p.requestedQty && (
                              <><span className="text-muted-foreground" aria-hidden="true">→</span>
                              <span className="fx-num text-sm font-semibold" style={{ color: "var(--accent)" }}>{p.recommendedQty}</span></>
                            )}
                            <span className="text-xs text-muted-foreground">{p.unit}</span>
                          </div>
                          <div className="mt-1"><PriorityBadge priority={p.priority} /></div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} /> : <ChevronDown className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 sm:px-5 pb-5 border-t border-border pt-4 space-y-4">
                      {/* Stats row — plain cells, no boxes */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <p className="fx-eyebrow text-[10px]">In Stock</p>
                          <p className="fx-num text-lg font-semibold text-foreground mt-1">{p.currentInventory}</p>
                        </div>
                        <div>
                          <p className="fx-eyebrow text-[10px]">7-Day Need</p>
                          <p className="fx-num text-lg font-semibold text-foreground mt-1">{p.weeklyDemand}</p>
                        </div>
                        <div>
                          <p className="fx-eyebrow text-[10px]">Recommended</p>
                          <p className="fx-num text-lg font-semibold mt-1" style={{ color: "var(--accent)" }}>{p.recommendedQty}</p>
                        </div>
                        <div>
                          <p className="fx-eyebrow text-[10px]">Est. Cost</p>
                          <p className="fx-num text-lg font-semibold text-foreground mt-1">₹{p.estimatedCost}</p>
                        </div>
                      </div>

                      {/* 7-day chart */}
                      <div className="fx-rule pt-4">
                        <p className="fx-eyebrow mb-2">7-Day Demand Forecast</p>
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="4 6" stroke="var(--border)" vertical={false} />
                            <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "var(--secondary)", opacity: 0.5 }} />
                            <Bar dataKey="sales" name="Sales" radius={[3, 3, 0, 0]} barSize={14} fill="var(--accent)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Adjustment reason */}
                      <div className="rounded-[var(--radius-md)] p-3 border" style={{ background: "var(--accent-soft)", borderColor: "var(--accent-border)" }}>
                        <p className="text-xs text-foreground flex items-start gap-1.5 leading-relaxed">
                          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" strokeWidth={1.8} style={{ color: "var(--accent)" }} /> {p.adjustmentReason}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Suggestions */}
          {analysis.suggestions?.length > 0 && (
            <section aria-label="Smart suggestions" className="fx-card p-6">
              <h3 className="fx-display text-[17px] text-foreground flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} /> Smart Suggestions
              </h3>
              <ul>
                {analysis.suggestions.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-secondary-foreground py-2.5 border-b border-border last:border-b-0">
                    <ArrowUpRight className="w-4 h-4 text-accent shrink-0 mt-0.5" aria-hidden="true" strokeWidth={1.8} />{s}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-label="Add analyzed products to inventory" className="fx-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="fx-display text-[17px] text-foreground flex items-center gap-2">
                  <Database className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} /> Add analyzed products to inventory
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Review required database fields before inserting. Empty rows will be skipped.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={prepareDatabaseDraft} className="fx-btn fx-btn-accent"><Edit3 className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> Add this to database</button>
                {draftRows.length > 0 && <button onClick={downloadDatabasePDF} className="fx-btn"><Download className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> Database PDF</button>}
              </div>
            </div>

            {showAddForm && (
              <div className="space-y-4">
                <div className="overflow-x-auto -mx-2">
                  <table className="fx-table min-w-[880px]">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Brand</th>
                        <th>Category*</th>
                        <th>Stock*</th>
                        <th>Unit*</th>
                        <th>Price*</th>
                        <th>SKU</th>
                        <th>Expiry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draftRows.map((row, i) => (
                        <tr key={i}>
                          <td className="min-w-56"><input value={row.product_name} onChange={(e) => updateDraftRow(i, "product_name", e.target.value)} aria-label="Product name" className="fx-input px-2 py-1.5 text-sm" /></td>
                          <td className="min-w-32"><input value={row.brand} onChange={(e) => updateDraftRow(i, "brand", e.target.value)} aria-label="Brand" className="fx-input px-2 py-1.5 text-sm" /></td>
                          <td className="min-w-40"><input value={row.category} onChange={(e) => updateDraftRow(i, "category", e.target.value)} aria-label="Category" className="fx-input px-2 py-1.5 text-sm" /></td>
                          <td className="min-w-24"><input type="number" value={row.current_stock} onChange={(e) => updateDraftRow(i, "current_stock", e.target.value)} aria-label="Stock" className="fx-input px-2 py-1.5 text-sm" /></td>
                          <td className="min-w-24"><input value={row.unit} onChange={(e) => updateDraftRow(i, "unit", e.target.value)} aria-label="Unit" className="fx-input px-2 py-1.5 text-sm" /></td>
                          <td className="min-w-24"><input type="number" value={row.price} onChange={(e) => updateDraftRow(i, "price", e.target.value)} aria-label="Price" className="fx-input px-2 py-1.5 text-sm" /></td>
                          <td className="min-w-28"><input value={row.sku} onChange={(e) => updateDraftRow(i, "sku", e.target.value)} placeholder="optional" aria-label="SKU" className="fx-input px-2 py-1.5 text-sm" /></td>
                          <td className="min-w-36"><input type="date" value={row.expiry_date} onChange={(e) => updateDraftRow(i, "expiry_date", e.target.value)} aria-label="Expiry date" className="fx-input px-2 py-1.5 text-sm" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-xs text-muted-foreground">Required fields: product name, category, stock, unit, and price. Brand, SKU, and expiry are optional.</p>
                  <button onClick={saveDraftToDatabase} disabled={savingToDb} className="fx-btn fx-btn-accent">
                    {savingToDb ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Save className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} />}
                    {savingToDb ? "Adding..." : "Confirm add to inventory"}
                  </button>
                </div>
                {dbResult && (
                  <div className="rounded-[var(--radius-md)] border border-success/25 bg-success/8 px-4 py-3 text-sm text-success">
                    {dbResult.message} Inserted {dbResult.inserted} row{dbResult.inserted === 1 ? "" : "s"}{dbResult.skipped ? `, skipped ${dbResult.skipped}.` : "."}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* New analysis button */}
          <div className="text-center">
            <button onClick={() => { setStep("upload"); setProducts([]); setAnalysis(null); setTextInput(""); setFileName(""); setRawText(""); setUnrecognized([]); setExtraPrompt(""); setShowAddForm(false); setDraftRows([]); setDbResult(null); }}
              className="fx-btn mx-auto">
              <Upload className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> Upload Another List
            </button>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {analyzing && (
        <div className="fx-card p-10 flex flex-col items-center gap-4" aria-busy="true">
          <div className="w-8 h-8 border-2 border-border-strong border-t-accent rounded-full animate-spin" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">Analyzing {products.length} products...</p>
          <p className="text-xs text-muted-foreground">Checking inventory, historic sales, weather, and upcoming events</p>
        </div>
      )}
    </div>
  );
}
