# Phase 8 — ShrMail Workspace, Team & Franchise Administration

> **Status:** Planning and documentation phase
> **Last Reviewed:** April 26, 2026

## Executive Summary

Phase 8 defines how ShrMail is operated after a tenant workspace exists. This phase is not only about a settings page. It is the full operating system for workspace ownership, team membership, franchise workspaces, export controls, and governance.

ShrMail follows a multi-tenant architecture where every company operates inside its own workspace. A workspace is the security and ownership boundary for users, campaigns, contacts, templates, sender identities, exports, and audit history. Within that workspace, roles determine what each person can do. The Owner has full administrative authority. The Manager handles day-to-day operations inside approved boundaries. The Member participates in execution but does not control workspace administration.

Franchise management extends this model. A franchise is not just another role inside the same workspace. It is a separate child workspace linked to a parent workspace. That child workspace has its own Owner, members, campaigns, contacts, domains, senders, exports, and audit trail. This preserves clean tenant isolation while still allowing the parent workspace to create and govern franchise instances.

This phase also covers user exports. Exports are treated as a controlled administrative workflow rather than a utility button. Owners can export workspace member data, while Managers can export only within the scope permitted by policy. Small exports download immediately. Larger exports run asynchronously, are logged, stored securely, and delivered through expiring download links.

The final part of this phase is governance. Every sensitive action must be attributable, reversible where appropriate, and explicitly destructive where it is not reversible. Invitations, removals, ownership transfer, franchise deletion, and exports all create audit history. Removing a user removes access, not workspace-owned business data. Deleting a franchise removes the franchise workspace and everything inside it according to policy.

## Phase 8 Scope

Phase 8 contains five connected subphases:

- `Phase 8.1` Workspace Administration Foundation
- `Phase 8.2` Team Members, Roles, Invites, and Ownership
- `Phase 8.3` Franchise Workspace Lifecycle
- `Phase 8.4` Team Data Export and Reporting
- `Phase 8.5` Governance, Audit, and Destructive Action Policy

These are grouped into one parent phase because they all depend on the same foundations:

- workspace-based multi-tenancy
- role-aware permissions
- invitation and membership lifecycle
- parent-child workspace relationships
- secure export controls
- audit and retention policy

## Core Operating Model

ShrMail is organized around the workspace. Every user belongs to one or more workspaces through membership records, and every business object is scoped to a workspace. Nothing important is owned only by an individual user. Campaigns, contacts, templates, sender identities, exports, audit logs, and franchise relationships are all anchored to the workspace so the company retains continuity even when people join, leave, or change roles.

Roles are intentionally simple:

- `Owner`: full administrative authority over the workspace
- `Manager`: operational authority with limited administrative actions
- `Member`: execution-only or visibility-limited role

A franchise owner is not modeled as a special extra role in the parent workspace. Instead, that user becomes the `Owner` of a new child workspace.

## End-to-End Architecture

The following diagram should be read from top to bottom. It starts at the ShrMail platform layer and moves downward into workspace structure, team structure, franchise branching, exports, and governance.

