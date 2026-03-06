# Phase 0 — UI/UX Design System & Project Setup

> **Status:** ✅ Complete  
> **Time taken:** ~1 day  
> **Depends on:** Nothing (this is the foundation)

---

## Overview

Phase 0 establishes the **design foundation** and **project infrastructure** for the Email Marketing platform. Before writing any features, this phase creates a unified design system with CSS variables, reusable components, and UX rules so that every subsequent page looks consistent and professional.

**Tech Stack:** Next.js 14 (App Router) · TypeScript · CSS Variables (Dark Mode) · Lucide Icons · CVA (Class Variance Authority)

---

## What Was Built

### 1. Design Token System (`globals.css`)
- Full dark-mode color palette as CSS variables
- Typography scale (h1–caption, mono)
- WCAG accessibility fix (`:focus-visible` instead of removing all outlines)
- Semantic color tokens: `--success`, `--warning`, `--danger`, `--info`

### 2. Reusable Component Library

| Component | Type | Description |
|---|---|---|
| `Button` | Atom | 7 variants (primary, secondary, outline, ghost, danger, success, purple), 4 sizes, loading state |
| `Badge` | Atom | 8 semantic color variants |
| `HealthDot` | Atom | Status dot with pulse animation |
| `LoadingSpinner` | Atom | Accessible spinner with label |
| `StatCard` | Molecule | Metric card with trend indicator |
| `StatusBadge` | Molecule | 18 pre-configured status labels with automatic coloring |
| `ConfirmModal` | Molecule | Accessible confirm dialog for destructive actions |
| `Toast / useToast` | Molecule | Auto-dismissing toast notification system |
| `PageHeader` | Organism | Standard page title bar with breadcrumb + action buttons |
| `Breadcrumb` | Organism | Navigation trail with home icon |
| `EmptyState` | Organism | Placeholder for empty lists with CTA |
| `DataTable` | Organism | Full table with search, sort, pagination |

### 3. Standard Page Layout Pattern
- Every page follows: Header → Stat Cards → Main Content → Empty State (if needed)
- Standardized spacing, typography, and color usage

### 4. Non-Negotiable UX Rules
- Every delete → `ConfirmModal` required
- Every form submit → `isLoading` on button
- Every API success → `toast.success()`
- Every API error → `toast.error()`
- Every empty list → `EmptyState` with CTA
- Every list → search input
- Mobile viewport → responsive sidebar

---

## Files Created

| File | Purpose |
|---|---|
| `src/app/globals.css` | Full design token system (CSS variables) |
| `tailwind.config.ts` | CSS vars mapped to Tailwind classes |
| `src/app/layout.tsx` | ToastProvider, global layout |
| `src/components/ui/Button.tsx` | Primary button with CVA variants |
| `src/components/ui/Badge.tsx` | Semantic badge |
| `src/components/ui/HealthDot.tsx` | Status indicator |
| `src/components/ui/LoadingSpinner.tsx` | Spinner component |
| `src/components/ui/StatCard.tsx` | Metric card |
| `src/components/ui/StatusBadge.tsx` | Auto-colored status labels |
| `src/components/ui/ConfirmModal.tsx` | Confirm dialog |
| `src/components/ui/Toast.tsx` | Toast + useToast hook |
| `src/components/ui/PageHeader.tsx` | Page title bar |
| `src/components/ui/DataTable.tsx` | Full data table |
| `src/components/ui/EmptyState.tsx` | Empty list placeholder |
| `src/components/ui/Breadcrumb.tsx` | Navigation breadcrumb |
| `src/components/ui/index.ts` | Barrel export |

---

## Dependencies Added

```bash
npm install class-variance-authority
```

---

## Next Phase

→ **Phase 1 — Foundation & Authentication** (Signup, Login, JWT, Multi-tenancy, Onboarding)
