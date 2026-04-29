-- Migration: [AUDIT FIX 2] Add token_version to users table
-- Description: Enables user-wide session revocation by tracking a version number in the JWT.

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.users.token_version IS 'Incremented to invalidate all active JWT sessions for this user.';
