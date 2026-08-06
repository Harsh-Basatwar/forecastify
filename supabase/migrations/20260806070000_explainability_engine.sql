-- Migration: Explainability (XAI) & Decision Transparency Engine
-- Milestone 5: Enterprise Explainability, Evidence Tracing, Counterfactuals & Lineage

-- 1. Explanation Records Table
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

-- Indexes for Explanation Records
CREATE INDEX IF NOT EXISTS idx_explanation_records_exp_id ON explanation_records(explanation_id);
CREATE INDEX IF NOT EXISTS idx_explanation_records_pred_id ON explanation_records(prediction_id);
CREATE INDEX IF NOT EXISTS idx_explanation_records_rec_id ON explanation_records(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_explanation_records_store_id ON explanation_records(store_id);

-- 2. Explanation Evidence Table
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

CREATE INDEX IF NOT EXISTS idx_explanation_evidence_exp_id ON explanation_evidence(explanation_id);

-- 3. Explanation Lineage Table
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

CREATE INDEX IF NOT EXISTS idx_explanation_lineage_exp_id ON explanation_lineage(explanation_id);

-- 4. Explanation History & Versioning Table
CREATE TABLE IF NOT EXISTS explanation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    explanation_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    diff_json JSONB DEFAULT '{}'::jsonb,
    changes_summary TEXT,
    snapshot_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_explanation_history_exp_ver ON explanation_history(explanation_id, version);

-- 5. Explanation Audience Templates Table
CREATE TABLE IF NOT EXISTS explanation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key TEXT UNIQUE NOT NULL, -- 'executive', 'manager', 'analyst', 'developer', 'api'
    audience TEXT NOT NULL,
    template_structure JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Counterfactual Sessions Table
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

CREATE INDEX IF NOT EXISTS idx_cf_sessions_session_id ON counterfactual_sessions(session_id);

-- 7. Counterfactual Runs Table
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

CREATE INDEX IF NOT EXISTS idx_cf_runs_run_id ON counterfactual_runs(run_id);

-- 8. Explanation Feedback Table
CREATE TABLE IF NOT EXISTS explanation_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    explanation_id TEXT NOT NULL REFERENCES explanation_records(explanation_id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    usefulness_score INTEGER NOT NULL CHECK (usefulness_score BETWEEN 1 AND 5),
    comments TEXT,
    correction_requests TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_explanation_feedback_exp_id ON explanation_feedback(explanation_id);

-- RLS Enablement
ALTER TABLE explanation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE explanation_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE explanation_lineage ENABLE ROW LEVEL SECURITY;
ALTER TABLE explanation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE explanation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE counterfactual_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE counterfactual_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE explanation_feedback ENABLE ROW LEVEL SECURITY;

-- Allow authenticated and anon access for development
CREATE POLICY "Allow read explanation_records" ON explanation_records FOR SELECT USING (true);
CREATE POLICY "Allow insert explanation_records" ON explanation_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update explanation_records" ON explanation_records FOR UPDATE USING (true);

CREATE POLICY "Allow read explanation_evidence" ON explanation_evidence FOR SELECT USING (true);
CREATE POLICY "Allow insert explanation_evidence" ON explanation_evidence FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read explanation_lineage" ON explanation_lineage FOR SELECT USING (true);
CREATE POLICY "Allow insert explanation_lineage" ON explanation_lineage FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read explanation_history" ON explanation_history FOR SELECT USING (true);
CREATE POLICY "Allow insert explanation_history" ON explanation_history FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read explanation_templates" ON explanation_templates FOR SELECT USING (true);
CREATE POLICY "Allow insert explanation_templates" ON explanation_templates FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read counterfactual_sessions" ON counterfactual_sessions FOR SELECT USING (true);
CREATE POLICY "Allow insert counterfactual_sessions" ON counterfactual_sessions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read counterfactual_runs" ON counterfactual_runs FOR SELECT USING (true);
CREATE POLICY "Allow insert counterfactual_runs" ON counterfactual_runs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read explanation_feedback" ON explanation_feedback FOR SELECT USING (true);
CREATE POLICY "Allow insert explanation_feedback" ON explanation_feedback FOR INSERT WITH CHECK (true);
