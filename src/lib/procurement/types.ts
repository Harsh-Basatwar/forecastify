export type PurchaseOrderStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sent'
  | 'supplier_accepted'
  | 'in_transit'
  | 'partially_received'
  | 'received'
  | 'closed'
  | 'cancelled';

export type QualityInspectionStatus =
  | 'pass'
  | 'partial_pass'
  | 'fail'
  | 'damaged'
  | 'expired'
  | 'wrong_product'
  | 'wrong_quantity'
  | 'quarantine';

export interface PurchaseOrder {
  id: string;
  store_id: string;
  po_number: string;
  supplier_id: string;
  status: PurchaseOrderStatus;
  approval_status: 'draft' | 'pending' | 'approved' | 'rejected';
  total_amount: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  expected_delivery_date?: string | null;
  notes?: string | null;
  terms?: string | null;
  created_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  sent_at?: string | null;
  accepted_at?: string | null;
  received_at?: string | null;
  closed_at?: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  // Joins
  supplier?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    gstin?: string;
    reliability_score?: number;
    avg_lead_time?: number;
  };
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  store_id: string;
  po_id: string;
  product_id: string;
  variant_id?: string | null;
  supplier_sku?: string | null;
  requested_qty: number;
  approved_qty: number;
  ordered_qty: number;
  received_qty: number;
  rejected_qty: number;
  backordered_qty: number;
  purchase_price: number;
  discount: number;
  gst_rate: number;
  expected_delivery_date?: string | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  product?: {
    id: string;
    name: string;
    barcode?: string;
  };
  variant?: {
    id: string;
    variant_name: string;
    sku?: string;
  };
}

export interface GoodsReceivedNote {
  id: string;
  store_id: string;
  grn_number: string;
  po_id: string;
  supplier_id: string;
  location_id?: string | null;
  received_date: string;
  inspector_id?: string | null;
  status: 'received' | 'inspecting' | 'completed' | 'rejected';
  notes?: string | null;
  invoice_number?: string | null;
  invoice_amount: number;
  created_at: string;
  updated_at: string;
  items?: GRNItem[];
}

export interface GRNItem {
  id: string;
  store_id: string;
  grn_id: string;
  po_item_id: string;
  product_id: string;
  variant_id?: string | null;
  batch_number: string;
  mfg_date?: string | null;
  expiry_date: string;
  quantity_received: number;
  quantity_accepted: number;
  quantity_rejected: number;
  rejection_reason?: string | null;
  quality_status: QualityInspectionStatus;
  cost_price: number;
  notes?: string | null;
  created_at: string;
  // Joins
  product?: {
    id: string;
    name: string;
  };
}

export interface SupplierPriceHistoryEntry {
  id: string;
  store_id: string;
  supplier_id: string;
  product_id: string;
  variant_id?: string | null;
  purchase_price: number;
  gst_rate: number;
  discount: number;
  date: string;
  invoice_ref?: string | null;
  lead_time_days: number;
  created_at: string;
}

export interface AIProcurementRecommendation {
  id: string;
  product_id: string;
  product_name: string;
  variant_id?: string;
  recommended_supplier_id: string;
  recommended_supplier_name: string;
  recommended_qty: number;
  recommended_purchase_date: string;
  expected_delivery_date: string;
  expected_cost: number;
  expected_savings: number;
  reasoning: {
    why_reorder: string;
    why_quantity: string;
    why_supplier: string;
    risk_if_ignored: string;
    expected_stockout_date: string;
  };
  metrics: {
    current_stock: number;
    reserved_stock: number;
    incoming_stock: number;
    sales_velocity: number;
    safety_stock: number;
    lead_time_days: number;
  };
}

export interface ProcurementEvent {
  event:
    | 'purchase.created'
    | 'purchase.approved'
    | 'purchase.sent'
    | 'purchase.received'
    | 'purchase.closed'
    | 'grn.created'
    | 'supplier.updated'
    | 'purchase.cancelled';
  po_id?: string;
  grn_id?: string;
  supplier_id?: string;
  store_id: string;
  user_id?: string;
  timestamp: string;
  details: Record<string, any>;
}
