# Phase 0 - Technical Audit

> Audit date: 2026-03-14  
> Scope: verified against repository code, not prior markdown claims

---

## 1. Audit Scope

This audit covers the technical implementation of the Phase 0 frontend foundation:

- design tokens
- Tailwind token mapping
- root layout wiring
- shared UI component library
- layout shell
- accessibility baseline
- developer setup items called out by the phase plan
- adoption of the shared system across existing frontend pages

Reviewed code areas:

- `platform/client/src/app`
- `platform/client/src/components/ui`
- `platform/client/src/components/layout`
- `platform/client/tailwind.config.ts`
- `platform/client/package.json`
- `docker-compose.yml`
- `.env.example`

---

## 2. Verified Tech Stack

### Frontend framework

- Next.js `14.2.3`
- React `18`
- TypeScript `5`

### Styling and UI

- Tailwind CSS `3.4.1`
- CSS custom properties in `src/app/globals.css`
- `class-variance-authority` for variant-driven components
- `lucide-react` icons
- `next/font/google` for Inter

### UI-related dependencies present

- `@radix-ui/react-dialog`
- `@radix-ui/react-slot`
- `@radix-ui/react-toast`

Technical note:

These Radix packages are installed, but the audited Phase 0 components do not currently use Radix primitives. The current modal and toast implementations are custom React components.

---

## 3. Architecture Implemented

### 3.1 Token layer

The base visual system lives in `platform/client/src/app/globals.css`.

Implemented token categories:

- canvas and surface colors
- text colors
- border colors
- semantic colors for success, warning, danger
- radius values
- shadow values
- utility animations

Implementation pattern:

- root-level CSS custom properties
- Tailwind arbitrary value classes such as `bg-[var(--bg-card)]`
- Tailwind config aliases such as `bg-bg-card`

### 3.2 Tailwind bridge

`platform/client/tailwind.config.ts` exposes CSS variables as Tailwind color and typography names.

Logic:

- component code can consume tokens through standard Tailwind class strings
- design tokens remain centralized in CSS rather than duplicated in component files

### 3.3 Component system

The UI library is organized in `platform/client/src/components/ui`.

Patterns used:

- CVA-based variants for `Button` and `Badge`
- barrel export through `index.ts`
- client-side React Context for toast state
- generic table component with client-side filtering, sorting, and pagination
- reusable confirm dialog for destructive actions

### 3.4 App shell

The shared shell is split across:

- `LayoutWrapper`
- `Sidebar`
- `Header`

Logic:

- public routes hide app shell
- onboarding routes hide app shell
- some template routes use a full-screen layout
- authenticated app routes render sidebar and header

---

## 4. Implementation Verification

## 4.1 Design tokens

### Verified implemented

- `--bg-primary`
- `--bg-card`
- `--bg-hover`
- `--bg-input`
- `--accent`
- `--accent-hover`
- `--accent-gradient`
- `--accent-glow`
- `--text-primary`
- `--text-secondary`
- `--text-muted`
- `--text-inverted`
- `--border`
- `--border-highlight`
- `--success`
- `--success-bg`
- `--success-border`
- `--warning`
- `--warning-bg`
- `--warning-border`
- `--danger`
- `--danger-bg`
- `--danger-border`
- radius and shadow tokens

### Referenced but missing

- `--accent-purple`
- `--info`
- `--info-bg`
- `--text-h1`
- `--text-h2`
- `--text-h3`
- `--text-body`
- `--text-caption`
- `--text-mono`

### Tailwind aliases with no matching root variables

- `--background`
- `--foreground`
- `--card`
- `--card-foreground`
- `--popover`
- `--popover-foreground`
- `--primary`
- `--primary-foreground`
- `--secondary`
- `--secondary-foreground`
- `--muted`
- `--muted-foreground`
- `--destructive`
- `--destructive-foreground`
- `--border-hsl`
- `--input-hsl`
- `--ring`

Technical finding:

The token layer is directionally correct but not internally consistent. Components and Tailwind mappings depend on variables that do not exist in the root token file.

---

## 4.2 Shared components

### Implemented and verified

- `Button`
- `Badge`
- `HealthDot`
- `LoadingSpinner`
- `PageLoader`
- `StatCard`
- `StatusBadge`
- `ConfirmModal`
- `ToastProvider` and `useToast`
- `PageHeader`
- `DataTable`
- `EmptyState`
- `Breadcrumb`

### Component logic quality

`Button`

- Uses CVA for variants and sizes
- Supports loading state
- Supports full-width mode

`Badge`

- Uses CVA for semantic variants
- Depends on missing `--info` and `--accent-purple` tokens

`StatusBadge`

- Maps a fixed set of statuses to badge variants
- Current type covers 16 statuses, not 18 as earlier docs claimed

`DataTable`

- Generic over row type
- Implements local search against configured string keys
- Implements locale string sorting
- Implements client-side pagination
- Uses `EmptyState` when filtered results are empty

`Toast`

- Uses React Context and in-memory state
- Supports timed dismissal
- Depends on missing `--info` and `--info-bg` tokens for info styling

`ConfirmModal`

- Supports Escape close
- Locks body scroll while open
- Does not trap focus
- Does not manage initial focus
- Does not restore focus to trigger element

---

