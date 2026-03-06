# Phase 0 — UI/UX Design System

> **Status:** ✅ Complete  
> **Time taken:** ~1 day  
> **Priority:** Do this before any new page development

---

## Why This Exists

Previously, pages used hardcoded hex colors and inline `style={{}}` objects. Each page looked slightly different. This phase establishes a **single source of truth** for colors, typography, and reusable components so every future page looks consistent automatically.

---

## Files Changed

| File | Change |
|---|---|
| `src/app/globals.css` | Full rewrite: dark design tokens, WCAG accessibility fix |
| `tailwind.config.ts` | Mapped CSS vars to Tailwind class names |
| `src/app/layout.tsx` | Added `ToastProvider`, removed inline styles |
| `src/components/ui/Button.tsx` | Rebuilt with CVA (7 variants) |
| `src/components/ui/Badge.tsx` | New — 8 semantic variants |
| `src/components/ui/HealthDot.tsx` | New — status indicator dot |
| `src/components/ui/LoadingSpinner.tsx` | New — accessible spinner |
| `src/components/ui/StatCard.tsx` | New — metric card with trend |
| `src/components/ui/StatusBadge.tsx` | New — 18 preconfigured statuses |
| `src/components/ui/ConfirmModal.tsx` | New — accessible confirm dialog |
| `src/components/ui/Toast.tsx` | New — context + `useToast` hook |
| `src/components/ui/PageHeader.tsx` | New — standard page title bar |
| `src/components/ui/DataTable.tsx` | New — full table with search/sort/pagination |
| `src/components/ui/EmptyState.tsx` | New — empty list placeholder |
| `src/components/ui/Breadcrumb.tsx` | New — navigation trail |
| `src/components/ui/index.ts` | New — barrel export for all of the above |

---

## Design Tokens (`globals.css`)

All colors are defined as CSS variables. **Never hardcode a hex color in a component file again.**

```css
/* Backgrounds */
--bg-primary:    #0F172A   /* page background */
--bg-card:       #1E293B   /* card/panel surface */
--bg-hover:      #293548   /* hover state */

/* Accent */
--accent:        #3B82F6   /* primary CTA blue */
--accent-hover:  #2563EB
--accent-purple: #8B5CF6   /* secondary / gradients */

/* Text */
--text-primary:  #F1F5F9   /* headings, labels */
--text-muted:    #94A3B8   /* descriptions, placeholders */

/* Borders */
--border:        #334155

/* Semantic */
--success:       #10B981   /* sent, verified */
--warning:       #F59E0B   /* quota warning, paused */
--danger:        #EF4444   /* failed, blocked */
--info:          #60A5FA   /* informational */
```

### Tailwind Mapping

Because `tailwind.config.ts` maps these to Tailwind class names, you can write:

```tsx
// ✅ Correct — uses design token
<div className="bg-[var(--bg-card)] text-[var(--text-primary)]">

// ✅ Also fine — Tailwind mapped names
<div className="bg-bg-card text-text-primary">

// ❌ Never do this
<div style={{ backgroundColor: '#1E293B', color: '#F1F5F9' }}>
```

### Typography Scale

```css
--text-h1:      1.75rem  /* bold headings */
--text-h2:      1.25rem  /* semibold subheadings */
--text-h3:      1rem     /* semibold section titles */
--text-body:    0.875rem /* 14px — standard body text */
--text-caption: 0.75rem  /* 12px — secondary labels */
--text-mono:    0.8125rem /* 13px — IDs, codes, timestamps */
```

### WCAG Accessibility Fix

The old code had:
```css
/* ❌ BUG: This disabled keyboard navigation for ALL users */
*:focus { outline: none; }
```

Fixed to:
```css
/* ✅ Correct: hides outline for mouse, shows for keyboard users only */
*:focus { outline: none; }
*:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
```

---

## Component Reference

### ATOMS

Atoms are the smallest building blocks. They have no sub-components.

---

#### `Button`

```tsx
import { Button } from '@/components/ui';

// Variants
<Button variant="primary">Send Campaign</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="outline">View Details</Button>
<Button variant="ghost">More options</Button>
<Button variant="danger">Delete</Button>
<Button variant="success">Verify Domain</Button>
<Button variant="purple">Upgrade Plan</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium (default)</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Trash2 className="h-4 w-4" /></Button>

// Loading state (disables button + shows spinner)
<Button isLoading={isSaving}>Saving...</Button>

// Full width
<Button fullWidth>Import All Contacts</Button>
```

