-- =====================================================
-- Phase 1.5 Migration: Immutable Audit Logs
-- Run this in Supabase SQL editor
-- =====================================================

-- This file enforces strict immutability for the audit logs.
-- It ensures compliance requirements (like SOC2/HIPAA) by preventing
-- any accidental or malicious updates or deletes to the audit trail.

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION prevent_audit_modifications()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is an append-only table. UPDATE and DELETE operations are strictly forbidden.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Bind the trigger to the audit_logs table for UPDATE and DELETE
DROP TRIGGER IF EXISTS trg_prevent_audit_modifications ON audit_logs;
CREATE TRIGGER trg_prevent_audit_modifications
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_modifications();

-- 3. Revoke TRUNCATE permissions
REVOKE TRUNCATE ON audit_logs FROM public;
REVOKE TRUNCATE ON audit_logs FROM authenticated;
REVOKE TRUNCATE ON audit_logs FROM anon;
-- Note: Service roles and postgres superusers might still have TRUNCATE,
-- but standard application roles will be blocked.

-- =====================================================
-- ARCHITECTURE NOTE: LONG-TERM STORAGE
-- For long-term viability, once the table exceeds 5M rows, 
-- use PostgreSQL declarative partitioning by month:
-- CREATE TABLE audit_logs_partitioned (...) PARTITION BY RANGE (created_at);
-- OR set up a cron job to move old records to `audit_logs_archive`.
-- =====================================================
