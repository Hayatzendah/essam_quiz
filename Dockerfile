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
    echo "Contents of /app:" && \
    ls -la /app/ && \
    echo "Contents of dist:" && \
    ls -la dist/ 2>/dev/null || echo "dist not found" && \
    echo "Contents of dist/src:" && \
    (ls -la dist/src/ 2>/dev/null || echo "dist/src not found") && \
    echo "Looking for main.js:" && \
    (find . -name "main.js" -type f 2>/dev/null || echo "main.js not found anywhere") && \
    echo "All .js files in dist:" && \
    (find dist -name "*.js" -type f 2>/dev/null | head -20 || echo "No .js files found")

# Expose port (adjust if needed)
EXPOSE 3000

# Start the application
CMD ["node", "dist/src/main.js"]

