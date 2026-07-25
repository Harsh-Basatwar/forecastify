"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  Upload, FileText, Camera, Loader2, Package, TrendingUp, ChevronDown,
  ChevronUp, AlertTriangle, CheckCircle2, ArrowUpRight, ShoppingCart,
  X, Zap, Star, Clipboard, DollarSign, MessageSquare, Database,
  Save, Download, Edit3,
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const COLORS = ["#6366f1", "#a855f7", "#ec4899", "#f59e0b", "#22c55e", "#06b6d4", "#f43f5e", "#8b5cf6"];
const priorityStyle = { High: "bg-red-500/10 text-red-600", Medium: "bg-amber-500/10 text-amber-600", Low: "bg-green-500/10 text-green-600" };

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><ShoppingCart className="w-6 h-6 text-emerald-500" /> Smart Purchase List</h1>
          <p className="text-muted-foreground mt-1">Upload your purchase list — get demand-based restock recommendations</p>
        </div>
        {analysis && (
          <div className="flex gap-2">
            <button onClick={downloadPDF} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-500/20 text-sm font-medium"><FileText className="w-4 h-4" /> Analysis PDF</button>
            <button onClick={downloadHTML} className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-500/20 text-sm font-medium"><Download className="w-4 h-4" /> HTML</button>
          </div>
        )}
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {["Upload", "Review", "Analysis"].map((s, i) => {
          const stages = ["upload", "review", "analysis"];
          const current = stages.indexOf(step);
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i <= current ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground"}`}>{i + 1}</div>
              <span className={`text-sm font-medium ${i <= current ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
              {i < 2 && <div className={`w-12 h-0.5 ${i < current ? "bg-emerald-500" : "bg-border"}`} />}
            </div>
          );
        })}
      </div>

      {error && <div className="bg-danger/10 border border-danger/20 text-danger rounded-xl px-4 py-3 text-sm">{error}</div>}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="space-y-4">
          {/* Upload zone */}
          <div className="bg-card border-2 border-dashed border-border rounded-2xl p-8 sm:p-12 text-center hover:border-emerald-500/50 transition-colors">
            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
              <Upload className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Upload your purchase list</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Drop a photo of your handwritten list, a PDF, or type it below. We&apos;ll extract products and analyze demand.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              <button onClick={() => fileRef.current?.click()} disabled={extracting}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 disabled:opacity-50">
                {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                Photo / PDF
              </button>
              <button onClick={() => fileRef.current?.click()} disabled={extracting}
                className="flex items-center gap-2 px-5 py-2.5 bg-secondary text-foreground rounded-xl font-semibold hover:bg-muted">
                <FileText className="w-4 h-4" /> Text File
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*,.pdf,.txt" onChange={handleFileChange} className="hidden" />
            <p className="text-xs text-muted-foreground">Supports: JPG, PNG, PDF, TXT</p>
          </div>

          {/* Or type manually */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h4 className="font-semibold text-foreground flex items-center gap-2 mb-3"><Clipboard className="w-4 h-4 text-emerald-500" /> Or type / paste your list</h4>
            <textarea value={textInput} onChange={(e) => setTextInput(e.target.value)}
              placeholder={"Maggi 50 packets ₹14 each\nAmul Butter 20 pcs ₹56\nBisleri 1L 100 bottles ₹20\nTata Salt 30 kg ₹28\nLays 40 packets ₹10"}
              rows={6} className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm font-mono resize-none" />
            <button onClick={() => handleExtract()} disabled={extracting || !textInput.trim()}
              className="mt-3 px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2">
              {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Extract Products
            </button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Camera, color: "text-emerald-500", bg: "bg-emerald-500/10", title: "OCR Recognition", desc: "Reads handwritten lists from photos using optical character recognition" },
              { icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-500/10", title: "Demand Analysis", desc: "7-day forecast for each product using historic sales and weather data" },
              { icon: Star, color: "text-amber-500", bg: "bg-amber-500/10", title: "Smart Priority", desc: "Tells you what to buy first based on stock urgency and demand level" },
            ].map(f => (
              <div key={f.title} className="bg-card border border-border rounded-xl p-4">
                <div className={`w-9 h-9 rounded-lg ${f.bg} flex items-center justify-center mb-2`}><f.icon className={`w-4 h-4 ${f.color}`} /></div>
                <p className="text-sm font-semibold text-foreground">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Review extracted products */}
      {step === "review" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2"><Package className="w-4 h-4 text-emerald-500" /> Extracted Products ({products.length})</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">From: {fileName}</span>
                <button onClick={downloadExtractPDF} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-foreground rounded-lg text-xs font-medium hover:bg-muted"><Download className="w-3.5 h-3.5" /> Step PDF</button>
              </div>
            </div>
            {rawText && (
              <div className="mb-4 rounded-xl border border-border bg-secondary/30 p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Extracted text</p>
                <p className="text-xs text-foreground/80 whitespace-pre-wrap line-clamp-4">{rawText}</p>
              </div>
            )}
            {unrecognized.length > 0 && (
              <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="text-xs font-semibold text-amber-600 mb-1">Needs attention</p>
                <p className="text-xs text-foreground/80">{unrecognized.join(", ")}</p>
              </div>
            )}
            <div className="space-y-3">
              {products.map((p, i) => (
                <div key={i} className="p-3 bg-secondary/50 rounded-xl border border-border/60">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-xs font-bold text-emerald-600">{i + 1}</div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">{p.originalText || "Extracted row"}</p>
                    </div>
                    <button onClick={() => removeProduct(i)} className="text-muted-foreground hover:text-red-500"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                    <input value={p.name || ""} onChange={(e) => updateProduct(i, "name", e.target.value)} placeholder="Product name" className="md:col-span-2 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                    <input value={p.category || ""} onChange={(e) => updateProduct(i, "category", e.target.value)} placeholder="Category" className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                    <input value={p.brand || ""} onChange={(e) => updateProduct(i, "brand", e.target.value)} placeholder="Brand" className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" value={p.quantity || ""} onChange={(e) => updateProduct(i, "quantity", e.target.value)} placeholder="Qty" className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                      <input value={p.unit || ""} onChange={(e) => updateProduct(i, "unit", e.target.value)} placeholder="Unit" className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                    </div>
                    <input type="number" value={p.price || ""} onChange={(e) => updateProduct(i, "price", e.target.value)} placeholder="Price" className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 border border-border rounded-xl p-4 bg-background/40">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2"><MessageSquare className="w-4 h-4 text-emerald-500" /> Extra prompt for analysis</label>
              <textarea
                value={extraPrompt}
                onChange={(e) => setExtraPrompt(e.target.value)}
                rows={3}
                placeholder="Example: Supplier has only 20 cartons today, prioritize fast-moving snacks, avoid items expiring soon, add festival demand context..."
                className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm resize-none"
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setStep("upload"); setProducts([]); }}
                className="px-4 py-2 bg-secondary text-foreground rounded-xl text-sm font-medium">Back</button>
              <button onClick={runAnalysis} disabled={analyzing || !products.length}
                className="flex-1 px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2">
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                {analyzing ? "Analyzing..." : "Analyze Demand"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Analysis results */}
      {step === "analysis" && analysis && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <Package className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{analysis.analysis?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Products</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-red-500">{analysis.analysis?.filter((p: any) => p.priority === "High").length || 0}</p>
              <p className="text-xs text-muted-foreground">High Priority</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <DollarSign className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">₹{analysis.totalEstimatedCost || 0}</p>
              <p className="text-xs text-muted-foreground">Est. Total Cost</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <ArrowUpRight className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-amber-500">{analysis.analysis?.filter((p: any) => p.recommendedQty > p.requestedQty).length || 0}</p>
              <p className="text-xs text-muted-foreground">Qty Increased</p>
            </div>
          </div>

          {/* Buy first */}
          {analysis.buyFirstList?.length > 0 && (
            <div className="bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-5">
              <h3 className="font-bold text-foreground flex items-center gap-2 mb-3"><Star className="w-4 h-4 text-amber-500" /> Buy These First</h3>
              <ol className="space-y-2">
                {analysis.buyFirstList.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-foreground/80">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Product cards with expandable 7-day forecast */}
          <div className="space-y-3">
            {analysis.analysis?.map((p: any, idx: number) => {
              const isExpanded = expandedIdx === idx;
              const chartData = p.dailyForecast?.map((d: any) => ({ name: d.day?.slice(0, 3), sales: d.sales })) || [];
              return (
                <div key={idx} className="bg-card border border-border rounded-xl overflow-hidden">
                  <button onClick={() => setExpandedIdx(isExpanded ? null : idx)} className="w-full text-left p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white" style={{ background: COLORS[idx % COLORS.length] }}>{idx + 1}</div>
                        <div>
                          <p className="font-semibold text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{p.requestedQty}</span>
                            {p.recommendedQty !== p.requestedQty && (
                              <><span className="text-muted-foreground">→</span>
                              <span className={`text-sm font-bold ${p.recommendedQty > p.requestedQty ? "text-red-500" : "text-green-500"}`}>{p.recommendedQty}</span></>
                            )}
                            <span className="text-xs text-muted-foreground">{p.unit}</span>
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityStyle[p.priority as keyof typeof priorityStyle] || priorityStyle.Low}`}>{p.priority}</span>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-border pt-4 space-y-4">
                      {/* Stats row */}
                      <div className="grid grid-cols-4 gap-3">
                        <div className="bg-secondary/50 rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-foreground">{p.currentInventory}</p>
                          <p className="text-[10px] text-muted-foreground">In Stock</p>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-foreground">{p.weeklyDemand}</p>
                          <p className="text-[10px] text-muted-foreground">7-Day Need</p>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-emerald-500">{p.recommendedQty}</p>
                          <p className="text-[10px] text-muted-foreground">Recommended</p>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-foreground">₹{p.estimatedCost}</p>
                          <p className="text-[10px] text-muted-foreground">Est. Cost</p>
                        </div>
                      </div>

                      {/* 7-day chart */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">7-Day Demand Forecast</p>
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
                            <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                            <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "8px" }} />
                            <Bar dataKey="sales" name="Sales" radius={[4, 4, 0, 0]}>
                              {chartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[idx % COLORS.length]} fillOpacity={0.6 + (i * 0.05)} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Adjustment reason */}
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {p.adjustmentReason}
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
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3"><Zap className="w-4 h-4 text-indigo-500" /> Smart Suggestions</h3>
              <ul className="space-y-2">
                {analysis.suggestions.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/80"><ArrowUpRight className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />{s}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2"><Database className="w-4 h-4 text-emerald-500" /> Add analyzed products to inventory</h3>
                <p className="text-xs text-muted-foreground mt-1">Review required database fields before inserting. Empty rows will be skipped.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={prepareDatabaseDraft} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600"><Edit3 className="w-4 h-4" /> Add this to database</button>
                {draftRows.length > 0 && <button onClick={downloadDatabasePDF} className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-xl text-sm font-medium hover:bg-muted"><Download className="w-4 h-4" /> Database PDF</button>}
              </div>
            </div>

            {showAddForm && (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b border-border">
                        <th className="py-2 pr-2">Product</th>
                        <th className="py-2 px-2">Brand</th>
                        <th className="py-2 px-2">Category*</th>
                        <th className="py-2 px-2">Stock*</th>
                        <th className="py-2 px-2">Unit*</th>
                        <th className="py-2 px-2">Price*</th>
                        <th className="py-2 px-2">SKU</th>
                        <th className="py-2 pl-2">Expiry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draftRows.map((row, i) => (
                        <tr key={i} className="border-b border-border/60">
                          <td className="py-2 pr-2 min-w-56"><input value={row.product_name} onChange={(e) => updateDraftRow(i, "product_name", e.target.value)} className="w-full px-2 py-1.5 bg-secondary border border-border rounded-lg text-foreground" /></td>
                          <td className="py-2 px-2 min-w-32"><input value={row.brand} onChange={(e) => updateDraftRow(i, "brand", e.target.value)} className="w-full px-2 py-1.5 bg-secondary border border-border rounded-lg text-foreground" /></td>
                          <td className="py-2 px-2 min-w-40"><input value={row.category} onChange={(e) => updateDraftRow(i, "category", e.target.value)} className="w-full px-2 py-1.5 bg-secondary border border-border rounded-lg text-foreground" /></td>
                          <td className="py-2 px-2 min-w-24"><input type="number" value={row.current_stock} onChange={(e) => updateDraftRow(i, "current_stock", e.target.value)} className="w-full px-2 py-1.5 bg-secondary border border-border rounded-lg text-foreground" /></td>
                          <td className="py-2 px-2 min-w-24"><input value={row.unit} onChange={(e) => updateDraftRow(i, "unit", e.target.value)} className="w-full px-2 py-1.5 bg-secondary border border-border rounded-lg text-foreground" /></td>
                          <td className="py-2 px-2 min-w-24"><input type="number" value={row.price} onChange={(e) => updateDraftRow(i, "price", e.target.value)} className="w-full px-2 py-1.5 bg-secondary border border-border rounded-lg text-foreground" /></td>
                          <td className="py-2 px-2 min-w-28"><input value={row.sku} onChange={(e) => updateDraftRow(i, "sku", e.target.value)} placeholder="optional" className="w-full px-2 py-1.5 bg-secondary border border-border rounded-lg text-foreground" /></td>
                          <td className="py-2 pl-2 min-w-36"><input type="date" value={row.expiry_date} onChange={(e) => updateDraftRow(i, "expiry_date", e.target.value)} className="w-full px-2 py-1.5 bg-secondary border border-border rounded-lg text-foreground" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-xs text-muted-foreground">Required fields: product name, category, stock, unit, and price. Brand, SKU, and expiry are optional.</p>
                  <button onClick={saveDraftToDatabase} disabled={savingToDb} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 disabled:opacity-50">
                    {savingToDb ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {savingToDb ? "Adding..." : "Confirm add to inventory"}
                  </button>
                </div>
                {dbResult && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                    {dbResult.message} Inserted {dbResult.inserted} row{dbResult.inserted === 1 ? "" : "s"}{dbResult.skipped ? `, skipped ${dbResult.skipped}.` : "."}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* New analysis button */}
          <div className="text-center">
            <button onClick={() => { setStep("upload"); setProducts([]); setAnalysis(null); setTextInput(""); setFileName(""); setRawText(""); setUnrecognized([]); setExtraPrompt(""); setShowAddForm(false); setDraftRows([]); setDbResult(null); }}
              className="px-6 py-2.5 bg-secondary text-foreground rounded-xl font-medium hover:bg-muted flex items-center gap-2 mx-auto">
              <Upload className="w-4 h-4" /> Upload Another List
            </button>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {analyzing && (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center gap-4">
          <div className="relative"><div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" /><ShoppingCart className="w-6 h-6 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" /></div>
          <p className="font-semibold text-foreground">Analyzing {products.length} products...</p>
          <p className="text-sm text-muted-foreground">Checking inventory, historic sales, weather, and upcoming events</p>
        </div>
      )}
    </div>
  );
}
