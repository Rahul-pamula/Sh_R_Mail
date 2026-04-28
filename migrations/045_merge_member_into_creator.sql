-- ============================================================
-- Migration 045: Merge 'member' role into 'creator'
-- 
-- REASON: The 'member' role has been deprecated. The system
-- now uses a strict 4-role hierarchy:
--   OWNER | ADMIN | CREATOR | VIEWER
--
-- 'member' had nearly identical permissions to 'creator'.
-- All existing 'member' users are promoted to 'creator'.
--
-- ORDER: Constraints must be dropped BEFORE rows are updated,
-- otherwise the old CHECK blocks the new 'creator' value.
-- ============================================================

-- Step 1: Drop the OLD CHECK constraints first (they block 'creator')
ALTER TABLE tenant_users
    DROP CONSTRAINT IF EXISTS tenant_users_role_check;

ALTER TABLE team_invitations
    DROP CONSTRAINT IF EXISTS team_invitations_role_check;

-- Step 2: Now promote all 'member' rows to 'creator' (no constraint blocking)
UPDATE tenant_users
SET role = 'creator'
WHERE role = 'member';

UPDATE team_invitations
SET role = 'creator'
WHERE role = 'member';

-- Step 3: Add the NEW CHECK constraint enforcing 4-role hierarchy
ALTER TABLE tenant_users
    ADD CONSTRAINT tenant_users_role_check
    CHECK (role IN ('owner', 'admin', 'creator', 'viewer'));

ALTER TABLE team_invitations
    ADD CONSTRAINT team_invitations_role_check
    CHECK (role IN ('owner', 'admin', 'creator', 'viewer'));

-- Step 4: Update column defaults
ALTER TABLE tenant_users
    ALTER COLUMN role SET DEFAULT 'creator';

ALTER TABLE team_invitations
    ALTER COLUMN role SET DEFAULT 'creator';
