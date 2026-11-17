# Stage 1: Build (TypeScript para JavaScript)
FROM node:20-alpine AS builder
WORKDIR /build

COPY package*.json ./
RUN npm install --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Stage 2: Runtime (Node 20 Alpine, usuario nao-root)
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000 --omit=dev && npm cache clean --force

COPY --from=builder /build/dist ./dist
RUN chown -R node:node /app

USER node

EXPOSE 3002

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://127.0.0.1:${PORT:-3002}/health || exit 1

CMD ["node", "dist/index.js"]
