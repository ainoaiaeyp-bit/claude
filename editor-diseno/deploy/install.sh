#!/usr/bin/env bash
# Instalación de Lienzo en un VPS Debian/Ubuntu. Uso: bash deploy/install.sh [--dry-run]
# Ejecútalo desde la carpeta editor-diseno como usuario con sudo (no hace falta root directo).
set -euo pipefail
DRY=0; [ "${1:-}" = "--dry-run" ] && DRY=1
run(){ if [ $DRY = 1 ]; then echo "[dry-run] $*"; else "$@"; fi; }
cd "$(dirname "$0")/.."

echo "== 1/5 Docker =="
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker no está instalado; se instalará con el script oficial."
  if [ $DRY = 1 ]; then echo "[dry-run] curl -fsSL https://get.docker.com | sudo sh"; else curl -fsSL https://get.docker.com | sudo sh; fi
  run sudo usermod -aG docker "$USER"
fi
if [ $DRY = 0 ] && ! docker info >/dev/null 2>&1; then DOCKER="sudo docker"; else DOCKER="docker"; fi

echo "== 2/5 Configuración (.env) =="
if [ ! -f .env ]; then
  [ $DRY = 1 ] && { echo "[dry-run] se pediría DOMAIN y claves y se crearía .env"; } || {
  read -rp "Dominio (ya apuntando a esta IP con registro A): " DOMAIN
  read -rp "¿Activar el proxy de IA con tu clave de Anthropic? (s/N): " AI
  cp .env.example .env
  sed -i "s|^DOMAIN=.*|DOMAIN=$DOMAIN|" .env
  if [[ "$AI" =~ ^[sS]$ ]]; then
    read -rsp "ANTHROPIC_API_KEY (no se mostrará): " K; echo
    read -rp "SUPABASE_URL: " SU; read -rp "SUPABASE_ANON_KEY: " SK
    sed -i "s|^ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=$K|;s|^SUPABASE_URL=.*|SUPABASE_URL=$SU|;s|^SUPABASE_ANON_KEY=.*|SUPABASE_ANON_KEY=$SK|" .env
    touch .use_ai
  fi
  chmod 600 .env; }
else echo ".env ya existe; no se toca."; fi

echo "== 3/5 Cortafuegos =="
if command -v ufw >/dev/null 2>&1; then run sudo ufw allow 22/tcp; run sudo ufw allow 80/tcp; run sudo ufw allow 443/tcp; echo "(ufw: no lo activo yo; hazlo tú con 'sudo ufw enable' cuando verifiques que SSH sigue permitido)"; fi

echo "== 4/5 Arranque =="
PROFILE=""; [ -f .use_ai ] && PROFILE="--profile ai"
run $DOCKER compose $PROFILE up -d --build

echo "== 5/5 Comprobación =="
if [ $DRY = 0 ]; then
  sleep 8; D=$(grep ^DOMAIN= .env | cut -d= -f2)
  curl -fsS -o /dev/null -w "Editor: HTTP %{http_code}\n" "https://$D/" || echo "Aún sin HTTPS: revisa DNS y que 80/443 estén abiertos ($DOCKER compose logs caddy)"
  [ -n "$PROFILE" ] && curl -fsS "https://$D/api/health" && echo
fi
echo "Listo. Falta (si usas nube): ejecutar supabase/schema.sql y poner las claves en config.js (ver DEPLOY.md)."
