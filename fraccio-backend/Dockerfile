FROM node:22-slim

# Install the `chromium` package only for its shared-library dependencies — the
# apt Chromium binary itself SIGTRAPs on launch in this image, so we let puppeteer
# use its own bundled, version-matched Chrome (downloaded during pnpm install) and
# just borrow the system libs. ponytail: the package is the terse way to pull every
# lib Chrome needs; swap for an explicit libnss3/libgbm1/... list only if image size bites.
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Cache puppeteer's Chrome under /app so it's downloaded as root at build time and
# still readable by the non-root `node` user at runtime (both use this path).
ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer

WORKDIR /app

RUN corepack enable

# Install deps first for layer caching. pnpm-workspace.yaml is needed so the
# onlyBuiltDependencies/ignoredBuiltDependencies config is honored during install.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# whatsapp-web.js LocalAuth writes here; these dirs back onto named volumes at runtime.
# Create + own them as `node` so the non-root user can write, and so the volumes
# inherit `node` ownership on first mount.
RUN mkdir -p .wwebjs_auth .wwebjs_cache && chown -R node:node /app

USER node

EXPOSE 5000

# Default = API. The worker service overrides this command in compose.
CMD ["pnpm", "start:api"]
