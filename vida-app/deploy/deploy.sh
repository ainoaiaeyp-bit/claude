#!/usr/bin/env bash
# Sube la app al VPS por rsync. Uso (desde vida-app/):
#   VPS_HOST=1.2.3.4 VPS_USER=root ./deploy/deploy.sh
# Opcionales: VPS_PATH (por defecto /var/www/vida), VPS_PORT (22)
set -euo pipefail
cd "$(dirname "$0")/.."

: "${VPS_HOST:?Falta VPS_HOST (IP o dominio del VPS)}"
: "${VPS_USER:?Falta VPS_USER (usuario SSH)}"
VPS_PATH="${VPS_PATH:-/var/www/vida}"
VPS_PORT="${VPS_PORT:-22}"

command -v node >/dev/null && for f in app.js sw.js; do node --check "$f"; done

ssh -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "mkdir -p '$VPS_PATH'"
rsync -avz --delete -e "ssh -p $VPS_PORT" \
  index.html styles.css app.js sw.js manifest.webmanifest icons \
  "$VPS_USER@$VPS_HOST:$VPS_PATH/"

echo "Subido a $VPS_USER@$VPS_HOST:$VPS_PATH"
echo "Si cambiaste app.js o styles.css, sube la versión de caché en sw.js (const CACHE = 'vida-vN')."
