export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'OUT_OF_STOCK' | 'DISCONTINUED' | 'ARCHIVED';

export type Granularity = 'hourly' | 'daily' | 'weekly' | 'monthly';

export type LocationType = 'storefront' | 'warehouse' | 'cold_storage' | 'shelf';

export type AdjustmentType =
  | 'add'
  | 'remove'
  | 'damaged'
  | 'expired'
  | 'lost'
  | 'found'
  | 'reconciliation';

export type StockTransactionType =
  | 'SALE_RESERVE'
  | 'SALE_DEDUCT'
  | 'SALE_CANCEL'
  | 'RETURN'
  | 'PURCHASE_RECEIVE'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'ADJUSTMENT'
  | 'EXPIRED_DISPOSAL'
  | 'IMPORT';

export interface ImageGallery {
  primary: string;
  thumbnail: string;
  compressed?: string;
  webp?: string;
  gallery: string[];
}

export interface ProductCatalogItem {
  id: string;
  store_id: string;
  name: string;
  brand_id?: string;
  category_id?: string;
  barcode?: string;
  hsn_code?: string;
  gst_rate: number;
  description?: string;
  status: ProductStatus;
  is_archived: boolean;
  images: ImageGallery;
  tags: string[];
  created_at: string;
  updated_at: string;

  // Joined metadata
  brand_name?: string;
  category_name?: string;
  variants?: ProductVariantItem[];
  inventory_balance?: InventoryBalanceItem;
  active_batches?: ProductBatchItem[];
  supplier_prices?: SupplierPriceItem[];
}

export interface ProductVariantItem {
  id: string;
  store_id: string;
  product_id: string;
  variant_name: string;
  sku?: string;
  barcode?: string;
  mrp: number;
  selling_price: number;
  purchase_price: number;
  unit_id?: string;
  unit_name?: string;
  attributes: Record<string, string | number>;
  created_at: string;
}

export interface StorageLocationItem {
  id: string;
  store_id: string;
  outlet_name: string;
  warehouse_name: string;
  shelf_code: string;
  location_type: LocationType;
  description?: string;
}

export interface InventoryBalanceItem {
  id: string;
  store_id: string;
  product_id: string;
  variant_id?: string;
  location_id?: string;
  total_stock: number;
  available_stock: number;
  reserved_stock: number;
  on_order_stock: number;
  incoming_stock: number;
  min_stock: number;
  max_stock: number;
  reorder_point: number;
  safety_stock: number;
  updated_at: string;
}

export interface ProductBatchItem {
  id: string;
  store_id: string;
  product_id: string;
  variant_id?: string;
  batch_number: string;
  lot_number?: string;
  mfg_date?: string;
  expiry_date: string;
  supplier_id?: string;
  supplier_name?: string;
  invoice_ref?: string;
  received_date: string;
  cost_price: number;
  purchase_price: number;
  initial_quantity: number;
  current_quantity: number;
  status: 'active' | 'expired' | 'exhausted' | 'quarantined';
}

export interface SupplierItem {
  id: string;
  store_id: string;
  name: string;
  gstin?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  lead_time_days: number;
  payment_terms: string;
  rating: number;
  is_preferred: boolean;
  notes?: string;
}

export interface SupplierPriceItem {
  id: string;
  store_id: string;
  supplier_id: string;
  supplier_name?: string;
  product_id: string;
  variant_id?: string;
  purchase_price: number;
  minimum_order_qty: number;
  lead_time_days: number;
  valid_from: string;
  valid_until?: string;
}

export interface UnitConversionRule {
  id: string;
  name: string;
  abbreviation: string;
  base_unit_id?: string;
  base_unit_name?: string;
  conversion_factor: number;
}

export interface InventoryLedgerEntry {
  id: string;
  store_id: string;
  product_id: string;
  product_name: string;
  previous_stock: number;
  change_amount: number;
  new_stock: number;
  transaction_type: StockTransactionType | string;
  reference_id?: string;
  notes?: string;
  batch_id?: string;
  created_at: string;
}

export interface DomainInventoryEvent {
  event:
    | 'inventory.stock.adjusted'
    | 'inventory.stock.reserved'
    | 'inventory.stock.deducted'
    | 'inventory.stock.released'
    | 'inventory.batch.expired'
    | 'inventory.po.received'
    | 'inventory.product.merged';
  product_id: string;
  product_name: string;
  sku?: string;
  quantity: number;
  reason: string;
  batch_number?: string;
  user_id?: string;
  store_id: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface DashboardMetricsSummary {
  total_inventory_value: number;
  total_products_count: number;
  total_stock_units: number;
  inventory_turnover: number;
  sell_through_rate: number;
  carrying_cost: number;
  stock_age_avg_days: number;
  overstock_count: number;
  understock_count: number;
  dead_stock_count: number;
  dead_stock_pct: number;
  inventory_accuracy_pct: number;
  avg_shelf_life_days: number;
  expiry_risk_count: number;
  blocked_capital: number;
}

export interface CsvDryRunResult {
  valid_rows_count: number;
  invalid_rows_count: number;
  warning_rows_count: number;
  previews: Array<{
    row_index: number;
    action: 'CREATE' | 'UPDATE' | 'SKIP';
    product_name: string;
    barcode?: string;
    category?: string;
    stock: number;
    price: number;
    warnings: string[];
    errors: string[];
  }>;
}
