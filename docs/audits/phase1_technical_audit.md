# Phase 1 - Technical Audit

> Audit date: 2026-03-15  
> Scope: verified against repository code, not earlier markdown assumptions

---

## 1. Audit Scope

This audit covers the real implementation of the Phase 1 foundation:

- authentication
- password hashing and token issuance
- tenant identity and membership
- onboarding lifecycle
- frontend session state
- middleware and redirect guards
- schema and migration support

Reviewed code areas:

- `platform/api/routes/auth.py`
- `platform/api/routes/onboarding.py`
- `platform/api/routes/password_reset.py`
- `platform/api/utils/jwt_middleware.py`
- `platform/api/utils/supabase_client.py`
- `platform/api/main.py`
- `platform/client/src/context/AuthContext.tsx`
- `platform/client/src/middleware.ts`
- `platform/client/src/app/login/page.tsx`
- `platform/client/src/app/signup/page.tsx`
- `platform/client/src/app/onboarding/*`
- `platform/client/src/app/dashboard/page.tsx`
- `migrations/002_progressive_onboarding.sql`
- `migrations/021_onboarding_field_extensions.sql`
- `migrations/022_campaign_runtime_alignment.sql`
- `migrations/manual_apply_latest_runtime_sync.sql`

---

## 2. Verified Tech Stack

### Backend foundation

- FastAPI
- Pydantic
- `python-jose` for JWT
- `bcrypt` for password hashing
- Supabase Python client
- custom auth tables in Postgres

### Frontend foundation

- Next.js App Router
- React context for auth state
- cookies plus localStorage session persistence
- client redirects in auth context
- Next.js middleware redirects at request time

### Important architectural clarification

The active auth system is:

- custom users table
- custom password hashes
- custom JWTs

It is not Supabase Auth as a managed identity provider.

---

## 3. Architecture Implemented

### 3.1 Identity model

The identity model is built from:

- `users`
- `tenants`
- `tenant_users`
- `onboarding_progress`

Behavior:

- one user may belong to multiple tenants
- role is stored in `tenant_users`
- JWT carries current `tenant_id`
- workspace switching issues a new tenant-scoped JWT

### 3.2 Authentication model

Auth path:

- signup writes directly to project tables
- login verifies `bcrypt` password hash
- JWT signed with `HS256`
- frontend stores JWT in localStorage and cookie
- backend dependencies validate JWT on protected routes

### 3.3 Tenant isolation model

Isolation is enforced by:

- tenant claim inside JWT
- header-to-JWT tenant match validation
- active tenant status guard
- explicit tenant filters in application code

Important note:

This is application-enforced isolation, not active RLS enforcement.

### 3.4 Onboarding model

The codebase currently has two onboarding layers:

- legacy progressive onboarding endpoints: `basic-info`, `compliance`, `intent`, `status`
- active product onboarding wizard: `workspace`, `use-case`, `integrations`, `scale`, `complete`

The authoritative activation state is `tenants.status`.

---

## 4. Implementation Verification

## 4.1 Authentication

### Verified implemented

- signup route
- login route
- JWT creation
- JWT verification
- password hashing with `bcrypt`
- account disable check via `is_active`
- OAuth login entry points for Google and GitHub
- email verification token generation
- password reset route family
- workspace switching route

### Important code-level findings

- signup creates email verification tokens and dispatches verification email
- login chooses the first joined tenant membership
- `pending_join` is a real tenant status flow in frontend and backend behavior
- `/auth/me` is still a placeholder and not a true authenticated profile endpoint

Technical finding:

The auth foundation is broader than the old Phase 1 docs claim, but also less cleanly separated by phase.

---

## 4.2 Password and token security

### Verified

- password hashing uses `bcrypt`
- password verification uses hash comparison
- JWT includes `user_id`, `tenant_id`, `email`, and `role`
- JWT expiry is configured for 7 days
- invalid token payloads are rejected

### Risks and limitations

- default secret fallback exists if `JWT_SECRET_KEY` is unset
- 7-day JWT lifetime is long for bearer-token compromise risk
- no token revocation system was verified

Technical finding:

The current system is acceptable for a custom MVP auth foundation, but not a hardened final production auth stack.

---

## 4.3 Multi-tenant identity and membership

### Verified implemented

- `tenant_users` is the membership junction table
- role is attached to membership
- login resolves current workspace from membership
- `switch-workspace` issues a fresh JWT for a selected tenant
- JIT enterprise domain flow can place users into pending join state
- invitation-based join path is partially supported

### Limitations

- default login still picks the first tenant by `joined_at`
- there is no backend-native tenant picker during login
- some comments in auth route still describe workspace switching as future even though it now exists

Technical finding:

Multi-tenant identity is structurally present, but the UX and documentation still reflect an earlier single-tenant assumption in places.

---

## 4.4 Tenant isolation and security controls

### Verified implemented

- JWT tenant claim is authoritative
- optional `X-Tenant-ID` must match JWT if supplied
- `require_active_tenant` blocks tenants not in `active` state
- `require_authenticated_user` exists for authenticated non-active flows

### Verified not implemented as active controls

