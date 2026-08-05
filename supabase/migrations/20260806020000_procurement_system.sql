-- Migration: Procurement & Purchase Management System Schema
-- Description: Enterprise procurement schema with Purchase Orders, GRNs, Quality Checks, Supplier Performance, Price History, Approvals, Timeline, Invoices, Payments, Returns, Analytics, and RLS policies.

-- 1. Extend Suppliers Table
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS reliability_score NUMERIC(5, 2) DEFAULT 100.00;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS avg_lead_time NUMERIC(5, 2) DEFAULT 3.00;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS fill_rate NUMERIC(5, 2) DEFAULT 100.00;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS avg_delay_days NUMERIC(5, 2) DEFAULT 0.00;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS bank_account_no TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS bank_ifsc TEXT;

-- 2. Purchase Orders Table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    po_number TEXT NOT NULL,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'pending_approval', 'approved', 'sent', 'supplier_accepted', 'in_transit', 'partially_received', 'received', 'closed', 'cancelled'
    approval_status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'pending', 'approved', 'rejected'
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    expected_delivery_date DATE,
    notes TEXT,
    terms TEXT DEFAULT 'Net 30',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Purchase Order Items Table
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    supplier_sku TEXT,
    requested_qty NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    approved_qty NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    ordered_qty NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    received_qty NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    rejected_qty NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    backordered_qty NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    gst_rate NUMERIC(5, 2) DEFAULT 0.00,
    expected_delivery_date DATE,
    batch_number TEXT,
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Goods Received Notes (GRN) Table
CREATE TABLE IF NOT EXISTS public.goods_received_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    grn_number TEXT NOT NULL,
    po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    location_id UUID REFERENCES public.storage_locations(id) ON DELETE SET NULL,
    received_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    inspector_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'inspecting', -- 'received', 'inspecting', 'completed', 'rejected'
    notes TEXT,
    invoice_number TEXT,
    invoice_amount NUMERIC(14, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. GRN Items Table (Quality Check)
CREATE TABLE IF NOT EXISTS public.grn_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    grn_id UUID NOT NULL REFERENCES public.goods_received_notes(id) ON DELETE CASCADE,
    po_item_id UUID NOT NULL REFERENCES public.purchase_order_items(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    batch_number TEXT NOT NULL,
    mfg_date DATE,
    expiry_date DATE NOT NULL,
    quantity_received NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    quantity_accepted NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    quantity_rejected NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    rejection_reason TEXT,
    quality_status TEXT NOT NULL DEFAULT 'pass', -- 'pass', 'partial_pass', 'fail', 'damaged', 'expired', 'wrong_product', 'wrong_quantity', 'quarantine'
    cost_price NUMERIC(12, 2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Supplier Price History Table
CREATE TABLE IF NOT EXISTS public.supplier_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    gst_rate NUMERIC(5, 2) DEFAULT 0.00,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    invoice_ref TEXT,
    lead_time_days INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Supplier Contracts Table
CREATE TABLE IF NOT EXISTS public.supplier_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    contract_code TEXT NOT NULL,
    title TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    payment_terms TEXT DEFAULT 'Net 30',
    credit_limit NUMERIC(12, 2) DEFAULT 0.00,
    discount_percentage NUMERIC(5, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'active', -- 'draft', 'active', 'expired', 'terminated'
    document_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Supplier Documents Table
CREATE TABLE IF NOT EXISTS public.supplier_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL, -- 'gst_certificate', 'license', 'pan', 'bank_proof', 'contract'
    doc_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    mime_type TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Purchase Attachments Table
CREATE TABLE IF NOT EXISTS public.purchase_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    po_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    grn_id UUID REFERENCES public.goods_received_notes(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    file_type TEXT,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Purchase Comments Table
CREATE TABLE IF NOT EXISTS public.purchase_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL DEFAULT 'User',
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Purchase Approvals Table
CREATE TABLE IF NOT EXISTS public.purchase_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    step_number INTEGER DEFAULT 1,
    approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approver_name TEXT NOT NULL DEFAULT 'Manager',
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    comments TEXT,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Purchase Timeline Table
CREATE TABLE IF NOT EXISTS public.purchase_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    grn_id UUID REFERENCES public.goods_received_notes(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'created', 'submitted', 'approved', 'rejected', 'sent', 'accepted', 'in_transit', 'grn_created', 'stock_updated', 'closed', 'cancelled'
    description TEXT NOT NULL,
    performed_by TEXT DEFAULT 'System',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Purchase Payments Table
CREATE TABLE IF NOT EXISTS public.purchase_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    payment_number TEXT NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    payment_method TEXT DEFAULT 'bank_transfer', -- 'bank_transfer', 'upi', 'cheque', 'credit'
    status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'failed'
    payment_date DATE DEFAULT CURRENT_DATE NOT NULL,
    reference_no TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. Purchase Invoices Table
CREATE TABLE IF NOT EXISTS public.purchase_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    po_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    invoice_number TEXT NOT NULL,
    invoice_date DATE DEFAULT CURRENT_DATE NOT NULL,
    due_date DATE,
    subtotal NUMERIC(14, 2) DEFAULT 0.00,
    tax_amount NUMERIC(14, 2) DEFAULT 0.00,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status TEXT DEFAULT 'unpaid', -- 'unpaid', 'partially_paid', 'paid', 'void'
    ocr_parsed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. Purchase Returns Table
CREATE TABLE IF NOT EXISTS public.purchase_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    po_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    grn_id UUID REFERENCES public.goods_received_notes(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    return_number TEXT NOT NULL,
    return_date DATE DEFAULT CURRENT_DATE NOT NULL,
    total_amount NUMERIC(14, 2) DEFAULT 0.00,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'requested', -- 'requested', 'approved', 'shipped', 'credited'
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 16. Purchase Analytics Table
CREATE TABLE IF NOT EXISTS public.purchase_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    snapshot_date DATE DEFAULT CURRENT_DATE NOT NULL,
    total_po_count INTEGER DEFAULT 0,
    open_po_count INTEGER DEFAULT 0,
    pending_deliveries_count INTEGER DEFAULT 0,
    delayed_orders_count INTEGER DEFAULT 0,
    avg_lead_time_days NUMERIC(5, 2) DEFAULT 0.00,
    total_spend NUMERIC(14, 2) DEFAULT 0.00,
    total_savings NUMERIC(14, 2) DEFAULT 0.00,
    outstanding_payments NUMERIC(14, 2) DEFAULT 0.00,
    monthly_procurement NUMERIC(14, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 17. Purchase Settings Table
CREATE TABLE IF NOT EXISTS public.purchase_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    auto_approval_threshold NUMERIC(14, 2) DEFAULT 50000.00,
    approval_workflow_enabled BOOLEAN DEFAULT true,
    default_payment_terms TEXT DEFAULT 'Net 30',
    po_prefix TEXT DEFAULT 'PO-',
    grn_prefix TEXT DEFAULT 'GRN-',
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on all procurement tables
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_received_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_settings ENABLE ROW LEVEL SECURITY;

-- RLS Store Isolation Policies (store_id = auth.uid())
CREATE POLICY purchase_orders_store_isolation ON public.purchase_orders FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
CREATE POLICY purchase_order_items_store_isolation ON public.purchase_order_items FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
CREATE POLICY goods_received_notes_store_isolation ON public.goods_received_notes FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
CREATE POLICY grn_items_store_isolation ON public.grn_items FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
CREATE POLICY supplier_price_history_store_isolation ON public.supplier_price_history FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
CREATE POLICY supplier_contracts_store_isolation ON public.supplier_contracts FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
CREATE POLICY supplier_documents_store_isolation ON public.supplier_documents FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
CREATE POLICY purchase_attachments_store_isolation ON public.purchase_attachments FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
CREATE POLICY purchase_comments_store_isolation ON public.purchase_comments FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
CREATE POLICY purchase_approvals_store_isolation ON public.purchase_approvals FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
CREATE POLICY purchase_timeline_store_isolation ON public.purchase_timeline FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
CREATE POLICY purchase_payments_store_isolation ON public.purchase_payments FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
CREATE POLICY purchase_invoices_store_isolation ON public.purchase_invoices FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
CREATE POLICY purchase_returns_store_isolation ON public.purchase_returns FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
CREATE POLICY purchase_analytics_store_isolation ON public.purchase_analytics FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());
CREATE POLICY purchase_settings_store_isolation ON public.purchase_settings FOR ALL USING (store_id = auth.uid()) WITH CHECK (store_id = auth.uid());

-- Indexes for performance & scale
CREATE INDEX IF NOT EXISTS idx_po_store_status ON public.purchase_orders(store_id, status);
CREATE INDEX IF NOT EXISTS idx_po_number ON public.purchase_orders(store_id, po_number);
CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON public.purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_grn_po_id ON public.goods_received_notes(po_id);
CREATE INDEX IF NOT EXISTS idx_grn_items_grn_id ON public.grn_items(grn_id);
CREATE INDEX IF NOT EXISTS idx_supplier_price_history ON public.supplier_price_history(store_id, supplier_id, product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_timeline_po ON public.purchase_timeline(po_id, created_at DESC);
