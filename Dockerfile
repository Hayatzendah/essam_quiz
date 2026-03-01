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

# Debug: Show what was built
RUN echo "=== Build completed, checking output ===" && \
    echo "Current directory:" && pwd && \
    echo "Contents of /app:" && ls -la /app/ | head -20 && \
    echo "Contents of dist:" && (ls -la dist/ 2>/dev/null | head -20 || echo "dist not found") && \
    echo "Contents of dist/src:" && (ls -la dist/src/ 2>/dev/null | head -20 || echo "dist/src not found") && \
    echo "Looking for main.js:" && (find . -name "main.js" -type f 2>/dev/null | head -10 || echo "main.js not found") && \
    echo "Checking if dist/src/main.js exists:" && (test -f dist/src/main.js && echo "✅ dist/src/main.js EXISTS" || echo "❌ dist/src/main.js NOT FOUND")

# Expose port (Railway will set PORT env variable)
EXPOSE 4000

# Start the application using npm script (same as package.json start:prod)
CMD ["npm", "run", "start:prod"]

