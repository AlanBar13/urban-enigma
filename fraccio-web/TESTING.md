# Testing guide (fraccio-web)

Read this before writing a test. It describes what tests look like **in this repo**, not testing in general.

## Commands

```bash
pnpm test                                        # run everything
pnpm test:watch                                  # watch mode
pnpm vitest run src/components/shared/DataTable.test.tsx   # one file
pnpm vitest run -t "toggles sort"                # one test by name
```

No coverage provider is installed (`@vitest/coverage-v8` is not a dependency) — `--coverage` will fail.

## Setup

Vitest config lives in [vitest.config.ts](./vitest.config.ts) — **not** in `vite.config.ts`. It is deliberately a minimal config (`@vitejs/plugin-react` + the `@` alias): running tests through the app's `tanstackStart()`/`nitro()` plugins loads a second copy of React, and every component that calls a hook then dies with `Cannot read properties of null (reading 'useState')`. Don't merge the two configs back together.

- `environment: 'jsdom'` — components render.
- `globals: true` — **only** so `@testing-library/react` auto-registers its `afterEach` cleanup. Without it, DOM from one test leaks into the next and queries blow up with "found multiple elements". Tests still import `describe/it/expect/vi` from `vitest` explicitly; keep doing that.
- `restoreMocks: true` — spies reset between tests.

Available libraries: `vitest`, `@testing-library/react`, `@testing-library/dom`, `jsdom`.
**Not** installed, and deliberately so: `@testing-library/jest-dom`, `@testing-library/user-event`. Use `fireEvent` and plain assertions (`expect(el.tagName).toBe('SPAN')`, `expect(btn.disabled).toBe(true)`, `expect(screen.getByText('x')).toBeTruthy()`).

Need a typed element? Pass the query's type parameter — `screen.getByText<HTMLButtonElement>('Cancel').disabled` — not `as HTMLButtonElement`. `pnpm check` deletes inline assertions on query results (`@typescript-eslint/no-unnecessary-type-assertion`) and leaves the file failing `tsc`.

## Where tests live

Co-located next to the subject: `Pagination.tsx` → `Pagination.test.tsx`. There is no `src/lib/tests/` directory. Only `src/**/*.test.{ts,tsx}` is collected.

## What to test when you add a feature

| You added                                               | Test it?                                         |
| ------------------------------------------------------- | ------------------------------------------------ |
| Component with branching, computed output, or callbacks | Yes — component test                             |
| Purely presentational wrapper, or a `ui/` CVA variant   | No — that asserts Tailwind classes, not behavior |
| A route `loader`                                        | Yes — loader test (see below)                    |
| A server function in `src/lib/`                         | Yes — unit test with the Supabase mock below     |
| Route component rendering                               | No — see _Limits_                                |

Rule of thumb: the test must **fail if the logic breaks**. If you can't name a mutation that would break it, don't write it.

## Template 1 — presentational component

[src/components/tenant/RoleBadge.test.tsx](./src/components/tenant/RoleBadge.test.tsx)

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RoleBadge } from './RoleBadge'

describe('RoleBadge', () => {
  it.each([
    ['owner', 'Owner'],
    ['admin', 'Admin'],
  ] as const)('renders the label for %s', (role, label) => {
    render(<RoleBadge role={role} />)
    expect(screen.getByText(label)).toBeTruthy()
  })
})
```

## Template 2 — interactive component

[src/components/navigation/Pagination.test.tsx](./src/components/navigation/Pagination.test.tsx) and [src/components/shared/DataTable.test.tsx](./src/components/shared/DataTable.test.tsx)

```tsx
const onPageChange = vi.fn()
render(
  <Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />,
)
fireEvent.click(screen.getByText('4'))
expect(onPageChange).toHaveBeenCalledWith(4)
```

Conventions:

- Query by role/text, never by class name. Anchor on the accessible name where one exists: `screen.getByRole('navigation', { name: 'pagination' })`.
- Need two prop configurations in one test? `const { unmount } = render(...)` then `unmount()` before the second render.
- `screen.getAllByRole('button')` is fine for positional assertions when the markup order is stable — comment which index is which.

## Template 2b — `admin/` container (server fn + toasts)

[src/components/admin/FraccContainer.test.tsx](./src/components/admin/FraccContainer.test.tsx). Two things make these renderable:

```tsx
vi.mock('@tanstack/react-start', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useServerFn: (fn: any) => fn, // spread the rest: logger needs createIsomorphicFn
}))
vi.mock('@/lib/tenants', () => ({
  createTenantFn: (...a: Array<any>) => createTenantFn(...a),
}))
```

and wrapping in `<ToastProvider>` **with** `<ToastContainer />` — the provider alone holds the toasts but renders nothing, so `findByText('Error al …')` never resolves without the container.

## Template 3 — page (route loader)

[src/routes/$tenantId/usuarios.test.ts](./src/routes/$tenantId/usuarios.test.ts)

```ts
const getHousesFn = vi.fn()
vi.mock('@/lib/houses', () => ({
  getHousesFn: (...args: Array<any>) => getHousesFn(...args),
}))

const { Route } = await import('./usuarios')
const loader = (Route.options as any).loader

const data = await loader({ context: { tenant: { id: 't1' } } })
expect(getHousesFn).toHaveBeenCalledWith({ data: { tenantId: 't1' } })
expect(data).toEqual({ houses: [{ id: 'h1' }] })
```

The mock factory must reference an **outer** `vi.fn()` through a wrapper arrow — `vi.mock` is hoisted above the `const`, so referencing the spy directly inside the factory body throws. Import the subject **after** the mocks with top-level `await import()`.

## Template 4 — server function with Supabase

[src/lib/push-send.test.ts](./src/lib/push-send.test.ts) has the working chain-builder fake. Copy it: a thenable object whose `select/eq/in/delete/single` return `this`, resolving to module-scoped arrays that each test mutates in `beforeEach`. Mock `'./supabase'` (or `'@/lib/supabase'` — match the specifier the subject actually imports).

## Limits

- **Route components are not rendered.** They're module-local (`function RouteComponent()`, never exported) and `Route.useLoaderData()` needs a live router context. Testing pages stops at the loader. Don't refactor routes just to make them renderable — the loader is where the logic is.
- No coverage numbers. Add `@vitest/coverage-v8` if you actually need them.
