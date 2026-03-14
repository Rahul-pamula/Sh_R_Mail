# Phase 0 - UI/UX Foundation, Design System, and Frontend Baseline

> Status: Partially complete  
> Verified against code: 2026-03-14  
> Scope: `platform/client`, shared frontend layout, design-system docs, and tracker data

---

## Purpose

Phase 0 exists to create the frontend foundation before feature phases build on top of it. The goal is not to ship business functionality. The goal is to define a reusable UI system, shared interaction rules, accessibility defaults, and local developer setup so every later page is built on the same base.

In this repository, Phase 0 should answer these questions:

1. What visual tokens define the product UI?
2. What shared components should feature pages reuse?
3. What interaction rules are mandatory across the app?
4. What local setup should make frontend and email testing repeatable?

---

## Verified Architecture

Phase 0 is implemented as a frontend foundation inside `platform/client`.

### Core stack in use

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS 3.4
- CSS custom properties in `src/app/globals.css`
- `next/font/google` with Inter
- `class-variance-authority` for component variants
- `lucide-react` for icons
- Local React Context toast implementation

### Key foundation files

- `platform/client/src/app/globals.css`
- `platform/client/tailwind.config.ts`
- `platform/client/src/app/layout.tsx`
- `platform/client/src/components/ui/*`
- `platform/client/src/components/layout/*`

### UI architecture

The current implementation follows a simple layered structure:

- Design tokens: CSS variables in `globals.css`
- Tailwind bridge: token names exposed in `tailwind.config.ts`
- UI primitives: `Button`, `Badge`, `LoadingSpinner`, `HealthDot`
- Composite UI: `StatCard`, `StatusBadge`, `ConfirmModal`, `Toast`
- Page scaffolding: `PageHeader`, `DataTable`, `EmptyState`, `Breadcrumb`
- App shell: `LayoutWrapper`, `Sidebar`, `Header`

This is the correct direction for Phase 0. The main gap is not absence of the foundation. The main gap is incomplete token definitions and incomplete adoption across feature pages.

---

## Design System Flow

This section captures the actual design-system flow that feature work is supposed to follow.

### What the design system is responsible for

Phase 0 should give the product one consistent frontend language:

- one token source
- one shell pattern
- one reusable component library
- one interaction model for loading, empty, confirmation, and feedback states

### Intended page composition

Every new app page should follow this shape:

1. Shell from `LayoutWrapper`
2. Optional `Breadcrumb`
3. `PageHeader`
4. Optional metrics using `StatCard`
5. Main content using `DataTable` or standardized form/card layout
6. `EmptyState` when there is no data
7. `Toast` for async feedback
8. `ConfirmModal` for destructive actions

This is the target Phase 0 architecture. It is already possible with the current shared components, but it is not yet consistently applied across the product.

### Design-system files and responsibilities

`platform/client/src/app/globals.css`

- token source for colors, borders, radius, shadows, and motion helpers

`platform/client/tailwind.config.ts`

- exposes token names as Tailwind-friendly utility names

`platform/client/src/app/layout.tsx`

- installs Inter
- mounts auth provider
- mounts toast provider
- mounts the shared shell

`platform/client/src/components/ui`

- contains shared UI primitives and page-level building blocks

`platform/client/src/components/layout`

- contains the authenticated app shell

---

## What Is Implemented

### 1. Shared styling foundation exists

Implemented:

- Dark theme token file in `src/app/globals.css`
- Core background, text, border, semantic success/warning/danger tokens
- Shared radius and shadow tokens
- Global background treatment and animation utilities
- Inter font configured in `src/app/layout.tsx`
- Toast provider added at app root

### 2. Reusable UI component library exists

Implemented components:

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
- `index.ts` barrel export

### 3. Shared app shell exists

Implemented:

- Auth-aware layout wrapper
- Sidebar navigation
- Header bar
- Full-screen and public-route layout branching

### 4. Some Phase 0 rules are already wired into code

Implemented in foundation code:

- Button loading states via `isLoading`
- Data table search, sort, pagination
- Empty-state rendering inside `DataTable`
- Escape-to-close behavior in `ConfirmModal`
- Toast API available globally through context

---

## Shared Component Reference

This section is included so the main Phase 0 document reads as a complete guide, not only as a status report.

### `Button`

Use for:

- primary actions
- secondary actions
- ghost and icon actions
- loading submit actions

Current strengths:

- CVA variants
- size variants
- loading support
- full-width support

Current limitation:

- smaller variants do not satisfy a strict app-wide 44x44 touch-target standard

### `Badge`

Use for:

- plan labels
- state labels
- lightweight emphasis

Current limitation:

- `info` and `purple` variants depend on tokens that are still missing from `globals.css`

### `StatusBadge`

Use for:

- campaign status
- contact status
- tenant or domain status

Current limitation:

- some pages still define page-local badge logic instead of using the shared component

### `StatCard`

Use for:

- top-of-page metrics
- dashboard summary cards
- trend summaries

Current limitation:

- some analytics pages still implement their own local stat-card pattern

### `DataTable`

Use for:

- list pages with local search, sort, and pagination

Built-in behavior:

- search
- sort
- pagination
- loading overlay
- empty-state rendering

Current limitation:

- major list pages are not yet standardized on this component

