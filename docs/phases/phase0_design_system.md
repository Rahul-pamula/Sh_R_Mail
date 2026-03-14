# Phase 0 Design System - Verified Reference

> This document describes the design-system foundation that exists in code today, the intended usage model, and the gaps that still need to be closed before Phase 0 can be marked complete.

---

## Design Goal

The design system is meant to give the product one consistent frontend language:

- one token source
- one shell pattern
- one reusable component library
- one interaction model for loading, empty, confirm, and feedback states

The implementation already provides that foundation. The remaining work is mostly consistency and completion, not direction.

---

## Implemented Structure

### Token source

`platform/client/src/app/globals.css`

Contains:

- dark-theme canvas and surfaces
- text and border colors
- semantic colors for success, warning, danger
- radius and shadow system
- animation helpers

### Tailwind bridge

`platform/client/tailwind.config.ts`

Purpose:

- expose token names as Tailwind utilities
- let component code use semantic classes instead of repeated literal values

### Root wiring

`platform/client/src/app/layout.tsx`

Purpose:

- install Inter globally
- wrap app with `AuthProvider`
- wrap app with `ToastProvider`
- mount the shared layout wrapper

### UI library

`platform/client/src/components/ui`

Current modules:

- `Button`
- `Badge`
- `HealthDot`
- `LoadingSpinner`
- `StatCard`
- `StatusBadge`
- `ConfirmModal`
- `Toast`
- `PageHeader`
- `DataTable`
- `EmptyState`
- `Breadcrumb`
- `index.ts`

### App shell

`platform/client/src/components/layout`

Current modules:

- `LayoutWrapper`
- `Sidebar`
- `Header`

---

## Recommended Usage Flow

Every new app page should follow this shape:

1. Page shell from `LayoutWrapper`
2. Optional `Breadcrumb`
3. `PageHeader`
4. optional metrics using `StatCard`
5. primary content using `DataTable` or form cards
6. `EmptyState` when data is absent
7. `Toast` for async feedback
8. `ConfirmModal` for destructive actions

This is the intended Phase 0 architecture. It is already possible with the current component set.

---

## Verified Component Notes

### `Button`

Use for:

- primary actions
- secondary actions
- ghost/icon actions
- loading submissions

Strengths:

- CVA variants
- size variants
- loading support

Current caution:

- small and icon sizes do not satisfy a strict 44x44 mobile target rule

### `Badge`

Use for:

- plan labels
- state labels
- lightweight emphasis

Current caution:

- `info` and `purple` styles depend on tokens not yet defined in `globals.css`

### `StatusBadge`

Use for:

- campaign, contact, domain, and tenant state labels

Current caution:

- some pages still ship page-local badge implementations instead of using this shared one

### `StatCard`

Use for:

- top-of-page metrics
- quick trend display

Current caution:

- some analytics pages still define local metric-card components instead of using the shared one

### `DataTable`

Use for:

- list screens with local filtering and pagination

Built-in behavior:

- search
- sort
- pagination
- empty state
- loading overlay

Current caution:

- major list pages are not fully standardized on this component yet

### `ConfirmModal`

Use for:

- delete
- cancel
- suspend
- irreversible actions

Current caution:

- Escape close exists
- focus trap does not
- initial focus and focus restore are not implemented

### `Toast`

Use for:

- async success
- warnings
- API failures
- information feedback

Current caution:

- info styling depends on missing tokens
- adoption is still limited to a small subset of pages

---

## Verified Gaps

### Token completeness gap

Missing root variables are the main structural issue in the current design system.

Missing values include:

- typography tokens
- purple accent token
- info-state tokens

### Adoption gap

The app still contains many pages with:

- inline styles
- hardcoded color values
- page-specific visual patterns

### Accessibility gap

Phase 0 accessibility goals are not fully met because:

- the global focus reset still removes default outlines
- modal focus management is incomplete
- mobile hit targets are not consistently large enough

### Environment setup gap

The Phase 0 plan also called for:

- Mailhog in Docker
- seed development data
- fully documented `.env.example`

Those items are still open.

---

## Practical Rules For Future Work

When building or editing frontend code after Phase 0:

- prefer shared UI components before creating page-local ones
- prefer token classes or CSS variables before hardcoded colors
- do not add new inline style-heavy layouts unless temporary
- use `Button isLoading` for async submits
- use `ConfirmModal` for destructive actions
- use `useToast` for user-visible API results
- use `EmptyState` instead of blank containers

---

## Recommended Work To Finish The Design System

### Foundation fixes

- define all missing tokens in `globals.css`
- remove unsupported Tailwind token aliases or back them with real values
- remove the global `*:focus { outline: none; }`

### Component hardening

- improve `ConfirmModal` accessibility
- verify all component variants against actual token support

### Product migration

- convert layout shell to token-only styling
- migrate major feature pages onto shared components
- replace local badges/cards/tables with shared versions

### Developer setup

- add Mailhog profile
- add seed script
- document all env vars

---

## Current Status

The current design system should be described as:

**Established and usable, but not yet complete or consistently adopted across the app.**
