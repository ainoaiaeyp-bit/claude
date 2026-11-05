#!/usr/bin/env bash
# Actualiza Lienzo: trae cambios de git y reconstruye. Uso: bash deploy/update.sh
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --ff-only
P=""; [ -f .use_ai ] && P="--profile ai"
docker compose $P up -d --build
docker image prune -f >/dev/null
echo "Actualizado. Los usuarios recibirán la nueva versión al recargar (service worker)."
