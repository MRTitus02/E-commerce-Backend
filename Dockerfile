# Use lightweight Node image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and lock file first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy the rest of the app
COPY . .

# Build TypeScript if needed
RUN npm run build

# Expose the port (Render sets PORT env)
EXPOSE 3000

# Use the PORT environment variable from Render
CMD ["sh", "-c", "node dist/index.js"]