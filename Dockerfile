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
# First, verify what was built in the builder stage
RUN echo "=== Builder stage dist contents ===" && \
    ls -la /usr/src/app/dist/ && \
    (ls -la /usr/src/app/dist/src/ 2>/dev/null || echo "dist/src not found in builder") && \
    (find /usr/src/app/dist -name "main.js" -type f || echo "main.js not found in builder")

# Copy the entire dist directory
COPY --from=builder /usr/src/app/dist ./dist

# Verify what was copied
RUN echo "=== Runner stage dist contents ===" && \
    ls -la dist/ && \
    (ls -la dist/src/ 2>/dev/null || echo "dist/src not found in runner") && \
    (find dist -name "main.js" -type f || echo "main.js not found in runner")

# Expose port (Railway will set PORT env variable)
EXPOSE 4000

# Start the application (will be fixed after we see the debug output)
CMD ["node", "dist/src/main.js"]


