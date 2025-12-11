# Use Node.js 20
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Debug: Check what was built
RUN echo "=== Checking dist structure ===" && \
    ls -la dist/ && \
    (ls -la dist/src/ 2>/dev/null || echo "dist/src not found") && \
    (find dist -name "main.js" -type f || echo "main.js not found")

# Expose port (adjust if needed)
EXPOSE 3000

# Start the application
CMD ["node", "dist/src/main.js"]

