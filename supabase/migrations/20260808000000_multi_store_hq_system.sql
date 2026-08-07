-- Migration: 20260808000000_multi_store_hq_system.sql
-- Description: Phase 1 — Multi-Store & HQ Organization System DDL & Data-Driven Migration

-- ═══════════════════════════════════════════════════════════════
-- 1. ENUM TYPES
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    CREATE TYPE public.org_plan_type AS ENUM ('free_trial', 'starter', 'growth', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'unpaid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.store_status AS ENUM ('ACTIVE', 'TEMP_CLOSED', 'UNDER_SETUP', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.store_type AS ENUM ('retail', 'warehouse', 'dark_store', 'distribution_center');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.member_role AS ENUM (
        'organization_owner', 'organization_admin', 'regional_manager', 
        'finance_manager', 'procurement_manager', 'store_manager', 
        'supervisor', 'cashier', 'stockboy', 'auditor'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.member_status AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'LEFT', 'REMOVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.transfer_status AS ENUM (
        'draft', 'requested', 'approved', 'rejected', 'picking', 
        'packed', 'in_transit', 'delivered', 'received', 'verified', 'closed'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.procurement_status AS ENUM (
        'draft', 'submitted', 'approved', 'rejected', 
        'ordered', 'partial_received', 'completed', 'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.allocation_reason AS ENUM ('Forecast', 'Manual', 'Emergency', 'Promotion', 'Seasonal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2. ORGANIZATIONS & SETTINGS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    tax_id_gstin TEXT,
    currency TEXT NOT NULL DEFAULT 'INR',
    time_zone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    fiscal_year_start_month INTEGER DEFAULT 4,
    plan public.org_plan_type NOT NULL DEFAULT 'free_trial',
    subscription_status public.subscription_status NOT NULL DEFAULT 'trialing',
    trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
    max_stores INTEGER DEFAULT 5,
    max_users INTEGER DEFAULT 25,
    features JSONB DEFAULT '{"ai_forecasting": true, "multi_store": true, "whatsapp": false}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_settings (
    organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
    auto_approval_limit NUMERIC(12,2) DEFAULT 50000.00,
    allow_inter_store_transfers BOOLEAN DEFAULT true,
    require_transfer_approval BOOLEAN DEFAULT true,
    require_finance_approval_above NUMERIC(12,2) DEFAULT 100000.00,
    central_procurement_enabled BOOLEAN DEFAULT true,
    working_hours JSONB DEFAULT '{"start": "09:00", "end": "21:00"}'::jsonb,
    notification_preferences JSONB DEFAULT '{"email": true, "whatsapp": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 3. STORES TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    store_type public.store_type NOT NULL DEFAULT 'retail',
    status public.store_status NOT NULL DEFAULT 'ACTIVE',
    warehouse_enabled BOOLEAN DEFAULT false,
    opening_date DATE DEFAULT CURRENT_DATE,
    closing_date DATE,
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    currency TEXT NOT NULL DEFAULT 'INR',
    business_type TEXT DEFAULT 'Supermarket',
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    phone TEXT,
    email TEXT,
    gstin TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT stores_org_code_unique UNIQUE (organization_id, code)
);

-- ═══════════════════════════════════════════════════════════════
-- 4. MEMBERSHIP & JUNCTION STORE ACCESS TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.member_role NOT NULL DEFAULT 'store_manager',
    status public.member_status NOT NULL DEFAULT 'ACTIVE',
    last_active_store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT org_user_unique UNIQUE (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.organization_member_store_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.organization_members(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT member_store_access_unique UNIQUE (member_id, store_id)
);

CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role public.member_role NOT NULL DEFAULT 'cashier',
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
    message TEXT,
    status public.invitation_status NOT NULL DEFAULT 'pending',
    accepted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    last_sent_at TIMESTAMPTZ DEFAULT NOW(),
    resend_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 5. MASTER CATALOG & STORE INVENTORY TABLES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    barcode TEXT,
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID,
    brand_id UUID,
    base_unit TEXT NOT NULL DEFAULT 'Piece',
    mrp NUMERIC(12,2) DEFAULT 0.00,
    cost_price NUMERIC(12,2) DEFAULT 0.00,
    selling_price NUMERIC(12,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT products_org_sku_unique UNIQUE (organization_id, sku)
);

CREATE TABLE IF NOT EXISTS public.store_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    stock_on_hand NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    reorder_point NUMERIC(12,2) DEFAULT 10.00,
    max_stock_level NUMERIC(12,2) DEFAULT 100.00,
    shelf_location TEXT,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT store_product_unique UNIQUE (store_id, product_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 6. STOCK TRANSFERS & CENTRAL PROCUREMENT
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_number TEXT UNIQUE NOT NULL,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    source_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
    destination_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
    status public.transfer_status NOT NULL DEFAULT 'draft',
    requested_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    shipped_by UUID REFERENCES auth.users(id),
    received_by UUID REFERENCES auth.users(id),
    notes TEXT,
    shipped_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    requested_qty NUMERIC(12,2) NOT NULL,
    shipped_qty NUMERIC(12,2) DEFAULT 0.00,
    received_qty NUMERIC(12,2) DEFAULT 0.00,
    damaged_qty NUMERIC(12,2) DEFAULT 0.00,
    unit_cost NUMERIC(12,2) DEFAULT 0.00,
    batch_number TEXT,
    expiry_date DATE,
    serial_number TEXT,
    lot_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.central_procurement_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    status public.procurement_status NOT NULL DEFAULT 'draft',
    total_amount NUMERIC(14,2) DEFAULT 0.00,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    expected_delivery_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.central_procurement_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    procurement_order_id UUID NOT NULL REFERENCES public.central_procurement_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    allocated_qty NUMERIC(12,2) NOT NULL,
    received_qty NUMERIC(12,2) DEFAULT 0.00,
    reason public.allocation_reason NOT NULL DEFAULT 'Forecast',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 7. AUDIT ENGINE & FOUNDATIONAL TABLES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    entity TEXT NOT NULL,
    entity_id UUID,
    action TEXT NOT NULL,
    before_data JSONB,
    after_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_preferences (
    organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'dark',
    language TEXT DEFAULT 'en'
);

CREATE TABLE IF NOT EXISTS public.organization_feature_flags (
    organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
    flags JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.store_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.store_regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.organization_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    events JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.organization_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    config JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.organization_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 8. INDEXING FOR HIGH PERFORMANCE
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_stores_org ON public.stores(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_member_store_access_member ON public.organization_member_store_access(member_id);
CREATE INDEX IF NOT EXISTS idx_member_store_access_store ON public.organization_member_store_access(store_id);
CREATE INDEX IF NOT EXISTS idx_products_org ON public.products(organization_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_store ON public.store_inventory(store_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_org ON public.stock_transfers(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_org ON public.audit_events(organization_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- 9. DATA BACKFILL SCRIPT FOR EXISTING SINGLE-STORE USERS
-- ═══════════════════════════════════════════════════════════════
DO $$
DECLARE
    u_rec RECORD;
    new_org_id UUID;
    new_store_id UUID;
    new_member_id UUID;
BEGIN
    FOR u_rec IN 
        SELECT DISTINCT p.id, p.email, p.store_name 
        FROM public.profiles p
        WHERE EXISTS (
            SELECT 1 FROM public.daily_briefs db WHERE db.store_id = p.id
            UNION
            SELECT 1 FROM public.sales s WHERE s.store_id = p.id
            UNION
            SELECT 1 FROM public.khata_accounts k WHERE k.store_id = p.id
        )
    LOOP
        IF NOT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = u_rec.id) THEN
            -- 1. Create Organization
            INSERT INTO public.organizations (name, slug, plan, subscription_status)
            VALUES (
                COALESCE(u_rec.store_name, 'Organization (' || u_rec.email || ')'),
                'org-' || substring(u_rec.id::text, 1, 8),
                'growth',
                'active'
            )
            RETURNING id INTO new_org_id;

            -- 2. Create Organization Settings
            INSERT INTO public.organization_settings (organization_id) VALUES (new_org_id);

            -- 3. Create Default Store
            INSERT INTO public.stores (organization_id, code, name, store_type, status)
            VALUES (new_org_id, 'STORE-01', COALESCE(u_rec.store_name, 'Main Outlet'), 'retail', 'ACTIVE')
            RETURNING id INTO new_store_id;

            -- 4. Create Org Owner Member
            INSERT INTO public.organization_members (organization_id, user_id, role, status, last_active_store_id)
            VALUES (new_org_id, u_rec.id, 'organization_owner', 'ACTIVE', new_store_id)
            RETURNING id INTO new_member_id;

            -- 5. Grant Store Access via Junction Table
            INSERT INTO public.organization_member_store_access (member_id, store_id)
            VALUES (new_member_id, new_store_id);

        END IF;
    END LOOP;
END $$;
