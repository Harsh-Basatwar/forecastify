"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShoppingBag,
  Zap,
  UserPlus,
  RotateCcw,
  Sparkles,
  Keyboard,
  Receipt,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import ProductGrid, { CatalogProduct } from "@/components/billing/ProductGrid";
import CartDrawer from "@/components/billing/CartDrawer";
import PaymentModal from "@/components/billing/PaymentModal";
import InvoiceModal from "@/components/billing/InvoiceModal";
import VoiceBillingBar from "@/components/billing/VoiceBillingBar";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { CartItem, Customer, CouponCode, PaymentMethod, PaymentSplit, SaleTransaction } from "@/lib/types/sales";
import { calculateItemTotals, DEFAULT_GST_RATE } from "@/lib/billing-utils";

export default function BillingPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponCode | null>(null);
  const [orderDiscountPct, setOrderDiscountPct] = useState(0);
  const [notes, setNotes] = useState("");
  const [fastBillingMode, setFastBillingMode] = useState(false);

  // Modals state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<SaleTransaction | null>(null);
  const [processingSale, setProcessingSale] = useState(false);

  // Customer search form state inside CustomerModal
  const [custSearch, setCustSearch] = useState("");
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custGstin, setCustGstin] = useState("");
  const [custResults, setCustResults] = useState<Customer[]>([]);
  const [custLoading, setCustLoading] = useState(false);

  // Store metadata
  const [storeInfo, setStoreInfo] = useState<{ store_name?: string; store_address?: string; gstin?: string }>({});

  // Fetch catalog products
  const fetchProducts = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("inventory")
      .select("*")
      .eq("store_id", user.id)
      .order("product_name", { ascending: true });

    if (data) {
      setProducts(data as CatalogProduct[]);
    }
    setLoading(false);

    // Fetch store info
    const { data: profile } = await supabase
      .from("profiles")
      .select("store_name, store_address")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      setStoreInfo({
        store_name: profile.store_name,
        store_address: profile.store_address,
      });
    }
  }, [user?.id]);

  // Restore cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("forecastify_pos_cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCartItems(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed to restore cart from localStorage", e);
    }
  }, []);

  // Persist cart to localStorage on state changes
  useEffect(() => {
    try {
      if (cartItems.length > 0) {
        localStorage.setItem("forecastify_pos_cart", JSON.stringify(cartItems));
      } else {
        localStorage.removeItem("forecastify_pos_cart");
      }
    } catch (e) {
      console.warn("Failed to persist cart to localStorage", e);
    }
  }, [cartItems]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Keyboard Hotkeys Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F4") {
        e.preventDefault();
        setShowCustomerModal(true);
      } else if (e.key === "F8") {
        e.preventDefault();
        if (cartItems.length > 0) setShowPaymentModal(true);
      } else if (e.key === "F9") {
        e.preventDefault();
        if (cartItems.length > 0) setShowPaymentModal(true);
      } else if (e.key === "Escape") {
        setShowPaymentModal(false);
        setShowCustomerModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cartItems]);

  // Cart operations
  const handleAddToCart = (product: CatalogProduct, addQty: number = 1) => {
    setCartItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.product_id === product.id);
      const mrp = product.mrp || product.price;

      if (existingIdx >= 0) {
        const copy = [...prev];
        const newQty = copy[existingIdx].quantity + addQty;
        const calc = calculateItemTotals(product.price, newQty, copy[existingIdx].discount_pct, DEFAULT_GST_RATE, mrp);

        copy[existingIdx] = {
          ...copy[existingIdx],
          quantity: newQty,
          subtotal: calc.subtotal,
          discount_amount: calc.discountAmount,
          tax_amount: calc.taxAmount,
          total: calc.total,
        };
        return copy;
      } else {
        const calc = calculateItemTotals(product.price, addQty, 0, DEFAULT_GST_RATE, mrp);
        const newItem: CartItem = {
          product_id: product.id,
          product_name: product.product_name,
          sku: product.sku || null,
          category: product.category,
          unit: product.unit || "pcs",
          mrp,
          unit_price: product.price,
          purchase_price: product.purchase_price || 0,
          quantity: addQty,
          available_stock: product.current_stock,
          discount_pct: 0,
          discount_amount: calc.discountAmount,
          tax_pct: DEFAULT_GST_RATE,
          tax_amount: calc.taxAmount,
          subtotal: calc.subtotal,
          total: calc.total,
        };
        return [...prev, newItem];
      }
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product_id === productId) {
            const newQty = Math.max(0, item.quantity + delta);
            if (newQty === 0) return null;
            const calc = calculateItemTotals(item.unit_price, newQty, item.discount_pct, item.tax_pct, item.mrp);
            return {
              ...item,
              quantity: newQty,
              subtotal: calc.subtotal,
              discount_amount: calc.discountAmount,
              tax_amount: calc.taxAmount,
              total: calc.total,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleSetQuantity = (productId: string, qty: number) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.product_id === productId) {
          const calc = calculateItemTotals(item.unit_price, qty, item.discount_pct, item.tax_pct, item.mrp);
          return {
            ...item,
            quantity: qty,
            subtotal: calc.subtotal,
            discount_amount: calc.discountAmount,
            tax_amount: calc.taxAmount,
            total: calc.total,
          };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const handleClearCart = () => {
    setCartItems([]);
    setSelectedCustomer(null);
    setAppliedCoupon(null);
    setOrderDiscountPct(0);
    setNotes("");
    try {
      localStorage.removeItem("forecastify_pos_cart");
    } catch (e) {
      console.warn("Failed to clear localStorage cart", e);
    }
  };

  // Complete Sale execution API call
  const handleCompleteSale = async (
    paymentMethod: PaymentMethod,
    splits?: PaymentSplit[],
    customNotes?: string
  ) => {
    if (!user?.id || cartItems.length === 0) return;
    setProcessingSale(true);

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: user.id,
          customerId: selectedCustomer?.id || null,
          items: cartItems,
          paymentMethod,
          payments: splits || [],
          coupon: appliedCoupon,
          orderDiscountPct,
          notes: customNotes || notes,
          status: "completed",
        }),
      });

      const data = await res.json();
      setProcessingSale(false);

      if (!res.ok || data.error) {
        alert(`Error completing sale: ${data.error || "Server transaction error"}`);
        return;
      }

      // Refresh catalog stock in UI
      fetchProducts();

      // Show completed sale invoice modal
      setCompletedSale({
        ...data.sale,
        items: cartItems.map((i) => ({
          ...i,
          id: i.product_id,
          sale_id: data.sale.id,
          created_at: new Date().toISOString(),
        })),
        customer: selectedCustomer,
      });

      setShowPaymentModal(false);
      setShowInvoiceModal(true);

      // Clear cart
      handleClearCart();
    } catch (err: unknown) {
      setProcessingSale(false);
      alert(`Network error: ${err instanceof Error ? err.message : "Failed to record sale"}`);
    }
  };

  // Voice command handler
  const handleVoiceCommand = async (transcript: string) => {
    if (!user?.id) return;
    try {
      const res = await fetch("/api/sales/voice-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, storeId: user.id }),
      });
      const data = await res.json();

      if (data.command) {
        const cmd = data.command;
        if (cmd.parsed_action === "clear_cart") {
          handleClearCart();
        } else if (cmd.parsed_action === "remove_item" && cmd.product_query) {
          const match = products.find((p) =>
            p.product_name.toLowerCase().includes(cmd.product_query!.toLowerCase())
          );
          if (match) handleRemoveItem(match.id);
        } else if (cmd.parsed_action === "add_item") {
          const match = cmd.matched_product_id
            ? products.find((p) => p.id === cmd.matched_product_id)
            : products.find((p) =>
                p.product_name.toLowerCase().includes(cmd.product_query!.toLowerCase())
              );
          if (match && match.current_stock > 0) {
            handleAddToCart(match, cmd.quantity || 1);
          } else {
            alert(`Voice AI matched '${cmd.product_query}', but product is out of stock or not found.`);
          }
        }
      }
    } catch (e) {
      console.warn("Voice command error:", e);
    }
  };

  // Search / Add customer logic
  const handleSearchCustomer = async (q: string) => {
    setCustSearch(q);
    if (!q.trim() || !user?.id) {
      setCustResults([]);
      return;
    }
    setCustLoading(true);
    const res = await fetch(`/api/sales/customers?storeId=${user.id}&query=${encodeURIComponent(q)}`);
    const data = await res.json();
    setCustResults(data.customers || []);
    setCustLoading(false);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !custName.trim()) return;
    const res = await fetch("/api/sales/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: user.id,
        name: custName,
        phone: custPhone,
        email: custEmail,
        gstin: custGstin,
      }),
    });
    const data = await res.json();
    if (data.customer) {
      setSelectedCustomer(data.customer);
      setShowCustomerModal(false);
      setCustName("");
      setCustPhone("");
      setCustEmail("");
      setCustGstin("");
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top POS Header & Mode Switches */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground fx-display">
              POS & Fast Billing
            </h1>
            <span className="fx-badge bg-accent/15 text-accent text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Zap className="w-3 h-3" /> Live Inventory Connected
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Record sales, generate instant GST invoices, update stock ledgers, and feed Jarvis AI predictions.
          </p>
        </div>

        {/* Hotkeys Quick Ref Bar */}
        <div className="flex items-center gap-2 overflow-x-auto text-[11px] text-muted-foreground bg-secondary/30 px-3 py-1.5 rounded-lg border border-border/60">
          <Keyboard className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="font-semibold text-foreground">HotKeys:</span>
          <span><strong className="text-accent">F2</strong> Search</span>
          <span>•</span>
          <span><strong className="text-accent">F4</strong> Customer</span>
          <span>•</span>
          <span><strong className="text-accent">F8</strong> Split</span>
          <span>•</span>
          <span><strong className="text-accent">F9</strong> Cash</span>
        </div>
      </div>

      {/* Voice Assistant NLP Component */}
      <VoiceBillingBar onProcessVoiceCommand={handleVoiceCommand} loading={loading} />

      {/* Main Billing Workspace: Grid (Left) + Cart (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-h-[620px]">
        {/* Left Column: Product Search & Catalog Grid */}
        <div className="lg:col-span-7 xl:col-span-8 h-[650px] flex flex-col">
          <ProductGrid
            products={products}
            loading={loading}
            onAddToCart={handleAddToCart}
            fastBillingMode={fastBillingMode}
          />
        </div>

        {/* Right Column: Active Cart & Billing Drawer */}
        <div className="lg:col-span-5 xl:col-span-4 h-[650px]">
          <CartDrawer
            items={cartItems}
            customer={selectedCustomer}
            onUpdateQuantity={handleUpdateQuantity}
            onSetQuantity={handleSetQuantity}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            onOpenCustomerModal={() => setShowCustomerModal(true)}
            onRemoveCustomer={() => setSelectedCustomer(null)}
            onProceedToPayment={() => setShowPaymentModal(true)}
            orderDiscountPct={orderDiscountPct}
            setOrderDiscountPct={setOrderDiscountPct}
            appliedCoupon={appliedCoupon}
            setAppliedCoupon={setAppliedCoupon}
            notes={notes}
            setNotes={setNotes}
          />
        </div>
      </div>

      {/* Payment Settlement Modal */}
      <PaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        grandTotal={
          cartItems.reduce((acc, item) => acc + item.unit_price * item.quantity, 0)
        }
        onCompleteSale={handleCompleteSale}
        processing={processingSale}
      />

      {/* Printable Invoice Modal */}
      <InvoiceModal
        open={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        sale={completedSale}
        storeDetails={storeInfo}
      />

      {/* Customer Attachment / Registration Modal */}
      <Modal
        open={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        title="Attach Customer to Invoice"
        description="Search existing customer or register a new one"
      >
        <div className="space-y-4 text-xs">
          {/* Search Existing */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Search Customer (Name or Phone)
            </label>
            <input
              type="text"
              placeholder="e.g. Rahul Sharma or 9876543210"
              value={custSearch}
              onChange={(e) => handleSearchCustomer(e.target.value)}
              className="fx-input h-10"
              autoFocus
            />
          </div>

          {custResults.length > 0 && (
            <div className="max-h-36 overflow-y-auto divide-y divide-border border border-border rounded-lg">
              {custResults.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedCustomer(c);
                    setShowCustomerModal(false);
                  }}
                  className="p-2 hover:bg-secondary cursor-pointer flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold text-foreground">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">{c.phone || "No phone"}</p>
                  </div>
                  <button className="fx-btn fx-btn-outline text-[11px] h-6 px-2">Select</button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-border pt-3">
            <p className="font-semibold text-foreground mb-2">Or Register New Customer</p>
            <form onSubmit={handleCreateCustomer} className="space-y-2.5">
              <input
                required
                placeholder="Full Name *"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                className="fx-input h-9 text-xs"
              />
              <input
                placeholder="Mobile Phone (e.g. 9876543210)"
                value={custPhone}
                onChange={(e) => setCustPhone(e.target.value)}
                className="fx-input h-9 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="Email"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  className="fx-input h-9 text-xs"
                />
                <input
                  placeholder="GSTIN (Optional)"
                  value={custGstin}
                  onChange={(e) => setCustGstin(e.target.value)}
                  className="fx-input h-9 text-xs"
                />
              </div>
              <button type="submit" className="fx-btn fx-btn-accent w-full h-9 text-xs font-semibold">
                Register & Select Customer
              </button>
            </form>
          </div>
        </div>
      </Modal>
    </div>
  );
}