```mermaid
flowchart TD
    A["ShrMail Platform"] --> B["Workspace / Tenant Boundary"]

    B --> C["Workspace Identity"]
    C --> C1["Organization Profile"]
    C --> C2["Branding"]
    C --> C3["Legal Address"]
    C --> C4["Domains and Senders"]
    C --> C5["API Keys and Technical Settings"]

    B --> D["Workspace Membership Model"]
    D --> D1["Owner"]
    D --> D2["Manager"]
    D --> D3["Member"]
    D --> D4["Pending Invitations"]
    D --> D5["Removed / Historical Membership State"]

    D1 --> E["Administrative Actions"]
    D2 --> F["Operational Actions"]
    D3 --> G["Limited Participation Actions"]

    E --> E1["Invite Manager"]
    E --> E2["Invite Member"]
    E --> E3["Invite Franchise Owner"]
    E --> E4["Transfer Ownership"]
    E --> E5["Remove Access"]
    E --> E6["Export Team Data"]
    E --> E7["Delete Franchise"]

    F --> F1["Manage Campaigns"]
    F --> F2["Manage Contacts"]
    F --> F3["Invite Members if policy allows"]
    F --> F4["Export permitted members if policy allows"]

    G --> G1["Participate in campaigns"]
    G --> G2["View reports if policy allows"]
    G --> G3["Leave workspace"]

    B --> H["Franchise Workspace Branch"]
    H --> H1["Child Workspace Created"]
    H1 --> H2["Child Workspace Owner"]
    H1 --> H3["Child Workspace Managers"]
    H1 --> H4["Child Workspace Members"]
    H1 --> H5["Child Workspace Campaigns"]
    H1 --> H6["Child Workspace Contacts"]
    H1 --> H7["Child Workspace Billing / Settings"]
    H1 --> H8["Child Workspace Domains / Senders"]

    B --> I["Exports and Reporting"]
    I --> I1["Sync Download for Small Exports"]
    I --> I2["Async Export Job for Large Exports"]
    I2 --> I3["Secure Storage"]
    I3 --> I4["Signed Download Link"]
    I4 --> I5["User Notification Email"]

    B --> J["Governance and Audit"]
    J --> J1["Audit Logs"]
    J --> J2["Retention Policy"]
    J --> J3["Soft Delete for Membership"]
    J --> J4["Last Owner Protection"]
    J --> J5["Franchise Deletion Policy"]
    J --> J6["Export History"]
```

## 8.1 Workspace Administration Foundation

This subphase defines the administrative backbone of the workspace. Everything else in Phase 8 depends on it.

### Workspace as the Security Boundary

The workspace is the primary tenant boundary in ShrMail. Every query, mutation, export, dashboard card, and administrative action must resolve against a workspace context. A user may belong to multiple workspaces, but every action happens inside one active workspace at a time.

That means:

- campaigns belong to a workspace
- contacts belong to a workspace
- templates belong to a workspace
- domains and senders belong to a workspace
- invitations belong to a workspace
- exports belong to a workspace
- audit history belongs to a workspace

This avoids a fragile model where data follows the individual instead of the company.

### Workspace Administrative Areas

The workspace administration surface should contain all of the following areas inside one coherent settings and management shell:

- profile and organization details
- branding and visual identity
- CAN-SPAM legal address
- domain verification
- sender verification
- API key management
- team members
- franchise accounts
- export history
- compliance and audit visibility

### Foundational Data Model

The minimum data objects required for this phase are:

- `workspaces`
  stores workspace identity, plan context, legal details, branding metadata, status, and `parent_workspace_id` for franchises
- `users`
  stores identity-level user details such as name, email, authentication identity, and security metadata
- `workspace_members`
  stores the membership relationship between a user and a workspace with role, join date, inviter, and removal metadata
- `invitations`
  stores invite email, target workspace, target role, token, expiry, inviter, status, and acceptance data
- `exports_log`
  stores requester, workspace, filters, output format, status, progress, storage metadata, and download expiry
- `audit_logs`
  stores actor, action, entity, entity identifier, workspace context, and timestamped event history

### Foundation Relationship Map

```mermaid
flowchart TD
    A["ShrMail Platform"] --> B["workspaces"]
    B --> C["workspace_members"]
    B --> D["invitations"]
    B --> E["exports_log"]
    B --> F["audit_logs"]
    B --> G["campaigns / contacts / templates / senders"]

    H["users"] --> C
    H --> D
    H --> E
    H --> F

    B --> I["parent_workspace_id"]
    I --> J["child franchise workspaces"]
```

### Administrative Permission Philosophy

Permissions are not just UI toggles. They are enforced at every level:

- UI visibility
- API authorization
- database filtering
- export eligibility
- destructive action confirmation

The interface may hide or disable unauthorized actions, but backend enforcement is still mandatory.

## 8.2 Team Members, Roles, Invites, and Ownership

This subphase defines how people enter, operate within, and leave a workspace.

### Role Definitions

#### Owner

The Owner is the primary administrative authority for a workspace.

The Owner can:

- manage workspace settings
- invite Managers and Members
- invite Franchise Owners
- remove Managers and Members
- transfer ownership
- control exports
- manage domain and sender settings
- control high-risk destructive actions

The Owner cannot leave the workspace if they are the last Owner. Ownership must always remain assigned to at least one valid member.

#### Manager

The Manager is responsible for daily operations rather than full administration.

The Manager can:

