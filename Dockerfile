# Multi-stage build for CipherSQLStudio

# Stage 1: Build React client
FROM node:18-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Setup server
FROM node:18-alpine AS server-setup
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production

# Stage 3: Final image
FROM node:18-alpine
WORKDIR /app

# Copy server files and dependencies
COPY --from=server-setup /app/node_modules ./server/node_modules
COPY server/ ./server/

# Copy built client
COPY --from=client-builder /app/client/build ./client/build

# Set working directory to server
WORKDIR /app/server

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "index.js"]

