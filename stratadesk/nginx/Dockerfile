# Stage 1 — validate JS syntax before shipping
FROM node:20-alpine AS validate
WORKDIR /src
COPY frontend/app.js frontend/index.html frontend/styles.css ./
RUN node --check app.js && echo "JS syntax OK"

# Stage 2 — minimal nginx image (~25 MB)
FROM nginx:1.27-alpine
COPY --from=validate /src/index.html  /usr/share/nginx/html/
COPY --from=validate /src/styles.css  /usr/share/nginx/html/
COPY --from=validate /src/app.js      /usr/share/nginx/html/
COPY nginx/nginx.conf /etc/nginx/nginx.conf

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/health || exit 1

EXPOSE 80
