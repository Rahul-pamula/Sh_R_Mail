# Phase 1 — Foundation & Authentication

> **Verification Status: ✅ VERIFIED**
> **Last Verified:** February 19, 2026
>
> | Component | Status | Verification Method |
> |-----------|--------|---------------------|
> | **Authentication** | ✅ | Verified `auth.py` (Signup/Login logic) and `jwt_middleware.py` (Token validation) |
> | **Multi-tenancy** | ✅ | Verified `schema.sql` (RLS Policies) and `jwt_middleware.py` (`tenant_id` enforcement) |
> | **Onboarding** | ✅ | Verified `onboarding.py` (Endpoints for Workspace, Use Case, Integrations, Scale) |
> | **Database Schema** | ✅ | Verified `schema.sql` tables (`users`, `tenants`, `tenant_users`) |


---

## Overview

Phase 1 establishes the **multi-tenant SaaS foundation** for the Email Marketing platform. It implements user registration, authentication, tenant provisioning, and a guided onboarding flow. Every subsequent phase (Contacts, Campaigns, Analytics) depends on this layer for identity, isolation, and access control.

**Tech Stack:** FastAPI (Python) · Supabase (PostgreSQL) · Next.js (React) · JWT (HS256) · bcrypt

---

## Authentication System

### Signup Flow

```
User submits email + password + full_name
         │
         ▼
  Validate email uniqueness (users table)
         │
         ▼
  Hash password with bcrypt
         │
         ▼
  Create user record (UUID generated)
         │
         ▼
  Create tenant record (status = 'onboarding')
         │
         ▼
  Link user → tenant via tenant_users (role = 'owner')
         │
         ▼
  Create onboarding_progress record
         │
         ▼
  Generate JWT token (user_id, tenant_id, email, role)
         │
         ▼
  Return token + onboarding_required = true
```

**Endpoint:** `POST /auth/signup`

| Field | Validation |
|-------|-----------|
| `email` | Pydantic EmailStr, unique check |
| `password` | min 8, max 100 characters |
| `full_name` | min 1, max 200 characters |

**Rollback:** If any step fails, created records are cleaned up (user, tenant, tenant_users).

### Login Flow

```
User submits email + password
         │
         ▼
  Look up user by email
         │
         ▼
  Verify password against bcrypt hash
         │
         ▼
  Check user is_active flag
         │
         ▼
  Get primary tenant (first by joined_at)
         │
         ▼
  Get tenant status ('onboarding' or 'active')
         │
         ▼
  Generate JWT token
         │
         ▼
  Return token + tenant_status + onboarding_required
```

**Endpoint:** `POST /auth/login`

### JWT Token

| Field | Source |
|-------|--------|
| `user_id` | Generated UUID |
| `tenant_id` | Linked tenant UUID |
| `email` | User email |
| `role` | From tenant_users (owner/admin/member) |
| `exp` | 7-day expiry |

**Signing:** HS256 with `JWT_SECRET_KEY` environment variable.

### Password Hashing

Uses `passlib` with bcrypt scheme. Passwords are never stored in plaintext.

```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
```

---

## Multi-Tenant Architecture

### Database Schema

```
┌──────────────┐      ┌──────────────────┐      ┌──────────────┐
│    users     │      │   tenant_users   │      │   tenants    │
├──────────────┤      ├──────────────────┤      ├──────────────┤
│ id (PK)      │◄─────│ user_id (FK)     │      │ id (PK)      │
│ email        │      │ tenant_id (FK)   │─────►│ email        │
│ password_hash│      │ role             │      │ status       │
│ full_name    │      │ joined_at        │      │ org_name     │
│ is_active    │      └──────────────────┘      │ max_contacts │
│ last_login_at│                                │ workspace_name│
│ created_at   │                                │ created_at   │
└──────────────┘                                └──────────────┘
```

### Role Assignment

| Event | Role Assigned |
|-------|--------------|
| User signs up | `owner` (automatic) |
| Invited to workspace | `admin` or `member` (future) |

### Tenant Lifecycle

```
  Created on signup → status = 'onboarding'
         │
         ▼ (user completes onboarding)
         │
  Activated → status = 'active'
```

Only `active` tenants can access protected features (contacts, campaigns).

---

## Onboarding Flow

The onboarding is a multi-step wizard flow:

### Step 1 — Workspace Setup
**Endpoint:** `POST /onboarding/workspace`

| Field | Type |
|-------|------|
| `workspace_name` | string |
| `user_role` | string |

### Step 2 — Primary Use Case
**Endpoint:** `POST /onboarding/use-case`

| Field | Type |
|-------|------|
| `primary_use_case` | string |

### Step 3 — Integrations
**Endpoint:** `POST /onboarding/integrations`

| Field | Type |
|-------|------|
| `integration_sources` | string[] |

### Step 4 — Expected Scale
**Endpoint:** `POST /onboarding/scale`

| Field | Type |
|-------|------|
| `expected_scale` | string |

### Step 5 — Complete
**Endpoint:** `POST /onboarding/complete`

**Actions:**
- Sets `tenants.status = 'active'`
- Records `onboarding_completed_at` timestamp
- Updates legacy `onboarding_progress` table

After completion, the user is redirected to the dashboard and can access all features.

### Legacy Onboarding Stages

The original 3-stage flow (basic_info, compliance, intent) is preserved:

