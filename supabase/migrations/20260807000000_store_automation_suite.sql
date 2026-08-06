-- Migration: 20260807000000_store_automation_suite.sql
-- Store Automation Suite — AI Retail Operations Module
-- 25 new tables for autonomous store management

-- ═══════════════════════════════════════════════════════════════
-- HELPER: Reusable updated_at trigger function
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- GROUP A: CORE AUTOMATION TABLES (1–10)
-- ═══════════════════════════════════════════════════════════════

-- 1. Daily Briefs (Morning & Closing Reports)
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

-- 2. Khata Accounts (Customer Credit Ledger)
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

-- 3. Khata Transactions (Immutable Ledger)
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

-- 4. Khata Reminders
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

-- 5. Employee Tasks
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

-- 6. Shelf Zones
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

-- 7. Shrinkage Reports
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

-- 8. Festival Plans
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

-- 9. Loyalty Segments
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

-- 10. Store Health Snapshots
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

-- ═══════════════════════════════════════════════════════════════
-- GROUP B: ENTERPRISE CAPABILITY TABLES (11–25)
-- ═══════════════════════════════════════════════════════════════

-- 11. Vendor Communications
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

-- 12. GST Compliance
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

-- 13. Delivery Orders
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

-- 14. Customer Communications
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

-- 15. Price Rules
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

-- 16. Demand Scenarios
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

-- 17. Layout Recommendations
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

-- 18. Negotiation Insights
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

-- 19. Loss Incidents
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

-- 20. Expenses
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

-- 21. Store Goals
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

-- 22. SOP Templates
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

-- 23. SOP Executions
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

-- 24. Autonomous Actions
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

-- 25. Autonomous Config
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

-- ═══════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════

-- Group A
CREATE INDEX IF NOT EXISTS idx_daily_briefs_store_date ON public.daily_briefs(store_id, brief_date DESC);
CREATE INDEX IF NOT EXISTS idx_khata_accounts_store ON public.khata_accounts(store_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_khata_accounts_overdue ON public.khata_accounts(store_id, status) WHERE status = 'overdue';
CREATE INDEX IF NOT EXISTS idx_khata_txn_account ON public.khata_transactions(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_store_date ON public.employee_tasks(store_id, due_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_status ON public.employee_tasks(store_id, status) WHERE status IN ('pending','in_progress');
CREATE INDEX IF NOT EXISTS idx_shrinkage_store_date ON public.shrinkage_reports(store_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_festival_plans_store ON public.festival_plans(store_id, festival_date);
CREATE INDEX IF NOT EXISTS idx_loyalty_store_segment ON public.loyalty_segments(store_id, segment);
CREATE INDEX IF NOT EXISTS idx_store_health_store_date ON public.store_health_snapshots(store_id, snapshot_date DESC);

-- Group B
CREATE INDEX IF NOT EXISTS idx_vendor_comms_store_supplier ON public.vendor_communications(store_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_vendor_comms_followup ON public.vendor_communications(store_id, next_follow_up_at) WHERE status IN ('sent','delivered') AND next_follow_up_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gst_compliance_period ON public.gst_compliance(store_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_store ON public.delivery_orders(store_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_comms_schedule ON public.customer_communications(store_id, scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_price_rules_store_status ON public.price_rules(store_id, status);
CREATE INDEX IF NOT EXISTS idx_loss_incidents_store ON public.loss_incidents(store_id, status) WHERE status IN ('open','investigating');
CREATE INDEX IF NOT EXISTS idx_expenses_store_date ON public.expenses(store_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_store_goals_active ON public.store_goals(store_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_pending ON public.autonomous_actions(store_id, approval_status) WHERE approval_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_store_date ON public.autonomous_actions(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sop_executions_store ON public.sop_executions(store_id, execution_date DESC);

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS (updated_at auto-update)
-- ═══════════════════════════════════════════════════════════════

CREATE TRIGGER set_daily_briefs_updated_at BEFORE UPDATE ON public.daily_briefs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_khata_accounts_updated_at BEFORE UPDATE ON public.khata_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_employee_tasks_updated_at BEFORE UPDATE ON public.employee_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_shelf_zones_updated_at BEFORE UPDATE ON public.shelf_zones FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_shrinkage_reports_updated_at BEFORE UPDATE ON public.shrinkage_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_festival_plans_updated_at BEFORE UPDATE ON public.festival_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_loyalty_segments_updated_at BEFORE UPDATE ON public.loyalty_segments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_vendor_comms_updated_at BEFORE UPDATE ON public.vendor_communications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_gst_compliance_updated_at BEFORE UPDATE ON public.gst_compliance FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_delivery_orders_updated_at BEFORE UPDATE ON public.delivery_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_price_rules_updated_at BEFORE UPDATE ON public.price_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_negotiation_insights_updated_at BEFORE UPDATE ON public.negotiation_insights FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_loss_incidents_updated_at BEFORE UPDATE ON public.loss_incidents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_store_goals_updated_at BEFORE UPDATE ON public.store_goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_sop_templates_updated_at BEFORE UPDATE ON public.sop_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_autonomous_actions_updated_at BEFORE UPDATE ON public.autonomous_actions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_autonomous_config_updated_at BEFORE UPDATE ON public.autonomous_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (Disabled per project convention, policies defined)
-- ═══════════════════════════════════════════════════════════════

-- Following existing Forecastify convention: RLS disabled but policies defined for production enablement.
ALTER TABLE public.daily_briefs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.khata_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.khata_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.khata_reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelf_zones DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shrinkage_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.festival_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_segments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_health_snapshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_communications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_compliance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_communications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_scenarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.layout_recommendations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.negotiation_insights DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.loss_incidents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_executions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.autonomous_actions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.autonomous_config DISABLE ROW LEVEL SECURITY;
