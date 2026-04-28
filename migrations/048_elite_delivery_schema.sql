-- 1. Provider Health Tracking (Ultra-Short vs Short vs Long Windows)
CREATE TABLE IF NOT EXISTS provider_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name TEXT NOT NULL,
    target_isp TEXT DEFAULT 'global',
    success_rate_1m FLOAT DEFAULT 100.0, -- Ultra-Short (Reaction)
    success_rate_5m FLOAT DEFAULT 100.0, -- Short (Stability)
    success_rate_1h FLOAT DEFAULT 100.0, -- Long (History)
    avg_latency_1m INTEGER DEFAULT 0,
    failure_threshold_reached BOOLEAN DEFAULT FALSE,
    last_error_at TIMESTAMPTZ,
    status TEXT DEFAULT 'healthy',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider_name, target_isp)
);

-- 2. Sticky Provider Assignment with Stability Window
CREATE TABLE IF NOT EXISTS campaign_provider_assignment (
    campaign_id UUID PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
    provider_name TEXT NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    last_switched_at TIMESTAMPTZ DEFAULT NOW(), -- Audit Fix: Stability Window
    is_sticky BOOLEAN DEFAULT TRUE,
    override_reason TEXT
);

-- 3. Advanced Reputation Engine (Recovery & Vol. Normalization)
ALTER TABLE domains 
    ADD COLUMN IF NOT EXISTS reputation_score FLOAT DEFAULT 100.0,
    ADD COLUMN IF NOT EXISTS throttle_factor FLOAT DEFAULT 1.0, 
    ADD COLUMN IF NOT EXISTS bounce_rate_1m FLOAT DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS bounce_rate_1h FLOAT DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS last_recalc_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cooldown_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS recovery_cap_per_min FLOAT DEFAULT 5.0; -- Audit Fix: Controlled Recovery

-- 4. Multi-Level Delivery Controls
CREATE TABLE IF NOT EXISTS delivery_controls (
    id TEXT PRIMARY KEY, -- 'global', 'tenant:<uuid>'
    pause_mode TEXT DEFAULT 'NONE', 
    max_rate_override INTEGER,
    reason TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Lease-Based Regional Safety
ALTER TABLE email_tasks
    ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS classification TEXT DEFAULT 'marketing',
    ADD COLUMN IF NOT EXISTS region_owner TEXT DEFAULT 'us-east-1',
    ADD COLUMN IF NOT EXISTS region_lease_expiry TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes', -- Audit Fix: Lease
    ADD COLUMN IF NOT EXISTS origin_region TEXT DEFAULT 'us-east-1';

-- 6. Region Heartbeat & Coordinator Lock
CREATE TABLE IF NOT EXISTS region_heartbeats (
    region_name TEXT PRIMARY KEY,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active',
    is_coordinator BOOLEAN DEFAULT FALSE -- Audit Fix: Split-Brain Prevention
);
