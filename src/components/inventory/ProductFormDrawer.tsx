"use client";

import { useState, useEffect } from "react";
import { X, Save, RefreshCw, Barcode } from "lucide-react";
import { ProductCatalogItem } from "@/lib/inventory/types";
import { BarcodeEngine } from "@/lib/inventory/barcode-engine";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  product?: ProductCatalogItem | null;
  storeId: string;
  onSaved: () => void;
}

export function ProductFormDrawer({ isOpen, onClose, product, storeId, onSaved }: Props) {
  const [activeTab, setActiveTab] = useState<"general" | "pricing" | "barcode" | "stock">("general");

  const [productName, setProductName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [category, setCategory] = useState("Staples & Grains");
  const [brand, setBrand] = useState("Aashirvaad");
  const [supplier, setSupplier] = useState("ITC Foods Distributor");
  const [purchasePrice, setPurchasePrice] = useState("0");
  const [sellingPrice, setSellingPrice] = useState("0");
  const [mrp, setMrp] = useState("0");
  const [gstRate, setGstRate] = useState("5");
  const [hsnCode, setHsnCode] = useState("1001");
  const [unit, setUnit] = useState("pack");
  const [openingStock, setOpeningStock] = useState("50");
  const [minStock, setMinStock] = useState("10");
  const [maxStock, setMaxStock] = useState("200");
  const [reorderPoint, setReorderPoint] = useState("15");
  const [safetyStock, setSafetyStock] = useState("10");
  const [expiryDate, setExpiryDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      const p = product as unknown as Record<string, unknown>;
      setProductName((p.name as string) || (p.product_name as string) || "");
      setSku((p.sku as string) || "");
      setBarcode((p.barcode as string) || "");
      setCategory((p.category as string) || "General");
      setBrand((p.brand as string) || "Generic");
      setSupplier((p.supplier as string) || "Direct");
      setPurchasePrice(String(p.purchase_price || 0));
      setSellingPrice(String(p.price || p.selling_price || 0));
      setMrp(String(p.mrp || 0));
      setGstRate(String(p.gst_rate || 5));
      setHsnCode((p.hsn_code as string) || "");
      setUnit((p.unit as string) || "pcs");
      setOpeningStock(String(p.current_stock || 0));
      setMinStock(String(p.min_stock || 10));
      setMaxStock(String(p.max_stock || 100));
      setReorderPoint(String(p.reorder_point || 15));
      setSafetyStock(String(p.safety_stock || 10));
      setExpiryDate((p.expiry_date as string) || "");
    } else {
      setProductName("");
      setSku("");
      setBarcode(BarcodeEngine.generateEAN13());
      setCategory("Staples & Grains");
      setBrand("Aashirvaad");
      setSupplier("ITC Foods Distributor");
      setPurchasePrice("0");
      setSellingPrice("0");
      setMrp("0");
      setGstRate("5");
      setHsnCode("1001");
      setUnit("pack");
      setOpeningStock("50");
      setMinStock("10");
      setMaxStock("200");
      setReorderPoint("15");
      setSafetyStock("10");
      setExpiryDate("");
    }
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        storeId,
        productName,
        sku,
        barcode,
        category,
        brand,
        supplier,
        purchasePrice,
        sellingPrice,
        mrp,
        gstRate,
        hsnCode,
        unit,
        openingStock,
        minStock,
        maxStock,
        reorderPoint,
        safetyStock,
        expiryDate,
      };

      const url = product ? `/api/inventory/${product.id}` : "/api/inventory";
      const method = product ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to save product");
      }

      onSaved();
      onClose();
    } catch (err) {
      alert("Error saving product. Please check input values.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in">
      <div className="w-full max-w-xl bg-background h-full border-l border-border flex flex-col justify-between shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {product ? "Edit Product Details" : "Create New Kirana Product"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Inventory 2.0 Catalog Entry & Stock Controls
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-border px-5 text-xs font-medium">
          <button
            onClick={() => setActiveTab("general")}
            className={`py-3 px-4 border-b-2 transition-colors ${
              activeTab === "general" ? "border-accent text-accent" : "border-transparent text-muted-foreground"
            }`}
          >
            General Info
          </button>
          <button
            onClick={() => setActiveTab("pricing")}
            className={`py-3 px-4 border-b-2 transition-colors ${
              activeTab === "pricing" ? "border-accent text-accent" : "border-transparent text-muted-foreground"
            }`}
          >
            Pricing & GST
          </button>
          <button
            onClick={() => setActiveTab("barcode")}
            className={`py-3 px-4 border-b-2 transition-colors ${
              activeTab === "barcode" ? "border-accent text-accent" : "border-transparent text-muted-foreground"
            }`}
          >
            Barcode & Bar
          </button>
          <button
            onClick={() => setActiveTab("stock")}
            className={`py-3 px-4 border-b-2 transition-colors ${
              activeTab === "stock" ? "border-accent text-accent" : "border-transparent text-muted-foreground"
            }`}
          >
            Stock & Reorder
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-4">
          {activeTab === "general" && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-medium mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  className="fx-input"
                  placeholder="e.g. Aashirvaad Shudh Chakki Atta 5kg"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Category</label>
                  <input
                    type="text"
                    className="fx-input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Brand</label>
                  <input
                    type="text"
                    className="fx-input"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Supplier</label>
                  <input
                    type="text"
                    className="fx-input"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">SKU</label>
                  <input
                    type="text"
                    className="fx-input font-mono"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "pricing" && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium mb-1">Purchase Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="fx-input"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="fx-input"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="fx-input"
                    value={mrp}
                    onChange={(e) => setMrp(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">GST Rate (%)</label>
                  <select
                    className="fx-select"
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                  >
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5% (Staples)</option>
                    <option value="12">12% (Processed Foods)</option>
                    <option value="18">18% (Standard FMCG)</option>
                    <option value="28">28% (Luxury)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">HSN Code</label>
                  <input
                    type="text"
                    className="fx-input font-mono"
                    value={hsnCode}
                    onChange={(e) => setHsnCode(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "barcode" && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-medium mb-1">EAN-13 / Barcode *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="fx-input font-mono flex-1"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setBarcode(BarcodeEngine.generateEAN13())}
                    className="fx-btn fx-btn-outline text-xs flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Auto-Gen
                  </button>
                </div>
              </div>

              <div className="p-4 bg-muted/40 rounded-lg border border-border flex flex-col items-center justify-center">
                <div dangerouslySetInnerHTML={{ __html: BarcodeEngine.renderBarcodeSVG(barcode || "8901000000000") }} />
              </div>
            </div>
          )}

          {activeTab === "stock" && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Opening Stock</label>
                  <input
                    type="number"
                    className="fx-input"
                    value={openingStock}
                    onChange={(e) => setOpeningStock(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Unit</label>
                  <select
                    className="fx-select"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  >
                    <option value="pcs">Piece (pcs)</option>
                    <option value="pack">Pack</option>
                    <option value="box">Box</option>
                    <option value="ctn">Carton (ctn)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="g">Gram (g)</option>
                    <option value="l">Liter (l)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Min Stock Threshold</label>
                  <input
                    type="number"
                    className="fx-input"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Reorder Point</label>
                  <input
                    type="number"
                    className="fx-input"
                    value={reorderPoint}
                    onChange={(e) => setReorderPoint(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">Expiry Date (Optional)</label>
                <input
                  type="date"
                  className="fx-input"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="fx-btn fx-btn-outline text-xs">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="fx-btn fx-btn-primary text-xs flex items-center gap-2">
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
