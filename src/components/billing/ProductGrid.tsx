"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Search, Barcode, Plus, Minus, Tag, Zap, Heart, Check, AlertCircle, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/billing-utils";

export interface CatalogProduct {
  id: string;
  product_name: string;
  category: string;
  price: number;
  mrp?: number;
  current_stock: number;
  unit: string;
  brand?: string;
  sku?: string;
  purchase_price?: number;
  expiry_date?: string;
}

interface ProductGridProps {
  products: CatalogProduct[];
  loading: boolean;
  onAddToCart: (product: CatalogProduct, qty?: number) => void;
  fastBillingMode: boolean;
}

export default function ProductGrid({
  products,
  loading,
  onAddToCart,
  fastBillingMode,
}: ProductGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [addedAnimationId, setAddedAnimationId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Category list derived from products
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["All", ...Array.from(set).sort()];
  }, [products]);

  // Keyboard shortcut listener (F2 focuses search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filtered product catalog
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        product.product_name.toLowerCase().includes(q) ||
        (product.sku && product.sku.toLowerCase().includes(q)) ||
        (product.brand && product.brand.toLowerCase().includes(q)) ||
        product.category.toLowerCase().includes(q);

      const matchesCategory =
        selectedCategory === "All" || product.category === selectedCategory;

      const matchesFav = !showFavoritesOnly || favorites.has(product.id);

      return matchesSearch && matchesCategory && matchesFav;
    });
  }, [products, searchQuery, selectedCategory, showFavoritesOnly, favorites]);

  // Handle barcode search exact match auto-add in fast mode
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Exact SKU or barcode match auto-add
    const exactMatch = products.find(
      (p) => p.sku && p.sku.toLowerCase() === searchQuery.trim().toLowerCase()
    );

    if (exactMatch && exactMatch.current_stock > 0) {
      triggerAddToCart(exactMatch);
      setSearchQuery("");
    } else if (filteredProducts.length === 1 && filteredProducts[0].current_stock > 0) {
      triggerAddToCart(filteredProducts[0]);
      setSearchQuery("");
    }
  };

  const toggleFavorite = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const triggerAddToCart = (product: CatalogProduct) => {
    if (product.current_stock <= 0) return;
    onAddToCart(product, 1);
    setAddedAnimationId(product.id);
    setTimeout(() => setAddedAnimationId(null), 600);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Search Bar & Barcode Scanner Row */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2.5 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search product by name, brand, SKU or scan barcode (F2)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="fx-input pl-10 pr-10 text-sm h-11 w-full"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => searchInputRef.current?.focus()}
          title="Barcode Scanner Mode (HotKey: F2)"
          className="fx-btn fx-btn-outline h-11 px-3.5 flex items-center gap-2 text-xs shrink-0"
        >
          <Barcode className="w-4 h-4 text-accent" />
          <span className="hidden sm:inline">Scan (F2)</span>
        </button>
        <button
          type="button"
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={cn(
            "fx-btn h-11 px-3 flex items-center gap-1.5 text-xs shrink-0",
            showFavoritesOnly
              ? "bg-accent/15 text-accent border border-accent/30"
              : "fx-btn-outline"
          )}
        >
          <Heart className={cn("w-4 h-4", showFavoritesOnly && "fill-accent text-accent")} />
          <span className="hidden md:inline">Favorites</span>
        </button>
      </form>

      {/* Category Pills Slider */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none shrink-0">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
              selectedCategory === cat
                ? "bg-accent text-accent-foreground border-accent font-semibold shadow-xs"
                : "bg-secondary/40 text-muted-foreground border-border hover:text-foreground hover:bg-secondary"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product Cards Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="fx-card p-4 space-y-3 animate-pulse">
                <div className="h-4 bg-muted/60 rounded w-3/4" />
                <div className="h-3 bg-muted/40 rounded w-1/2" />
                <div className="h-6 bg-muted/50 rounded w-1/3 pt-2" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6 border border-dashed border-border rounded-xl">
            <ShoppingBag className="w-10 h-10 text-muted-foreground/50 mb-3" />
            <h3 className="text-sm font-semibold text-foreground">No Products Found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              No items match your search criteria. Try clearing filters or searching for another SKU.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => {
              const isOutOfStock = product.current_stock <= 0;
              const isLowStock = product.current_stock > 0 && product.current_stock <= 10;
              const isFav = favorites.has(product.id);
              const isJustAdded = addedAnimationId === product.id;
              const mrpVal = product.mrp || product.price;
              const discountPct = mrpVal > product.price ? Math.round(((mrpVal - product.price) / mrpVal) * 100) : 0;

              return (
                <div
                  key={product.id}
                  onClick={() => triggerAddToCart(product)}
                  className={cn(
                    "fx-card p-3.5 flex flex-col justify-between relative group cursor-pointer transition-all duration-150 border",
                    isOutOfStock
                      ? "opacity-60 grayscale cursor-not-allowed bg-muted/20 border-border"
                      : isJustAdded
                      ? "border-accent ring-2 ring-accent/30 bg-accent/5 scale-[1.02]"
                      : "hover:border-accent/60 hover:shadow-md bg-card"
                  )}
                >
                  {/* Top Badges Row */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-[10px] font-medium text-muted-foreground truncate px-1.5 py-0.5 rounded bg-secondary">
                      {product.category}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(product.id, e)}
                      className="p-1 text-muted-foreground hover:text-accent transition-colors"
                    >
                      <Heart
                        className={cn("w-3.5 h-3.5", isFav && "fill-accent text-accent")}
                      />
                    </button>
                  </div>

                  {/* Title & Brand */}
                  <div>
                    <h4 className="text-xs font-semibold text-foreground line-clamp-2 leading-tight group-hover:text-accent transition-colors">
                      {product.product_name}
                    </h4>
                    {product.brand && (
                      <p className="text-[10.5px] text-muted-foreground mt-0.5">{product.brand}</p>
                    )}
                  </div>

                  {/* Stock Badge & Price Row */}
                  <div className="mt-3 pt-2.5 border-t border-border/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1",
                          isOutOfStock
                            ? "bg-danger-soft text-danger"
                            : isLowStock
                            ? "bg-warning/15 text-warning font-bold"
                            : "bg-success/15 text-success"
                        )}
                      >
                        {isOutOfStock ? (
                          <>
                            <AlertCircle className="w-2.5 h-2.5" /> Out of stock
                          </>
                        ) : isLowStock ? (
                          <>
                            <Zap className="w-2.5 h-2.5" /> {product.current_stock} {product.unit} left
                          </>
                        ) : (
                          <>{product.current_stock} {product.unit} in stock</>
                        )}
                      </span>

                      {discountPct > 0 && (
                        <span className="text-[10px] font-bold text-accent bg-accent/10 px-1 rounded">
                          {discountPct}% OFF
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-sm font-bold text-foreground">
                          {formatINR(product.price)}
                        </span>
                        {mrpVal > product.price && (
                          <span className="text-[11px] text-muted-foreground line-through ml-1.5">
                            {formatINR(mrpVal)}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerAddToCart(product);
                        }}
                        className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                          isJustAdded
                            ? "bg-success text-white"
                            : isOutOfStock
                            ? "bg-muted text-muted-foreground cursor-not-allowed"
                            : "bg-accent/10 text-accent hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        {isJustAdded ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
