# Phase 1 — Foundation, Authentication, Tenant Identity, Onboarding, Auth Hardening & GDPR
## The Theoretical Architecture & "The Why" Behind Every Decision

> **Who is this for?** Anyone new to this project. This document explains what Phase 1, Phase 1.5, and Phase 1.6 are, the reasoning behind every task we built, and what would go catastrophically wrong if we had skipped it.

---

## What is Phase 1? (Start Here)

In Phase 0, we built the **Frontend Visual Language** — the Buttons, the Toasts, the Tables. But that was purely cosmetic. Phase 1 is fundamentally different.

**Phase 1 is the Security and Identity Backbone of the entire platform.**

Think of it this way: Phase 0 built the beautiful glass-and-steel exterior of a bank. Phase 1 builds the **vault, the security guards, the keycards, and the membership system** inside that bank. Before a single email can be sent, the platform must know *who you are*, *which company you belong to*, *what you are allowed to do*, and *what stage of setup your company is in*.

Phase 1.5 then **hardens** that vault — adding security cameras (audit logs), alarm systems (auto-alerts), and two-factor locks. Phase 1.6 makes the vault **legally compliant** — ensuring we follow international privacy laws so a government audit doesn't shut down the business.

If any part of this phase is skipped or broken, the entire platform collapses. Every feature in Phase 2 through Phase 13 depends entirely on this foundation being solid, secure, and reliable.

---

## Phase 1 — Core Authentication & Tenant Foundation

### Custom Email/Password Auth (`bcrypt` + Custom JWT)

We deliberately chose not to use Supabase Auth (the managed identity service) because for a multi-tenant SaaS platform, it doesn't allow us to natively embed our own `tenant_id`, `role`, and `isolation_model` as first-class citizens inside the token itself. A custom JWT means that when the backend reads a request, it instantly knows "This is user X, from company Y, with the role of owner" without any extra database lookups. Without this, every single API request would require an additional SQL query to figure out the tenant context — at 10,000 users simultaneously requesting data, that would be thousands of wasted queries per second, making the platform slow, expensive, and fragile.

### `bcrypt` Password Hashing

We hash every password through `bcrypt` before storing it because storing raw passwords is a catastrophic security failure. If a hacker ever dumps our database, they would get every user's password in plain text and could use those credentials to attack that person's Gmail, bank account, and every other platform they reuse the password on. `bcrypt` performs a mathematically irreversible one-way transformation with a random "salt" mixed in — even if a hacker gets the hash, they cannot reverse-engineer the original password. During login, we simply re-hash the submitted password and compare it to the stored hash. The raw password never touches our database at any point.

### Short-Lived Access Tokens (30 min) + HttpOnly Refresh Cookie

We issue two tokens on login because a single long-lived 7-day token is catastrophically dangerous. If a hacker steals that token through an XSS script injection (a common browser attack), they have full, unchecked account access for an entire week. Instead, we issue a 30-minute JWT (which becomes useless to a hacker within half an hour) and separately store a 7-day "Refresh Token" inside an `HttpOnly` cookie — a special browser flag that makes it completely invisible and inaccessible to any JavaScript code, making it impossible to steal via XSS. Every 30 minutes, the frontend silently uses that hidden cookie to fetch a fresh JWT without the user ever knowing. The session feels permanent to the user, but the attack window for any stolen token is capped at 30 minutes.

### Token Revocation via `token_version` Counter

JWTs are "stateless" — once issued, they are valid until expiry. If a user reports their account is compromised and we change their password, the old JWT is still valid for another 30 minutes. That 30-minute window is unacceptable in a security incident. We solve this by storing a `token_version` integer counter per user in the database. When we revoke a user's session (e.g., forced password reset, suspicious activity), we increment this counter by 1. Every incoming JWT is checked: if the token's version number doesn't match the database, it is instantly rejected. Old stolen tokens are invalidated immediately without waiting for natural expiry.

### Tenant Membership Model (`users`, `tenants`, `tenant_users`)

A multi-tenant email platform serves multiple companies simultaneously. Without strict data isolation, a bug in a database query could accidentally expose Company A's private subscriber list to Company B, which would result in a lawsuit, GDPR fines, and irreparable brand damage. We solve this with a three-table identity model: `users` stores individual accounts, `tenants` stores companies/workspaces, and `tenant_users` is the junction table linking a user to a company with a specific role (`owner`, `admin`, `member`). This design also naturally supports a consultant or agency user belonging to multiple companies with a different role in each — they might be "owner" of their own agency but only a "member" in a client's workspace.