- run campaigns
- manage contacts and audience operations
- view operational analytics
- possibly invite Members if this is allowed by policy
- possibly export limited user lists if policy allows

The Manager cannot:

- transfer ownership
- remove the Owner
- manage billing-level authority
- create unrestricted franchise structures
- override workspace-wide destructive actions

#### Member

The Member participates in approved work inside the workspace.

The Member can:

- participate in campaign workflow
- access reports and areas specifically granted to the role
- leave the workspace voluntarily

The Member cannot:

- invite users
- remove users
- transfer ownership
- export admin data

### Invitation Lifecycle

Invitations are the standard entry point into a workspace. ShrMail should not silently attach people to a workspace without a verified invitation path.

The invitation lifecycle is:

1. an authorized user opens Team Members
2. they choose the target role
3. they enter the email address
4. ShrMail creates a secure invitation record
5. ShrMail sends a verification email with an expiring token
6. the invitee accepts the token
7. ShrMail creates or links the user account
8. ShrMail creates the workspace membership
9. ShrMail records the event in audit history

Invites should support:

- resend
- cancel
- expire automatically
- prevent duplicate active invites for the same role and email where appropriate

### Team Member Lifecycle

```mermaid
flowchart TD
    A["Authorized user opens Team Members"] --> B["Select action"]
    B --> C["Invite Manager"]
    B --> D["Invite Member"]
    B --> E["Change Role"]
    B --> F["Remove Access"]
    B --> G["Transfer Ownership"]
    B --> H["Leave Workspace"]

    C --> I["Create invitation"]
    D --> I
    I --> J["Send secure email"]
    J --> K["Invitee accepts token"]
    K --> L["Create or attach user"]
    L --> M["Create workspace_members record"]
    M --> N["Show member in Team Members list"]
    N --> O["Write audit log"]

    E --> P["Validate permission"]
    P --> Q["Update role"]
    Q --> O

    F --> R["Validate removable target"]
    R --> S["Revoke membership access"]
    S --> T["Invalidate workspace session"]
    T --> O

    G --> U["Choose new owner"]
    U --> V["Confirm ownership transfer"]
    V --> W["Promote target to Owner"]
    W --> X["Downgrade previous Owner as policy requires"]
    X --> O

    H --> Y["Validate user can leave"]
    Y --> Z["Remove own membership"]
    Z --> O
```

### Ownership Transfer

Ownership transfer is one of the highest-risk workspace actions and should be treated accordingly.

The transfer process should:

- allow transfer to an existing member or a newly invited user
- require a deliberate confirmation step
- prevent the workspace from becoming ownerless
- record the previous owner and the new owner in audit history
- optionally downgrade the previous owner to Manager or remove them later by separate action

### Removal and Historical Continuity

Removing a user should revoke access, not erase workspace-owned content. If a removed user created campaigns, contacts, or templates, those records stay with the workspace. Historical continuity matters more than strict personal ownership of content.

This means the preferred behavior is:

- remove or deactivate membership
- preserve authored history
- preserve audit trail
- invalidate workspace access immediately

## 8.3 Franchise Workspace Lifecycle

This subphase defines how one workspace can create and govern franchise workspaces.

### Franchise Model

A franchise is a child workspace, not just a privileged member. It exists under a parent workspace relationship but remains isolated in its own operational scope.

Each franchise workspace has:

- its own Owner
- its own Managers and Members
- its own campaigns
- its own contacts
- its own domains and senders
- its own export history
- its own audit trail

The parent workspace may create and monitor franchises, but parent users should not automatically gain unrestricted access to franchise data unless a future shadow-mode or delegated support model is explicitly designed.

### Franchise Creation Lifecycle

The parent Owner creates a franchise through an invitation-driven provisioning process.

```mermaid
flowchart TD
    A["Parent Owner opens Franchise Accounts"] --> B["Click Add Franchise Owner"]
    B --> C["Enter franchise owner email and initial details"]
    C --> D["Create pending child workspace"]
    D --> E["Create franchise invitation"]
    E --> F["Send franchise invite email"]
    F --> G["Invitee accepts token"]
    G --> H["Create or attach user identity"]
    H --> I["Assign user as Owner of child workspace"]
    I --> J["Activate child workspace"]
    J --> K["Franchise owner logs into isolated workspace"]
    K --> L["Franchise owner manages own team and data"]
    L --> M["Audit franchise creation and activation"]
```

