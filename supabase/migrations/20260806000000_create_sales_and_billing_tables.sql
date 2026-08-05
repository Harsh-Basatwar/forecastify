-- Migration: Sales & Billing Module Tables & Ledger
-- Description: Creates normalized schema for sales, sale items, customers, payments, returns, and inventory ledger audit logs.

-- 1. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    gstin TEXT,
    address TEXT,
    total_purchases NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Sales Table (Orders)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'completed', -- 'draft', 'completed', 'cancelled', 'refunded'
    cashier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_pct NUMERIC(5, 2) DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) DEFAULT 0.00,
    tax_pct NUMERIC(5, 2) DEFAULT 18.00,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00,
    round_off NUMERIC(6, 2) DEFAULT 0.00,
    grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_status TEXT NOT NULL DEFAULT 'paid', -- 'pending', 'paid', 'partially_paid', 'refunded'
    payment_method TEXT NOT NULL DEFAULT 'cash', -- 'cash', 'upi', 'card', 'split'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT sales_invoice_store_unique UNIQUE (store_id, invoice_number)
);

-- 3. Sale Items Table
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    sku TEXT,
    category TEXT,
    unit TEXT DEFAULT 'pcs',
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    mrp NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    purchase_price NUMERIC(12, 2) DEFAULT 0.00,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_pct NUMERIC(5, 2) DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Sales Payments Table (for single or split payments)
CREATE TABLE IF NOT EXISTS public.sales_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    payment_method TEXT NOT NULL, -- 'cash', 'upi', 'card'
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    transaction_ref TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Sales Returns Table
CREATE TABLE IF NOT EXISTS public.sales_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    sale_item_id UUID REFERENCES public.sale_items(id) ON DELETE SET NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    refund_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    reason TEXT,
    restock_inventory BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Inventory Ledger Audit Log Table
CREATE TABLE IF NOT EXISTS public.inventory_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    previous_stock NUMERIC(10, 2) NOT NULL,
    change_amount NUMERIC(10, 2) NOT NULL, -- negative for sales, positive for returns/restock
    new_stock NUMERIC(10, 2) NOT NULL,
    transaction_type TEXT NOT NULL, -- 'sale', 'return', 'manual_adjustment'
    reference_id UUID, -- points to sale_id or return_id
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Disable Row Level Security (RLS) on new sales tables to match project convention
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_returns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_ledger DISABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_store ON public.customers(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_store_date ON public.sales(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON public.sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_payments_sale ON public.sales_payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_store_product ON public.inventory_ledger(store_id, product_id);
