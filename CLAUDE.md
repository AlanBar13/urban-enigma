# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

This is a two-app repo (not a pnpm workspace — each app has its own lockfile and is installed/run independently):

- **`fraccio-web/`** — React 19 + TanStack Start frontend (SSR, deployed to Vercel). Has its own detailed [CLAUDE.md](fraccio-web/CLAUDE.md); read it before working there.
- **`fraccio-backend/`** — Fastify API + BullMQ worker that drives WhatsApp automation via `whatsapp-web.js`. Documented below.

Both apps use pnpm and talk to the **same Supabase Postgres project**. The web app owns the product UI/data; the backend is a separate service for WhatsApp group messaging per tenant.

## fraccio-backend

### Commands (run inside `fraccio-backend/`)

```bash
pnpm install
pnpm dev            # API server with hot reload (tsx watch src/server.ts) on port 5000
pnpm start:api      # API server, no watch
pnpm start:worker   # BullMQ worker that processes WhatsApp jobs
```

There is **no build, lint, or test setup** in the backend yet — it runs directly from TypeScript via `tsx`. Swagger UI is served at `http://localhost:5000/docs`; all routes are under `/api/v1`.

The API and the worker are **two separate processes** and both must run for end-to-end flows: the API enqueues jobs, the worker executes them against WhatsApp.

### Required environment (`.env` in `fraccio-backend/`)

`REDIS_HOST`, `REDIS_PORT` (BullMQ/Redis — Redis must be running), `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (service key; used by the singleton client). Also present: `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_JWKS_URL`.

### Architecture

The backend exists to run one WhatsApp Web client **per tenant** and expose group-messaging operations. Because `whatsapp-web.js` drives a real headless-Chromium WhatsApp session (via Puppeteer), all WhatsApp work is offloaded to a background worker rather than done in HTTP handlers.

**Request → Queue → Worker flow:**

1. HTTP routes ([src/api/routes/](fraccio-backend/src/api/routes/)) validate input and enqueue a BullMQ job onto the `whatsapp` queue ([src/queue/whatsapp.queue.ts](fraccio-backend/src/queue/whatsapp.queue.ts)). They return immediately with `{ success, jobId }` — they do **not** wait for the WhatsApp operation.
2. The worker ([src/workers/whatsapp.worker.ts](fraccio-backend/src/workers/whatsapp.worker.ts)) switches on `job.name` (`INIT_TENANT_SESSION`, `SEND_GROUP_MESSAGE`, `ADD_USER_TO_GROUP`, `CREATE_TENANT_GROUP`), resolves the tenant's client, and calls the service.
3. `concurrency: 1` on the worker is deliberate — the WhatsApp clients are stateful and live in-process.

**Session lifecycle** ([src/lib/whatsapp/session-manager.ts](fraccio-backend/src/lib/whatsapp/session-manager.ts)): `whatsappSessionManager` is a module-level singleton holding in-memory `Map`s of live `WhatsAppClient`s and session cache, keyed by tenant. It also persists session rows in the Supabase `whatsapp_sessions` table (status `pending_qr` → `connecting` → `ready` / `error`, plus `qr_code`). `getClient()` lazily initializes a client and dedupes concurrent inits via `initializingClients`. Because clients live in the worker process's memory, session state does not survive a worker restart and is not shared across processes.

**Layers:**

- [src/lib/whatsapp/client.ts](fraccio-backend/src/lib/whatsapp/client.ts) — thin wrapper over `whatsapp-web.js` `Client` with `LocalAuth` (auth persisted to `.wwebjs_auth/`, gitignored). Wires `qr`/`ready`/`auth_failure` events to `onQr`/`onReady`/`onError` callbacks that the session manager uses to update DB status.
- [src/lib/whatsapp/service.ts](fraccio-backend/src/lib/whatsapp/service.ts) — actual WhatsApp operations (send group message, add participant, create group). Phone numbers are normalized to `<digits>@c.us`. Several DB-persistence steps are still `TODO`.
- [src/api/controllers/comms.controller.ts](fraccio-backend/src/api/controllers/comms.controller.ts) — `commsController` singleton; enqueues comms jobs (does not touch WhatsApp directly).
- [src/lib/db/](fraccio-backend/src/lib/db/) — `SupaClient` singleton (`getInstance().getSupabase()`) plus a Fastify plugin that decorates the server with `supabase`.

**Server composition** ([src/server.ts](fraccio-backend/src/server.ts)): registers Swagger, the Supabase plugin, then route groups under `/api/v1` — `base.route` (health), `comms.route` and `whatsapp-session.route` both under `/comms`.

### Backend conventions

- **ESM with NodeNext**: relative imports **must** use `.js` extensions (e.g. `./client.js`) even though the source is `.ts`. TypeScript is strict, including `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- Singletons are the norm for shared stateful resources (Supabase client, session manager, comms controller, WhatsApp queue).
- HTTP handlers stay thin: validate + enqueue. Anything touching a live WhatsApp client belongs in the worker.

## fraccio-web

See [fraccio-web/CLAUDE.md](fraccio-web/CLAUDE.md) for full details (TanStack Start routing, multi-tenant model, server functions in `src/lib/`, component library, Vitest suite). Quick start:

```bash
cd fraccio-web
pnpm dev            # dev server on port 3000
pnpm test           # Vitest
pnpm check          # Prettier --write + ESLint --fix
```

## Shared domain model

A **tenant** is a `fraccionamiento` (residential subdivision). The web app manages tenants, houses, owners, and documents in Supabase; the backend adds a per-tenant WhatsApp session so a tenant's residents can be messaged as a WhatsApp group. The backend's `whatsapp_sessions` table is keyed by the same `tenant_id`.