### JWT Carries Tenant Identity

Every API request embeds `tenant_id` directly inside the JWT payload so the backend knows which company is making the request without any extra database lookups. Without this, every endpoint would independently need to resolve the user's company from their user ID — adding one SQL query per request, which multiplies catastrophically at scale and defeats the performance advantage of using a stateless auth system in the first place.

### `X-Tenant-ID` Header Validation Against JWT

A malicious authenticated user could set the HTTP header `X-Tenant-ID: competitor-company-id` in their API request, attempting to trick the backend into returning a different company's data. Our middleware has a hard security rule: if the `X-Tenant-ID` header exists in any request, it must exactly match the `tenant_id` embedded in the JWT — if they differ, the request is immediately rejected with HTTP 400. The JWT is the authoritative identity source and cannot be argued with via a manually set header.

### Active-Tenant Guard (`require_active_tenant`)

A brand-new company that hasn't completed onboarding (domain not verified, sending plan not configured) must be physically blocked from accessing campaign-sending features. Without this guard, a company could sign up in 60 seconds and immediately send 1 million spam emails using our infrastructure, destroying our domain reputation and getting our AWS SES account suspended by Amazon. The FastAPI dependency `require_active_tenant` is injected into every campaign and contact route. Before any logic runs, it checks `tenants.status` in the database. If the status is anything other than `active`, a `HTTP 403 Forbidden` is returned immediately. No exceptions.

### Workspace Switching

A consultant or agency user who manages campaigns for multiple companies shouldn't need to create separate accounts. The `/auth/switch-workspace` endpoint reissues a completely fresh JWT embedding the new company's `tenant_id`. The frontend hard-navigates to `/dashboard`, clearing all cached in-memory state. Without this, the only alternative is creating one account per client company, which is a terrible user experience and makes cross-client management impossible.

### `/auth/me` Fully Implemented

The `/auth/me` endpoint gives the frontend a way to hydrate the latest server-side profile on every page load — picking up theme preferences, role changes, and plan updates that happened since the JWT was issued. Without it, a user whose role was changed by an admin would continue to see the old role and old permissions until their JWT expired, which could be up to 30 minutes of incorrect access.

### Login & Signup Pages

The login and signup pages are the front door of the entire platform. Without functional, polished, and accessible authentication pages, no user can enter the system. These pages include form validation, error messaging, loading states, and redirect logic tied to `tenants.status` so that incomplete accounts are sent to onboarding and fully active accounts are sent directly to the dashboard.

### reCAPTCHA on Signup Form

Without CAPTCHA, bots can programmatically create thousands of fake accounts using our signup API, flooding our database with junk tenants, consuming storage, and potentially abusing our email infrastructure for spam. Google reCAPTCHA generates a cryptographic challenge token in the browser that only a real human interaction can produce. The backend verifies this token with Google's API before processing any signup. Automated scripts cannot generate valid tokens, neutralizing the attack entirely.

### 4-Step Onboarding Wizard

New companies must configure critical settings before going live — workspace name, primary use-case (marketing vs transactional), integration keys, and sending scale/warmup plan. Without a structured onboarding wizard, companies attempt to send emails without a verified domain, resulting in immediate spam-filter flags, high bounce rates, and destroyed domain reputation that can take months to recover. The guided wizard (`workspace → use-case → integrations → scale → complete`) captures all required configuration and upon the final step's completion, transitions `tenants.status` from `onboarding` to `active`, unlocking the platform.

### Interactive Onboarding Checklist on Dashboard

After completing the wizard, some companies still need to configure DNS records, add team members, or connect their API. A persistent checklist on the dashboard surface acts as a continuous reminder and progress tracker so nothing critical is missed. Without it, companies complete onboarding halfway, skip domain verification, and immediately encounter email deliverability problems that they blame on the platform.

### `tenants.status` as the Authoritative State

`tenants.status` is our single-flag state machine and the canonical source of truth for whether a company is allowed to use the product. If we tracked this state in multiple places (both `onboarding_progress.completed` and `tenants.status`), they could go out of sync — the system might think a company is active when they haven't finished setup. One field, one truth. After the final onboarding step, the backend sets `tenants.status = 'active'`, and every guard in the system checks only this column.

### Sidebar Navigation Layout

The sidebar is the primary navigation mechanism of the authenticated app. Without a stable, role-aware sidebar, users have no way to navigate between Campaigns, Contacts, Templates, and Analytics. The sidebar also reflects the user's role — admins see a "Team Settings" link that regular members don't see — making it a live extension of the access control system.

