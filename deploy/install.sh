#!/usr/bin/env bash
# Primera instalación en un servidor Linux (Ubuntu/Debian), como root. Es seguro repetirla.
# Uso: sudo bash deploy/install.sh tudominio.es 'contraseña-del-panel'
# Antes de tocar nada, hace una copia de seguridad de lo que haya en /var/www y de la configuración de nginx.
set -euo pipefail
DOMAIN="${1:?Indica el dominio, por ejemplo tudominio.es}"
PANEL_PW="${2:-}"
APP=/opt/noelia/app; DATA=/var/lib/noelia; STAMP=$(date +%Y%m%d-%H%M%S)
[ "$(id -u)" = 0 ] || { echo "Ejecútalo como root (sudo)."; exit 1; }

mkdir -p /root/backups
tar czf "/root/backups/antes-de-noelia-$STAMP.tar.gz" /var/www /etc/nginx 2>/dev/null || true
echo "Copia de seguridad guardada en /root/backups/antes-de-noelia-$STAMP.tar.gz"

if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
apt-get install -y nginx unzip certbot python3-certbot-nginx

id noelia >/dev/null 2>&1 || useradd --system --home /opt/noelia --shell /usr/sbin/nologin noelia
mkdir -p "$APP" "$DATA"; chown -R noelia:noelia /opt/noelia "$DATA"

if [ ! -f /etc/noelia.env ]; then
  [ -n "$PANEL_PW" ] || { echo "Falta la contraseña del panel (segundo argumento)."; exit 1; }
  cat > /etc/noelia.env <<ENV
PORT=3000
DATA_DIR=$DATA
SITE_URL=https://$DOMAIN
TRUST_PROXY=1
ADMIN_PASSWORD=$PANEL_PW
ENV
  chmod 600 /etc/noelia.env
fi

# Si ya subiste el paquete a /tmp/noelia-duque-web.zip, se despliega ahora.
if [ -f /tmp/noelia-duque-web.zip ]; then
  find "$APP" -mindepth 1 -delete
  unzip -q -o /tmp/noelia-duque-web.zip -d "$APP"; chown -R noelia:noelia "$APP"
fi

install -m 644 "$APP/deploy/noelia.service" /etc/systemd/system/noelia.service
sed "s/DOMINIO/$DOMAIN/g" "$APP/deploy/nginx.conf" > /etc/nginx/sites-available/noelia
ln -sf /etc/nginx/sites-available/noelia /etc/nginx/sites-enabled/noelia
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
systemctl daemon-reload && systemctl enable --now noelia && systemctl restart noelia
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m noeliaduquebrowandmakeup@gmail.com --redirect || echo "AVISO: no se pudo activar HTTPS (comprueba que el dominio apunta a este servidor) y vuelve a lanzar este script."
echo "Listo: https://$DOMAIN  ·  panel: https://$DOMAIN/admin"
