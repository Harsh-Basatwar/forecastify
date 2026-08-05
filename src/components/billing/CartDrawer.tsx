"use client";

import React, { useState } from "react";
import {
  Trash2,
  Plus,
  Minus,
  UserCheck,
  UserPlus,
  Tag,
  Receipt,
  Percent,
  X,
  CreditCard,
  Banknote,
  QrCode,
  Layers,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatINR, calculateCartTotals, AVAILABLE_COUPONS } from "@/lib/billing-utils";
import { CartItem, Customer, CouponCode } from "@/lib/types/sales";

interface CartDrawerProps {
  items: CartItem[];
  customer: Customer | null;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onSetQuantity: (productId: string, qty: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onOpenCustomerModal: () => void;
  onRemoveCustomer: () => void;
  onProceedToPayment: () => void;
  orderDiscountPct: number;
  setOrderDiscountPct: (pct: number) => void;
  appliedCoupon: CouponCode | null;
  setAppliedCoupon: (coupon: CouponCode | null) => void;
  notes: string;
  setNotes: (notes: string) => void;
}

export default function CartDrawer({
  items,
  customer,
  onUpdateQuantity,
  onSetQuantity,
  onRemoveItem,
  onClearCart,
  onOpenCustomerModal,
  onRemoveCustomer,
  onProceedToPayment,
  orderDiscountPct,
  setOrderDiscountPct,
  appliedCoupon,
  setAppliedCoupon,
  notes,
  setNotes,
}: CartDrawerProps) {
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");

  const totals = calculateCartTotals(items, appliedCoupon, orderDiscountPct);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError("");
    if (!couponInput.trim()) return;

    const found = AVAILABLE_COUPONS.find(
      (c) => c.code.toUpperCase() === couponInput.trim().toUpperCase()
    );

    if (found) {
      setAppliedCoupon(found);
      setCouponInput("");
    } else {
      setCouponError("Invalid coupon code.");
    }
  };

