# Stage 1: Build
FROM node:20-bullseye AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-bullseye

WORKDIR /app

# Copy only prod dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled JS from builder
COPY --from=builder /app/dist ./dist

# Copy other necessary files (if any, like .env.example)
# COPY .env .  # optional; use env-file at runtime

EXPOSE 3000

CMD ["node", "dist/index.js"]