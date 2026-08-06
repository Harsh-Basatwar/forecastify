-- Migration: 20260806090000_background_operations.sql
-- Milestone 7: Enterprise Autonomous Operations, Background Processing & Platform Reliability

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

CREATE TABLE IF NOT EXISTS public.job_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.background_jobs(id) ON DELETE CASCADE,
    depends_on_job_id UUID REFERENCES public.background_jobs(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) DEFAULT 'REQUIRED', -- REQUIRED, OPTIONAL
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS public.system_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subsystem VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'HEALTHY', -- HEALTHY, WARNING, DEGRADED, CRITICAL, OFFLINE
    latency_ms INTEGER DEFAULT 0,
    last_check_at TIMESTAMPTZ DEFAULT NOW(),
    details JSONB DEFAULT '{}'::jsonb,
    error_message TEXT
);

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

CREATE TABLE IF NOT EXISTS public.drift_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC(10,4) NOT NULL,
    threshold NUMERIC(10,4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.distributed_locks (
    lock_key VARCHAR(255) PRIMARY KEY,
    holder_id VARCHAR(100) NOT NULL,
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    fence_token BIGINT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.rate_limits (
    key_id VARCHAR(255) PRIMARY KEY,
    client_key VARCHAR(255) NOT NULL,
    tokens NUMERIC(10,2) NOT NULL,
    last_refill TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.configuration_registry (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    category VARCHAR(100) DEFAULT 'GENERAL',
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.secrets_registry (
    key VARCHAR(255) PRIMARY KEY,
    encrypted_value TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_registry (
    service_id VARCHAR(100) PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'ONLINE',
    version VARCHAR(50) DEFAULT '1.0.0',
    capabilities JSONB DEFAULT '[]'::jsonb,
    last_ping TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS public.sla_breaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sla_name VARCHAR(100) NOT NULL,
    actual_value NUMERIC(10,2) NOT NULL,
    target_value NUMERIC(10,2) NOT NULL,
    severity VARCHAR(50) DEFAULT 'WARNING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_name VARCHAR(255) NOT NULL,
    backup_type VARCHAR(50) DEFAULT 'FULL', -- FULL, DELTA, CONFIG
    size_bytes BIGINT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'COMPLETED',
    storage_location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.capacity_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type VARCHAR(100) NOT NULL, -- CPU, MEMORY, DB_SIZE, QUEUE_DEPTH, STORAGE
    current_usage NUMERIC(12,2) NOT NULL,
    predicted_usage_30d NUMERIC(12,2) NOT NULL,
    predicted_usage_90d NUMERIC(12,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.operational_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR(50) NOT NULL, -- DAILY, WEEKLY, MONTHLY
    title VARCHAR(255) NOT NULL,
    metrics_summary JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS public.notification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID,
    channel VARCHAR(50) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS public.worker_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_type VARCHAR(100) NOT NULL,
    throughput_per_min NUMERIC(10,2) DEFAULT 0,
    avg_latency_ms NUMERIC(10,2) DEFAULT 0,
    failure_rate_pct NUMERIC(5,2) DEFAULT 0,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.queue_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_name VARCHAR(100) NOT NULL,
    depth INTEGER DEFAULT 0,
    avg_wait_time_ms INTEGER DEFAULT 0,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS public.health_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    overall_status VARCHAR(50) NOT NULL,
    active_workers INTEGER DEFAULT 0,
    queued_jobs INTEGER DEFAULT 0,
    active_alerts INTEGER DEFAULT 0,
    snapshot JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    correlation_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_bg_jobs_store_status ON public.background_jobs(store_id, status);
CREATE INDEX IF NOT EXISTS idx_bg_jobs_correlation ON public.background_jobs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_bg_jobs_trace ON public.background_jobs(trace_id);
CREATE INDEX IF NOT EXISTS idx_spans_trace ON public.distributed_spans(trace_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.system_alerts(is_resolved, severity);
CREATE INDEX IF NOT EXISTS idx_drift_store_type ON public.drift_reports(store_id, drift_type);
CREATE INDEX IF NOT EXISTS idx_audit_store_action ON public.audit_events(store_id, action);
CREATE INDEX IF NOT EXISTS idx_sys_events_type ON public.system_events(event_type);

-- RLS POLICIES
ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drift_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for store users background_jobs" ON public.background_jobs FOR ALL USING (true);
CREATE POLICY "Enable all for store users workflows" ON public.workflows FOR ALL USING (true);
CREATE POLICY "Enable all for store users system_alerts" ON public.system_alerts FOR ALL USING (true);
CREATE POLICY "Enable all for store users drift_reports" ON public.drift_reports FOR ALL USING (true);
CREATE POLICY "Enable all for store users audit_events" ON public.audit_events FOR ALL USING (true);
