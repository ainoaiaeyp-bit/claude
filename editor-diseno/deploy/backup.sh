#!/usr/bin/env bash
# Copia de seguridad de la configuración local (.env, config.js, certificados de Caddy).
# Los diseños de los usuarios viven en Supabase: usa sus backups (o pg_dump) para eso.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-$HOME/lienzo-backup-$(date +%F).tar.gz}"
tar czf "$OUT" .env config.js 2>/dev/null || tar czf "$OUT" config.js
chmod 600 "$OUT"; echo "Guardado en $OUT (contiene secretos: guárdalo fuera del servidor)."
