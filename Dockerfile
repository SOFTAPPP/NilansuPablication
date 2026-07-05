# 1. Base Node image
FROM node:20-alpine AS base

# 2. Dependencies stage
FROM base AS deps
WORKDIR /app
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN npm run install --workspaces || npm i concurrently puppeteer
WORKDIR /app/client
RUN npm install
WORKDIR /app/server
RUN npm install
COPY server/prisma ./prisma
RUN npx prisma generate

# 3. Builder stage
FROM deps AS builder
WORKDIR /app
COPY . .
WORKDIR /app/client
RUN npm run build
WORKDIR /app/server
RUN npm run build

# 4. Production Runner stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install PM2 globally
RUN npm install -g pm2

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/server/prisma ./server/prisma
COPY ecosystem.config.js ./

# Expose ports
EXPOSE 5000 5173

# Start via PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
