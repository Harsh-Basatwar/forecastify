"use client";

import { useState } from "react";
import { X, Upload, Download, CheckCircle2, AlertTriangle, FileText, ArrowRight } from "lucide-react";
import { CsvDryRunResult } from "@/lib/inventory/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  onImportCompleted: () => void;
}

export function CsvImportExportModal({ isOpen, onClose, storeId, onImportCompleted }: Props) {
  const [activeTab, setActiveTab] = useState<"import" | "export">("import");
  const [csvContent, setCsvContent] = useState("");
  const [dryRunResult, setDryRunResult] = useState<CsvDryRunResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [committing, setCommitted] = useState(false);
  const [exportType, setExportType] = useState("products");

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      setCsvContent(text);
      runDryRun(text);
    };
    reader.readAsText(file);
  };

  const runDryRun = async (text: string) => {
    setValidating(true);
    try {
      const res = await fetch("/api/inventory/csv/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dryRun", storeId, csvContent: text }),
      });
      const result = await res.json();
      setDryRunResult(result);
    } catch (err) {
      alert("Error parsing CSV for dry run.");
    } finally {
      setValidating(false);
    }
  };

  const handleCommit = async () => {
    if (!csvContent) return;
    setCommitted(true);
    try {
      const res = await fetch("/api/inventory/csv/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "commit", storeId, csvContent }),
      });
      const json = await res.json();
      if (json.success) {
        alert(`Successfully imported ${json.insertedCount} products!`);
        onImportCompleted();
        onClose();
      } else {
        alert(`Import failed: ${json.error}`);
      }
    } catch (err) {
      alert("Error committing CSV import.");
    } finally {
      setCommitted(false);
    }
  };

  const handleExport = () => {
    window.open(`/api/inventory/csv/export?storeId=${storeId}&type=${exportType}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-background rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" />
            <h3 className="text-sm font-bold text-foreground">CSV Data Hub (Import / Export)</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-4 text-xs font-medium bg-muted/20">
          <button
            onClick={() => setActiveTab("import")}
            className={`py-2.5 px-4 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "import" ? "border-accent text-accent" : "border-transparent text-muted-foreground"
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Dry-Run Import Wizard
          </button>
          <button
            onClick={() => setActiveTab("export")}
            className={`py-2.5 px-4 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "export" ? "border-accent text-accent" : "border-transparent text-muted-foreground"
            }`}
          >
            <Download className="w-3.5 h-3.5" /> Data Exporter
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {activeTab === "import" && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border hover:border-accent/50 rounded-xl p-6 text-center bg-muted/10 transition-colors">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="font-medium text-foreground">Upload CSV File for Validation</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Headers required: product_name, stock, price (optional: barcode, category, brand, supplier)
                </p>
                <input
                  type="file"
                  accept=".csv"
                  className="mt-3 block mx-auto text-xs text-muted-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-accent file:text-accent-foreground hover:file:opacity-90"
                  onChange={handleFileUpload}
                />
              </div>

              {validating && (
                <div className="text-center py-4 text-xs text-accent">Running Dry-Run CSV Validation...</div>
              )}

              {dryRunResult && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded">
                      <div className="text-lg font-bold text-emerald-400">{dryRunResult.valid_rows_count}</div>
                      <div className="text-[10px] text-emerald-400">Valid Rows</div>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded">
                      <div className="text-lg font-bold text-amber-400">{dryRunResult.warning_rows_count}</div>
                      <div className="text-[10px] text-amber-400">Warnings</div>
                    </div>
                    <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded">
                      <div className="text-lg font-bold text-rose-400">{dryRunResult.invalid_rows_count}</div>
                      <div className="text-[10px] text-rose-400">Errors (Skipped)</div>
                    </div>
                  </div>

                  <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-muted/40 text-muted-foreground uppercase font-medium">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Product</th>
                          <th className="py-2 px-3">Stock</th>
                          <th className="py-2 px-3">Price</th>
                          <th className="py-2 px-3">Validation Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {dryRunResult.previews.map((p) => (
                          <tr key={p.row_index} className="hover:bg-muted/20">
                            <td className="py-1.5 px-3 font-mono">{p.row_index}</td>
                            <td className="py-1.5 px-3 font-medium">{p.product_name}</td>
                            <td className="py-1.5 px-3">{p.stock}</td>
                            <td className="py-1.5 px-3">₹{p.price}</td>
                            <td className="py-1.5 px-3">
                              {p.errors.length > 0 ? (
                                <span className="text-rose-400 font-bold">Error: {p.errors.join(", ")}</span>
                              ) : p.warnings.length > 0 ? (
                                <span className="text-amber-400">Warning: {p.warnings.join(", ")}</span>
                              ) : (
                                <span className="text-emerald-400">Valid</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    disabled={committing || dryRunResult.valid_rows_count === 0}
                    onClick={handleCommit}
                    className="w-full fx-btn fx-btn-primary text-xs flex items-center justify-center gap-2 py-2.5"
                  >
                    <ArrowRight className="w-4 h-4" />
                    {committing ? "Committing Database Changes..." : `Confirm & Commit ${dryRunResult.valid_rows_count} Rows`}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "export" && (
            <div className="space-y-4 py-2">
              <div>
                <label className="block font-medium mb-1">Select Dataset to Export</label>
                <select
                  className="fx-select"
                  value={exportType}
                  onChange={(e) => setExportType(e.target.value)}
                >
                  <option value="products">Product Catalog & Master Balances</option>
                  <option value="ledger">Immutable Inventory Audit Ledger</option>
                </select>
              </div>

              <div className="p-4 bg-muted/20 border border-border rounded-lg space-y-2">
                <h4 className="font-semibold text-foreground">Exporting Kirana Data</h4>
                <p className="text-muted-foreground text-[11px]">
                  Downloads complete UTF-8 encoded CSV file compatible with Excel, Google Sheets, and accounting software.
                </p>
              </div>

              <button
                onClick={handleExport}
                className="w-full fx-btn fx-btn-primary text-xs flex items-center justify-center gap-2 py-2.5"
              >
                <Download className="w-4 h-4" /> Download CSV Export File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