---

#### `Badge`

```tsx
import { Badge } from '@/components/ui';

<Badge variant="success">Active</Badge>
<Badge variant="warning">Paused</Badge>
<Badge variant="danger">Failed</Badge>
<Badge variant="info">Scheduled</Badge>
<Badge variant="accent">Pro Plan</Badge>
<Badge variant="purple">Beta</Badge>
<Badge variant="outline">Draft</Badge>
<Badge variant="default">Unknown</Badge>
```

---

#### `HealthDot`

```tsx
import { HealthDot } from '@/components/ui';

<HealthDot status="good" label="Connected" />
<HealthDot status="warning" label="Degraded" />
<HealthDot status="danger" label="Offline" pulse />
<HealthDot status="unknown" />
```

---

#### `LoadingSpinner` / `PageLoader`

```tsx
import { LoadingSpinner, PageLoader } from '@/components/ui';

// Inline spinner (e.g. next to text while fetching)
<LoadingSpinner size="sm" />
<LoadingSpinner size="md" label="Importing contacts..." />

// Full page loading state
<PageLoader label="Loading campaigns..." />
```

---

### MOLECULES

Molecules combine atoms into slightly more complex components.

---

#### `StatCard`

```tsx
import { StatCard } from '@/components/ui';
import { Mail } from 'lucide-react';

<StatCard
  label="Emails Sent"
  value="24,831"
  trend={12}
  trendLabel="vs last month"
  icon={<Mail className="h-5 w-5" />}
/>

// Negative trend
<StatCard label="Bounce Rate" value="1.2%" trend={-0.3} trendLabel="this week" />

// No trend
<StatCard label="Total Contacts" value="3,200" />
```

---

#### `StatusBadge`

Preconfigured badge for all entity statuses. Input a status string, get the right color automatically.

```tsx
import { StatusBadge } from '@/components/ui';

// Campaign statuses
<StatusBadge status="draft" />        // grey   Draft
<StatusBadge status="scheduled" />    // blue   Scheduled
<StatusBadge status="processing" />   // blue   Sending...
<StatusBadge status="throttled" />    // yellow ⏳ Throttled
<StatusBadge status="completed" />    // green  Completed
<StatusBadge status="paused" />       // yellow Paused
<StatusBadge status="failed" />       // red    Failed
<StatusBadge status="cancelled" />    // grey   Cancelled

// Contact statuses
<StatusBadge status="subscribed" />   // green  Subscribed
<StatusBadge status="unsubscribed" /> // yellow Unsubscribed
<StatusBadge status="bounced" />      // red    Bounced
<StatusBadge status="inactive" />     // grey   Inactive

// Domain / tenant statuses
<StatusBadge status="verified" />     // green  Verified
<StatusBadge status="suspended" />    // red    ⛔ Suspended
<StatusBadge status="pending" />      // yellow Pending
<StatusBadge status="active" />       // green  Active
```

---

#### `ConfirmModal`

Always show this before any destructive action (delete, suspend, cancel campaign).

```tsx
import { ConfirmModal } from '@/components/ui';

const [isOpen, setIsOpen] = useState(false);
const [isDeleting, setIsDeleting] = useState(false);

async function handleDelete() {
    setIsDeleting(true);
    await deleteContact(id);
    setIsDeleting(false);
    setIsOpen(false);
    toast.success('Contact deleted.');
}

<ConfirmModal
    isOpen={isOpen}
    onClose={() => setIsOpen(false)}
    onConfirm={handleDelete}
    title="Delete Contact"
    message="This contact will be moved to trash. You can restore within 30 days."
    confirmLabel="Delete"
    cancelLabel="Cancel"
    variant="danger"
    isLoading={isDeleting}
/>
```

**Keyboard support:** `Escape` closes the modal. `Tab` cycles through buttons.

---

#### `useToast` Hook

Add globally to your page — calls `toast.success()`, `toast.error()`, `toast.warning()`, `toast.info()` from anywhere. Auto-dismisses after 4 seconds.

```tsx
import { useToast } from '@/components/ui';

function MyPage() {
    const toast = useToast();

    async function handleImport() {
        try {
            await importContacts(file);
            toast.success('✅ 500 contacts imported successfully.');
        } catch (err) {
            toast.error('❌ Import failed. Please check your CSV format.');
        }
    }
}
```

**`ToastProvider` is already added to `layout.tsx`** — you don't need to add it again.

