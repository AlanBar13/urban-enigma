# Fraccio

Two-app repo (not a pnpm workspace — each app has its own lockfile and is installed/run independently), both talking to the same Supabase Postgres project.

- **[fraccio-web/](fraccio-web/)** — React 19 + TanStack Start frontend (SSR, deployed to Vercel). Owns the product UI and data. See [fraccio-web/CLAUDE.md](fraccio-web/CLAUDE.md).
- **[fraccio-backend/](fraccio-backend/)** — Fastify API + BullMQ worker that drives per-tenant WhatsApp automation via `whatsapp-web.js`, plus Stripe payments. See [fraccio-backend/README.md](fraccio-backend/README.md).

## Domain model

A **tenant** is a `fraccionamiento` (residential subdivision). The web app manages tenants, houses, owners, and documents; the backend adds a per-tenant WhatsApp session so residents can be messaged as a group, and handles Stripe payments. Both are keyed by the same `tenant_id`.

## Quick start

```bash
# frontend
cd fraccio-web
pnpm install
pnpm dev            # http://localhost:3000

# backend (needs Redis; see fraccio-backend/README.md for full setup)
cd fraccio-backend
pnpm install
pnpm dev            # API on http://localhost:5000
pnpm start:worker    # separate process, required for WhatsApp jobs to run
```

See each app's own README/CLAUDE.md for environment variables, Docker setup, and architecture details.