  return (
    <div className="fx-card p-4 flex flex-col h-full bg-card border-border shadow-sm">
      {/* Header Row */}
      <div className="flex items-center justify-between pb-3 border-b border-border/80 shrink-0">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Active Order</h2>
          <span className="text-xs font-bold bg-accent/15 text-accent px-2 py-0.5 rounded-full">
            {items.reduce((acc, i) => acc + i.quantity, 0)} items
          </span>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={onClearCart}
            className="text-xs text-muted-foreground hover:text-danger flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear Cart
          </button>
        )}
      </div>

      {/* Customer Attachment Bar */}
      <div className="py-2.5 border-b border-border/60 shrink-0">
        {customer ? (
          <div className="flex items-center justify-between bg-accent/10 border border-accent/25 px-3 py-2 rounded-lg">
            <div className="flex items-center gap-2 min-w-0">
              <UserCheck className="w-4 h-4 text-accent shrink-0" />
              <div className="truncate">
                <p className="text-xs font-semibold text-foreground truncate">{customer.name}</p>
                <p className="text-[10.5px] text-muted-foreground truncate">{customer.phone || "No phone"}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onRemoveCustomer}
              className="text-muted-foreground hover:text-danger p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenCustomerModal}
            className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground bg-secondary/30 hover:bg-secondary/60 border border-dashed border-border px-3 py-2 rounded-lg transition-colors"
          >
            <span className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-accent" /> Attach Customer (F4)
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
            <Receipt className="w-8 h-8 opacity-40 mb-2" />
            <p className="text-xs font-medium">Cart is empty</p>
            <p className="text-[11px] opacity-75 mt-0.5">Click product cards or scan barcode to add items</p>
          </div>
        ) : (
          items.map((item) => {
            const lineTotal = item.unit_price * item.quantity;
            return (
              <div
                key={item.product_id}
                className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-secondary/20 hover:bg-secondary/40 border border-border/40 transition-colors text-xs"
              >
                {/* Item Details */}
                <div className="min-w-0 flex-1">
                  <h5 className="font-semibold text-foreground truncate">{item.product_name}</h5>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                    <span>{formatINR(item.unit_price)}</span>
                    {item.mrp > item.unit_price && (
                      <span className="line-through text-[10px] opacity-70">
                        {formatINR(item.mrp)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.product_id, -1)}
                    className="w-6 h-6 rounded bg-card hover:bg-muted border border-border flex items-center justify-center text-foreground"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      onSetQuantity(item.product_id, Math.max(1, Number(e.target.value) || 1))
                    }
                    className="w-10 text-center font-bold fx-num fx-input py-0.5 px-0 h-6 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.product_id, 1)}
                    className="w-6 h-6 rounded bg-card hover:bg-muted border border-border flex items-center justify-center text-foreground"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Subtotal & Delete */}
                <div className="text-right shrink-0 min-w-[60px]">
                  <p className="font-bold text-foreground">{formatINR(lineTotal)}</p>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.product_id)}
                    className="text-muted-foreground hover:text-danger transition-colors p-0.5 mt-0.5 inline-block"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Coupon & Discounts Accordion */}
      {items.length > 0 && (
        <div className="pt-2 border-t border-border/80 space-y-2 shrink-0">
          {/* Coupon Code Row */}
          <form onSubmit={handleApplyCoupon} className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Coupon code (e.g. FORECAST10)"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                className="fx-input pl-8 py-1 h-8 text-xs uppercase"
              />
            </div>
            <button type="submit" className="fx-btn fx-btn-outline h-8 text-xs px-2.5">
              Apply
            </button>
          </form>

          {appliedCoupon && (
            <div className="flex items-center justify-between text-xs bg-success/10 border border-success/30 text-success px-2.5 py-1 rounded">
              <span className="flex items-center gap-1 font-semibold">
                <Sparkles className="w-3.5 h-3.5" /> Coupon `{appliedCoupon.code}` Applied
              </span>
              <button
                type="button"
                onClick={() => setAppliedCoupon(null)}
                className="hover:opacity-80"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {couponError && <p className="text-[11px] text-danger">{couponError}</p>}
        </div>
      )}

      {/* Bill Summary Calculation Box */}
      <div className="mt-3 pt-3 border-t border-border space-y-1.5 text-xs shrink-0 bg-secondary/10 p-3 rounded-lg">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatINR(totals.subtotal)}</span>
        </div>

        {totals.mrp_savings > 0 && (
          <div className="flex justify-between text-success font-medium">
            <span>MRP Discount Savings</span>
            <span>-{formatINR(totals.mrp_savings)}</span>
          </div>
        )}

        {totals.coupon_discount > 0 && (
          <div className="flex justify-between text-accent font-medium">
            <span>Coupon Discount</span>
            <span>-{formatINR(totals.coupon_discount)}</span>
          </div>
        )}

        <div className="flex justify-between text-muted-foreground">
          <span>CGST (9%) + SGST (9%)</span>
          <span>+{formatINR(totals.total_tax)}</span>
        </div>

        {totals.round_off !== 0 && (
          <div className="flex justify-between text-muted-foreground/80 text-[11px]">
            <span>Round Off</span>
            <span>{totals.round_off > 0 ? `+${totals.round_off}` : totals.round_off}</span>
          </div>
        )}

        <div className="flex justify-between items-baseline pt-2 border-t border-border/80 text-sm font-extrabold text-foreground">
          <span>Grand Total</span>
          <span className="text-base text-accent">{formatINR(totals.grand_total)}</span>
        </div>
      </div>

      {/* Checkout Action Button */}
      <div className="mt-3 shrink-0">
        <button
          type="button"
          disabled={items.length === 0}
          onClick={onProceedToPayment}
          className="fx-btn fx-btn-accent w-full h-11 text-sm font-bold flex items-center justify-center gap-2 shadow-md fx-press"
        >
          <Banknote className="w-4 h-4" /> Pay & Generate Invoice ({formatINR(totals.grand_total)})
        </button>
      </div>
    </div>
  );
}
