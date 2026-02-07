# Multi-stage build para optimización
FROM node:20-alpine AS base
WORKDIR /app

# Stage 1: Dependencias de producción
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Dependencias de desarrollo y build
FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --production

# Stage 3: Desarrollo
FROM base AS development
RUN apk add --no-cache curl wget
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# Stage 4: Producción
FROM base AS production
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs
RUN apk add --no-cache curl
WORKDIR /app
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/package*.json ./
USER nestjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1
CMD ["node", "dist/main.js"]
