# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace config
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/domain/package.json ./packages/domain/
COPY packages/application/package.json ./packages/application/
COPY packages/infrastructure/package.json ./packages/infrastructure/
COPY apps/backend/package.json ./apps/backend/

# Install dependencies
RUN npm install

# Copy source code
COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY packages/domain/ ./packages/domain/
COPY packages/application/ ./packages/application/
COPY packages/infrastructure/ ./packages/infrastructure/
COPY apps/backend/ ./apps/backend/

# Build all packages
RUN npm run build --workspace=@orion/shared && \
    npm run build --workspace=@orion/domain && \
    npm run build --workspace=@orion/application && \
    npm run build --workspace=@orion/infrastructure && \
    npm run build --workspace=@orion/backend

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy workspace config
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/domain/package.json ./packages/domain/
COPY packages/application/package.json ./packages/application/
COPY packages/infrastructure/package.json ./packages/infrastructure/
COPY apps/backend/package.json ./apps/backend/

# Install production dependencies only
RUN npm install --omit=dev

# Copy built files
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/domain/dist ./packages/domain/dist
COPY --from=builder /app/packages/application/dist ./packages/application/dist
COPY --from=builder /app/packages/infrastructure/dist ./packages/infrastructure/dist
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "apps/backend/dist/index.js"]
