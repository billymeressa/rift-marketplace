FROM node:20-alpine AS base
WORKDIR /app

# Copy workspace root files
COPY package.json ./
COPY tsconfig.base.json ./

# Copy packages
COPY packages/shared ./packages/shared

# Copy API app
COPY apps/api ./apps/api

# Install all deps (workspace aware)
RUN npm install --workspaces --include-workspace-root

# Build shared package first
WORKDIR /app/packages/shared
RUN npm run build 2>/dev/null || true

# Build API
WORKDIR /app/apps/api
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

COPY --from=base /app/package.json ./
COPY --from=base /app/packages/shared ./packages/shared
COPY --from=base /app/apps/api/dist ./apps/api/dist
COPY --from=base /app/apps/api/package.json ./apps/api/
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/api/node_modules ./apps/api/node_modules 2>/dev/null || true

WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/index.js"]
