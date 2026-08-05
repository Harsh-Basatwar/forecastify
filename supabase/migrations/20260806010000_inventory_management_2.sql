-- Migration: Inventory Management 2.0 Database Schema
-- Description: Complete enterprise schema with domain separation, RLS security policies, multi-outlet storage, product variants, FEFO/FIFO batch tracking, stock reservation, supplier price history, and immutable ledger logging.

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Categories Table (Hierarchical)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT,
    parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Brands Table
CREATE TABLE IF NOT EXISTS public.brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    manufacturer TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    gstin TEXT,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    lead_time_days INTEGER DEFAULT 3,
    payment_terms TEXT DEFAULT 'Net 30',
    rating NUMERIC(3, 2) DEFAULT 5.00,
    is_preferred BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Units Table (Supports Base Units & Custom Conversions)
CREATE TABLE IF NOT EXISTS public.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for system-wide defaults
    name TEXT NOT NULL, -- e.g., 'Carton', 'Pack', 'Piece', 'Kg', 'Gram', 'Liter', 'Milliliter'
    abbreviation TEXT NOT NULL, -- e.g., 'ctn', 'pk', 'pc', 'kg', 'g', 'l', 'ml'
    base_unit_id UUID REFERENCES public.units(id),
    conversion_factor NUMERIC(12, 4) DEFAULT 1.0000,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Storage Locations Table (3-Tier Outlet Hierarchy: Store -> Warehouse -> Shelf)
CREATE TABLE IF NOT EXISTS public.storage_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    outlet_name TEXT NOT NULL DEFAULT 'Main Store',
    warehouse_name TEXT NOT NULL DEFAULT 'Primary Warehouse',
    shelf_code TEXT DEFAULT 'Shelf A1',
    location_type TEXT NOT NULL DEFAULT 'storefront', -- 'storefront', 'warehouse', 'cold_storage', 'shelf'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Products Table (Catalog Metadata)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    barcode TEXT,
    hsn_code TEXT,
    gst_rate NUMERIC(5, 2) DEFAULT 0.00,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'DRAFT', 'ACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED', 'ARCHIVED'
    is_archived BOOLEAN DEFAULT false,
    images JSONB DEFAULT '{"primary": "", "thumbnail": "", "gallery": []}'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Product Variants Table
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_name TEXT NOT NULL, -- e.g. "500g Pack", "1kg Box"
    sku TEXT,
    barcode TEXT,
    mrp NUMERIC(12, 2) DEFAULT 0.00,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    purchase_price NUMERIC(12, 2) DEFAULT 0.00,
    unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
    attributes JSONB DEFAULT '{}'::jsonb, -- e.g. {"size": "500g", "flavor": "Masala"}
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Supplier Prices Table (Historical Supplier Pricing & Lead Times)
CREATE TABLE IF NOT EXISTS public.supplier_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    minimum_order_qty NUMERIC(10, 2) DEFAULT 1.00,
    lead_time_days INTEGER DEFAULT 3,
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Enhance legacy public.inventory / Create multi-location Inventory table
-- We ensure public.inventory can act both as location balance and main product balance link
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.storage_locations(id) ON DELETE SET NULL;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS available_stock NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS reserved_stock NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS on_order_stock NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS incoming_stock NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS min_stock NUMERIC(10, 2) DEFAULT 5.00;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS max_stock NUMERIC(10, 2) DEFAULT 100.00;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS reorder_point NUMERIC(10, 2) DEFAULT 10.00;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS safety_stock NUMERIC(10, 2) DEFAULT 5.00;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS mrp NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5, 2) DEFAULT 0.00;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS hsn_code TEXT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 10. Product Batches Table (FEFO & Cost Lineage)
CREATE TABLE IF NOT EXISTS public.product_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    lot_number TEXT,
    mfg_date DATE,
    expiry_date DATE NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    invoice_ref TEXT,
    received_date DATE DEFAULT CURRENT_DATE,
    cost_price NUMERIC(12, 2) DEFAULT 0.00,
    purchase_price NUMERIC(12, 2) DEFAULT 0.00,
    initial_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    current_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status TEXT DEFAULT 'active', -- 'active', 'expired', 'exhausted', 'quarantined'
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Stock Adjustments Table
CREATE TABLE IF NOT EXISTS public.stock_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES public.product_batches(id) ON DELETE SET NULL,
    location_id UUID REFERENCES public.storage_locations(id) ON DELETE SET NULL,
    adjustment_type TEXT NOT NULL, -- 'add', 'remove', 'damaged', 'expired', 'lost', 'found', 'reconciliation'
    quantity_change NUMERIC(10, 2) NOT NULL,
    previous_stock NUMERIC(10, 2) NOT NULL,
    new_stock NUMERIC(10, 2) NOT NULL,
    reason TEXT,
    adjusted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Stock Transfers Table (Multi-Outlet Location Transfers)
