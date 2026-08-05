import { CartItem, CartTotals, PaymentSplit, CouponCode } from "./types/sales";

/**
 * Standard GST tax rate (18% default for general grocery, customizable per item)
 */
export const DEFAULT_GST_RATE = 18;

/**
 * Pre-defined promotional coupons
 */
export const AVAILABLE_COUPONS: CouponCode[] = [
  { code: "FORECAST10", discount_type: "percentage", value: 10, description: "10% Instant Off on entire bill" },
  { code: "FLAT50", discount_type: "flat", value: 50, description: "₹50 flat discount on orders above ₹500" },
  { code: "GROCERY5", discount_type: "percentage", value: 5, description: "5% Super Saver Discount" },
  { code: "WELCOME100", discount_type: "flat", value: 100, description: "₹100 flat discount for new store customers" },
];

/**
 * Safely format numbers to 2 decimal places to avoid floating point errors
 */
export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Standardized Indian Rupee currency formatter
 */
export function formatINR(amount: number): string {
  const rounded = round2(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
  }).format(rounded);
}

/**
 * Calculates item-level subtotal, tax amount, and final total
 */
export function calculateItemTotals(
  unitPrice: number,
  quantity: number,
  discountPct: number = 0,
  taxPct: number = DEFAULT_GST_RATE,
  mrp: number = unitPrice
): {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
} {
  const safeQty = Math.max(0, quantity);
  const safePrice = Math.max(0, unitPrice);
  const rawSubtotal = round2(safePrice * safeQty);

  const discountAmount = round2((rawSubtotal * Math.min(100, Math.max(0, discountPct))) / 100);
  const taxableAmount = Math.max(0, round2(rawSubtotal - discountAmount));

  // GST is assumed to be exclusive or inclusive; standard billing calculates GST on taxable amount
  const taxAmount = round2((taxableAmount * Math.max(0, taxPct)) / 100);
  const total = round2(taxableAmount + taxAmount);

  return {
    subtotal: rawSubtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    total,
  };
}

/**
 * Computes complete cart breakdown live (Subtotal, GST, Coupons, Round off, Grand Total)
 */
export function calculateCartTotals(
  items: CartItem[],
  appliedCoupon?: CouponCode | null,
  orderDiscountPct: number = 0
): CartTotals {
  let subtotal = 0;
  let totalMRP = 0;
  let itemDiscounts = 0;
  let totalTax = 0;

  items.forEach((item) => {
    const itemCalc = calculateItemTotals(
      item.unit_price,
      item.quantity,
      item.discount_pct,
      item.tax_pct,
      item.mrp
    );
    subtotal += itemCalc.subtotal;
    totalMRP += round2(item.mrp * item.quantity);
    itemDiscounts += itemCalc.discountAmount;
    totalTax += itemCalc.taxAmount;
  });

  subtotal = round2(subtotal);
  totalMRP = round2(totalMRP);
  itemDiscounts = round2(itemDiscounts);
  totalTax = round2(totalTax);

  // Apply order-level percentage discount
  let orderDiscountAmount = 0;
  if (orderDiscountPct > 0) {
    orderDiscountAmount = round2((subtotal * Math.min(100, orderDiscountPct)) / 100);
  }

  // Apply coupon discount
  let couponDiscount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === "flat") {
      couponDiscount = Math.min(subtotal, appliedCoupon.value);
    } else {
      couponDiscount = round2((subtotal * appliedCoupon.value) / 100);
    }
  }

  const totalDiscount = round2(itemDiscounts + orderDiscountAmount + couponDiscount);
  const mrpSavings = Math.max(0, round2(totalMRP - subtotal + totalDiscount));

  const taxableAmount = Math.max(0, round2(subtotal - orderDiscountAmount - couponDiscount));
  
  // CGST and SGST split evenly (50% each for intrastate GST)
  const cgst = round2(totalTax / 2);
  const sgst = round2(totalTax / 2);

  const rawTotal = round2(taxableAmount + totalTax);

  // Round off calculation to whole rupee
  const roundedGrandTotal = Math.round(rawTotal);
  const roundOff = round2(roundedGrandTotal - rawTotal);

  return {
    subtotal,
    total_mrp: totalMRP,
    mrp_savings: mrpSavings,
    item_discounts: itemDiscounts,
    coupon_discount: couponDiscount,
    total_discount: totalDiscount,
    taxable_amount: taxableAmount,
    cgst,
    sgst,
    total_tax: totalTax,
    raw_total: rawTotal,
    round_off: roundOff,
    grand_total: roundedGrandTotal,
  };
}

/**
 * Validates split payments against the order grand total
 */
export function validateSplitPayment(
  grandTotal: number,
  splits: PaymentSplit[]
): {
  isValid: boolean;
  totalPaid: number;
  remaining: number;
  errorMessage?: string;
} {
  const totalPaid = round2(splits.reduce((acc, curr) => acc + Math.max(0, curr.amount), 0));
  const remaining = round2(grandTotal - totalPaid);

  if (Math.abs(remaining) < 0.01) {
    return { isValid: true, totalPaid: grandTotal, remaining: 0 };
  }

  if (totalPaid > grandTotal) {
    return {
      isValid: false,
      totalPaid,
      remaining,
      errorMessage: `Overpaid by ${formatINR(Math.abs(remaining))}. Please adjust payment split.`,
    };
  }

  return {
    isValid: false,
    totalPaid,
    remaining,
    errorMessage: `Remaining balance of ${formatINR(remaining)} to be settled.`,
  };
}

/**
 * Generates sequential store invoice number
 */
export function generateInvoiceNumber(sequenceIndex: number = 1): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const seqStr = String(sequenceIndex).padStart(4, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${dateStr}-${seqStr}-${rand}`;
}

/**
 * Generates UPI Deep Link / Payment QR payload
 */
export function generateUPIPayload(
  vpa: string = "forecastify@upi",
  payeeName: string = "Forecastify Store",
  amount: number = 0,
  invoiceNo: string = ""
): string {
  const safeAmount = round2(amount).toFixed(2);
  const encodedName = encodeURIComponent(payeeName);
  const encodedNote = encodeURIComponent(`Bill ${invoiceNo}`);
  return `upi://pay?pa=${vpa}&pn=${encodedName}&am=${safeAmount}&cu=INR&tn=${encodedNote}`;
}
