# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server on port 3000
pnpm build        # Build with Vite + Nitro (Vercel preset)
pnpm test         # Run tests with Vitest
pnpm lint         # ESLint
pnpm check        # Prettier --write + ESLint --fix (auto-fix everything)
```

Add shadcn components:
```bash
pnpm dlx shadcn@latest add <component>
```

Test commands:
```bash
pnpm test                                                  # Run all tests
pnpm test:watch                                            # Watch mode
pnpm vitest run -t "toggles sort"                          # Run tests matching a name
pnpm vitest run src/components/shared/DataTable.test.tsx   # Run a single file
```

Tests are co-located (`Foo.tsx` → `Foo.test.tsx`), run under jsdom, and use `@testing-library/react` without `jest-dom`/`user-event`. Route *loaders* are tested; route components are not rendered.

**Read [TESTING.md](./TESTING.md) before writing a test** — it has the copyable templates and says what does and doesn't warrant a test.

## Architecture

**Stack**: React 19 + TanStack Start (SSR) + Nitro backend + Supabase (Postgres + Auth) + AWS S3 + Stripe. Deployed to Vercel.

### Routing — TanStack Router (file-based)

Routes live in `src/routes/`. The route tree is auto-generated into `src/routeTree.gen.ts`.

Key route segments:
- `/` — landing/login
- `/admin/` — super-admin area (fraccionamientos, usuarios)
- `/$tenantId/` — per-tenant workspace (parameterized by tenant slug)
  - `casa`, `anuncios`, `documentos`, `pagos/`, `perfil`, `usuarios`
  - `admin-anuncios`, `admin-documentos`, `adminCasas`, `admin-pagos`
- `/api/stripe/webhook` and `/api/upload/document` — API routes (Nitro handlers)

Each tenant route segment (`/$tenantId/route.tsx`) acts as a layout wrapper that gates access.

### Server Functions — `src/lib/`

Business logic and Supabase queries are organized by domain in `src/lib/`. These are called from route loaders/actions as TanStack Start server functions. Key files:

| File | Responsibility |
|------|---------------|
| `supabase.ts` | Creates Supabase client (SSR-aware) |
| `user.ts` | Auth, session, profile |
| `tenants.ts` | Tenant lookups |
| `casa.ts` / `houses.ts` | Property management |
| `anuncios.ts` | Announcements CRUD |
| `documents.ts` | Doc management (calls S3) |
| `s3.ts` | AWS S3 presigned URLs |
| `stripe.ts` | Payment processing |
| `admin.ts` / `admin-tenants.ts` / `admin-users.ts` | Super-admin operations |
| `invites/` | Invite token flow |
| `profiles/queries.ts` | User profile queries |
| `house_owners/queries.ts` | Owner assignment queries |

### Component Library — `src/components/`

Custom domain-organized components (not just shadcn). See `src/components/COMPONENTS_GUIDE.md` for full API docs.

| Folder | Contents |
|--------|----------|
| `ui/` | shadcn base primitives (button, card, input, badge, label, spinner) |
| `layouts/` | DashboardLayout, PageHeader, Section, Stack, Grid |
| `shared/` | DataTable, Badge, Avatar, List, Skeleton |
| `forms/` | FormField, MultiStepForm, DynamicFieldArray, CheckboxGroup, RadioGroup, Select, Textarea |
| `modals/` | Dialog, ConfirmDialog, AlertDialog, FormModal, Drawer |
| `navigation/` | SidebarNav, Breadcrumbs, Tabs, Pagination |
| `notifications/` | Alert, Callout, SnackBar, Toast (via `useToast` hook) |
| `tenant/` | TenantSelector, TenantHeader, RoleBadge |
| `admin/` | Container components for admin CRUD pages |

Toast notifications require `<ToastProvider>` + `<ToastContainer>` in `__root.tsx` (already configured). Use `useToast()` → `addToast({ type, title, description })` anywhere in the tree.

### Multi-Tenant Model

- A **tenant** maps to a `fraccionamiento` (residential subdivision).
- The URL param `$tenantId` is the tenant's `path` slug (not UUID).
- Users belong to tenants via `house_owners` or `house_users` junction tables.
- Roles: `owner`, `admin`, `member`, `viewer`.
- `RoleBadge` component renders role indicators; role-gating logic lives in route loaders.

### Feature Toggles (tenant-wide)

Per-tenant feature flags live in the `tenants.features` jsonb column (e.g. `{"payments": true}`). **Missing key = disabled** — features must be explicitly enabled per tenant. Superadmins toggle them via the "Funciones" modal on each tenant card in `/admin/fraccionamientos`, which calls `setTenantFeatureFn` (`src/lib/admin-tenants.ts`, guarded by `requireSuperadmin`).

To add a new toggleable feature (no DB migration needed — it's just a new jsonb key):

1. **`src/lib/tenants.ts`** — add the name to the `FeatureName` union.
2. **`src/lib/admin-tenants.ts`** — add it to the `z.enum([...])` in `setTenantFeatureFn`.
3. **`src/routes/admin/fraccionamientos.tsx`** — add a checkbox for it in the features `FormModal` (a `useState` seeded in `openFeatures`, saved in `onSaveFeatures`).
4. **Gate the feature** with `isFeatureEnabled(tenant.features, '<name>')` (tenant comes from route context):
   - Hide its nav items in `src/routes/$tenantId/route.tsx` (the `.filter()` on the nav arrays).
   - Add a `beforeLoad` redirect in the feature's routes — see `routes/$tenantId/pagos/index.tsx` and `admin-pagos.tsx` for the pattern. Don't gate external callback routes (e.g. `pagos/success`/`cancel` are Stripe return URLs).

Route guards + hidden nav are the enforcement layer; server fns behind backend auth are not re-checked against the flag.

### Database

Supabase PostgreSQL. Types are auto-generated in `src/database.types.ts`. Main tables: `tenants`, `houses`, `house_owners`, `house_users`, `profiles`, `announcements`, `documents`, `invites`.

## Conventions

- **Path alias**: `@/*` → `src/*`
- **Prettier**: no semicolons, single quotes, trailing commas
- **TypeScript**: strict mode, `noUnusedLocals`, `noUnusedParameters`
- **Styling**: Tailwind CSS v4 (no `tailwind.config.js` — config is in `src/styles.css`); CVA for component variants; shadcn "new-york" style with `zinc` base color
- **Icons**: `lucide-react`