### Auth Context (`AuthContext.tsx`)

React components are nested trees. Without a global session state provider, every component would individually need to fetch the user's identity from the API on every render, causing dozens of redundant network calls per page load. `AuthContext` stores the decoded user object (`userId`, `tenantId`, `role`, `tenantStatus`) in memory for the lifetime of the browser session. Any component calls `useAuth().user` and instantly gets the current identity. One source of truth, zero redundant calls.

### Middleware Route Protection (`middleware.ts`)

Client-side React routing guards run *after* the page JavaScript has loaded. A user who directly types `/dashboard` into the browser could see a flash of the dashboard UI before the React redirect fires. Next.js Middleware runs at the **Edge Network level, before the page is even rendered**. It reads the `auth_token` cookie and redirects unauthenticated users directly to `/login` before a single byte of the dashboard page is served to the browser.

### Route Protection is Fully Centralized and Consistent

Without consistent route protection, a protected page might be protected in React but reachable via the middleware, or vice versa. Inconsistency in guards creates security blind spots. Every protected route must be guarded at both layers — the middleware at the network edge, and the React context on the client — creating defense in depth.

### Social Auth (Google, GitHub) via OAuth 2.0

A large segment of users prefer "Sign in with Google" and refuse to create yet another username and password. Without social auth, we lose those users immediately at the signup page. OAuth 2.0 delegates authentication to a trusted provider (Google or GitHub), which returns a verified identity to our callback URL. We create the local user record using that trusted identity, giving users a friction-free registration with a single click.

### Rate Limiting on Login & Registration

Without rate limiting, a hacker can run a "credential stuffing" attack — cycling through millions of stolen password combinations against our login endpoint at machine speed. Within 24 hours, every user who reused a password would be compromised. Our composite rate limiter (`IP address + email address`) caps attempts at roughly 5 per minute per combination. On the 6th attempt, the API returns `HTTP 429 Too Many Requests`. The attacker's script slows to economically infeasible speeds.

### Email Verification Required Before Onboarding Completes

Without email verification, anyone can sign up using someone else's email address. A bad actor could create an account using the CEO's email, locking that person out and taking control of their workspace. Email verification proves ownership of the address before granting any platform access.

---

## Phase 1.5 — Auth Hardening & Audit Logging

### Immutable Audit Log Table

Security incidents and compliance audits require a forensic trail of who did what, when, on which record. Without an immutable log, if an admin deletes 50,000 contacts and denies it, there is zero evidence. We built an `audit_logs` table that records `user_id`, `tenant_id`, `action`, `resource_type`, and timestamp for every significant action — and we make it write-only with `no UPDATE or DELETE allowed`. Even a database admin cannot edit audit records after they are written, making the log legally defensible as an evidence trail.

### Log Severity Levels (INFO / WARNING / CRITICAL)

Without severity categorization, every log entry carries equal weight and critical alerts get buried under thousands of routine INFO entries. We assign three tiers: `INFO` for normal operations (user logged in), `WARNING` for unusual but non-damaging events (5 failed logins), and `CRITICAL` for high-risk actions (bulk delete of >1,000 contacts, suspicious login from new country). Severity tiers allow engineers and compliance teams to filter and triage rapidly.

### Auto-Alert on CRITICAL Log Events

A human can't watch the audit log 24/7. Without automated alerts, a rogue employee bulk-deleting a subscriber list at 3am would go completely undetected until the client notices their campaign has zero recipients. We wire an automatic email alert to workspace owners the moment a CRITICAL-severity event is logged — specifically for operations like bulk deletion exceeding 1,000 records or a suspicious login pattern — giving ownership teams a chance to react and reverse damage.

### JWT Refresh Token Model (AUDIT FIX 2)

This was identified as a critical security defect: the original implementation used a single 7-day JWT stored in `localStorage`, which is accessible to JavaScript and thus vulnerable to XSS attacks. The fix introduced the dual-token model (30-minute access token + 7-day HttpOnly refresh cookie) described in Phase 1. The `HttpOnly` attribute makes the cookie completely inaccessible to any JavaScript, eliminating the XSS theft vector entirely.

### Lock CORS to `FRONTEND_URL` Env Var (AUDIT FIX 3)

A wildcard CORS policy (`Access-Control-Allow-Origin: *`) means any website in the world can make authenticated API calls to our backend from a user's browser. A malicious website could silently perform actions on behalf of a logged-in user without their knowledge (this is a Cross-Site Request Forgery attack). Locking CORS to only the exact `FRONTEND_URL` environment variable means only our own frontend application is allowed to make cross-origin API calls.

