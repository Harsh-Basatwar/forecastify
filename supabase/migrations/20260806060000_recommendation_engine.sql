-- Migration: 20260806060000_recommendation_engine.sql
-- Description: Enterprise AI Recommendation & Decision Intelligence Engine (Milestone 4)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Main forecast_recommendations table
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

-- Indexes for forecast_recommendations
CREATE INDEX IF NOT EXISTS idx_fr_store_status_priority ON forecast_recommendations(store_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_fr_store_category ON forecast_recommendations(store_id, category);
CREATE INDEX IF NOT EXISTS idx_fr_product_store ON forecast_recommendations(product_id, store_id);
CREATE INDEX IF NOT EXISTS idx_fr_forecast_prediction ON forecast_recommendations(forecast_prediction_id);
CREATE INDEX IF NOT EXISTS idx_fr_chain_id ON forecast_recommendations(chain_id);

-- Enable RLS for forecast_recommendations
ALTER TABLE forecast_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access recommendations for their store" ON forecast_recommendations
    FOR ALL USING (
        store_id IN (
            SELECT store_id FROM store_users WHERE user_id = auth.uid()
            UNION
            SELECT id FROM stores WHERE owner_id = auth.uid()
        )
    );

-- 2. Recommendation Dependency Graph (DAG) Table
CREATE TABLE IF NOT EXISTS recommendation_dependency_graph (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL,
    source_recommendation_id UUID NOT NULL REFERENCES forecast_recommendations(id) ON DELETE CASCADE,
    target_recommendation_id UUID NOT NULL REFERENCES forecast_recommendations(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) NOT NULL, -- REQUIRES, BLOCKS, SUPERSEDES, DUPLICATES
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rdg_source ON recommendation_dependency_graph(source_recommendation_id);
CREATE INDEX IF NOT EXISTS idx_rdg_target ON recommendation_dependency_graph(target_recommendation_id);

ALTER TABLE recommendation_dependency_graph ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access dependency graph for their store" ON recommendation_dependency_graph
    FOR ALL USING (
        store_id IN (
            SELECT store_id FROM store_users WHERE user_id = auth.uid()
            UNION
            SELECT id FROM stores WHERE owner_id = auth.uid()
        )
    );

-- 3. Immutable Event Sourcing Table
CREATE TABLE IF NOT EXISTS recommendation_event_store (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL,
    recommendation_id UUID NOT NULL REFERENCES forecast_recommendations(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    actor_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_res_rec_event ON recommendation_event_store(recommendation_id, created_at);

ALTER TABLE recommendation_event_store ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access recommendation events for their store" ON recommendation_event_store
    FOR ALL USING (
        store_id IN (
            SELECT store_id FROM store_users WHERE user_id = auth.uid()
            UNION
            SELECT id FROM stores WHERE owner_id = auth.uid()
        )
    );

-- 4. Recommendation Version History Table
CREATE TABLE IF NOT EXISTS recommendation_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL,
    recommendation_id UUID NOT NULL REFERENCES forecast_recommendations(id) ON DELETE CASCADE,
    version INT NOT NULL,
    forecast_prediction_id UUID,
    snapshot_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE recommendation_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access recommendation versions for their store" ON recommendation_versions
    FOR ALL USING (
        store_id IN (
            SELECT store_id FROM store_users WHERE user_id = auth.uid()
            UNION
            SELECT id FROM stores WHERE owner_id = auth.uid()
        )
    );

-- 5. Rule DSL Definitions Table
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

ALTER TABLE recommendation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access rules for their store" ON recommendation_rules
    FOR ALL USING (
        store_id IN (
            SELECT store_id FROM store_users WHERE user_id = auth.uid()
            UNION
            SELECT id FROM stores WHERE owner_id = auth.uid()
        )
    );

-- 6. Recommendation Feedback & Rejection Table
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

ALTER TABLE recommendation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access feedback for their store" ON recommendation_feedback
    FOR ALL USING (
        store_id IN (
            SELECT store_id FROM store_users WHERE user_id = auth.uid()
            UNION
            SELECT id FROM stores WHERE owner_id = auth.uid()
        )
    );

-- 7. Recommendation Engine Settings Table
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

ALTER TABLE recommendation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access settings for their store" ON recommendation_settings
    FOR ALL USING (
        store_id IN (
            SELECT store_id FROM store_users WHERE user_id = auth.uid()
            UNION
            SELECT id FROM stores WHERE owner_id = auth.uid()
        )
    );
