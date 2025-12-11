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

# Verify build output
RUN echo "=== Verifying build output ===" && \
    if [ -f "dist/src/main.js" ]; then \
        echo "✅ dist/src/main.js exists"; \
        ls -lh dist/src/main.js; \
    else \
        echo "❌ dist/src/main.js NOT FOUND"; \
        echo "Contents of dist:"; \
        ls -la dist/ 2>/dev/null || echo "dist directory not found"; \
        echo "Looking for main.js:"; \
        find . -name "main.js" -type f 2>/dev/null || echo "main.js not found"; \
        exit 1; \
    fi

# Expose port (adjust if needed)
EXPOSE 3000

# Start the application
CMD ["node", "dist/src/main.js"]

