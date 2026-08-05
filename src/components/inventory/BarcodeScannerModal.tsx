"use client";

import { useState } from "react";
import { X, Barcode, Printer, Camera, Search } from "lucide-react";
import { BarcodeEngine, BarcodeSymbology } from "@/lib/inventory/barcode-engine";
import { ProductCatalogItem } from "@/lib/inventory/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  products: ProductCatalogItem[];
}

export function BarcodeScannerModal({ isOpen, onClose, products }: Props) {
  const [scannedCode, setScannedCode] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductCatalogItem | null>(null);
  const [symbology, setSymbology] = useState<BarcodeSymbology>("EAN-13");

  if (!isOpen) return null;

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedCode) return;

    const matched = products.find(
      (p) =>
        p.barcode === scannedCode ||
        (p as unknown as { sku?: string }).sku === scannedCode ||
        p.name.toLowerCase().includes(scannedCode.toLowerCase())
    );

    setSelectedProduct(matched || null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-background rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Barcode className="w-5 h-5 text-accent" />
            <h3 className="text-sm font-bold text-foreground">Barcode Reader & SVG Label Generator</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Scanner Input */}
          <form onSubmit={handleScanSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                autoFocus
                placeholder="Scan with USB Scanner or type Barcode / EAN-13..."
                className="fx-input pl-9 font-mono text-sm"
                value={scannedCode}
                onChange={(e) => setScannedCode(e.target.value)}
              />
            </div>
            <button type="submit" className="fx-btn fx-btn-primary text-xs">
              Search Barcode
            </button>
          </form>

          {/* Result Card */}
          {selectedProduct ? (
            <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-foreground">{selectedProduct.name}</h4>
                  <div className="text-[11px] text-muted-foreground">Category: {(selectedProduct as unknown as { category?: string }).category || "General"}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-400">₹{(selectedProduct as unknown as { price?: number }).price || 0}</div>
                  <div className="text-[11px] text-muted-foreground">Stock: {(selectedProduct as unknown as { current_stock?: number }).current_stock || 0} pcs</div>
                </div>
              </div>

              {/* Barcode Render */}
              <div className="p-4 bg-white rounded border flex flex-col items-center justify-center">
                <div
                  dangerouslySetInnerHTML={{
                    __html: BarcodeEngine.renderBarcodeSVG(
                      selectedProduct.barcode || scannedCode || "8901000000000",
                      symbology
                    ),
                  }}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <select
                  className="fx-select text-xs w-36"
                  value={symbology}
                  onChange={(e) => setSymbology(e.target.value as BarcodeSymbology)}
                >
                  <option value="EAN-13">EAN-13 (Standard)</option>
                  <option value="EAN-8">EAN-8</option>
                  <option value="UPC-A">UPC-A</option>
                  <option value="CODE128">Code128</option>
                </select>
                <button
                  onClick={() => window.print()}
                  className="fx-btn fx-btn-outline text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Barcode Label
                </button>
              </div>
            </div>
          ) : scannedCode ? (
            <div className="p-4 text-center text-rose-400 bg-rose-500/10 rounded border border-rose-500/20">
              No matching product found for scanned code: <span className="font-mono font-bold">{scannedCode}</span>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground space-y-2">
              <Camera className="w-8 h-8 mx-auto text-muted-foreground/60" />
              <p>Ready for scanning. Connect a USB Barcode scanner or scan with keyboard input.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
