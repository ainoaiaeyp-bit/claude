#!/bin/bash
# Despliega Mielec en el VPS. NO se ejecuta solo: lo lanza Ainoa (o con su visto bueno).
# Uso: ./desplegar.sh            (primera vez y actualizaciones)
# Antes de la primera vez, en Plesk: subdominio de Mielec con proxy a 127.0.0.1:$PUERTO y Let's Encrypt (HTTPS es
# obligatorio: sin él no se puede instalar en el iPhone ni funcionan las notificaciones ni el service worker).
set -euo pipefail
VPS=${VPS:-root@194.164.163.53}
DEST=/opt/mielec
PUERTO=${PUERTO:-8160}

cd "$(dirname "$0")"
node prueba.mjs
ssh "$VPS" "ss -ltn | grep -q ':$PUERTO ' && [ ! -d $DEST ] && { echo 'El puerto $PUERTO ya está en uso por otra app: cambia PUERTO'; exit 1; } || true"
ssh "$VPS" "id mielec >/dev/null 2>&1 || useradd -r -s /usr/sbin/nologin -d $DEST mielec; mkdir -p $DEST"
rsync -az --delete --exclude '__pycache__' --exclude 'prueba.mjs' --exclude 'desplegar.sh' --exclude 'referencia' --exclude 'TAREA-claude-code.md' ./ "$VPS:$DEST/"
ssh "$VPS" bash -s <<REMOTO
set -e
chown -R mielec:mielec $DEST
cat > /etc/systemd/system/mielec.service <<UNIT
[Unit]
Description=Mielec (precio de la luz y simulador de factura)
After=network.target
[Service]
User=mielec
WorkingDirectory=$DEST
Environment=HOST=127.0.0.1
Environment=PORT=$PUERTO
ExecStart=/usr/bin/python3 $DEST/server.py
Restart=on-failure
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now mielec
systemctl restart mielec
sleep 2
systemctl is-active mielec
# comprobación clave: REE responde de verdad (si sale "demo": true, el VPS no llega a apidatos.ree.es)
curl -s http://127.0.0.1:$PUERTO/api/ree/hoy | head -c 60; echo
curl -s http://127.0.0.1:$PUERTO/api/ree/hoy | grep -q '"demo": false' && echo 'REE OK (datos reales)' || echo 'AVISO: la app está sirviendo datos de EJEMPLO'
REMOTO
echo "Listo. Falta (solo la primera vez): subdominio en Plesk con proxy a 127.0.0.1:$PUERTO + Let's Encrypt."