---

### ORGANISMS

Organisms are full page sections that assemble multiple molecules.

---

#### `PageHeader`

Use at the top of every page. Accepts a title, optional subtitle, and optional action button.

```tsx
import { PageHeader, Button, Breadcrumb } from '@/components/ui';
import { Upload } from 'lucide-react';

<PageHeader
    title="Contacts"
    subtitle="Manage your subscriber lists"
    breadcrumb={
        <Breadcrumb items={[
            { label: 'Contacts', href: '/contacts' }
        ]} showHome />
    }
    action={
        <Button onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Import
        </Button>
    }
/>
```

---

#### `Breadcrumb`

```tsx
import { Breadcrumb } from '@/components/ui';

// Simple
<Breadcrumb items={[
    { label: 'Campaigns', href: '/campaigns' },
    { label: 'Holiday Sale', href: '/campaigns/123' },
    { label: 'Analytics' },   // last item: no href = current page
]} />

// With home icon
<Breadcrumb showHome items={[{ label: 'Templates' }]} />
```

**Accessibility:** renders a `<nav aria-label="Breadcrumb">` with `aria-current="page"` on the last item.

---

#### `EmptyState`

Show when a table or list has 0 rows. **Never show a blank white space.**

```tsx
import { EmptyState, Button } from '@/components/ui';
import { Users } from 'lucide-react';

{contacts.length === 0 && (
    <EmptyState
        icon={<Users className="h-12 w-12" />}
        title="No contacts yet"
        description="Import a CSV to get started. Supports up to 100k rows."
        action={
            <Button onClick={() => setImportOpen(true)}>
                Import Contacts
            </Button>
        }
    />
)}
```

---

#### `DataTable`

Full-featured table with built-in search, sort, and pagination.

```tsx
import { DataTable, StatusBadge, Button } from '@/components/ui';
import { Column } from '@/components/ui';

interface Contact { id: string; name: string; email: string; status: string; }

const columns: Column<Contact>[] = [
    { key: 'name',   header: 'Name',   sortable: true },
    { key: 'email',  header: 'Email',  sortable: true },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status as any} /> },
    { key: 'actions', header: '', width: '80px',
      render: (row) => (
        <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)}>
            <Trash2 className="h-4 w-4" />
        </Button>
      )
    },
];

<DataTable
    columns={columns}
    data={contacts}
    isLoading={isFetching}
    searchable
    searchPlaceholder="Search contacts..."
    searchKeys={['name', 'email']}
    pageSize={25}
    emptyTitle="No contacts found"
    emptyDescription="Try a different search or import contacts."
    actions={
        <Button variant="danger" size="sm" onClick={handleBulkDelete}>
            Delete Selected
        </Button>
    }
/>
```

---

## Standard Page Layout Pattern

Every new page **must** follow this layout:

```tsx
export default function MyPage() {
    const toast = useToast();

    return (
        <div className="p-6">

            {/* 1. Header */}
            <PageHeader
                title="Page Title"
                subtitle="Short description"
                action={<Button>Primary Action</Button>}
            />

            {/* 2. Stat cards (3–4 key metrics) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard label="Total" value="1,234" trend={5} />
                <StatCard label="Active" value="892" />
                <StatCard label="Failed" value="12" trend={-2} />
                <StatCard label="Rate" value="24.3%" trend={1.2} />
            </div>

            {/* 3. Main content (table, form, etc.) */}
            <DataTable columns={columns} data={data} ... />

            {/* 4. Empty state shown automatically by DataTable when data=[] */}
        </div>
    );
}
```

---

## UX Rules — Non-Negotiable

These rules apply to **every** page and every PR gets rejected if these are violated:

| Rule | Implementation |
|---|---|
| Every delete action | Must show `<ConfirmModal>` first |
| Every form submit | Show `isLoading` on `<Button>` while waiting |
| Every API success | Call `toast.success('✅ ...')` |
| Every API error | Call `toast.error('❌ Something went wrong.')` |
| Every empty list | Show `<EmptyState>` with a CTA button |
| Every list page | Has a search input |
| Mobile viewport | Sidebar hidden, hamburger shows |

---

## Dependency Added

```bash
npm install class-variance-authority
```

Used by `Button.tsx` and `Badge.tsx` for type-safe variant management.

---

## Next Phase

**Phase 1.5 — Auth Cleanup** (fix forgot password, enable Google login, add audit logs)