### Enable SSL Certificate Verification in Worker (AUDIT FIX 4)

One of our background workers had SSL verification disabled (`ssl.CERT_NONE`), meaning it accepted any certificate — including self-signed certificates created by an attacker performing a Man-in-the-Middle attack on the network connection. Disabling SSL verification is the equivalent of sending a registered letter without verifying the recipient's identity — a fake "Google" server could intercept all outbound traffic. Re-enabling strict certificate verification ensures all outbound connections are cryptographically verified.

### Cross-Tenant Webhook Suppression (AUDIT FIX 1)

A webhook handler that processes bounce notifications was found to be suppressing contacts without filtering by `tenant_id`. If Company A's contact had the same email address as Company B's contact, a bounce from Company A's campaign would silently suppress Company B's contact too — a cross-tenant data corruption bug. Adding a `tenant_id` filter to the `_suppress_contact()` function ensures each company's suppression events are strictly isolated.

### OAuth State Parameter Validation (AUDIT FIX 17)

The Google/GitHub OAuth flow was missing a critical CSRF protection mechanism. Without a validated `state` parameter, a malicious website could trick a user into completing an OAuth flow that logs them into the attacker's account instead of their own (OAuth login CSRF). We generate a cryptographically random `state` string, store it in the session before the OAuth redirect, and verify it matches on the callback. If it doesn't match, the OAuth flow is rejected.

### Remove Debug Endpoints from Production (AUDIT FIX 5)

Development convenience endpoints (`/contacts/upload`, `/test-send`) were left registered in `main.py`. These bypass authentication guards and input validation designed for production paths. A malicious actor who discovers a debug endpoint can use it to upload arbitrary data or trigger email sends without proper authorization. All dev-only routes must be removed from production builds.

### Remove Duplicate Router Registration (AUDIT FIX 6)

The events router was registered twice in `main.py`, causing duplicate route entries in FastAPI's routing table. This means every `/events/` request was potentially handled by two conflicting handlers, with unpredictable results. Duplicate registrations are cleaned up to ensure exactly one handler per route.

### MFA via TOTP for Workspace Admins

A compromised admin password gives an attacker full control over an entire company's email infrastructure. Multi-Factor Authentication with Time-based One-Time Passwords (TOTP — like Google Authenticator) requires that even with the correct password, the attacker also needs physical access to the admin's phone to generate the 6-digit rotating code. Without MFA, a single leaked credential = full company takeover. TOTP makes account compromise orders of magnitude harder.

### Audit Log Viewer UI

Raw audit logs in a database table are useless to non-technical workspace owners. A visible, searchable, filterable log viewer in the Settings page lets owners see exactly what their team members have done — who invited a user, who deleted a campaign, who exported the contact list. Without this UI, the security observability we built in the backend is invisible to the people who need it most.

### System Email Count Tracking in Redis

Our transactional system emails (verification emails, password resets, team invitations) are sent via a Gmail Workspace account capped at ~2,000 emails/day. Without tracking daily usage, we would not know we are approaching the cap until emails start bouncing silently — blocking new users from verifying their accounts and logging in. We track the daily count in Redis under `system:emails:sent:{date}` and trigger a CRITICAL audit log when we hit 80% of the limit, giving the team time to react before service disruption.

### `SYSTEM_MAILER` Abstraction Layer Env Flag

As user volume grows, Gmail's daily sending cap will eventually be exceeded. Without an abstraction layer, switching from Gmail to AWS SES requires editing every location in the codebase that sends an email. A single `SYSTEM_MAILER=gmail|ses` environment flag creates a routing abstraction — all email-sending code checks this flag and dispatches accordingly. Switching providers becomes a one-line config change with no code modifications.

### Password Reset Flow (Forgot Password / Reset Password Pages)

Without a password reset mechanism, a user who forgets their password is permanently locked out of their account. Since we use custom auth tables (not Supabase Auth), we must implement the reset flow ourselves: generate a cryptographically random reset token, store its hash in the database with an expiry timestamp, email a link to the user, and on submission verify the token hasn't expired before allowing the password hash to be updated.

### reCAPTCHA Token Verification Endpoint/Middleware

The CAPTCHA verification logic is extracted into a reusable middleware utility so it can be applied to any sensitive endpoint (signup, password reset, login) without duplicating the verification logic across multiple route files. Without a centralized CAPTCHA utility, bot protection would be inconsistently applied — some endpoints protected, others accidentally left open.

