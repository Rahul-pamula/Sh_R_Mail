-- =====================================================
-- Progressive Tenant Onboarding
-- Adds users, tenant membership, onboarding tracking, and
-- tenant lifecycle/compliance fields required by the API.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    full_name TEXT,
    google_id TEXT UNIQUE,
    github_id TEXT UNIQUE,
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON public.users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);

ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS organization_name TEXT,
    ADD COLUMN IF NOT EXISTS country TEXT,
    ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
    ADD COLUMN IF NOT EXISTS business_address_line1 TEXT,
    ADD COLUMN IF NOT EXISTS business_address_line2 TEXT,
    ADD COLUMN IF NOT EXISTS business_city TEXT,
    ADD COLUMN IF NOT EXISTS business_state TEXT,
    ADD COLUMN IF NOT EXISTS business_country TEXT,
    ADD COLUMN IF NOT EXISTS business_zip TEXT,
    ADD COLUMN IF NOT EXISTS business_type TEXT,
    ADD COLUMN IF NOT EXISTS primary_channel TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'onboarding',
    ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tenants_status_check'
    ) THEN
        ALTER TABLE public.tenants
            ADD CONSTRAINT tenants_status_check
            CHECK (status IN ('onboarding', 'active', 'suspended', 'cancelled'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tenants_business_type_check'
    ) THEN
        ALTER TABLE public.tenants
            ADD CONSTRAINT tenants_business_type_check
            CHECK (business_type IS NULL OR business_type IN ('ecommerce', 'saas', 'agency', 'nonprofit', 'other'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tenants_primary_channel_check'
    ) THEN
        ALTER TABLE public.tenants
            ADD CONSTRAINT tenants_primary_channel_check
            CHECK (primary_channel IS NULL OR primary_channel IN ('marketing', 'transactional', 'both'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_created_at ON public.tenants(created_at);

CREATE TABLE IF NOT EXISTS public.tenant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tenant_users_role_check'
    ) THEN
        ALTER TABLE public.tenant_users
            ADD CONSTRAINT tenant_users_role_check
            CHECK (role IN ('owner', 'admin', 'member'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON public.tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON public.tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_role ON public.tenant_users(role);

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    stage_basic_info BOOLEAN DEFAULT FALSE,
    stage_compliance BOOLEAN DEFAULT FALSE,
    stage_intent BOOLEAN DEFAULT FALSE,
    basic_info_completed_at TIMESTAMPTZ,
    compliance_completed_at TIMESTAMPTZ,
    intent_completed_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_tenant ON public.onboarding_progress(tenant_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tenants_updated_at ON public.tenants;
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
