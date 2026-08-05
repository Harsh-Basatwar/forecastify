import assert from "node:assert/strict";
import { test, describe } from "node:test";
import {
  calculateItemTotals,
  calculateCartTotals,
  validateSplitPayment,
  generateInvoiceNumber,
  round2,
} from "../lib/billing-utils";
import { CartItem, CouponCode, PaymentSplit } from "../lib/types/sales";

describe("Sales & Billing Utilities - Unit Tests", () => {
  test("calculateItemTotals calculates subtotal, 18% GST tax, and total accurately", () => {
    // 5 units at ₹100 each = ₹500 subtotal. 18% GST = ₹90. Total = ₹590.
    const res = calculateItemTotals(100, 5, 0, 18, 100);
    assert.equal(res.subtotal, 500);
    assert.equal(res.discountAmount, 0);
    assert.equal(res.taxableAmount, 500);
    assert.equal(res.taxAmount, 90);
    assert.equal(res.total, 590);
  });

  test("calculateItemTotals handles item discount percentage", () => {
    // 2 units at ₹200 each = ₹400 subtotal. 10% discount = ₹40. Taxable = ₹360. 18% GST = ₹64.80. Total = ₹424.80
    const res = calculateItemTotals(200, 2, 10, 18, 200);
    assert.equal(res.subtotal, 400);
    assert.equal(res.discountAmount, 40);
    assert.equal(res.taxableAmount, 360);
    assert.equal(res.taxAmount, 64.8);
    assert.equal(res.total, 424.8);
  });

  test("calculateCartTotals calculates live cart subtotal, coupons, CGST/SGST, round-off, and grand total", () => {
    const mockItems: CartItem[] = [
      {
        product_id: "prod-1",
        product_name: "Aashirvaad Atta 5kg",
        category: "Staples & Grains",
        unit: "pack",
        mrp: 310,
        unit_price: 310,
        purchase_price: 260,
        quantity: 2,
        available_stock: 50,
        discount_pct: 0,
        discount_amount: 0,
        tax_pct: 18,
        tax_amount: 111.6,
        subtotal: 620,
        total: 731.6,
      },
      {
        product_id: "prod-2",
        product_name: "Amul Butter 100g",
        category: "Dairy & Beverages",
        unit: "pack",
        mrp: 56,
        unit_price: 56,
        purchase_price: 48,
        quantity: 3,
        available_stock: 30,
        discount_pct: 0,
        discount_amount: 0,
        tax_pct: 18,
        tax_amount: 30.24,
        subtotal: 168,
        total: 198.24,
      },
    ];

    const coupon: CouponCode = {
      code: "FLAT50",
      discount_type: "flat",
      value: 50,
      description: "₹50 flat discount",
    };

    const totals = calculateCartTotals(mockItems, coupon, 0);

    assert.equal(totals.subtotal, 788); // 620 + 168
    assert.equal(totals.coupon_discount, 50);
    assert.equal(totals.taxable_amount, 738); // 788 - 50
    assert.equal(totals.total_tax, 141.84);
    assert.equal(totals.cgst, 70.92);
    assert.equal(totals.sgst, 70.92);
    assert.equal(totals.raw_total, 879.84);
    assert.equal(totals.grand_total, 880);
    assert.equal(totals.round_off, 0.16);
  });

  test("validateSplitPayment validates exact matches, overpayments, and underpayments", () => {
    const grandTotal = 1200;

    // Case 1: Exact match
    const validSplits: PaymentSplit[] = [
      { method: "cash", amount: 500 },
      { method: "upi", amount: 700 },
    ];
    const res1 = validateSplitPayment(grandTotal, validSplits);
    assert.equal(res1.isValid, true);
    assert.equal(res1.remaining, 0);

    // Case 2: Underpaid
    const underpaidSplits: PaymentSplit[] = [
      { method: "cash", amount: 500 },
      { method: "upi", amount: 500 },
    ];
    const res2 = validateSplitPayment(grandTotal, underpaidSplits);
    assert.equal(res2.isValid, false);
    assert.equal(res2.remaining, 200);

    // Case 3: Overpaid
    const overpaidSplits: PaymentSplit[] = [
      { method: "cash", amount: 700 },
      { method: "card", amount: 600 },
    ];
    const res3 = validateSplitPayment(grandTotal, overpaidSplits);
    assert.equal(res3.isValid, false);
    assert.equal(res3.remaining, -100);
  });

  test("generateInvoiceNumber returns formatted invoice string", () => {
    const invNo = generateInvoiceNumber(42);
    assert.match(invNo, /^INV-\d{8}-0042-\d{4}$/);
  });
});
