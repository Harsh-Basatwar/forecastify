-- Migration: Forecast Engine 2.0 Feature Engineering Pipeline Schema
-- Description: Feature Store table storing versioned, validated, normalized feature vectors, metadata, quality metrics, lineage, lifecycle state, and ML training snapshots.

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

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_forecast_features_store_prod_ts 
    ON public.forecast_features(store_id, product_id, generated_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_forecast_features_hash 
    ON public.forecast_features(feature_hash);

CREATE INDEX IF NOT EXISTS idx_forecast_features_state 
    ON public.forecast_features(lifecycle_state);

CREATE INDEX IF NOT EXISTS idx_forecast_features_version 
    ON public.forecast_features(feature_version);

-- ROW LEVEL SECURITY (RLS) POLICIES FOR STORE ISOLATION
ALTER TABLE public.forecast_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own store forecast features" ON public.forecast_features
    FOR SELECT USING (auth.uid() = store_id);

CREATE POLICY "Users can insert own store forecast features" ON public.forecast_features
    FOR INSERT WITH CHECK (auth.uid() = store_id);

CREATE POLICY "Users can update own store forecast features" ON public.forecast_features
    FOR UPDATE USING (auth.uid() = store_id);

CREATE POLICY "Users can delete own store forecast features" ON public.forecast_features
    FOR DELETE USING (auth.uid() = store_id);

-- TRIGGER FOR UPDATED_AT
CREATE TRIGGER update_forecast_features_modtime
BEFORE UPDATE ON public.forecast_features
FOR EACH ROW EXECUTE PROCEDURE update_forecast_updated_at_column();
