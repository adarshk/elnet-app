#!/bin/bash
# Deploy/reload nginx config for the elec project
set -e

CONF_SRC="$(dirname "$0")/nginx.conf"
CONF_DEST="/etc/nginx/sites-available/elec"
LINK="/etc/nginx/sites-enabled/elec"

cp "$CONF_SRC" "$CONF_DEST"
ln -sf "$CONF_DEST" "$LINK"
rm -f /etc/nginx/sites-enabled/default

nginx -t && nginx -s reload 2>/dev/null || nginx
echo "nginx is running on port 80"
echo "  /api/*  -> localhost:3001 (backend)"
echo "  /*      -> localhost:5173 (frontend)"