### Parent and Child Workspace Rules

The parent workspace can:

- create franchise workspaces
- view franchise status and summary metadata
- suspend or delete a franchise according to policy
- track franchise ownership and operational state

The parent workspace should not automatically:

- see all child contacts
- see all child campaigns
- edit all child settings directly
- export all child member data without explicit design approval

This protects tenant isolation and keeps franchise workspaces meaningfully independent.

### Franchise Deletion

Franchise deletion is a workspace-level destructive action. It is not equivalent to removing one user.

Deleting a franchise should:

- revoke access for franchise users in that child workspace
- remove or archive child workspace data according to policy
- preserve an audit trail of who deleted it and when
- warn the parent Owner that the action affects campaigns, contacts, templates, members, and operational history inside that franchise

### Franchise Lifecycle Map

```mermaid
flowchart TD
    A["Franchise requested"] --> B["Pending invite"]
    B --> C["Pending activation"]
    C --> D["Active franchise workspace"]
    D --> E["Suspended franchise workspace"]
    D --> F["Deleted franchise workspace"]
    E --> D
    E --> F
    F --> G["Retention / archive policy"]
```

## 8.4 Team Data Export and Reporting

This subphase covers export of team and membership data from the Team Members area.

### Export Philosophy

Exports are a governed administrative feature. They expose controlled business data and must respect role boundaries, workspace boundaries, and audit requirements.

The export feature should support:

- export from the Team Members page
- filtering by role
- filtering by inviter or manager
- filtering by status
- CSV output by default
- optional XLSX output if needed
- direct download for small result sets
- background jobs for larger result sets
- secure file storage
- expiring download links

### Export User Flow

```mermaid
flowchart TD
    A["Owner or eligible Manager opens Team Members"] --> B["Apply export filters"]
    B --> C["Click Export Users"]
    C --> D["Estimate result size"]
    D --> E{"Small export?"}
    E -->|Yes| F["Generate file immediately"]
    F --> G["Return browser download"]
    G --> H["Write export event to audit and exports_log"]

    E -->|No| I["Create async export job"]
    I --> J["Queue background worker"]
    J --> K["Read filtered team data in pages"]
    K --> L["Write file to secure storage"]
    L --> M["Mark export completed"]
    M --> N["Generate signed expiring URL"]
    N --> O["Send notification email"]
    O --> P["User downloads from email or export history"]
    P --> Q["Record download / completion event"]
```

### Export Rules

- Owners can export all workspace member data allowed by policy.
- Managers can export only the subset of users they are allowed to see.
- Members cannot export team data.
- Export generation should be rate-limited.
- Concurrent export storms from the same workspace should be controlled.
- Every export request must create a durable log entry.

### Expected Export Columns

The baseline export should include:

- first name
- last name
- email
- role
- invited by
- joined date
- membership status

Additional fields can be added later, but the first release should stay focused on team administration use cases.

### Export System Architecture

```mermaid
flowchart TD
    A["Team Members UI"] --> B["Export API"]
    B --> C["Permission validation"]
    C --> D["Workspace scope validation"]
    D --> E["Filter validation"]
    E --> F{"Sync or Async"}

    F -->|Sync| G["Query workspace_members + users"]
    G --> H["Stream CSV / XLSX"]
    H --> I["Browser download"]

    F -->|Async| J["Create exports_log record"]
    J --> K["Queue worker"]
    K --> L["Paginated export processing"]
    L --> M["Secure object storage"]
    M --> N["Signed URL"]
    N --> O["Email + Export History entry"]
```

## 8.5 Governance, Audit, and Destructive Action Policy

This subphase ensures that all high-risk actions in Phase 8 are accountable and policy-driven.

### Audit Requirements

The following actions must produce audit records:

- invite created
- invite resent
- invite cancelled
- invite accepted
- role changed
- member removed
- user left workspace
- ownership transferred
- franchise created
- franchise activated
- franchise suspended
- franchise deleted
- export requested
- export completed
- export downloaded

### Retention and Historical Policy

ShrMail should preserve operational continuity while still respecting administrative removals.

That means:

