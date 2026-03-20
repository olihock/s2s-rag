# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
COPY frontend/package.json ./frontend/
RUN yarn install --frozen-lockfile
COPY frontend/ ./frontend/
WORKDIR /app/frontend
RUN yarn build

# Stage 2: Serve with nginx
FROM nginx:1.27-alpine AS runtime
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
