# =============================================================================
# CrediBot — Admin BFF  (Node.js 20 Alpine, multi-stage)
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder — compila TypeScript, instala TODAS as dependências
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /build

# Copia manifests primeiro para aproveitar cache de camadas do Docker.
# package-lock.json garante instalação determinística via npm ci.
COPY package.json package-lock.json ./
RUN npm ci --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Runtime — apenas artefatos de produção, usuário não-root
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Instala somente dependências de produção com npm ci + --omit=dev.
# npm ci é mais rápido e garante reprodutibilidade a partir do lockfile.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
      --fetch-retries=5 \
      --fetch-retry-mintimeout=20000 \
      --fetch-retry-maxtimeout=120000 \
    && npm cache clean --force

# Copia artefatos compilados com ownership já definido (evita RUN chown separado)
COPY --from=builder --chown=node:node /build/dist ./dist

USER node

EXPOSE 3002

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3002/health || exit 1

CMD ["node", "dist/index.js"]