### `ConfirmModal`

Use for:

- delete
- cancel
- suspend
- other destructive actions

What currently works:

- Escape close
- body scroll lock
- configurable labels and loading state

What is still missing:

- focus trap
- initial focus behavior
- focus restore to trigger

### `Toast`

Use for:

- async success messages
- warnings
- API failures
- informational feedback

What currently works:

- global provider
- hook-based API
- timed dismissal

What is still missing:

- complete info-state token support
- consistent adoption across API flows

### `EmptyState`

Use for:

- no results
- no records
- empty onboarding sections

Why it matters:

- Phase 0 should eliminate blank screens and ad hoc empty placeholders

### `Breadcrumb` and `PageHeader`

Use for:

- orientation
- page title and subtitle
- action placement
- standard top-of-page structure

Current limitation:

- several pages still use custom headers instead of this shared pattern

---

## What Is Not Complete

Phase 0 is not fully complete because the repository still has material gaps between the intended system and the implemented system.

### 1. Token system is incomplete

Referenced but not defined in `globals.css`:

- `--accent-purple`
- `--info`
- `--info-bg`
- `--text-h1`
- `--text-h2`
- `--text-h3`
- `--text-body`
- `--text-caption`
- `--text-mono`

Also present in Tailwind config but not backed by actual root variables:

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

Impact:

- Some component classes compile but resolve to missing CSS variables at runtime.
- Documentation currently claims a complete typography scale and info token set that do not exist in code.

### 2. Accessibility baseline is incomplete

Still incomplete:

- `*:focus { outline: none; }` still exists globally
- `ConfirmModal` does not implement focus trap or initial focus management
- Not all icon-only buttons across the app have verified labels
- Small button variants do not satisfy a global 44x44 touch-target rule

### 3. Adoption is incomplete across feature pages

Large parts of the app still use:

- inline `style={{}}`
- hardcoded hex colors
- hardcoded `rgba(...)` values
- page-specific custom cards, tables, and badges instead of shared UI components

This means the design system exists, but the application is not yet consistently using it.

### 4. Local developer setup items are not complete

Not implemented:

- Mailhog service in `docker-compose.yml`
- `scripts/seed_dev_data.py`
- fully documented `.env.example`
- verified shadcn/ui initialization artifacts such as `components.json`

---

## Verified Completion Matrix

### Setup

- [ ] shadcn/ui installed and initialized
- [x] Inter font configured in root layout

### Design tokens

- [x] Core dark-mode color tokens exist
- [ ] Typography scale tokens fully defined
- [ ] All referenced semantic tokens fully defined
- [ ] Token policy adopted across app without hardcoded colors

### Reusable components

- [x] Button
- [x] Badge
- [x] HealthDot
- [x] LoadingSpinner
- [x] StatCard
- [x] StatusBadge
- [x] ConfirmModal
- [x] Toast system
- [x] PageHeader
- [x] DataTable
- [x] EmptyState
- [x] Breadcrumb
- [x] Barrel exports

### UX rules

- [ ] ConfirmModal enforced for every destructive action
- [ ] Loading states applied consistently on every form submit
- [ ] Toast success/error handling applied consistently across API flows
- [ ] EmptyState used consistently across empty list screens
- [ ] Search plus filter pattern applied consistently across list pages
- [ ] Mobile navigation pattern completed end-to-end

### Accessibility

- [ ] Global focus reset fixed correctly
- [ ] Modal keyboard accessibility complete
- [ ] Icon-only button labels verified app-wide
- [ ] 44x44 touch-target rule met app-wide

### Local development setup

- [ ] Mailhog profile added
- [ ] Seed data script added
- [ ] `.env.example` fully documented

---

## Recommended Definition Of Done

Phase 0 should only be marked complete when all of the following are true:

1. Every token referenced by components and Tailwind exists in `globals.css`.
2. Shared UI components are used by the main feature pages instead of page-local replacements.
3. The global focus rule is corrected without disabling keyboard focus visibility.
4. Modal accessibility includes Escape, focus trap, initial focus, and sensible return focus.
5. Core list pages use shared page layout, table, empty state, button, and toast patterns.
6. Local frontend and email testing setup is documented and reproducible.

---

## Recommended Next Work To Finish Phase 0

### Priority 1 - Correct foundation bugs

- Define missing typography and semantic tokens in `globals.css`
- Remove the global `*:focus { outline: none; }` reset
- Clean up invalid or placeholder Tailwind token mappings

### Priority 2 - Finish accessibility

- Add focus trapping and initial focus to `ConfirmModal`
- Audit icon-only controls for ARIA labels
- Rework small action buttons that violate touch-target guidance

### Priority 3 - Finish adoption

- Migrate layout shell files away from inline styles
- Replace page-local status badges, stat cards, and table patterns with shared components
- Convert the highest-traffic pages first: dashboard, contacts, campaigns, templates, settings

### Priority 4 - Finish local setup

- Add Mailhog as a dev profile in Docker Compose
- Add `scripts/seed_dev_data.py`
- Expand `.env.example` with every required variable and a short explanation

---

## Conclusion

Phase 0 has produced a real design-system foundation, but it is not fully complete. The correct status is:

**Foundation created, partially adopted, not yet fully standardized.**
