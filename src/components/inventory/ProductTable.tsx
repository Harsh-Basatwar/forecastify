"use client";

import { useState } from "react";
import { Search, Filter, Edit3, Trash2, Archive, Barcode, Plus, Layers, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCatalogItem } from "@/lib/inventory/types";

interface Props {
  products: ProductCatalogItem[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  onPageChange: (newPage: number) => void;
  onSearchChange: (q: string) => void;
  onStatusFilterChange: (s: string) => void;
  onCategoryFilterChange: (c: string) => void;
  onEditProduct: (p: ProductCatalogItem) => void;
  onAdjustStock: (p: ProductCatalogItem) => void;
  onArchiveProduct: (id: string) => void;
  onSelectBulk: (selectedIds: string[]) => void;
  onOpenCreateModal: () => void;
}

export function ProductTable({
  products,
  total,
  page,
  limit,
  loading,
  onPageChange,
  onSearchChange,
  onStatusFilterChange,
  onCategoryFilterChange,
  onEditProduct,
  onAdjustStock,
  onArchiveProduct,
  onSelectBulk,
  onOpenCreateModal,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const all = products.map((p) => p.id);
      setSelectedIds(all);
      onSelectBulk(all);
    } else {
      setSelectedIds([]);
      onSelectBulk([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const updated = checked ? [...selectedIds, id] : selectedIds.filter((item) => item !== id);
    setSelectedIds(updated);
    onSelectBulk(updated);
  };

  const formatINR = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(val);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <span className="fx-badge fx-badge-success text-[11px]">Active</span>;
      case "DRAFT":
        return <span className="fx-badge text-[11px] bg-slate-800 text-slate-300">Draft</span>;
      case "OUT_OF_STOCK":
        return <span className="fx-badge fx-badge-danger text-[11px]">Out of Stock</span>;
      case "DISCONTINUED":
        return <span className="fx-badge text-[11px] bg-amber-950 text-amber-300">Discontinued</span>;
      case "ARCHIVED":
        return <span className="fx-badge text-[11px] bg-slate-900 text-slate-400">Archived</span>;
      default:
        return <span className="fx-badge text-[11px]">{status}</span>;
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="fx-card p-6 space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products by name, barcode, SKU, brand, category..."
              className="fx-input pl-9 text-sm"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                onSearchChange(e.target.value);
              }}
            />
          </div>
          <select
            className="fx-select text-xs w-36"
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
            <option value="DISCONTINUED">Discontinued</option>
          </select>
        </div>

        <button onClick={onOpenCreateModal} className="fx-btn fx-btn-primary flex items-center gap-2 text-xs">
          <Plus className="w-4 h-4" /> Add New Product
        </button>
      </div>

      {/* Bulk Toolbar */}
      {selectedIds.length > 0 && (
        <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 flex items-center justify-between text-xs">
          <span className="font-medium text-accent">{selectedIds.length} items selected</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => selectedIds.forEach(onArchiveProduct)}
              className="fx-btn fx-btn-outline text-xs text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
            >
              <Archive className="w-3.5 h-3.5" /> Archive Selected
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground font-medium uppercase tracking-wider">
              <th className="py-3 px-3 w-8">
                <input
                  type="checkbox"
                  className="rounded bg-background border-border text-accent focus:ring-accent"
                  checked={selectedIds.length === products.length && products.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th className="py-3 px-3">Product Name</th>
              <th className="py-3 px-3">Category & Brand</th>
              <th className="py-3 px-3">Barcode / SKU</th>
              <th className="py-3 px-3">Stock Level</th>
              <th className="py-3 px-3">Selling Price</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {loading ? (
              [0, 1, 2, 3, 4].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={8} className="py-4 px-3">
                    <div className="skeleton-shimmer h-4 w-full" />
                  </td>
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted-foreground">
                  No products found matching filters.
                </td>
              </tr>
            ) : (
              products.map((item) => {
                const stock = (item as unknown as { current_stock?: number }).current_stock ?? 0;
                const isLow = stock <= 10;

                return (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-3">
                      <input
                        type="checkbox"
                        className="rounded bg-background border-border text-accent focus:ring-accent"
                        checked={selectedIds.includes(item.id)}
                        onChange={(e) => handleSelectOne(item.id, e.target.checked)}
                      />
                    </td>
                    <td className="py-3 px-3 font-semibold text-foreground">
                      {item.name}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">
                      <div>{(item as unknown as { category?: string }).category || "General"}</div>
                      <div className="text-[10px] text-muted-foreground/70">{(item as unknown as { brand?: string }).brand || "Generic"}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 text-accent font-mono text-[11px]">
                        <Barcode className="w-3.5 h-3.5" /> {item.barcode || (item as unknown as { sku?: string }).sku || "—"}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-medium">
                      <span className={isLow ? "text-rose-400 font-bold" : "text-emerald-400"}>
                        {stock} {(item as unknown as { unit?: string }).unit || "pcs"}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-foreground">
                      {formatINR((item as unknown as { price?: number }).price || 0)}
                    </td>
                    <td className="py-3 px-3">
                      {getStatusBadge(item.status || "ACTIVE")}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onAdjustStock(item)}
                          className="p-1.5 rounded hover:bg-muted text-accent"
                          title="Quick Stock Adjustment"
                        >
                          <Layers className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditProduct(item)}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Edit Product"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onArchiveProduct(item.id)}
                          className="p-1.5 rounded hover:bg-muted text-rose-400"
                          title="Archive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
        <div>
          Showing {Math.min((page - 1) * limit + 1, total)} to {Math.min(page * limit, total)} of {total} products
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="fx-btn fx-btn-outline p-1.5 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="fx-btn fx-btn-outline p-1.5 disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