CREATE TABLE IF NOT EXISTS public.stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    source_location_id UUID REFERENCES public.storage_locations(id) ON DELETE SET NULL,
    dest_location_id UUID REFERENCES public.storage_locations(id) ON DELETE SET NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    status TEXT DEFAULT 'completed', -- 'pending', 'in_transit', 'completed', 'cancelled'
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Multi-Granularity Inventory Snapshots Table (Hourly, Daily, Weekly, Monthly)
CREATE TABLE IF NOT EXISTS public.inventory_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    granularity TEXT NOT NULL DEFAULT 'daily', -- 'hourly', 'daily', 'weekly', 'monthly'
    snapshot_timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    total_products INTEGER DEFAULT 0,
    total_stock_qty NUMERIC(12, 2) DEFAULT 0,
    total_inventory_value NUMERIC(14, 2) DEFAULT 0,
    low_stock_count INTEGER DEFAULT 0,
    expired_count INTEGER DEFAULT 0,
    carrying_cost NUMERIC(12, 2) DEFAULT 0,
    turnover_rate NUMERIC(6, 2) DEFAULT 0,
    dead_stock_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. Inventory Settings Table
CREATE TABLE IF NOT EXISTS public.inventory_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    valuation_method TEXT DEFAULT 'FEFO', -- 'FIFO', 'FEFO', 'LIFO', 'AVG'
    auto_reorder_enabled BOOLEAN DEFAULT false,
    default_low_stock_threshold INTEGER DEFAULT 10,
    expiry_alert_days INTEGER DEFAULT 30,
    barcode_prefix TEXT DEFAULT 'FC',
    allow_negative_stock BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. Inventory Audit Logs Table (With Rollback Data Buffer)
CREATE TABLE IF NOT EXISTS public.inventory_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'MERGE', 'STOCK_RESERVE', 'STOCK_DEDUCT', 'ADJUSTMENT', 'TRANSFER', 'IMPORT'
    entity_type TEXT NOT NULL, -- 'PRODUCT', 'VARIANT', 'BATCH', 'SUPPLIER', 'STOCK'
    entity_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on all new tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Store Isolation (store_id = auth.uid())
-- Categories
CREATE POLICY categories_store_isolation ON public.categories FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
-- Brands
CREATE POLICY brands_store_isolation ON public.brands FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
-- Suppliers
CREATE POLICY suppliers_store_isolation ON public.suppliers FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
-- Units (Allows store specific or global NULL units)
CREATE POLICY units_store_isolation ON public.units FOR ALL USING (store_id IS NULL OR store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
-- Storage Locations
CREATE POLICY locations_store_isolation ON public.storage_locations FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
-- Products
CREATE POLICY products_store_isolation ON public.products FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
-- Product Variants
CREATE POLICY variants_store_isolation ON public.product_variants FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
-- Supplier Prices
CREATE POLICY supplier_prices_store_isolation ON public.supplier_prices FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
-- Product Batches
CREATE POLICY batches_store_isolation ON public.product_batches FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
-- Stock Adjustments
CREATE POLICY adjustments_store_isolation ON public.stock_adjustments FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
-- Stock Transfers
CREATE POLICY transfers_store_isolation ON public.stock_transfers FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
-- Inventory Snapshots
CREATE POLICY snapshots_store_isolation ON public.inventory_snapshots FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
-- Inventory Settings
CREATE POLICY settings_store_isolation ON public.inventory_settings FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
-- Audit Logs
CREATE POLICY audit_logs_store_isolation ON public.inventory_audit_logs FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());

-- Indexes for maximum performance
CREATE INDEX IF NOT EXISTS idx_products_store_status ON public.products(store_id, status);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(store_id, barcode);
CREATE INDEX IF NOT EXISTS idx_variants_product ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_store_product ON public.inventory(store_id, product_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON public.product_batches(store_id, expiry_date, status);
CREATE INDEX IF NOT EXISTS idx_supplier_prices_supplier ON public.supplier_prices(supplier_id, product_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_store_granularity ON public.inventory_snapshots(store_id, granularity, snapshot_timestamp DESC);
