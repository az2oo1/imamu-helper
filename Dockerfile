FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ bash

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Ensure public directory exists
RUN mkdir -p public

# Build frontend and backend
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Install bash, ca-certificates, and copy binary to all standard PATH locations
RUN apk add --no-cache ca-certificates bash curl \
    && cp -f /bin/bash /usr/bin/bash \
    && cp -f /bin/bash /usr/local/bin/bash || true

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built artifacts and scripts from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src
COPY --from=builder /app/server.ts ./server.ts

# Expose port
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