---

## Phase 1.6 — GDPR & Legal Compliance

### Soft Delete Pattern (`deleted_at` on contacts, campaigns, templates)

Deleting a database row permanently is legally dangerous under modern privacy regulations. If a compliance officer asks "show me all contacts that existed in March" and we have hard-deleted them, that is potentially a legal violation. We implement soft deletes by adding a `deleted_at` timestamp column to sensitive tables. A "deleted" record is simply hidden from the UI but remains in the database. This creates a 30-day recycle bin period where accidental deletions can be restored, and it preserves aggregate analytics history for reporting without retaining identifiable PII.

### Right to be Forgotten (`DELETE /contacts/{id}/anonymize`)

Under GDPR Article 17, any European citizen can request that a company erase all their personal data. If we hard-delete the row, we break analytics (`campaign_id X had 500 sends but now has only 499`)`. If we keep the row unchanged, we violate GDPR. The solution is anonymization: replace the contact's identifying fields (email, name, phone) with non-identifiable placeholders like `deleted@gdpr.invalid`, while keeping the row for analytics continuity. The person is effectively erased from a privacy perspective while the statistical record remains intact.

### Data Export API (Async Job — POST → poll → download ZIP)

GDPR Article 15 grants every user the right to a full copy of all data held about them. A naive synchronous implementation that generates a ZIP of 100,000 contact records would time out after 30 seconds. We implement this as an asynchronous job: the user clicks "Export My Data", we create a `job_id` and start the export in the background, the frontend polls `GET /export/{job_id}` until completion, and the user downloads the resulting ZIP. Without async design, this feature would always fail for any user with significant data volume.

### Consent Tracking (source, date, IP on contacts)

Under GDPR and CAN-SPAM, you must be able to prove that every person on your mailing list explicitly consented to receive emails, and you must record when and how they consented. Without consent tracking, if a user complains their email was used without permission, you cannot legally defend yourself. We add `consent_source` (e.g., "Website signup form"), `consent_date` (exact timestamp), and `consent_ip` (the IP address of the browser that submitted the form) to every contact record at the moment of import.

### Data Retention Policy (Auto-flag contacts inactive >24 months for purge)

Storing personal data indefinitely violates GDPR's "storage limitation" principle — you may only retain personal data for as long as it serves its original purpose. Contacts who haven't engaged with any email in over 24 months are effectively dead subscribers who are inflating your contact count and increasing legal liability. An automated system flags these contacts for review, with the workspace owner confirming purge or consent re-validation before deletion.

### Consent Re-validation (Exclude contacts with consent >24 months old)

Even if a contact originally consented to receive emails, that consent has a practical shelf life. A user who signed up 3 years ago for a monthly newsletter and hasn't opened an email in 2 years has effectively withdrawn implicit consent through disengagement. Before sending to stale contacts, we automatically exclude those whose consent timestamp is older than 24 months, protecting the company from spam complaints and regulatory risk.

### Do Not Contact (DNC) Global Suppression List

Some people explicitly request that a company never contacts them again — regardless of which specific list they appear on. Without a platform-level DNC list, a single bounce or unsubscribe from one campaign only removes the person from that campaign's list. If they appear on a different import, they get emailed again. A global DNC list at the platform level permanently blocks email delivery to any address on it, regardless of which tenant list they appear in, making "never email me again" truly absolute.

### Restore Modal for Soft-Deleted Items

Soft deletion is only useful if there is an accessible way for users to undo it within the 30-day window. Without a restore UI, soft deletion provides no practical benefit — users who accidentally delete a campaign have no mechanism to recover it and assume the data is permanently gone, eroding trust in the platform.

### Data Export Button in Settings

A legal right without a visible mechanism to exercise it is practically useless. The "Export My Data" button in the Settings page surfaces the GDPR data portability right in a discoverable, user-friendly location, so workspace owners can fulfil employee or customer data requests without needing to contact support or file a ticket.

### Consent Column Visible in Contacts Table

Displaying `consent_source` and `consent_date` directly in the contacts data table gives workspace owners an immediate visual verification that their list is legally clean. Without this visibility, they have no way to audit their own data quality or respond to compliance questions during a regulatory review.

### Privacy Policy / Terms Page Linked from Footer

GDPR requires that users are informed about data practices before consenting to them. A visible, accessible Privacy Policy and Terms of Service linked from the application footer is not optional — it is a legal precondition to legally processing anyone's personal data in the European Union. Without these pages, the entire data processing operation is operating without a lawful basis.
