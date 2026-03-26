# Use lightweight Node image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy only package files first (better caching)
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy rest of the app
COPY . .

# Build the app
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Set environment
ENV NODE_ENV=production

# Expose app port
EXPOSE 3000

# Start the app
CMD ["node", "dist/index.js"]