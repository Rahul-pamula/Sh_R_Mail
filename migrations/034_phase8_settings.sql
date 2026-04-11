-- Phase 8A: Add personal profile columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Phase 8A: Add organization details to tenants table (CAN-SPAM compliance)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_address TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_city TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_state TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_zip TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_country TEXT;

-- Phase 8C: API Keys table for developer integrations
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,            -- SHA-256 of the raw key (never store plain text)
  key_prefix TEXT NOT NULL,          -- First 12 chars for display (e.g. "ee_abc123...")
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,            -- NULL = active, set = revoked
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by tenant
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_id ON api_keys(tenant_id);
-- Index for API authentication (lookup by hash)
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash) WHERE revoked_at IS NULL;
