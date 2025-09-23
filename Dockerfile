# syntax=docker/dockerfile:1

# =========================
# 1) Build stage
# =========================
FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies using the lockfile for reproducibility
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy the rest of the source and build
COPY . .
RUN npm run build

# =========================
# 2) Runtime stage (Nginx)
# =========================
FROM nginx:1.25-alpine AS runner

# Copy custom nginx config (SPA routing)
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts to nginx html directory
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
