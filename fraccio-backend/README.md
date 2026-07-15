# fraccio-backend

Fastify API + BullMQ worker that drives WhatsApp automation (via `whatsapp-web.js`) for Fraccio tenants. Talks to the same Supabase Postgres project as `fraccio-web`.

## Prerequisites

- Node.js + pnpm
- A running Redis instance (used by BullMQ)

## Setup

```bash
pnpm install
```

Create a `.env` file in this directory with:

```
REDIS_HOST=
REDIS_PORT=
SUPABASE_URL=
SUPABASE_SECRET_KEY=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_JWKS_URL=
STRIPE_SECRET_KEY=
STRIPE_CONNECT_WEBHOOK_SECRET=
```

## Running locally (no containers)

The API and worker are separate processes — both must run for end-to-end flows (the API enqueues jobs, the worker executes them against WhatsApp):

```bash
pnpm dev            # API server with hot reload, port 5000
pnpm start:api       # API server, no watch
pnpm start:worker     # BullMQ worker that processes WhatsApp jobs
```

Swagger UI: `http://localhost:5000/docs`. All routes are under `/api/v1`.

There is no build, lint, or test setup yet — it runs directly from TypeScript via `tsx`. Typechecking: `pnpm typecheck` (also run in CI, see `.github/workflows/ci-backend.yml`).

## Running in Docker (dev)

`docker compose up` starts `redis` + `api` + `worker`, auto-merging `docker-compose.override.yml` which bind-mounts `./src` and runs `tsx watch` for hot reload in both containers. Redis connection env vars are set by compose, so `REDIS_HOST`/`REDIS_PORT` in `.env` are ignored inside containers.

```bash
docker compose up --build
```

WhatsApp session auth (`.wwebjs_auth`, `.wwebjs_cache`) persists in named volumes across restarts, so you don't have to re-scan the QR code every time.

Prod-shaped stack (base compose file only, no hot reload):

```bash
docker compose -f docker-compose.yml up -d --build
```

## Deployment (Railway)

One Railway project with three services. `api` and `worker` both build from this directory's `Dockerfile` (set **Root Directory** to `fraccio-backend` on each).

| Service | Config |
|---|---|
| **Redis** | Railway Redis template. Set `maxmemory-policy noeviction` (BullMQ requirement). |
| **api** | Default Docker CMD (`pnpm start:api`). Generate a public domain; Railway injects `PORT` and the server reads it. |
| **worker** | Custom start command: `pnpm start:worker`. Attach a **volume mounted at `/app/.wwebjs_auth`** — without it every deploy loses the WhatsApp session and forces a QR re-scan. (`.wwebjs_cache` is a re-creatable cache; no volume needed.) |

On both `api` and `worker`:

- **Watch paths**: `fraccio-backend/**` — web-only commits don't trigger backend deploys.
- **Wait for CI**: enabled — deploys only after the commit's GitHub checks (`ci-backend`) pass.
- **Variables**: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` as reference variables from the Redis service, plus `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_JWKS_URL`, `STRIPE_SECRET_KEY`, `STRIPE_CONNECT_WEBHOOK_SECRET`.

`docker-compose.yml` is the local-dev story only; Railway builds straight from the `Dockerfile`.

## Architecture

See the [root CLAUDE.md](../CLAUDE.md#fraccio-backend) for the full architecture writeup (request → queue → worker flow, session lifecycle, layer breakdown, conventions).
