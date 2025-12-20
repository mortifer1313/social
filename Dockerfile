# Build stage
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

# Copy drizzle configuration files
COPY drizzle.config.* ./
COPY shared/ ./shared/
COPY scripts/ ./scripts/

COPY --from=builder /app/dist ./dist

EXPOSE 5000

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5000

# Run environment check before starting
CMD ["sh", "-c", "node scripts/check-env.js && npm start"]
