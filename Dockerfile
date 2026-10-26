# Stage 1: build the React app
FROM node:20-slim AS web
WORKDIR /web
COPY web/package*.json ./
RUN npm ci --legacy-peer-deps
COPY web ./
RUN npm run build

# Stage 2: API server plus the built UI
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
# Index shards come from storage at runtime, not from the image.
COPY --from=web /web/dist ./web/dist
ENV NODE_ENV=production
CMD ["node", "src/server.js"]
