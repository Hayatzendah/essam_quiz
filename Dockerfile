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

# Verify build output exists
RUN test -f dist/src/main.js || (echo "ERROR: dist/src/main.js not found after build" && ls -la dist/ && exit 1)

# Expose port (Railway will set PORT env variable)
EXPOSE 4000

# Start the application using npm script (same as package.json start:prod)
CMD ["npm", "run", "start:prod"]

