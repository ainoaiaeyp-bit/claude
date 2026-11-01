#!/usr/bin/env bash
# Sube la versión actual a tu servidor de IONOS (VPS / Cloud Server) y sustituye la web que hubiera.
# Uso:  ./scripts/deploy-ionos.sh usuario@IP-o-dominio [--first dominio.es 'contraseña-panel'] [--yes]
# Sin --yes solo enseña lo que haría. Antes de sustituir nada se guarda una copia en /root/backups del servidor.
# Los datos (clientas, citas, facturas) viven en /var/lib/noelia y NUNCA se tocan al actualizar.
set -euo pipefail
TARGET="${1:?Indica usuario@servidor}"; shift || true
YES=0; FIRST=0; DOMAIN=""; PW=""
while [ $# -gt 0 ]; do case "$1" in
  --yes) YES=1;; --first) FIRST=1; DOMAIN="${2:?dominio}"; PW="${3:?contraseña}"; shift 2;;
esac; shift; done
cd "$(dirname "$0")/.."
node scripts/make-package.mjs
echo "Destino: $TARGET"
if [ "$FIRST" = 1 ]; then echo "Plan: instalación inicial para $DOMAIN (copia de seguridad, Node 22, nginx, HTTPS, servicio)."; else echo "Plan: copia de seguridad de la app actual, subir el paquete, reiniciar el servicio."; fi
if [ "$YES" != 1 ]; then echo "Simulación: no se ha cambiado nada. Repite con --yes para ejecutarlo."; exit 0; fi
scp dist/noelia-duque-web.zip "$TARGET:/tmp/noelia-duque-web.zip"
if [ "$FIRST" = 1 ]; then
  ssh "$TARGET" "mkdir -p /tmp/noelia-setup && cd /tmp/noelia-setup && unzip -q -o /tmp/noelia-duque-web.zip deploy/install.sh && bash deploy/install.sh '$DOMAIN' '$PW'"
else
  ssh "$TARGET" 'set -e; S=$(date +%Y%m%d-%H%M%S); mkdir -p /root/backups; tar czf /root/backups/app-$S.tar.gz /opt/noelia/app; find /opt/noelia/app -mindepth 1 -delete; unzip -q -o /tmp/noelia-duque-web.zip -d /opt/noelia/app; chown -R noelia:noelia /opt/noelia/app; systemctl restart noelia; sleep 2; systemctl is-active noelia'
fi
echo "Hecho."
