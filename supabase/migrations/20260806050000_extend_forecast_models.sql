-- Migration: Extend Forecast Models & Add Prediction History
-- Description: MLOps extensions for dataset versioning, artifact checksums, evaluation reports, resource metadata, health tracking, and prediction history.

-- 1. Extend forecast_models table
ALTER TABLE public.forecast_models
ADD COLUMN IF NOT EXISTS dataset_version TEXT DEFAULT '1.0.0',
ADD COLUMN IF NOT EXISTS dataset_hash TEXT,
ADD COLUMN IF NOT EXISTS feature_snapshot_version TEXT DEFAULT '1.0.0',
ADD COLUMN IF NOT EXISTS validation_window TEXT DEFAULT '30d',
ADD COLUMN IF NOT EXISTS test_window TEXT DEFAULT '14d',
ADD COLUMN IF NOT EXISTS artifact_checksum TEXT,
ADD COLUMN IF NOT EXISTS framework_version TEXT DEFAULT '1.0.0',
ADD COLUMN IF NOT EXISTS serialization_format TEXT DEFAULT 'json',
ADD COLUMN IF NOT EXISTS training_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS training_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS evaluation_report JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS deployment_notes TEXT,
ADD COLUMN IF NOT EXISTS resource_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS health_status JSONB DEFAULT '{"healthState":"HEALTHY","predictionCount":0,"failureCount":0}'::jsonb;

-- 2. Create forecast_predictions table for prediction history
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

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_forecast_predictions_store_product ON public.forecast_predictions(store_id, product_id);
CREATE INDEX IF NOT EXISTS idx_forecast_predictions_model ON public.forecast_predictions(model_id);
CREATE INDEX IF NOT EXISTS idx_forecast_predictions_created ON public.forecast_predictions(created_at DESC);

-- RLS POLICIES
ALTER TABLE public.forecast_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own store predictions" ON public.forecast_predictions
    FOR SELECT USING (auth.uid() = store_id);

CREATE POLICY "Users can insert own store predictions" ON public.forecast_predictions
    FOR INSERT WITH CHECK (auth.uid() = store_id);

CREATE POLICY "Users can delete own store predictions" ON public.forecast_predictions
    FOR DELETE USING (auth.uid() = store_id);
