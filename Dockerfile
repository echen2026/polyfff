# Stage 1: Build the application and generate the production assets
FROM node:18-alpine AS builder
WORKDIR /app
# Copy package files and install dependencies
COPY package*.json ./
RUN npm install
# Copy the rest of the source code
COPY . .
# Build the Vite frontend (this outputs the built files to the "dist" folder)
RUN npm run build

# Stage 2: Create the final image for production
FROM node:18-alpine
WORKDIR /app
# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm install --production
# Bring over the built assets and server code from the builder stage.
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src

# Set production mode and expose the port (default used in your server.js is 3000)
ENV NODE_ENV=production
EXPOSE 3000

# Start the Express server that also serves the built client
CMD ["node", "src/server.js"]