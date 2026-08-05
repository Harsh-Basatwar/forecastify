/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { Package, Layers, AlertTriangle, Barcode, FileText, GitMerge, History, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ProductCatalogItem, DashboardMetricsSummary } from "@/lib/inventory/types";
import { InventoryKpiCards } from "@/components/inventory/InventoryKpiCards";
import { ProductTable } from "@/components/inventory/ProductTable";
import { ProductFormDrawer } from "@/components/inventory/ProductFormDrawer";
import { StockAdjustmentModal } from "@/components/inventory/StockAdjustmentModal";
import { BatchExpiryManager } from "@/components/inventory/BatchExpiryManager";
import { CsvImportExportModal } from "@/components/inventory/CsvImportExportModal";
import { BarcodeScannerModal } from "@/components/inventory/BarcodeScannerModal";
import { ProductMergeModal } from "@/components/inventory/ProductMergeModal";
import { InventoryLedgerView } from "@/components/inventory/InventoryLedgerView";

type ActiveTab = "products" | "expiry" | "barcodes" | "csv" | "merger" | "ledger";

export default function InventoryPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>("products");

  // State
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetricsSummary | null>(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);

  // Modals state
  const [isFormDrawerOpen, setIsFormDrawerOpen] = useState(false);
  const [selectedEditProduct, setSelectedEditProduct] = useState<ProductCatalogItem | null>(null);

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedAdjustProduct, setSelectedAdjustProduct] = useState<ProductCatalogItem | null>(null);

  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);

  const storeId = user?.id || "";

  // Fetch KPI Metrics
  const fetchMetrics = useCallback(async () => {
    if (!storeId) return;
    try {
      const res = await fetch(`/api/inventory/dashboard-summary?storeId=${storeId}`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error("Error fetching inventory metrics:", err);
    }
  }, [storeId]);

  // Fetch Products List
  const fetchProducts = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const url = `/api/inventory?storeId=${storeId}&page=${page}&limit=${limit}&query=${encodeURIComponent(
        searchQuery
      )}&status=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.items || []);
        setTotalProducts(data.total || 0);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  }, [storeId, page, limit, searchQuery, statusFilter]);

  useEffect(() => {
    if (storeId) {
      fetchMetrics();
      fetchProducts();
    }
  }, [storeId, fetchMetrics, fetchProducts]);

  const handleArchiveProduct = async (id: string) => {
    if (!confirm("Are you sure you want to archive this product?")) return;
    try {
      await fetch(`/api/inventory/${id}?storeId=${storeId}`, { method: "DELETE" });
      fetchProducts();
      fetchMetrics();
    } catch (err) {
      alert("Error archiving product.");
    }
  };

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-accent" /> Inventory Management 2.0
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enterprise Single Source of Truth for Catalog, Stock Balances, FEFO Batches, Multi-Outlet Storage & Audit Ledger.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="fx-btn fx-btn-outline text-xs flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" /> CSV Data Hub
          </button>
          <button
            onClick={() => setIsBarcodeModalOpen(true)}
            className="fx-btn fx-btn-outline text-xs flex items-center gap-1.5"
          >
            <Barcode className="w-4 h-4" /> Barcode Reader
          </button>
          <button
            onClick={() => setIsMergeModalOpen(true)}
            className="fx-btn fx-btn-outline text-xs flex items-center gap-1.5"
          >
            <GitMerge className="w-4 h-4" /> Product Merger
          </button>
          <button
            onClick={() => {
              setSelectedEditProduct(null);
              setIsFormDrawerOpen(true);
            }}
            className="fx-btn fx-btn-primary text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create Product
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <InventoryKpiCards metrics={metrics} loading={loading && !metrics} />

      {/* Module Navigation Tabs */}
      <div className="flex border-b border-border text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab("products")}
          className={`py-3 px-5 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === "products" ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Package className="w-4 h-4" /> Products Catalog & Stock
        </button>

        <button
          onClick={() => setActiveTab("expiry")}
          className={`py-3 px-5 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === "expiry" ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <AlertTriangle className="w-4 h-4" /> FEFO Expiry & Markdowns
        </button>

        <button
          onClick={() => setActiveTab("ledger")}
          className={`py-3 px-5 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === "ledger" ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="w-4 h-4" /> Stock Audit Ledger
        </button>
      </div>

      {/* Tab Views */}
      {activeTab === "products" && (
        <ProductTable
          products={products}
          total={totalProducts}
          page={page}
          limit={limit}
          loading={loading}
          onPageChange={(p) => setPage(p)}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setPage(1);
          }}
          onStatusFilterChange={(s) => {
            setStatusFilter(s);
            setPage(1);
          }}
          onCategoryFilterChange={() => {}}
          onEditProduct={(prod) => {
            setSelectedEditProduct(prod);
            setIsFormDrawerOpen(true);
          }}
          onAdjustStock={(prod) => {
            setSelectedAdjustProduct(prod);
            setIsAdjustModalOpen(true);
          }}
          onArchiveProduct={handleArchiveProduct}
          onSelectBulk={(ids) => setSelectedBulkIds(ids)}
          onOpenCreateModal={() => {
            setSelectedEditProduct(null);
            setIsFormDrawerOpen(true);
          }}
        />
      )}

      {activeTab === "expiry" && <BatchExpiryManager storeId={storeId} />}

      {activeTab === "ledger" && <InventoryLedgerView storeId={storeId} />}

      {/* Modals & Drawers */}
      <ProductFormDrawer
        isOpen={isFormDrawerOpen}
        onClose={() => setIsFormDrawerOpen(false)}
        product={selectedEditProduct}
        storeId={storeId}
        onSaved={() => {
          fetchProducts();
          fetchMetrics();
        }}
      />

      <StockAdjustmentModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        product={selectedAdjustProduct}
        storeId={storeId}
        onAdjusted={() => {
          fetchProducts();
          fetchMetrics();
        }}
      />

      <CsvImportExportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        storeId={storeId}
        onImportCompleted={() => {
          fetchProducts();
          fetchMetrics();
        }}
      />

      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        products={products}
      />

      <ProductMergeModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        products={products}
        storeId={storeId}
        onMerged={() => {
          fetchProducts();
          fetchMetrics();
        }}
      />
    </div>
  );
}