- RLS is not the primary enforcement layer
- migrations explicitly describe RLS as future or commented-out work
- service-role Supabase access bypasses RLS by default

Technical finding:

The current foundation uses strong application-layer tenant enforcement, but the old docs incorrectly present RLS as if it is already active and central.

---

## 4.5 Onboarding implementation

### Verified implemented

Frontend wizard:

- workspace
- use case
- integrations
- scale
- complete

Backend support:

- `/onboarding/workspace`
- `/onboarding/use-case`
- `/onboarding/integrations`
- `/onboarding/scale`
- `/onboarding/complete`

Legacy support also exists:

- `/onboarding/status`
- `/onboarding/basic-info`
- `/onboarding/compliance`
- `/onboarding/intent`

### Important inconsistencies

- new onboarding routes mostly use JWT dependencies
- `/onboarding/status` still depends on `X-Tenant-ID`
- `/onboarding/intent` still depends on `X-Tenant-ID`
- frontend wizard uses the new route family, not the legacy one

Technical finding:

The onboarding foundation works, but the API surface is internally inconsistent and still carries legacy paths that need cleanup or explicit retention.

---

## 4.6 Frontend auth state and route protection

### Verified implemented

- `AuthContext` restores session from localStorage
- auth token and tenant status are mirrored to cookies
- client redirects handle onboarding and waiting-room flows
- middleware blocks some protected routes without token
- middleware redirects onboarding tenants away from protected routes
- middleware redirects active users away from auth pages

### Limitations

- route protection is split between middleware and client auth context
- middleware covers only selected protected prefixes
- some route decisions depend on client-set cookies after login
- `AuthContext` and middleware do overlapping work

Technical finding:

The user flow works, but protection logic is duplicated and should eventually be centralized more clearly.

---

## 4.7 Schema and migrations

### Verified implemented

- progressive onboarding migration creates `users`, `tenant_users`, and `onboarding_progress`
- tenant lifecycle columns exist
- additional onboarding fields are added by migration
- migration docs correctly describe `tenants.status` as authoritative
- ordered top-level migration files now exist for the current onboarding/runtime schema
- a manual catch-up SQL file exists for environments that missed recent runtime changes

### Strong architecture note

The migration and refinement docs are actually more accurate than the old Phase 1 markdown in one important respect:

- `tenants.status` is the real source of truth
- `onboarding_progress` is auxiliary

That is the correct architectural rule.

### Operational note

Schema truth is now documented more accurately in the repository, but environment drift is still possible if a database was created from older bootstrap SQL and never received the later numbered migrations.

---

## 5. Findings

### [High] Phase 1 docs describe the wrong auth architecture

The old Phase 1 docs describe Supabase Auth and active RLS-backed security. The actual code uses custom auth tables, custom JWTs, `bcrypt`, and service-role Supabase access. This is the largest documentation mismatch in the phase.

### [High] RLS is described as implemented but is still future-facing

Migration files explicitly mark RLS as future or commented-out work. Representing RLS as the active data-security mechanism is inaccurate.

### [Medium] Onboarding API is internally inconsistent

Some onboarding endpoints use JWT-based tenant identity while others still use `X-Tenant-ID`. That creates mixed trust models inside the same phase.

### [Medium] `/auth/me` is incomplete

The route is still a placeholder and should not be treated as part of a finished auth foundation.

### [Medium] Auth and redirect logic are duplicated across client and middleware

The system works, but responsibility is spread across multiple layers and not fully unified.

### [Medium] Phase boundary drift exists between Phase 1 and Phase 1.5

The codebase already contains password reset, email verification, and social login hooks, while the phase docs still place many of those items entirely in Phase 1.5.

---

## 6. Verified Phase 1 Status

### Complete enough to count as foundation

- custom auth foundation
- tenant membership foundation
- onboarding foundation
- frontend auth state
- route redirect foundation
- sidebar-driven app shell

### Not fully complete

- architecture documentation accuracy
- onboarding endpoint consistency
- true `/auth/me` endpoint
- clear RLS status
- centralized route protection
- clean phase boundary with Phase 1.5

### Correct status label

**Phase 1 is mostly complete, but not perfectly clean or fully documented.**

---

## 7. Recommended Completion Plan

### Step 1 - fix architectural truth in docs

- document custom JWT auth as the real Phase 1 implementation
- remove inaccurate Supabase Auth and active-RLS claims

### Step 2 - unify onboarding security

- convert remaining header-based onboarding endpoints to JWT tenant resolution
- decide whether the legacy onboarding surface stays or is deprecated

### Step 3 - finish auth cohesion

- implement `/auth/me`
- align middleware and auth-context coverage
- document workspace switching as implemented, not future

### Step 4 - clarify phase boundaries

- keep Phase 1 as the identity and onboarding foundation
- keep Phase 1.5 as hardening and cleanup
- mark already-existing 1.5 code as partial implementation where appropriate

---

## 8. Final Verdict

Phase 1 has successfully created the real tenant-aware application foundation.

The correct engineering verdict is:

**Strong foundation implemented.**
**Documentation accuracy, consistency, and hardening still need cleanup.**
