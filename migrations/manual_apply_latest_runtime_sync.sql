-- ========================================================
-- Manual Apply: Latest Runtime Schema Sync
-- Paste this entire file into Supabase SQL Editor.
-- Safe to run multiple times.
-- Covers the recent schema drift between code and DB:
-- - contacts/import batches/runtime fields
-- - email_domain support
-- - onboarding field extensions
-- - campaign runtime alignment
-- ========================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================================
-- 1. Import batches
-- ========================================================
CREATE TABLE IF NOT EXISTS public.import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    total_rows INTEGER NOT NULL DEFAULT 0,
    imported_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    errors TEXT DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'processing',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'import_batches_status_check'
    ) THEN
        ALTER TABLE public.import_batches
            ADD CONSTRAINT import_batches_status_check
            CHECK (status IN ('processing', 'completed', 'failed'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_import_batches_tenant_created
    ON public.import_batches(tenant_id, created_at DESC);

-- ========================================================
-- 2. Contacts runtime alignment
-- ========================================================
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    status TEXT DEFAULT 'subscribed',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    custom_fields JSONB DEFAULT '{}'::jsonb,
    import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contacts
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS first_name TEXT,
    ADD COLUMN IF NOT EXISTS last_name TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'subscribed',
    ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS import_batch_id UUID,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS email_domain TEXT;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'contacts'
          AND column_name = 'project_id'
    ) AND EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'projects'
    ) THEN
        UPDATE public.contacts c
        SET tenant_id = p.tenant_id
        FROM public.projects p
        WHERE c.project_id = p.id
          AND c.tenant_id IS NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'contacts_status_check'
    ) THEN
        ALTER TABLE public.contacts
            ADD CONSTRAINT contacts_status_check
            CHECK (status IN ('subscribed', 'unsubscribed', 'bounced', 'complained'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'contacts_import_batch_id_fkey'
    ) THEN
        ALTER TABLE public.contacts
            ADD CONSTRAINT contacts_import_batch_id_fkey
            FOREIGN KEY (import_batch_id) REFERENCES public.import_batches(id) ON DELETE SET NULL;
    END IF;
END $$;

UPDATE public.contacts
SET email_domain = LOWER(SPLIT_PART(email, '@', 2))
WHERE email IS NOT NULL
  AND POSITION('@' IN email) > 0
  AND (email_domain IS NULL OR email_domain = '');

CREATE UNIQUE INDEX IF NOT EXISTS uq_contacts_tenant_email
    ON public.contacts(tenant_id, email);

CREATE INDEX IF NOT EXISTS idx_contacts_tenant_created
    ON public.contacts(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contacts_tenant_status
    ON public.contacts(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_contacts_import_batch_id
    ON public.contacts(import_batch_id);

CREATE INDEX IF NOT EXISTS idx_contacts_tenant_email_domain
    ON public.contacts(tenant_id, email_domain);

-- ========================================================
-- 3. Contact custom fields compatibility table
-- ========================================================
CREATE TABLE IF NOT EXISTS public.contact_custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    field_key TEXT NOT NULL,
    field_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(contact_id, field_key)
);

ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS max_contacts INT DEFAULT 1000;

CREATE INDEX IF NOT EXISTS idx_contact_custom_fields_tenant
    ON public.contact_custom_fields(tenant_id);

ALTER TABLE public.contact_custom_fields ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'contact_custom_fields'
          AND policyname = 'tenant_isolation_on_contact_custom_fields'
    ) THEN
        CREATE POLICY tenant_isolation_on_contact_custom_fields
            ON public.contact_custom_fields
            USING (tenant_id = auth.uid());
    END IF;
END $$;

COMMENT ON TABLE public.contact_custom_fields IS 'Phase 2: Flexible key-value storage for contact attributes';

-- ========================================================
-- 4. Onboarding field extensions
-- ========================================================
ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS workspace_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS user_role VARCHAR(50),
    ADD COLUMN IF NOT EXISTS primary_use_case VARCHAR(100),
    ADD COLUMN IF NOT EXISTS integration_sources TEXT[],
    ADD COLUMN IF NOT EXISTS expected_scale VARCHAR(50);

COMMENT ON COLUMN public.tenants.workspace_name IS 'Workspace or company name from onboarding';
COMMENT ON COLUMN public.tenants.user_role IS 'User role: Founder, Developer, Marketer, Other';
COMMENT ON COLUMN public.tenants.primary_use_case IS 'Primary use case: transactional, marketing, event_based, exploring';
COMMENT ON COLUMN public.tenants.integration_sources IS 'Array of integration sources: api_webhooks, web_app, mobile_app, ecommerce, not_sure';
COMMENT ON COLUMN public.tenants.expected_scale IS 'Expected monthly events: testing, less_1k, 1k_10k, 10k_plus';

-- ========================================================
-- 5. Campaign runtime alignment
-- ========================================================
ALTER TABLE public.campaigns
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS audience_target TEXT DEFAULT 'all',
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'campaigns'
          AND column_name = 'project_id'
    ) THEN
        UPDATE public.campaigns
        SET tenant_id = project_id
        WHERE tenant_id IS NULL
          AND project_id IS NOT NULL;

        ALTER TABLE public.campaigns
            ALTER COLUMN project_id DROP NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_created
    ON public.campaigns(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_status
    ON public.campaigns(tenant_id, status);
