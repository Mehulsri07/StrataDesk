#!/bin/sh
# Substitute API_UPSTREAM placeholder with the real value from the environment.
# Local Docker Compose: API_UPSTREAM defaults to "api:3001"
# Railway:              set API_UPSTREAM to "<api-service>.railway.internal:3001"

API_UPSTREAM="${API_UPSTREAM:-api:3001}"
PORT="${PORT:-80}"

sed -i "s|API_UPSTREAM|${API_UPSTREAM}|g" /etc/nginx/nginx.conf
sed -i "s|${PORT:-80}|${PORT}|g"         /etc/nginx/nginx.conf

exec nginx -g "daemon off;"
