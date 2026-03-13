# ── Build stage ──────────────────────────────
FROM node:22.15-alpine3.21 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ── Production stage ─────────────────────────
FROM node:22.15-alpine3.21
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY --from=builder /app/dist/ ./dist/

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN mkdir -p /app/data && chown -R appuser:appgroup /app/data
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "dist/index.js"]
