-- Migration: Forecast Engine 2.0 Infrastructure Schema
-- Description: Core infrastructure tables for model registry, background jobs, and store forecast settings with RLS policies.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Forecast Models Table (Model Registry)
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

-- 2. Forecast Jobs Table (Job Queue & Tracking)
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

-- 3. Forecast Settings Table (Store Preferences)
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

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_forecast_models_store ON public.forecast_models(store_id, status);
CREATE INDEX IF NOT EXISTS idx_forecast_models_type ON public.forecast_models(model_type);
CREATE INDEX IF NOT EXISTS idx_forecast_jobs_store ON public.forecast_jobs(store_id, status);
CREATE INDEX IF NOT EXISTS idx_forecast_jobs_type ON public.forecast_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_forecast_settings_store ON public.forecast_settings(store_id);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.forecast_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for forecast_models
CREATE POLICY "Users can view own store forecast models" ON public.forecast_models
    FOR SELECT USING (auth.uid() = store_id);

CREATE POLICY "Users can insert own store forecast models" ON public.forecast_models
    FOR INSERT WITH CHECK (auth.uid() = store_id);

CREATE POLICY "Users can update own store forecast models" ON public.forecast_models
    FOR UPDATE USING (auth.uid() = store_id);

CREATE POLICY "Users can delete own store forecast models" ON public.forecast_models
    FOR DELETE USING (auth.uid() = store_id);

-- RLS Policies for forecast_jobs
CREATE POLICY "Users can view own store forecast jobs" ON public.forecast_jobs
    FOR SELECT USING (auth.uid() = store_id);

CREATE POLICY "Users can insert own store forecast jobs" ON public.forecast_jobs
    FOR INSERT WITH CHECK (auth.uid() = store_id);

CREATE POLICY "Users can update own store forecast jobs" ON public.forecast_jobs
    FOR UPDATE USING (auth.uid() = store_id);

CREATE POLICY "Users can delete own store forecast jobs" ON public.forecast_jobs
    FOR DELETE USING (auth.uid() = store_id);

-- RLS Policies for forecast_settings
CREATE POLICY "Users can view own store forecast settings" ON public.forecast_settings
    FOR SELECT USING (auth.uid() = store_id);

CREATE POLICY "Users can insert own store forecast settings" ON public.forecast_settings
    FOR INSERT WITH CHECK (auth.uid() = store_id);

CREATE POLICY "Users can update own store forecast settings" ON public.forecast_settings
    FOR UPDATE USING (auth.uid() = store_id);

-- TRIGGERS FOR UPDATED_AT
CREATE OR REPLACE FUNCTION update_forecast_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = timezone('utc'::text, now());
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_forecast_models_modtime
BEFORE UPDATE ON public.forecast_models
FOR EACH ROW EXECUTE PROCEDURE update_forecast_updated_at_column();

CREATE TRIGGER update_forecast_jobs_modtime
BEFORE UPDATE ON public.forecast_jobs
FOR EACH ROW EXECUTE PROCEDURE update_forecast_updated_at_column();

CREATE TRIGGER update_forecast_settings_modtime
BEFORE UPDATE ON public.forecast_settings
FOR EACH ROW EXECUTE PROCEDURE update_forecast_updated_at_column();
