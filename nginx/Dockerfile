# Stage 1 — build React frontend
FROM node:20-alpine AS build
WORKDIR /src
COPY app/package*.json ./
RUN npm ci
COPY app/ ./
RUN npm run build

# Stage 2 — nginx
FROM nginx:1.27-alpine
COPY --from=build /src/dist/        /usr/share/nginx/html/
COPY nginx/nginx.conf               /etc/nginx/nginx.conf
COPY nginx/docker-entrypoint.sh     /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/health || exit 1

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
