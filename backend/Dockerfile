# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
COPY backend/package.json ./backend/
RUN yarn install --frozen-lockfile
COPY backend/ ./backend/
WORKDIR /app/backend
RUN npx prisma generate
RUN yarn build

# Stage 2: Runtime
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-linux-musl-openssl-3.0.x.so.node
COPY package.json yarn.lock ./
COPY backend/package.json ./backend/
RUN yarn install --frozen-lockfile --production && yarn cache clean
WORKDIR /app/backend
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma
EXPOSE 3000
CMD ["node", "dist/main"]