- membership records may be soft-deactivated or timestamped as removed
- workspace-owned records should remain intact
- audit history must remain queryable after user removal
- export history should remain visible for compliance review
- franchise deletion should preserve at least audit-level history even if business data is hard-deleted

### Last Owner Protection

The system must prevent a workspace from losing its final Owner accidentally. Any action that would remove or invalidate the last Owner must fail until another valid Owner is assigned.

### Destructive Action Map

```mermaid
flowchart TD
    A["Sensitive admin action"] --> B{"Action type"}

    B --> C["Remove member"]
    B --> D["Transfer ownership"]
    B --> E["Delete franchise"]
    B --> F["Run export"]

    C --> G["Revoke access only"]
    G --> H["Keep workspace-owned history"]
    H --> I["Write audit log"]

    D --> J["Validate new owner exists"]
    J --> K["Protect against zero owners"]
    K --> I

    E --> L["Show destructive warning"]
    L --> M["Delete or archive franchise data by policy"]
    M --> N["Preserve audit trail"]
    N --> I

    F --> O["Validate export permissions"]
    O --> P["Apply rate limit and logging"]
    P --> I
```

### Governance Summary

The governance layer exists so that ShrMail administration is not only functional, but safe:

- no silent privilege changes
- no invisible destructive actions
- no cross-workspace leakage
- no export without accountability
- no loss of company-owned continuity when people leave

## Complete Vertical Flow From ShrMail to End State

This final diagram ties the entire phase together in one continuous top-down flow.

```mermaid
flowchart TD
    A["ShrMail Platform"] --> B["Workspace / Tenant Created"]
    B --> C["Workspace Identity Configured"]
    C --> D["Branding, Legal Address, Domains, Senders, API Keys"]

    B --> E["Team Members Module"]
    E --> F["Owner"]
    E --> G["Manager"]
    E --> H["Member"]

    F --> I["Invite Users"]
    I --> J["Invitation Email"]
    J --> K["Invite Accepted"]
    K --> L["Membership Created"]

    F --> M["Transfer Ownership"]
    M --> N["New Owner Assigned"]

    F --> O["Create Franchise"]
    O --> P["Child Workspace Created"]
    P --> Q["Franchise Owner Assigned"]
    Q --> R["Franchise Team Managed Independently"]

    F --> S["Export Team Data"]
    S --> T["Sync Download or Async Job"]
    T --> U["Secure File Delivery"]

    F --> V["Remove Member"]
    V --> W["Access Revoked"]
    W --> X["History Preserved"]

    F --> Y["Delete Franchise"]
    Y --> Z["Child Workspace and Its Data Removed by Policy"]

    L --> AA["Audit History Written"]
    N --> AA
    R --> AA
    U --> AA
    X --> AA
    Z --> AA

    AA --> AB["Governed, Traceable, Multi-Tenant Workspace Administration"]
```

## Detailed Delivery Checklist

### 8.1 Foundation

- workspace administration shell documented
- workspace identity model documented
- membership model documented
- parent-child workspace model documented
- permission enforcement model documented

### 8.2 Team Management

- Team Members page
- Owner / Manager / Member role definitions
- invite manager flow
- invite member flow
- resend invite flow
- cancel invite flow
- invitation acceptance flow
- change role flow
- remove member flow
- leave workspace flow
- ownership transfer flow
- last-owner protection

### 8.3 Franchise Lifecycle

- Franchise Accounts page
- add franchise owner flow
- child workspace provisioning flow
- pending / active / suspended / deleted franchise statuses
- franchise deletion policy
- franchise isolation rules

### 8.4 Export

- Team Members export control
- role-based export permissions
- sync export path
- async export path
- secure storage
- signed download link
- export history
- export email notification

### 8.5 Governance

- audit log coverage
- retention model
- membership soft-delete policy
- destructive warning copy
- franchise deletion audit trail
- export logging and download traceability

## Final Notes

This document intentionally reads as a system design chapter rather than a lightweight phase bullet list. Phase 8 is operationally important because it defines who controls a workspace, how teams expand, how franchises branch, how sensitive member data is exported, and how ShrMail preserves trust during destructive or high-risk actions.

The most important principle across the whole phase is simple:

workspace ownership is stable, membership is controlled, franchise boundaries are isolated, exports are governed, and every sensitive action is visible in history.
