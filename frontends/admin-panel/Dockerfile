# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /build
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
COPY package*.json ./
RUN npm config set maxsockets 3 && npm ci --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000
COPY . .
RUN npm run build

# Stage 2: Runtime (Nginx servindo estáticos)
FROM nginx:1.27-alpine AS runtime
RUN rm -f /etc/nginx/conf.d/default.conf
COPY default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /build/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:80/ || exit 1