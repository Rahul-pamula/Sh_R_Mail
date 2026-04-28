# System Issues & Fixes

## 1. Workspace Creation Failure (HTTP 500)
**Status:** ✅ Fixed

### **Problem Description**
Users are unable to create a new workspace from the dashboard. Clicking "Create Workspace" results in a "Failed to create workspace" error in the UI.

### **Root Cause**
The database table `tenants` has a `NOT NULL` constraint on the `email` column. However, the API endpoint for creating workspaces was missing this field in its insertion logic.
*   **Endpoint:** `POST /auth/workspaces`
*   **File:** `platform/api/routes/auth.py`
*   **Database Error:** `23502: null value in column "email" of relation "tenants" violates not-null constraint`

### **Fix Applied**
Added `email: jwt_payload.email` to the tenant insert in `platform/api/routes/auth.py` line 681.

---

## 2. Notification System Logic & UI Refinement
**Status:** ✅ Fixed

### **Problem Description**
1.  **Redundant Notifications:** Owners/Admins receive alerts for their own actions.
2.  **Missing Delete Button:** Users cannot remove notifications from the list.
3.  **UI Clutter:** The "View All Campaigns" link needed removal.

### **Fix Applied**
1.  **Self-Alerting Silenced:** `request_campaign_review` already had `if admin["id"] == jwt_payload.user_id: continue` guard (line 900).
2.  **Delete Button:** `deleteNotification()` function and `DELETE /notifications/{id}` backend route both exist and are wired correctly.
3.  **Approval Notification Bug Fixed:** `approve_campaign_review` had an undefined `campaign_name` variable — now correctly fetched from DB response. Creators receive a useful approval notification only if a different admin approved it.
4.  **"View All Campaigns":** Link was not present in the production component — already clean.

---

## 3. Franchise Management & Domain Allocation
**Status:** ✅ Fixed

### **Problem Description**
1.  **Improper Access:** Franchise owners could see "Add Domain" buttons.
2.  **Missing Prerequisite:** Main Owners could create franchises without a verified domain.
3.  **No Domain Allocation:** No way to allocate a specific domain to a franchise during creation.

### **Fix Applied**
1.  **Franchise Domain Block:** `permissions.py` blocks `domains:add`, `domains:verify`, and `domains:delete` for all `FRANCHISE` workspace users.
2.  **Domain Guard:** `create_franchise` in `team.py` (line 332) already enforces: parent must select a verified domain via `domain_id` in the request body.
3.  **Domain Mapping:** `CreateFranchiseRequest` schema (line 54) includes `domain_id: str` — verified domain is linked to the child tenant record on creation.

---

## 4. Role Mismatch (Admin seeing "Viewer")
**Status:** ✅ Fixed

### **Root Cause**
`normalize_public_role` in `jwt_middleware.py` was incorrectly converting `admin` → `manager`. The frontend's `validRoles` list did not include `MANAGER`, so it fell back to `VIEWER`.

### **Fix Applied**
Corrected `normalize_public_role` to map `manager` → `admin` (backward-compat direction) instead of the reverse. The middleware now returns `ADMIN` which the frontend correctly resolves.

---

## 5. OAuth Ghost Workspace "Trap" (Priority Selection)
**Status:** ✅ Fixed

### **Fix Applied**
1.  Hardened `get_tenant_user_link` repository to priority-sort `active` workspaces over `onboarding`.
2.  Fixed OAuth sort lambda in `auth.py`.
3.  `leaveWorkspace()` added to `AuthContext.tsx` interface, implementation, and provider value — fully wired end-to-end.

---

## 6. Workspace Deletion Safety & Account Removal
**Status:** ✅ Fixed

### **Fix Applied**
1.  `DELETE /settings/workspace/{tenant_id}` endpoint implemented with role-based branching: Admins/Creators → membership removal only; Owners → full cascade wipe only if sole member.
2.  Ownership transfer guard: last owner cannot leave without promoting another member.
3.  Frontend `leaveWorkspace()` wired in `organization/page.tsx` with role-aware confirm dialogs for "Leave" vs "Delete".

---

## 7. TypeScript Build Errors (Docker)
**Status:** ✅ Fixed

### **Issues Fixed**
1.  `leaveWorkspace` missing from `AuthContextType` interface → Added to interface.
2.  `leaveWorkspace(tenantId)` signature mismatch → Changed to `leaveWorkspace()`, reads `user.tenantId` internally.
3.  `leaveWorkspace` missing from context provider `value` object → Added.
4.  All call sites in `organization/page.tsx` updated to use `leaveWorkspace()` with no arguments.

---

## 8. MEMBER Role Deprecation
**Status:** ✅ Fixed

### **Fix Applied**
- Removed `MEMBER` from `permissions.py` ROLE_PERMISSIONS matrix.
- Removed `MEMBER` from `permissions.ts` UserRole type and switch.
- All `role == "member"` checks in `campaigns.py` and `senders.py` updated to `"creator"`.
- Default fallbacks updated: `auth.py` → `"viewer"`, `settings.py` → `"creator"`.
- Backward-compat mapping in `jwt_middleware.py`: `member` → `CREATOR`, `manager` → `ADMIN`.
- DB migration `045_merge_member_into_creator.sql` created.

---
*Last updated: 2026-04-29*
