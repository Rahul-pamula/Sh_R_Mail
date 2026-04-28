-- Phase 7.8 Distributed Audit Hardening
-- Implements robust state machine and observability for email pipeline

DO $$ BEGIN
    CREATE TYPE email_task_status AS ENUM ('pending', 'processing', 'sent', 'failed', 'retrying');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE email_tasks 
    ADD COLUMN IF NOT EXISTS status email_task_status DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS last_error TEXT,
    ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
    ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS provider_id TEXT, -- For multi-provider failover tracking
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

-- Performance Indices
CREATE INDEX IF NOT EXISTS idx_email_tasks_status_claim ON email_tasks (status, created_at) 
    WHERE status IN ('pending', 'retrying');

CREATE INDEX IF NOT EXISTS idx_email_tasks_stale_reclaim ON email_tasks (status, locked_at) 
    WHERE status = 'processing';

CREATE INDEX IF NOT EXISTS idx_email_tasks_tenant_campaign ON email_tasks (tenant_id, campaign_id);

-- Warmup & Quota Extensions
ALTER TABLE domains 
    ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 50, -- Starting limit for Day 1
    ADD COLUMN IF NOT EXISTS warmup_started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS custom_rate_limit INTEGER; -- Per-second override

-- Suppression List (Global or per-tenant)
CREATE TABLE IF NOT EXISTS suppressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_suppressions_email ON suppressions (email);

-- Daily Send tracking for quota enforcement
CREATE TABLE IF NOT EXISTS domain_daily_stats (
    domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
    send_date DATE DEFAULT CURRENT_DATE,
    sent_count INTEGER DEFAULT 0,
    PRIMARY KEY (domain_id, send_date)
);
