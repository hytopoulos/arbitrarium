# Build stage
FROM node:20-alpine AS builder

WORKDIR /frontend

# Install only production dependencies first
COPY package*.json ./
RUN npm install --legacy-peer-deps --prefer-offline --no-audit

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /frontend

# Copy only necessary files from builder
COPY --from=builder /frontend/build ./build
COPY --from=builder /frontend/node_modules ./node_modules
COPY --from=builder /frontend/package*.json ./

# Install serve to run the app
RUN npm install -g serve

# Expose the port the app runs on
EXPOSE 8080

# Start the application
CMD ["serve", "-s", "build", "-l", "8080"]
