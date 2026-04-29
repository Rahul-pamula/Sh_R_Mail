-- =====================================================
-- Phase 1.9 Migration: Account + Workspace Deletion Safety
-- GDPR-safe anonymization with grace-period scheduling
-- =====================================================

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS user_status TEXT DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_user_status_check'
    ) THEN
        ALTER TABLE public.users
            ADD CONSTRAINT users_user_status_check
            CHECK (user_status IN ('active', 'pending_deletion', 'anonymized'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_user_status
    ON public.users(user_status);

CREATE INDEX IF NOT EXISTS idx_users_deletion_scheduled_at
    ON public.users(deletion_scheduled_at)
    WHERE deletion_scheduled_at IS NOT NULL;


ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS workspace_status TEXT DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tenants_workspace_status_check'
    ) THEN
        ALTER TABLE public.tenants
            ADD CONSTRAINT tenants_workspace_status_check
            CHECK (workspace_status IN ('active', 'pending_deletion'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenants_workspace_status
    ON public.tenants(workspace_status);

CREATE INDEX IF NOT EXISTS idx_tenants_deletion_scheduled_at
    ON public.tenants(deletion_scheduled_at)
    WHERE deletion_scheduled_at IS NOT NULL;


UPDATE public.users
SET user_status = 'active'
WHERE user_status IS NULL;

UPDATE public.tenants
SET workspace_status = 'active'
WHERE workspace_status IS NULL;