## 4.3 Layout shell

### Verified

- Auth-aware route branching is implemented
- Sidebar and header are shared across app routes
- Inter font and toast provider are installed at root

### Gaps

- `LayoutWrapper` still uses inline style objects
- `Sidebar` still uses inline style objects
- `Header` contains a mobile menu button, but no open-close sidebar interaction is wired
- layout code references `var(--bg-secondary)` in several places, but that token is not defined in `globals.css`

Technical finding:

The shell exists, but it is not yet a clean consumer of the design system it is supposed to define.

---

## 4.4 Accessibility verification

### What is implemented

- `:focus-visible` styling exists
- `ConfirmModal` closes on Escape
- some icon-only controls include `aria-label`
- `LoadingSpinner` includes screen-reader text
- `Breadcrumb` uses `aria-label="Breadcrumb"`

### What remains incomplete

- global `*:focus { outline: none; }` remains active
- no verified modal focus trap
- no verified app-wide keyboard interaction audit
- no verified app-wide icon-button label audit
- no verified touch-target audit

Technical finding:

Accessibility is partially addressed at the component level, but Phase 0 cannot be considered WCAG-ready.

---

## 4.5 Adoption across feature pages

### Verified adoption level

Adoption of shared Phase 0 components is still limited.

Observed direct imports from `@/components/ui` are sparse and mostly limited to:

- `Button`
- `ToastProvider`
- `useToast`

Observed issues:

- some pages define page-local `StatusBadge`
- some pages define page-local `StatCard`
- many screens still use inline `style={{}}`
- many screens still use raw hex colors and `rgba(...)`

Examples of ongoing debt:

- `platform/client/src/app/reports/page.tsx`
- `platform/client/src/components/CampaignWizard/Steps/Step1Details.tsx`
- `platform/client/src/components/CampaignWizard/Steps/Step3Content.tsx`
- `platform/client/src/components/layout/LayoutWrapper.tsx`
- `platform/client/src/components/layout/Sidebar.tsx`

Technical finding:

Phase 0 has created a library, but Phase 0 has not finished standardizing the product UI.

---

## 4.6 Developer setup items

### Verified implemented

- `.env.example` exists

### Verified not complete

- Mailhog service is not in `docker-compose.yml`
- `scripts/seed_dev_data.py` does not exist
- `.env.example` is not fully documented and does not list all required variables
- no verified `shadcn/ui` initialization artifacts were found

Technical finding:

The local setup portion of Phase 0 is incomplete.

---

## 5. Findings

### [High] Token system and consumers are out of sync

The code references multiple CSS variables that are not defined in `globals.css`. This affects typography, info-state styling, purple accents, and some Tailwind aliases. The result is a design system that appears complete in docs but is incomplete in runtime behavior.

### [High] Global focus reset still suppresses default accessibility behavior

`*:focus { outline: none; }` remains in the global stylesheet. Even with `:focus-visible`, this is not the Phase 0 accessibility standard described in the plan and increases the risk of keyboard focus regressions.

### [High] Shared design system is not yet adopted across major screens

Many pages continue to use inline styles, hardcoded colors, and local UI patterns. This means visual consistency, accessibility, and maintainability benefits of Phase 0 are not realized app-wide.

### [Medium] Confirm modal is not fully accessible

The modal handles Escape and scroll lock, but it does not trap focus, set initial focus, or restore focus. This is incomplete for a foundational component meant to be reused across the app.

### [Medium] Mobile shell behavior is incomplete

The header includes a mobile menu icon, but no functional mobile sidebar orchestration was verified. The plan item "sidebar hidden on mobile, hamburger menu added" is not fully delivered.

### [Medium] Phase documentation currently overstates completion

Existing docs claim Phase 0 is complete, claim typography tokens exist, claim semantic info tokens exist, and imply no hardcoded colors remain. Those claims are not supported by the current codebase.

---

## 6. Verified Phase 0 Status

### Complete

- frontend foundation created
- Inter root font wiring
- token-based dark theme base established
- reusable UI component library created
- root toast provider integrated
- shared app shell created

### Incomplete

- token completeness
- typography token definitions
- semantic info token definitions
- app-wide migration away from inline styles and hardcoded colors
- accessibility baseline
- mobile navigation completion
- local developer setup tasks

### Correct status label

**Phase 0 is partially complete.**

The correct technical description is:

**The base design system exists, but token integrity, accessibility, developer setup, and app-wide adoption are still unfinished.**

---

## 7. Recommended Completion Plan

### Step 1 - stabilize the foundation

- add all missing root variables
- remove invalid token aliases or back them with real values
- correct global focus behavior

### Step 2 - harden core components

- upgrade `ConfirmModal` accessibility
- verify `Button`, `Badge`, `Toast`, and `PageHeader` against actual token availability

### Step 3 - migrate shell and top-level pages

- remove inline styles from layout shell
- standardize dashboard, contacts, campaigns, templates, and settings on shared UI primitives

### Step 4 - finish environment support

- add Mailhog
- add seed script
- expand `.env.example`

---

## 8. Final Verdict

Phase 0 should not be represented as complete in planning or audit documents.

The correct engineering verdict is:

**Implemented foundation: yes.**
**Production-ready, fully adopted design system: not yet.**
