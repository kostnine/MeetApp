# meetlink — single-origin production image.
# NestJS serves the API (/api), the websockets (/socket.io) AND the built Vue SPA,
# all from one port. Build context must be this directory (outputs/).

# ---- Stage 1: build the Vue SPA ----
FROM node:22-alpine AS web
WORKDIR /web
COPY meetlink/package*.json ./
RUN npm ci
COPY meetlink/ ./
# The "Continue as guest" button signs in with this password; it must match the
# backend's ADMIN_PASSWORD. Override at build time: --build-arg VITE_ADMIN_PASSWORD=...
ARG VITE_ADMIN_PASSWORD=kostnine-admin
ENV VITE_ADMIN_PASSWORD=$VITE_ADMIN_PASSWORD
RUN npm run build

# ---- Stage 2: build the NestJS API ----
FROM node:22-alpine AS api
WORKDIR /api
COPY meetlink-api/package*.json ./
RUN npm ci
COPY meetlink-api/ ./
RUN npm run build

# ---- Stage 3: lean runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY meetlink-api/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=api /api/dist ./dist
COPY --from=web /web/dist ./client
# The host injects its own PORT; the app reads it (falls back to 4000).
EXPOSE 4000
CMD ["node", "dist/main.js"]
