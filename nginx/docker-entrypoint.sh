#!/bin/sh
# Substitute API_UPSTREAM placeholder in nginx.conf at container start.
# Local Docker Compose: API_UPSTREAM=api:3001 (default)
# Railway:              API_UPSTREAM=<api-service>.railway.internal:3001

API_UPSTREAM="${API_UPSTREAM:-api:3001}"

sed -i "s|API_UPSTREAM|${API_UPSTREAM}|g" /etc/nginx/nginx.conf

exec nginx -g "daemon off;"
