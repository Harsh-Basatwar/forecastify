export type SaleStatus = "draft" | "completed" | "cancelled" | "refunded";

export type PaymentMethod = "cash" | "upi" | "card" | "split";

export type SinglePaymentMethod = "cash" | "upi" | "card";

export interface Customer {
  id: string;
  store_id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  address?: string | null;
  total_purchases: number;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product_id: string;
  product_name: string;
  sku?: string | null;
  category: string;
  unit: string;
  mrp: number;
  unit_price: number;
  purchase_price: number;
  quantity: number;
  available_stock: number;
  discount_pct: number;
  discount_amount: number;
  tax_pct: number; // e.g. 18%
  tax_amount: number;
  subtotal: number;
  total: number;
}

export interface PaymentSplit {
  method: SinglePaymentMethod;
  amount: number;
  transaction_ref?: string;
}

export interface CouponCode {
  code: string;
  discount_type: "flat" | "percentage";
  value: number;
  description: string;
}

export interface CartTotals {
  subtotal: number;
  total_mrp: number;
  mrp_savings: number;
  item_discounts: number;
  coupon_discount: number;
  total_discount: number;
  taxable_amount: number;
  cgst: number;
  sgst: number;
  total_tax: number;
  raw_total: number;
  round_off: number;
  grand_total: number;
}

export interface SaleTransaction {
  id: string;
  store_id: string;
  invoice_number: string;
  customer_id?: string | null;
  customer?: Customer | null;
  status: SaleStatus;
  cashier_id?: string | null;
  subtotal: number;
  discount_pct: number;
  discount_amount: number;
  tax_pct: number;
  tax_amount: number;
  round_off: number;
  grand_total: number;
  payment_status: "pending" | "paid" | "partially_paid" | "refunded";
  payment_method: PaymentMethod;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  items?: SaleItem[];
  payments?: SalePayment[];
  returns?: SaleReturn[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id?: string | null;
  product_name: string;
  sku?: string | null;
  category: string;
  unit: string;
  unit_price: number;
  mrp: number;
  purchase_price: number;
  quantity: number;
  subtotal: number;
  tax_pct: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  created_at: string;
}

export interface SalePayment {
  id: string;
  sale_id: string;
  payment_method: SinglePaymentMethod;
  amount: number;
  transaction_ref?: string | null;
  created_at: string;
}

export interface SaleReturn {
  id: string;
  sale_id: string;
  sale_item_id?: string | null;
  quantity: number;
  refund_amount: number;
  reason?: string | null;
  restock_inventory: boolean;
  created_at: string;
}

export interface InventoryLedgerEntry {
  id: string;
  store_id: string;
  product_id?: string | null;
  product_name: string;
  previous_stock: number;
  change_amount: number;
  new_stock: number;
  transaction_type: "sale" | "return" | "manual_adjustment";
  reference_id?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface SalesAnalyticsSummary {
  gross_sales: number;
  net_sales: number;
  total_revenue: number;
  total_profit: number;
  total_orders: number;
  total_units_sold: number;
  average_order_value: number;
  total_tax_collected: number;
  total_discounts_given: number;
  hourly_sales: Array<{ hour: string; sales: number; orders: number }>;
  daily_sales: Array<{ date: string; sales: number; profit: number; orders: number }>;
  category_sales: Array<{ category: string; sales: number; units: number; pct: number }>;
  top_products: Array<{ product_name: string; quantity: number; revenue: number; profit: number }>;
  payment_method_breakdown: Array<{ method: string; total: number; count: number }>;
}

export interface VoiceBillingCommand {
  raw_transcript: string;
  parsed_action: "add_item" | "remove_item" | "update_quantity" | "clear_cart";
  product_query?: string;
  matched_product_name?: string;
  matched_product_id?: string;
  quantity?: number;
  confidence: number;
}
