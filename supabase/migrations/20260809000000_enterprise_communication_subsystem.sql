-- Migration: 20260809000000_enterprise_communication_subsystem.sql
-- Description: Phase 2 — Enterprise Provider-Agnostic Communication & Workflow Subsystem DDL

-- 1. CHANNELS REGISTRY
CREATE TABLE IF NOT EXISTS public.communication_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL, -- whatsapp, sms, email, push, rcs, telegram, slack
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.communication_channels (code, name) VALUES
('whatsapp', 'WhatsApp Business Cloud API'),
('sms', 'SMS Gateway'),
('email', 'Email Service'),
('push', 'Mobile Push Notification'),
('rcs', 'Rich Communication Services'),
('telegram', 'Telegram Bot API'),
('slack', 'Slack Workspace Webhook')
ON CONFLICT (code) DO NOTHING;

-- 2. PROVIDERS & SECRET REFERENCES (No plaintext secrets stored in DB)
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

-- 3. PROVIDER HEALTH MONITORING
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

-- 4. MESSAGE TEMPLATES & IMMUTABLE VERSIONS
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

-- 5. CONVERSATION THREADS & MULTI-PARTY PARTICIPANTS
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

-- 6. MESSAGES TABLE
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

-- 7. OUTGOING COMMUNICATION JOBS & ATTEMPTS
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

-- 8. DEAD LETTER MESSAGES
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

-- 9. LONG-RUNNING WORKFLOW STATES
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

-- 10. APPROVAL POLICIES
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

-- 11. COMMUNICATION PREFERENCES
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

-- 12. COMMUNICATION COSTS & ANALYTICS
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

-- 13. COMMUNICATION EVENT BUS LOG
CREATE TABLE IF NOT EXISTS public.communication_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- message.received, message.delivered, workflow.state_changed, ai.parsed
    source TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed_handlers JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. ENTERPRISE AUDIT LOGS
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

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_comm_jobs_status ON public.communication_jobs(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_messages_thread ON public.messages(thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_workflow_states_lookup ON public.workflow_states(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comm_events_type ON public.communication_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_costs_store ON public.communication_costs(store_id, created_at DESC);

-- DISABLE RLS PER PROJECT CONVENTION
ALTER TABLE public.communication_channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_providers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_health DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_job_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dead_letter_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_states DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_policies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_costs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_audit_logs DISABLE ROW LEVEL SECURITY;
