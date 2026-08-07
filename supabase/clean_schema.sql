-- ========================================================
-- FORECASTIFY DDL: TABLE CREATION & RELATIONSHIP SCHEMA
-- Target Project: pkpndbcldenbdkmybntb
-- ========================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS & CUSTOM TYPES
DO $$ BEGIN CREATE TYPE public.org_plan_type AS ENUM ('free_trial', 'starter', 'growth', 'enterprise'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'unpaid'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.store_status AS ENUM ('ACTIVE', 'TEMP_CLOSED', 'UNDER_SETUP', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.store_type AS ENUM ('retail', 'warehouse', 'dark_store', 'distribution_center'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.member_role AS ENUM ('organization_owner', 'organization_admin', 'regional_manager', 'finance_manager', 'procurement_manager', 'store_manager', 'supervisor', 'cashier', 'stockboy', 'auditor'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.member_status AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'LEFT', 'REMOVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.transfer_status AS ENUM ('draft', 'requested', 'approved', 'rejected', 'picking', 'packed', 'in_transit', 'delivered', 'received', 'verified', 'closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.procurement_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'ordered', 'partial_received', 'completed', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.allocation_reason AS ENUM ('Forecast', 'Manual', 'Emergency', 'Promotion', 'Seasonal'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;



-- 3. TABLES IN DEPENDENCY ORDER (157 tables)

-- Table: public.activity_logs
create table public.activity_logs (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    activity_type text not null,
    activity_title text not null,
    activity_description text,
    metadata jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: public.ai_narratives
CREATE TABLE IF NOT EXISTS ai_narratives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  sales_story TEXT,
  future_expectation TEXT,
  recommendation TEXT,
  confidence_score NUMERIC
);

-- Table: public.organizations
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

-- Table: public.approval_policies
CREATE TABLE IF NOT EXISTS public.approval_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    policy_name TEXT NOT NULL,
    trigger_action TEXT NOT NULL, -- modify_po_quantity, increase_po_price, cancel_po, waive_khata_fee
    entity_type TEXT NOT NULL,
    min_amount NUMERIC(12,2) DEFAULT 0.00,
    max_variance_pct NUMERIC(5,2) DEFAULT 0.00,
    required_role TEXT NOT NULL DEFAULT 'store_manager', -- store_manager, procurement_manager, organization_admin
    auto_approve_if_below NUMERIC(12,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.audit_events
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID,
    action VARCHAR(100) NOT NULL,
    actor VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.autonomous_actions
CREATE TABLE IF NOT EXISTS public.autonomous_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    action_title TEXT NOT NULL,
    action_description TEXT NOT NULL,
    urgency TEXT NOT NULL DEFAULT 'normal',
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    reference_id UUID,
    reference_table TEXT,
    approval_status TEXT NOT NULL DEFAULT 'pending',
    auto_approved BOOLEAN DEFAULT false,
    approval_rule TEXT,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    execution_result JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.autonomous_config
CREATE TABLE IF NOT EXISTS public.autonomous_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT false,
    auto_purchase_orders BOOLEAN DEFAULT false,
    auto_supplier_comms BOOLEAN DEFAULT false,
    auto_employee_tasks BOOLEAN DEFAULT true,
    auto_morning_brief BOOLEAN DEFAULT true,
    auto_closing_report BOOLEAN DEFAULT true,
    auto_stockout_orders BOOLEAN DEFAULT false,
    auto_expiry_actions BOOLEAN DEFAULT false,
    auto_customer_reminders BOOLEAN DEFAULT true,
    auto_khata_reminders BOOLEAN DEFAULT true,
    auto_festival_prep BOOLEAN DEFAULT false,
    auto_pricing BOOLEAN DEFAULT false,
    auto_health_alerts BOOLEAN DEFAULT true,
    auto_compliance_prep BOOLEAN DEFAULT true,
    po_auto_approve_limit NUMERIC(12,2) DEFAULT 5000.00,
    price_change_max_pct NUMERIC(5,2) DEFAULT 10.00,
    expiry_auto_discount_days INTEGER DEFAULT 3,
    expiry_auto_discount_pct NUMERIC(5,2) DEFAULT 30.00,
    stockout_auto_order_days INTEGER DEFAULT 2,
    escalation_channels JSONB DEFAULT '["in_app"]'::jsonb,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '07:00',
    enabled_at TIMESTAMPTZ,
    last_reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT autonomous_config_unique UNIQUE (store_id)
);

-- Table: public.background_jobs
CREATE TABLE IF NOT EXISTS public.background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    job_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'QUEUED', -- QUEUED, WAITING, RUNNING, RETYING, FAILED, SUCCEEDED, CANCELLED, EXPIRED
    priority INTEGER NOT NULL DEFAULT 5,
    payload JSONB DEFAULT '{}'::jsonb,
    result JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    locked_by VARCHAR(100),
    locked_until TIMESTAMPTZ,
    idempotency_key VARCHAR(255),
    correlation_id VARCHAR(255),
    trace_id VARCHAR(255),
    workflow_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.backups
CREATE TABLE IF NOT EXISTS public.backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_name VARCHAR(255) NOT NULL,
    backup_type VARCHAR(50) DEFAULT 'FULL', -- FULL, DELTA, CONFIG
    size_bytes BIGINT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'COMPLETED',
    storage_location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.brands
CREATE TABLE IF NOT EXISTS public.brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    manufacturer TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: public.cache_metrics
CREATE TABLE IF NOT EXISTS public.cache_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_name VARCHAR(100) NOT NULL UNIQUE,
    hit_count BIGINT DEFAULT 0,
    miss_count BIGINT DEFAULT 0,
    hit_ratio NUMERIC(5,4) DEFAULT 0.0,
    item_count INTEGER DEFAULT 0,
    memory_bytes BIGINT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.capacity_forecasts
CREATE TABLE IF NOT EXISTS public.capacity_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type VARCHAR(100) NOT NULL, -- CPU, MEMORY, DB_SIZE, QUEUE_DEPTH, STORAGE
    current_usage NUMERIC(12,2) NOT NULL,
    predicted_usage_30d NUMERIC(12,2) NOT NULL,
    predicted_usage_90d NUMERIC(12,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.categories
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

-- Table: public.products
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

-- Table: public.suppliers
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

-- Table: public.central_procurement_orders
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

-- Table: public.stores
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

-- Table: public.central_procurement_allocations
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

-- Table: public.communication_audit_logs
CREATE TABLE IF NOT EXISTS public.communication_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    actor_type TEXT NOT NULL, -- system, ai_agent, user
    actor_id UUID,
    action TEXT NOT NULL, -- approve_action, manual_override, template_create, provider_toggle
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    changes JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.communication_channels
CREATE TABLE IF NOT EXISTS public.communication_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL, -- whatsapp, sms, email, push, rcs, telegram, slack
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.message_threads
CREATE TABLE IF NOT EXISTS public.message_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    channel_code TEXT NOT NULL REFERENCES public.communication_channels(code),
    thread_title TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_preview TEXT,
    unread_count INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open', -- open, closed, archived, pending_human
    session_expires_at TIMESTAMPTZ, -- 24h window
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.communication_providers
CREATE TABLE IF NOT EXISTS public.communication_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE, -- NULL = Org default
    channel_code TEXT NOT NULL REFERENCES public.communication_channels(code) ON DELETE CASCADE,
    provider_name TEXT NOT NULL, -- meta_cloud, twilio, sendgrid, gupshup
    provider_secret_reference TEXT NOT NULL, -- Secret Vault Key identifier (e.g., "env:META_ACCESS_TOKEN_STORE_1")
    account_identifier TEXT NOT NULL, -- Phone Number ID, WABA ID, Twilio SID, SendGrid Sender Email
    config JSONB DEFAULT '{}'::jsonb, -- endpoint URLs, webhook verify tokens, rate limits
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_org_store_provider UNIQUE (organization_id, store_id, channel_code, provider_name)
);

-- Table: public.message_templates
CREATE TABLE IF NOT EXISTS public.message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    channel_code TEXT NOT NULL REFERENCES public.communication_channels(code) ON DELETE CASCADE,
    template_key TEXT NOT NULL,
    category TEXT NOT NULL, -- MARKETING, UTILITY, AUTHENTICATION, OPERATIONS
    name TEXT NOT NULL,
    current_version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_org_template_key UNIQUE (organization_id, channel_code, template_key)
);

-- Table: public.template_versions
CREATE TABLE IF NOT EXISTS public.template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.message_templates(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    language TEXT NOT NULL DEFAULT 'en_US',
    external_template_id TEXT, -- Meta Template ID or Provider Template ID
    header_type TEXT DEFAULT 'NONE',
    body_text TEXT NOT NULL,
    footer_text TEXT,
    buttons JSONB DEFAULT '[]'::jsonb,
    variables_schema JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'APPROVED', -- PENDING, APPROVED, REJECTED
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_template_version UNIQUE (template_id, version, language)
);

-- Table: public.messages
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.communication_providers(id) ON DELETE SET NULL,
    external_message_id TEXT UNIQUE, -- wamid or SMS SID
    direction TEXT NOT NULL, -- inbound, outbound
    sender_type TEXT NOT NULL, -- system, ai_agent, user, contact
    sender_id UUID,
    message_type TEXT NOT NULL, -- text, template, interactive_button, document, image
    content TEXT,
    media_url TEXT,
    media_mime_type TEXT,
    interactive_payload JSONB DEFAULT '{}'::jsonb,
    template_version_id UUID REFERENCES public.template_versions(id) ON DELETE SET NULL,
    delivery_status TEXT NOT NULL DEFAULT 'queued', -- queued, sent, delivered, read, failed
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    ai_parsed BOOLEAN DEFAULT false,
    associated_entity_type TEXT,
    associated_entity_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.communication_costs
CREATE TABLE IF NOT EXISTS public.communication_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    channel_code TEXT NOT NULL,
    provider_id UUID REFERENCES public.communication_providers(id),
    category TEXT NOT NULL,
    cost_amount NUMERIC(10,4) NOT NULL DEFAULT 0.0000,
    currency TEXT NOT NULL DEFAULT 'INR',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.communication_events
CREATE TABLE IF NOT EXISTS public.communication_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- message.received, message.delivered, workflow.state_changed, ai.parsed
    source TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed_handlers JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.communication_jobs
CREATE TABLE IF NOT EXISTS public.communication_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    thread_id UUID REFERENCES public.message_threads(id) ON DELETE SET NULL,
    channel_code TEXT NOT NULL REFERENCES public.communication_channels(code),
    preferred_provider_id UUID REFERENCES public.communication_providers(id),
    fallback_channel_code TEXT REFERENCES public.communication_channels(code),
    recipient_identifier TEXT NOT NULL,
    payload JSONB NOT NULL,
    priority INTEGER DEFAULT 5, -- 1 = High, 10 = Low
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed, cancelled
    attempts_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    dead_lettered BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.communication_job_attempts
CREATE TABLE IF NOT EXISTS public.communication_job_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.communication_jobs(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.communication_providers(id),
    attempt_number INTEGER NOT NULL,
    status TEXT NOT NULL, -- success, failure, throttled
    response_payload JSONB,
    error_message TEXT,
    latency_ms INTEGER,
    attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.communication_preferences
CREATE TABLE IF NOT EXISTS public.communication_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL, -- supplier, customer, employee
    entity_id UUID NOT NULL,
    channel_code TEXT NOT NULL REFERENCES public.communication_channels(code),
    message_category TEXT NOT NULL, -- marketing, utility, transactional, operational
    is_enabled BOOLEAN DEFAULT true,
    preferred_time_start TIME DEFAULT '09:00',
    preferred_time_end TIME DEFAULT '20:00',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_entity_preference UNIQUE (entity_type, entity_id, channel_code, message_category)
);

-- Table: public.configuration_registry
CREATE TABLE IF NOT EXISTS public.configuration_registry (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    category VARCHAR(100) DEFAULT 'GENERAL',
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.conversation_participants
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL, -- supplier, customer, employee, driver, hq_user
    entity_id UUID NOT NULL,
    identifier TEXT NOT NULL, -- Phone number, email address
    role TEXT NOT NULL DEFAULT 'member', -- primary, member, observer, manager
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_thread_participant UNIQUE (thread_id, entity_type, entity_id)
);

-- Table: public.counterfactual_sessions
CREATE TABLE IF NOT EXISTS counterfactual_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT UNIQUE NOT NULL,
    store_id TEXT,
    title TEXT NOT NULL DEFAULT 'What-If Simulation Session',
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE' | 'ARCHIVED' | 'SAVED'
    baseline_explanation_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: public.counterfactual_runs
CREATE TABLE IF NOT EXISTS counterfactual_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id TEXT UNIQUE NOT NULL,
    session_id TEXT REFERENCES counterfactual_sessions(session_id) ON DELETE CASCADE,
    explanation_id TEXT,
    scenario_name TEXT NOT NULL,
    scenario_version INTEGER NOT NULL DEFAULT 1,
    assumptions JSONB NOT NULL DEFAULT '{}'::jsonb,
    modified_inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
    simulated_outputs JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: public.customers
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

-- Table: public.customer_communications
CREATE TABLE IF NOT EXISTS public.customer_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    channel TEXT NOT NULL DEFAULT 'whatsapp',
    comm_type TEXT NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    scheduled_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    auto_generated BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.daily_briefs
CREATE TABLE IF NOT EXISTS public.daily_briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    brief_type TEXT NOT NULL DEFAULT 'morning',
    brief_date DATE NOT NULL DEFAULT CURRENT_DATE,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    ai_summary TEXT,
    is_read BOOLEAN DEFAULT false,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT daily_briefs_unique UNIQUE (store_id, brief_type, brief_date)
);

-- Table: public.dead_letter_messages
CREATE TABLE IF NOT EXISTS public.dead_letter_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.communication_jobs(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    recipient_identifier TEXT NOT NULL,
    channel_code TEXT NOT NULL,
    last_error TEXT NOT NULL,
    payload JSONB NOT NULL,
    resolved BOOLEAN DEFAULT false,
    resolution_notes TEXT,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.sales
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

-- Table: public.delivery_orders
CREATE TABLE IF NOT EXISTS public.delivery_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    phone TEXT,
    driver_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    delivery_sequence INTEGER,
    estimated_distance_km NUMERIC(6,2),
    estimated_time_mins INTEGER,
    estimated_fuel_cost NUMERIC(8,2),
    scheduled_at TIMESTAMPTZ,
    picked_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    delivery_proof TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.demand_scenarios
CREATE TABLE IF NOT EXISTS public.demand_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scenario_name TEXT NOT NULL,
    scenario_type TEXT NOT NULL,
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    baseline_demand JSONB DEFAULT '{}'::jsonb,
    simulated_demand JSONB DEFAULT '{}'::jsonb,
    impact_summary JSONB DEFAULT '{}'::jsonb,
    recommended_actions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.distributed_locks
CREATE TABLE IF NOT EXISTS public.distributed_locks (
    lock_key VARCHAR(255) PRIMARY KEY,
    holder_id VARCHAR(100) NOT NULL,
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    fence_token BIGINT DEFAULT 1
);

-- Table: public.distributed_spans
CREATE TABLE IF NOT EXISTS public.distributed_spans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id VARCHAR(255) NOT NULL,
    span_id VARCHAR(255) NOT NULL,
    parent_span_id VARCHAR(255),
    subsystem VARCHAR(100) NOT NULL,
    operation VARCHAR(255) NOT NULL,
    duration_ms INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'OK',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.drift_history
CREATE TABLE IF NOT EXISTS public.drift_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC(10,4) NOT NULL,
    threshold NUMERIC(10,4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.drift_reports
CREATE TABLE IF NOT EXISTS public.drift_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    model_id VARCHAR(100) NOT NULL,
    drift_type VARCHAR(50) NOT NULL, -- FEATURE, PREDICTION, CONCEPT, TARGET, PRICING, INVENTORY, WEATHER, DEMAND
    psi_score NUMERIC(6,4) DEFAULT 0.0000,
    kl_divergence NUMERIC(6,4) DEFAULT 0.0000,
    mape_trend NUMERIC(6,4) DEFAULT 0.0000,
    rmse_trend NUMERIC(6,4) DEFAULT 0.0000,
    bias_trend NUMERIC(6,4) DEFAULT 0.0000,
    drift_detected BOOLEAN DEFAULT false,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.employee_tasks
CREATE TABLE IF NOT EXISTS public.employee_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    assignee TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'pending',
    due_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    zone_code TEXT,
    product_ids JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    auto_generated BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.expenses
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expense_type TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    description TEXT,
    vendor TEXT,
    payment_method TEXT DEFAULT 'cash',
    receipt_ref TEXT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_period TEXT,
    budget_amount NUMERIC(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.explanation_records
CREATE TABLE IF NOT EXISTS explanation_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    explanation_id TEXT UNIQUE NOT NULL,
    prediction_id TEXT,
    recommendation_id TEXT,
    model_version TEXT NOT NULL DEFAULT 'v1.0.0',
    feature_schema_version TEXT NOT NULL DEFAULT 'v1.0.0',
    explanation_version INTEGER NOT NULL DEFAULT 1,
    explanation_type TEXT NOT NULL DEFAULT 'PREDICTION', -- 'PREDICTION' | 'RECOMMENDATION' | 'FEATURE' | 'STORE' | 'CATEGORY'
    explanation_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    explanation_graph_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    explanation_score NUMERIC NOT NULL DEFAULT 0,
    quality_score NUMERIC NOT NULL DEFAULT 0,
    store_id TEXT,
    ttl_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: public.explanation_evidence
CREATE TABLE IF NOT EXISTS explanation_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    explanation_id TEXT NOT NULL REFERENCES explanation_records(explanation_id) ON DELETE CASCADE,
    feature_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    prediction_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    inventory_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    supplier_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    pricing_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    evidence_confidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: public.explanation_feedback
CREATE TABLE IF NOT EXISTS explanation_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    explanation_id TEXT NOT NULL REFERENCES explanation_records(explanation_id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    usefulness_score INTEGER NOT NULL CHECK (usefulness_score BETWEEN 1 AND 5),
    comments TEXT,
    correction_requests TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: public.explanation_history
CREATE TABLE IF NOT EXISTS explanation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    explanation_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    diff_json JSONB DEFAULT '{}'::jsonb,
    changes_summary TEXT,
    snapshot_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: public.explanation_lineage
CREATE TABLE IF NOT EXISTS explanation_lineage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    explanation_id TEXT NOT NULL REFERENCES explanation_records(explanation_id) ON DELETE CASCADE,
    prediction_id TEXT,
    feature_vector_id TEXT,
    model_version_id TEXT,
    training_dataset_id TEXT,
    feature_schema_id TEXT,
    recommendation_id TEXT,
    lineage_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: public.explanation_templates
CREATE TABLE IF NOT EXISTS explanation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key TEXT UNIQUE NOT NULL, -- 'executive', 'manager', 'analyst', 'developer', 'api'
    audience TEXT NOT NULL,
    template_structure JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: public.external_events
CREATE TABLE IF NOT EXISTS external_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT,
  event_type TEXT,
  start_date DATE,
  end_date DATE,
  impact_score NUMERIC
);

-- Table: public.festival_plans
CREATE TABLE IF NOT EXISTS public.festival_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    festival_name TEXT NOT NULL,
    festival_date DATE NOT NULL,
    lead_time_days INTEGER DEFAULT 14,
    demand_forecast JSONB DEFAULT '{}'::jsonb,
    purchase_order_ids JSONB DEFAULT '[]'::jsonb,
    staff_requirements JSONB DEFAULT '{}'::jsonb,
    promotion_plan JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft',
    auto_generated BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.forecast_features
CREATE TABLE IF NOT EXISTS public.forecast_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    variant_id TEXT,
    generated_timestamp TIMESTAMPTZ NOT NULL,
    feature_version TEXT NOT NULL DEFAULT '2.0.0',
    feature_schema_version TEXT NOT NULL DEFAULT '2.0.0',
    builder_version TEXT NOT NULL DEFAULT '2.0.0',
    normalization_method TEXT NOT NULL DEFAULT 'Identity',
    lifecycle_state TEXT NOT NULL DEFAULT 'READY', -- 'COLLECTING', 'VALIDATING', 'NORMALIZING', 'READY', 'ARCHIVED', 'FAILED'
    feature_hash TEXT NOT NULL DEFAULT '',
    source_snapshot_id TEXT NOT NULL DEFAULT '',
    generation_duration_ms INTEGER DEFAULT 0,
    quality_score NUMERIC(5, 4) NOT NULL DEFAULT 1.0000,
    quality_metrics JSONB DEFAULT '{}'::jsonb,
    feature_vector JSONB NOT NULL DEFAULT '{}'::jsonb,
    snapshot_json JSONB DEFAULT '{}'::jsonb,
    lineage JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: public.forecast_jobs
CREATE TABLE IF NOT EXISTS public.forecast_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL, -- 'TRAIN_MODEL', 'GENERATE_FORECAST', 'CACHE_REFRESH', 'FEATURE_REFRESH', 'DRIFT_ANALYSIS'
    status TEXT NOT NULL DEFAULT 'Queued', -- 'Queued', 'Running', 'Completed', 'Failed', 'Cancelled'
    parameters_json JSONB DEFAULT '{}'::jsonb,
    result_json JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: public.forecast_models
CREATE TABLE IF NOT EXISTS public.forecast_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    model_type TEXT NOT NULL, -- e.g. 'naive', 'moving_average', 'linear_regression', 'xgboost', 'lightgbm', 'prophet', 'random_forest', 'ensemble'
    framework TEXT NOT NULL DEFAULT 'custom', -- e.g. 'scikit-learn', 'xgboost', 'lightgbm', 'prophet', 'custom'
    version TEXT NOT NULL DEFAULT '1.0.0',
    artifact_uri TEXT,
    training_dataset TEXT,
    training_window TEXT, -- e.g. '90d', '180d', '365d'
    metrics_json JSONB DEFAULT '{}'::jsonb, -- MAE, RMSE, MAPE, SMAPE, R2, Bias
    hyperparameters_json JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'active', -- 'draft', 'training', 'active', 'evaluating', 'retired', 'failed'
    is_default BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: public.forecast_predictions
CREATE TABLE IF NOT EXISTS public.forecast_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    model_id UUID REFERENCES public.forecast_models(id) ON DELETE SET NULL,
    model_version TEXT NOT NULL,
    prediction_schema_version TEXT NOT NULL DEFAULT '1.0.0',
    feature_schema_version TEXT NOT NULL DEFAULT '1.0.0',
    horizon TEXT NOT NULL DEFAULT '7d',
    prediction_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    latency_ms NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: public.forecast_recommendations
CREATE TABLE IF NOT EXISTS forecast_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL,
    product_id UUID,
    variant_id UUID,
    forecast_prediction_id UUID,
    feature_snapshot_id UUID,
    recommendation_type VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(50) NOT NULL DEFAULT 'GENERATED',
    version INT NOT NULL DEFAULT 1,
    confidence NUMERIC(5, 4) NOT NULL DEFAULT 0.8500,
    explainability_score NUMERIC(5, 2) NOT NULL DEFAULT 85.00,
    risk_score NUMERIC(5, 2) NOT NULL DEFAULT 20.00,
    recommendation_score NUMERIC(5, 2) NOT NULL DEFAULT 75.00,
    valid_until TIMESTAMPTZ,
    
    -- Financial Impact Metrics
    expected_profit NUMERIC(15, 2) DEFAULT 0.00,
    expected_savings NUMERIC(15, 2) DEFAULT 0.00,
    expected_revenue NUMERIC(15, 2) DEFAULT 0.00,
    expected_cost NUMERIC(15, 2) DEFAULT 0.00,
    expected_inventory_reduction NUMERIC(15, 2) DEFAULT 0.00,
    blocked_capital_released NUMERIC(15, 2) DEFAULT 0.00,
    financial_impact JSONB DEFAULT '{}'::jsonb,
    
    -- Simulation Results
    simulation_results JSONB DEFAULT '{}'::jsonb,
    
    -- Explainability & Rationale
    reasoning TEXT,
    supporting_features JSONB DEFAULT '{}'::jsonb,
    explanation_details JSONB DEFAULT '{}'::jsonb,
    
    -- Workflow & Graph Metadata
    chain_id UUID,
    parent_recommendation_id UUID REFERENCES forecast_recommendations(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_by UUID,
    
    -- Timestamps
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ,
    executing_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    expired_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: public.forecast_settings
CREATE TABLE IF NOT EXISTS public.forecast_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    forecast_horizon TEXT NOT NULL DEFAULT '7d', -- '1d', '3d', '7d', '14d', '30d', '60d', '90d'
    preferred_model TEXT NOT NULL DEFAULT 'ensemble',
    prediction_frequency TEXT NOT NULL DEFAULT 'daily', -- 'hourly', 'daily', 'weekly'
    weather_enabled BOOLEAN DEFAULT true,
    festival_enabled BOOLEAN DEFAULT true,
    supplier_signals_enabled BOOLEAN DEFAULT true,
    recommendation_enabled BOOLEAN DEFAULT true,
    safety_stock_multiplier NUMERIC(5, 2) DEFAULT 1.25,
    confidence_threshold NUMERIC(5, 2) DEFAULT 0.80,
    retraining_frequency TEXT DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly'
    cache_ttl_seconds INTEGER DEFAULT 3600,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: public.storage_locations
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

-- Table: public.purchase_orders
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

-- Table: public.goods_received_notes
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

-- Table: public.units
CREATE TABLE IF NOT EXISTS public.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for system-wide defaults
    name TEXT NOT NULL, -- e.g., 'Carton', 'Pack', 'Piece', 'Kg', 'Gram', 'Liter', 'Milliliter'
    abbreviation TEXT NOT NULL, -- e.g., 'ctn', 'pk', 'pc', 'kg', 'g', 'l', 'ml'
    base_unit_id UUID REFERENCES public.units(id),
    conversion_factor NUMERIC(12, 4) DEFAULT 1.0000,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: public.product_variants
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

-- Table: public.purchase_order_items
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

-- Table: public.grn_items
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

-- Table: public.store_groups
CREATE TABLE IF NOT EXISTS store_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  city TEXT,
  state TEXT,
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: public.group_members
CREATE TABLE IF NOT EXISTS group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES store_groups(id) ON DELETE CASCADE,
  store_id UUID NOT NULL,
  store_name TEXT NOT NULL,
  city TEXT,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, store_id)
);

-- Table: public.gst_compliance
CREATE TABLE IF NOT EXISTS public.gst_compliance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period_month INTEGER NOT NULL,
    period_year INTEGER NOT NULL,
    total_sales_taxable NUMERIC(14,2) DEFAULT 0.00,
    total_sales_gst NUMERIC(14,2) DEFAULT 0.00,
    cgst_collected NUMERIC(14,2) DEFAULT 0.00,
    sgst_collected NUMERIC(14,2) DEFAULT 0.00,
    igst_collected NUMERIC(14,2) DEFAULT 0.00,
    total_purchase_taxable NUMERIC(14,2) DEFAULT 0.00,
    total_purchase_gst NUMERIC(14,2) DEFAULT 0.00,
    itc_cgst NUMERIC(14,2) DEFAULT 0.00,
    itc_sgst NUMERIC(14,2) DEFAULT 0.00,
    itc_igst NUMERIC(14,2) DEFAULT 0.00,
    net_gst_liability NUMERIC(14,2) DEFAULT 0.00,
    hsn_summary JSONB DEFAULT '[]'::jsonb,
    gstr1_status TEXT DEFAULT 'pending',
    gstr3b_status TEXT DEFAULT 'pending',
    filing_due_date DATE,
    filed_at TIMESTAMPTZ,
    mismatches JSONB DEFAULT '[]'::jsonb,
    mismatch_count INTEGER DEFAULT 0,
    tds_applicable BOOLEAN DEFAULT false,
    tds_amount NUMERIC(14,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT gst_compliance_unique UNIQUE (store_id, period_month, period_year)
);

-- Table: public.health_snapshots
CREATE TABLE IF NOT EXISTS public.health_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    overall_status VARCHAR(50) NOT NULL,
    active_workers INTEGER DEFAULT 0,
    queued_jobs INTEGER DEFAULT 0,
    active_alerts INTEGER DEFAULT 0,
    snapshot JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.inventory
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID,
    product_name TEXT,
    name TEXT,
    category TEXT,
    quantity NUMERIC(10, 2) DEFAULT 0.00,
    price NUMERIC(12, 2) DEFAULT 0.00,
    cost_price NUMERIC(12, 2) DEFAULT 0.00,
    unit TEXT,
    reorder_level NUMERIC(10, 2) DEFAULT 10.00,
    expiry_date DATE,
    supplier TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.inventory_audit_logs
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

-- Table: public.inventory_ledger
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

-- Table: public.inventory_settings
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

-- Table: public.inventory_snapshots
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

-- Table: public.invitations
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

-- Table: public.job_dependencies
CREATE TABLE IF NOT EXISTS public.job_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.background_jobs(id) ON DELETE CASCADE,
    depends_on_job_id UUID REFERENCES public.background_jobs(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) DEFAULT 'REQUIRED', -- REQUIRED, OPTIONAL
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.job_history
CREATE TABLE IF NOT EXISTS public.job_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.background_jobs(id) ON DELETE CASCADE,
    store_id UUID NOT NULL,
    job_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    execution_time_ms INTEGER NOT NULL DEFAULT 0,
    logs TEXT,
    error_stack TEXT,
    executed_by_worker VARCHAR(100),
    correlation_id VARCHAR(255),
    trace_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.khata_accounts
CREATE TABLE IF NOT EXISTS public.khata_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    credit_limit NUMERIC(12,2) DEFAULT 5000.00,
    outstanding_balance NUMERIC(12,2) DEFAULT 0.00,
    interest_rate NUMERIC(5,2) DEFAULT 0.00,
    auto_remind BOOLEAN DEFAULT true,
    remind_after_days INTEGER DEFAULT 7,
    status TEXT NOT NULL DEFAULT 'active',
    payment_prediction_date DATE,
    notes TEXT,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.khata_reminders
CREATE TABLE IF NOT EXISTS public.khata_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.khata_accounts(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel TEXT NOT NULL DEFAULT 'whatsapp',
    message_template TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending',
    response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.khata_transactions
CREATE TABLE IF NOT EXISTS public.khata_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.khata_accounts(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    running_balance NUMERIC(12,2) NOT NULL,
    sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
    payment_method TEXT,
    reference_number TEXT,
    due_date DATE,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.layout_recommendations
CREATE TABLE IF NOT EXISTS public.layout_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recommendation_type TEXT NOT NULL,
    product_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
    product_name TEXT,
    from_zone TEXT,
    to_zone TEXT,
    rationale TEXT NOT NULL,
    expected_impact TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    implemented_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.loss_incidents
CREATE TABLE IF NOT EXISTS public.loss_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    incident_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium',
    description TEXT NOT NULL,
    evidence JSONB DEFAULT '{}'::jsonb,
    estimated_loss NUMERIC(12,2) DEFAULT 0.00,
    involved_entity TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    resolution TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.loyalty_segments
CREATE TABLE IF NOT EXISTS public.loyalty_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    segment TEXT NOT NULL DEFAULT 'regular',
    loyalty_score NUMERIC(5,2) DEFAULT 50.00,
    total_lifetime_value NUMERIC(14,2) DEFAULT 0.00,
    visit_frequency_days NUMERIC(5,1) DEFAULT 30.0,
    last_visit_date DATE,
    recommended_actions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT loyalty_segments_unique UNIQUE (store_id, customer_id)
);

-- Table: public.negotiation_insights
CREATE TABLE IF NOT EXISTS public.negotiation_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL,
    insight_text TEXT NOT NULL,
    confidence NUMERIC(5,2) DEFAULT 0.70,
    data_points JSONB DEFAULT '{}'::jsonb,
    last_validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.notification_history
CREATE TABLE IF NOT EXISTS public.notification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID,
    channel VARCHAR(50) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.notification_queue
CREATE TABLE IF NOT EXISTS public.notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID,
    channel VARCHAR(50) NOT NULL, -- IN_APP, EMAIL, SLACK, WEBHOOK, SMS
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.operational_reports
CREATE TABLE IF NOT EXISTS public.operational_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR(50) NOT NULL, -- DAILY, WEEKLY, MONTHLY
    title VARCHAR(255) NOT NULL,
    metrics_summary JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.organization_activity
CREATE TABLE IF NOT EXISTS public.organization_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.organization_api_keys
CREATE TABLE IF NOT EXISTS public.organization_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.organization_feature_flags
CREATE TABLE IF NOT EXISTS public.organization_feature_flags (
    organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
    flags JSONB DEFAULT '{}'::jsonb
);

-- Table: public.organization_integrations
CREATE TABLE IF NOT EXISTS public.organization_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    config JSONB DEFAULT '{}'::jsonb
);

-- Table: public.organization_members
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

-- Table: public.organization_member_store_access
CREATE TABLE IF NOT EXISTS public.organization_member_store_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.organization_members(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT member_store_access_unique UNIQUE (member_id, store_id)
);

-- Table: public.organization_notifications
CREATE TABLE IF NOT EXISTS public.organization_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.organization_preferences
CREATE TABLE IF NOT EXISTS public.organization_preferences (
    organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'dark',
    language TEXT DEFAULT 'en'
);

-- Table: public.organization_settings
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

-- Table: public.organization_webhooks
CREATE TABLE IF NOT EXISTS public.organization_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    events JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true
);

-- Table: public.price_rules
CREATE TABLE IF NOT EXISTS public.price_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE,
    category TEXT,
    rule_type TEXT NOT NULL,
    current_price NUMERIC(12,2),
    recommended_price NUMERIC(12,2),
    min_price NUMERIC(12,2),
    max_price NUMERIC(12,2),
    discount_pct NUMERIC(5,2) DEFAULT 0.00,
    justification TEXT,
    demand_elasticity NUMERIC(5,3),
    expected_revenue_impact NUMERIC(12,2),
    status TEXT NOT NULL DEFAULT 'suggested',
    auto_apply BOOLEAN DEFAULT false,
    applied_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.product_batches
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

-- Table: public.product_offers
CREATE TABLE IF NOT EXISTS product_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES store_groups(id) ON DELETE CASCADE,
  offerer_id UUID NOT NULL,
  offerer_store TEXT NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT,
  quantity_available INT NOT NULL,
  unit TEXT DEFAULT 'pcs',
  price FLOAT DEFAULT 0,
  message TEXT,
  status TEXT DEFAULT 'available',
  claimed_by UUID,
  claimer_store TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: public.product_requests
CREATE TABLE IF NOT EXISTS product_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES store_groups(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL,
  requester_store TEXT NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT,
  quantity_needed INT NOT NULL,
  unit TEXT DEFAULT 'pcs',
  message TEXT,
  status TEXT DEFAULT 'open',
  fulfilled_by UUID,
  fulfiller_store TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: public.profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    website TEXT,
    store_name TEXT,
    phone TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    number_of_outlets INTEGER DEFAULT 1,
    notifications JSONB DEFAULT '{"emailAlerts": true}'::jsonb
);

-- Table: public.provider_health
CREATE TABLE IF NOT EXISTS public.provider_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.communication_providers(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'healthy', -- healthy, degraded, down
    latency_ms INTEGER DEFAULT 0,
    availability_pct NUMERIC(5,2) DEFAULT 100.00,
    failure_rate_pct NUMERIC(5,2) DEFAULT 0.00,
    queue_depth INTEGER DEFAULT 0,
    last_successful_ping TIMESTAMPTZ DEFAULT NOW(),
    last_error_message TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.purchase_analytics
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

-- Table: public.purchase_approvals
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

-- Table: public.purchase_attachments
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

-- Table: public.purchase_comments
CREATE TABLE IF NOT EXISTS public.purchase_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL DEFAULT 'User',
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: public.purchase_invoices
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

-- Table: public.purchase_payments
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

-- Table: public.purchase_returns
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

-- Table: public.purchase_settings
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

-- Table: public.purchase_timeline
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

-- Table: public.queue_metrics
CREATE TABLE IF NOT EXISTS public.queue_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_name VARCHAR(100) NOT NULL,
    depth INTEGER DEFAULT 0,
    avg_wait_time_ms INTEGER DEFAULT 0,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.rate_limits
CREATE TABLE IF NOT EXISTS public.rate_limits (
    key_id VARCHAR(255) PRIMARY KEY,
    client_key VARCHAR(255) NOT NULL,
    tokens NUMERIC(10,2) NOT NULL,
    last_refill TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.recommendation_dependency_graph
CREATE TABLE IF NOT EXISTS recommendation_dependency_graph (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL,
    source_recommendation_id UUID NOT NULL REFERENCES forecast_recommendations(id) ON DELETE CASCADE,
    target_recommendation_id UUID NOT NULL REFERENCES forecast_recommendations(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) NOT NULL, -- REQUIRES, BLOCKS, SUPERSEDES, DUPLICATES
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: public.recommendation_event_store
CREATE TABLE IF NOT EXISTS recommendation_event_store (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL,
    recommendation_id UUID NOT NULL REFERENCES forecast_recommendations(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    actor_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: public.recommendation_feedback
CREATE TABLE IF NOT EXISTS recommendation_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL,
    recommendation_id UUID NOT NULL REFERENCES forecast_recommendations(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- REJECTED, ACCEPTED, MODIFIED
    reason TEXT,
    feedback_category VARCHAR(100),
    user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: public.recommendation_rules
CREATE TABLE IF NOT EXISTS recommendation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL,
    rule_name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    when_clause TEXT NOT NULL,
    then_action VARCHAR(100) NOT NULL,
    priority VARCHAR(50) DEFAULT 'MEDIUM',
    enabled BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: public.recommendation_settings
CREATE TABLE IF NOT EXISTS recommendation_settings (
    store_id UUID PRIMARY KEY,
    confidence_threshold NUMERIC(5, 4) DEFAULT 0.6000,
    explainability_threshold NUMERIC(5, 2) DEFAULT 50.00,
    priority_threshold VARCHAR(50) DEFAULT 'LOW',
    auto_execute_enabled BOOLEAN DEFAULT false,
    auto_execute_threshold NUMERIC(5, 2) DEFAULT 90.00,
    enabled_categories JSONB DEFAULT '["INVENTORY", "PROCUREMENT", "PRICING", "EXPIRY", "FINANCIAL", "RISK"]'::jsonb,
    enabled_plugins JSONB DEFAULT '["StockoutRule", "OverstockRule", "ExpiryRule", "SupplierRule", "PricingRule"]'::jsonb,
    ttl_hours INT DEFAULT 48,
    notification_settings JSONB DEFAULT '{"email": true, "in_app": true}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: public.recommendation_versions
CREATE TABLE IF NOT EXISTS recommendation_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL,
    recommendation_id UUID NOT NULL REFERENCES forecast_recommendations(id) ON DELETE CASCADE,
    version INT NOT NULL,
    forecast_prediction_id UUID,
    snapshot_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: public.retraining_history
CREATE TABLE IF NOT EXISTS public.retraining_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    champion_model_id VARCHAR(100) NOT NULL,
    challenger_model_id VARCHAR(100) NOT NULL,
    champion_mape NUMERIC(6,4),
    challenger_mape NUMERIC(6,4),
    action_taken VARCHAR(100) NOT NULL, -- PROMOTED_CHALLENGER, KEPT_CHAMPION, MANUAL_REVIEW
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.sale_items
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

-- Table: public.sales_payments
CREATE TABLE IF NOT EXISTS public.sales_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    payment_method TEXT NOT NULL, -- 'cash', 'upi', 'card'
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    transaction_ref TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: public.sales_returns
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

-- Table: public.scheduler_tasks
CREATE TABLE IF NOT EXISTS public.scheduler_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    task_name VARCHAR(100) NOT NULL,
    cron_expression VARCHAR(100),
    job_type VARCHAR(100) NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    is_enabled BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    total_runs INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.secrets_registry
CREATE TABLE IF NOT EXISTS public.secrets_registry (
    key VARCHAR(255) PRIMARY KEY,
    encrypted_value TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.service_registry
CREATE TABLE IF NOT EXISTS public.service_registry (
    service_id VARCHAR(100) PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'ONLINE',
    version VARCHAR(50) DEFAULT '1.0.0',
    capabilities JSONB DEFAULT '[]'::jsonb,
    last_ping TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.shelf_zones
CREATE TABLE IF NOT EXISTS public.shelf_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    zone_code TEXT NOT NULL,
    zone_name TEXT NOT NULL,
    category_affinity TEXT,
    display_order INTEGER DEFAULT 0,
    walking_sequence INTEGER DEFAULT 0,
    capacity_units INTEGER DEFAULT 100,
    current_fill_pct NUMERIC(5,2) DEFAULT 50.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT shelf_zones_unique UNIQUE (store_id, zone_code)
);

-- Table: public.shrinkage_reports
CREATE TABLE IF NOT EXISTS public.shrinkage_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    product_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    expected_qty NUMERIC(10,2) NOT NULL,
    actual_qty NUMERIC(10,2) NOT NULL,
    variance NUMERIC(10,2) NOT NULL,
    variance_value NUMERIC(12,2) DEFAULT 0.00,
    category TEXT NOT NULL DEFAULT 'unknown',
    investigation_status TEXT DEFAULT 'open',
    notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.sla_breaches
CREATE TABLE IF NOT EXISTS public.sla_breaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sla_name VARCHAR(100) NOT NULL,
    actual_value NUMERIC(10,2) NOT NULL,
    target_value NUMERIC(10,2) NOT NULL,
    severity VARCHAR(50) DEFAULT 'WARNING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.sla_definitions
CREATE TABLE IF NOT EXISTS public.sla_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sla_name VARCHAR(100) NOT NULL,
    target_metric VARCHAR(100) NOT NULL,
    target_value NUMERIC(10,2) NOT NULL,
    warning_threshold NUMERIC(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.sop_templates
CREATE TABLE IF NOT EXISTS public.sop_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'operations',
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    estimated_total_mins INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    auto_generated BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.sop_executions
CREATE TABLE IF NOT EXISTS public.sop_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.sop_templates(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    executor_name TEXT NOT NULL,
    execution_date DATE NOT NULL DEFAULT CURRENT_DATE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    step_results JSONB DEFAULT '[]'::jsonb,
    completion_pct NUMERIC(5,2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'in_progress',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.stock_adjustments
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

-- Table: public.stock_transfers
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

-- Table: public.stock_transfer_items
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

-- Table: public.store_goals
CREATE TABLE IF NOT EXISTS public.store_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_type TEXT NOT NULL,
    title TEXT NOT NULL,
    target_value NUMERIC(14,2) NOT NULL,
    current_value NUMERIC(14,2) DEFAULT 0.00,
    baseline_value NUMERIC(14,2) DEFAULT 0.00,
    unit TEXT DEFAULT '%',
    target_date DATE NOT NULL,
    progress_pct NUMERIC(5,2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'active',
    ai_recommendations JSONB DEFAULT '[]'::jsonb,
    milestones JSONB DEFAULT '[]'::jsonb,
    daily_coaching JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.store_health_snapshots
CREATE TABLE IF NOT EXISTS public.store_health_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    overall_score INTEGER NOT NULL DEFAULT 0,
    dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    trend TEXT DEFAULT 'stable',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT store_health_unique UNIQUE (store_id, snapshot_date)
);

-- Table: public.store_inventory
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

-- Table: public.store_regions
CREATE TABLE IF NOT EXISTS public.store_regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL
);

-- Table: public.store_users
CREATE TABLE IF NOT EXISTS public.store_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'MEMBER',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.supplier_contracts
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

-- Table: public.supplier_documents
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

-- Table: public.supplier_price_history
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

-- Table: public.supplier_prices
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

-- Table: public.system_alerts
CREATE TABLE IF NOT EXISTS public.system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL DEFAULT 'INFO', -- INFO, WARNING, CRITICAL
    subsystem VARCHAR(100) NOT NULL,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.system_events
CREATE TABLE IF NOT EXISTS public.system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    correlation_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.system_health
CREATE TABLE IF NOT EXISTS public.system_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subsystem VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'HEALTHY', -- HEALTHY, WARNING, DEGRADED, CRITICAL, OFFLINE
    latency_ms INTEGER DEFAULT 0,
    last_check_at TIMESTAMPTZ DEFAULT NOW(),
    details JSONB DEFAULT '{}'::jsonb,
    error_message TEXT
);

-- Table: public.vendor_communications
CREATE TABLE IF NOT EXISTS public.vendor_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    po_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
    channel TEXT NOT NULL DEFAULT 'whatsapp',
    direction TEXT NOT NULL DEFAULT 'outgoing',
    message_type TEXT NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    follow_up_count INTEGER DEFAULT 0,
    max_follow_ups INTEGER DEFAULT 3,
    next_follow_up_at TIMESTAMPTZ,
    supplier_response TEXT,
    response_received_at TIMESTAMPTZ,
    auto_generated BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.worker_metrics
CREATE TABLE IF NOT EXISTS public.worker_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_type VARCHAR(100) NOT NULL,
    throughput_per_min NUMERIC(10,2) DEFAULT 0,
    avg_latency_ms NUMERIC(10,2) DEFAULT 0,
    failure_rate_pct NUMERIC(5,2) DEFAULT 0,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.worker_status
CREATE TABLE IF NOT EXISTS public.worker_status (
    id VARCHAR(100) PRIMARY KEY,
    worker_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'IDLE', -- IDLE, BUSY, OFFLINE, DEGRADED
    current_job_id UUID,
    processed_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    cpu_usage_pct NUMERIC(5,2) DEFAULT 0.0,
    memory_mb NUMERIC(10,2) DEFAULT 0.0,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Table: public.workflows
CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    dag_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: public.workflow_executions
CREATE TABLE IF NOT EXISTS public.workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
    store_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'RUNNING', -- RUNNING, SUCCEEDED, FAILED, ROLLBACK_IN_PROGRESS, ROLLED_BACK
    current_step VARCHAR(100),
    context JSONB DEFAULT '{}'::jsonb,
    correlation_id VARCHAR(255),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Table: public.workflow_states
CREATE TABLE IF NOT EXISTS public.workflow_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
    workflow_type TEXT NOT NULL, -- supplier_po_negotiation, customer_khata_recovery, employee_audit
    entity_type TEXT NOT NULL, -- purchase_order, khata_account, employee_task
    entity_id UUID NOT NULL,
    current_state TEXT NOT NULL, -- WAITING_RESPONSE, PRICE_NEGOTIATION, MANAGER_APPROVAL, CONFIRMED
    state_data JSONB DEFAULT '{}'::jsonb,
    history JSONB DEFAULT '[]'::jsonb,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_entity_workflow UNIQUE (entity_type, entity_id, workflow_type)
);

-- 4. SCHEMA EVOLUTION COLUMNS

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS supplier TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS number_of_outlets INTEGER DEFAULT 1;
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
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS reliability_score NUMERIC(5, 2) DEFAULT 100.00;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS avg_lead_time NUMERIC(5, 2) DEFAULT 3.00;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS fill_rate NUMERIC(5, 2) DEFAULT 100.00;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS avg_delay_days NUMERIC(5, 2) DEFAULT 0.00;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS bank_account_no TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS bank_ifsc TEXT;

-- 5. DISABLE ROW LEVEL SECURITY FOR API ACCESS

ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_narratives DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_policies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.autonomous_actions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.autonomous_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.background_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.backups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cache_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.capacity_forecasts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.central_procurement_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.central_procurement_allocations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_providers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_costs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_job_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuration_registry DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.counterfactual_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.counterfactual_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_communications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_briefs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dead_letter_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_scenarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributed_locks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributed_spans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.drift_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.drift_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.explanation_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.explanation_evidence DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.explanation_feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.explanation_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.explanation_lineage DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.explanation_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.festival_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_features DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_models DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_predictions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_recommendations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_received_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.units DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.grn_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_compliance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_snapshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_snapshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_dependencies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.khata_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.khata_reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.khata_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.layout_recommendations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.loss_incidents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_segments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.negotiation_insights DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_activity DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_api_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_feature_flags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_integrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_member_store_access DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_webhooks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_offers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_health DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_analytics DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_approvals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_returns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_timeline DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_dependency_graph DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_event_store DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.retraining_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_returns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduler_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.secrets_registry DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_registry DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelf_zones DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shrinkage_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_breaches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_definitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_executions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_adjustments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfer_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_health_snapshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_regions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_price_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_prices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_communications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_states DISABLE ROW LEVEL SECURITY;
