# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Debug: List dist contents to see what was copied
RUN echo "=== Contents of dist/ ===" && \
    ls -la dist/ && \
    echo "=== Contents of dist/src/ ===" && \
    (ls -la dist/src/ 2>/dev/null || echo "dist/src not found") && \
    echo "=== Looking for main.js ===" && \
    (find dist -name "main.js" -type f || echo "main.js not found")

# Expose port (Railway will set PORT env variable)
EXPOSE 4000

# Start the application (will be fixed after we see the debug output)
CMD ["node", "dist/src/main.js"]