| Stage | Endpoint | Required? |
|-------|----------|-----------|
| Basic Info | `PUT /onboarding/basic-info` | ✅ Yes |
| Compliance | `PUT /onboarding/compliance` | ✅ Yes |
| Intent | `PUT /onboarding/intent` | Optional |

**Status Endpoint:** `GET /onboarding/status` — returns completed stages, next stage, and progress.

---

## Access Control

### Route Protection Levels

| Level | Dependency | Use Case | Tenant Status |
|-------|-----------|----------|---------------|
| **Public** | None | `/auth/signup`, `/auth/login`, `/health` | Any |
| **Authenticated** | `require_authenticated_user` | `/onboarding/*` | Any |
| **Active Tenant** | `require_active_tenant` | `/contacts/*`, `/campaigns/*` | `active` only |

### require_active_tenant (Primary Guard)

```
Request arrives with Authorization: Bearer <token>
         │
         ▼
  Decode JWT, extract user_id + tenant_id + email + role
         │
         ▼
  Validate X-Tenant-ID header matches JWT (anti-spoofing)
         │
         ▼
  Query tenants table for status
         │
         ▼
  If status ≠ 'active' → HTTP 403 Forbidden
         │
         ▼
  Return tenant_id for use in route handler
```

### Anti-Spoofing Protection

If a client sends `X-Tenant-ID` header, it **must match** the `tenant_id` in the JWT. Mismatches return HTTP 400. This prevents:
- Debug confusion when wrong headers are sent
- Intentional spoofing via header manipulation

---

## Security Design

### Tenant Isolation Guarantees

| Layer | Mechanism | Detail |
|-------|-----------|--------|
| **Identity** | JWT signed with HS256 | `tenant_id` embedded in token, cannot be forged |
| **API Layer** | Dependency injection | Every protected route gets `tenant_id` from JWT |
| **Query Layer** | Application filtering | Every query includes `.eq("tenant_id", tenant_id)` |
| **Database** | RLS policies | PostgreSQL row-level security as last defense |
| **Header** | Anti-spoofing check | `X-Tenant-ID` must match JWT if present |

### Key Security Properties

1. **tenant_id NEVER comes from user input** — always extracted from JWT
2. **Passwords hashed with bcrypt** — industry standard, salted automatically
3. **JWT expires in 7 days** — configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`
4. **Service role key** used for backend DB access (bypasses RLS, requires app-level isolation)
5. **Email uniqueness** enforced at signup

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                    │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  Auth Pages    │  │  Onboarding  │  │  Dashboard  │ │
│  │  (Login/Signup)│  │  (4 Steps)   │  │  (Active)   │ │
│  └───────┬────────┘  └──────┬───────┘  └──────┬──────┘ │
└──────────┼──────────────────┼─────────────────┼────────┘
           │ JWT              │ JWT              │ JWT
           ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│                    FASTAPI (Backend)                     │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────────┐ │
│  │ /auth/*      │  │ /onboarding/*  │  │ /contacts/* │ │
│  │ Public       │  │ Authenticated  │  │ Active Only │ │
│  └──────┬───────┘  └───────┬────────┘  └──────┬──────┘ │
│         │                  │                   │        │
│         ▼                  ▼                   ▼        │
│  ┌─────────────────────────────────────────────────┐    │
│  │         JWT Middleware (tenant extraction)       │    │
│  └─────────────────────┬───────────────────────────┘    │
└────────────────────────┼────────────────────────────────┘
                         │ Service Role Key
                         ▼
┌─────────────────────────────────────────────────────────┐
│              SUPABASE (PostgreSQL)                       │
│  ┌────────┐  ┌──────────┐  ┌──────────────┐            │
│  │ users  │  │ tenants  │  │ tenant_users │            │
│  └────────┘  └──────────┘  └──────────────┘            │
│  ┌──────────────────────┐  ┌──────────────┐            │
│  │ onboarding_progress  │  │  contacts    │            │
│  └──────────────────────┘  └──────────────┘            │
│                     RLS Enabled                         │
└─────────────────────────────────────────────────────────┘
```

---

## API Endpoints Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/signup` | Public | Register user + create tenant |
| `POST` | `/auth/login` | Public | Authenticate, get JWT |
| `GET` | `/auth/me` | JWT | Get current user (placeholder) |
| `GET` | `/onboarding/status` | Header | Get onboarding progress |
| `PUT` | `/onboarding/basic-info` | JWT | Save org name, country |
| `PUT` | `/onboarding/compliance` | JWT | Save business address |
| `PUT` | `/onboarding/intent` | Header | Save business context |
| `POST` | `/onboarding/workspace` | JWT | Step 1: workspace setup |
| `POST` | `/onboarding/use-case` | JWT | Step 2: use case |
| `POST` | `/onboarding/integrations` | JWT | Step 3: integrations |
| `POST` | `/onboarding/scale` | JWT | Step 4: scale |
| `POST` | `/onboarding/complete` | JWT | Activate tenant |

---

## Files Reference

| File | Purpose | Lines |
|------|---------|-------|
| `routes/auth.py` | Signup, login, JWT creation | ~310 |
| `routes/onboarding.py` | 4-step onboarding + legacy 3-stage flow | ~490 |
| `utils/jwt_middleware.py` | JWT verification, tenant extraction, access control | ~181 |
| `utils/supabase_client.py` | Database singleton | ~56 |
| `main.py` | FastAPI app, CORS, router registration | ~137 |
