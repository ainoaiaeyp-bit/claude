#!/bin/bash
# Despliega IA Simulador de factura en el VPS. NO se ejecuta solo: lo lanza Ainoa (o con su visto bueno).
# Uso: ./desplegar.sh            (primera vez y actualizaciones)
# Antes de la primera vez, en Plesk: subdominio simulador.ingenieriaaplicada.org con proxy a 127.0.0.1:8150 y Let's Encrypt,
# y en IA Unity dar de alta el módulo (url https://simulador.ingenieriaaplicada.org, sso=1) para saber su id (SIM_MODULO_ID).
set -euo pipefail
VPS=${VPS:-root@194.164.163.53}
DEST=/opt/simulador
PUERTO=${PUERTO:-8150}
MODULO_ID=${SIM_MODULO_ID:-}

cd "$(dirname "$0")"
node prueba.mjs
ssh "$VPS" "ss -ltn | grep -q ':$PUERTO ' && [ ! -d $DEST ] && { echo 'El puerto $PUERTO ya está en uso por otra app: cambia PUERTO'; exit 1; } || true"
ssh "$VPS" "id simulador >/dev/null 2>&1 || useradd -r -s /usr/sbin/nologin -d $DEST simulador; mkdir -p $DEST"
rsync -az --delete --exclude '.venv' --exclude 'navegador' --exclude 'datos' --exclude 'config.ini' --exclude '__pycache__' --exclude 'prueba.mjs' --exclude 'poner_clave_ia.sh' --exclude 'informe-ver.html' --exclude 'ejemplo.json' --exclude 'desplegar.sh' ./ "$VPS:$DEST/"
ssh "$VPS" bash -s <<REMOTO
set -e
cd $DEST
[ -d .venv ] || python3 -m venv .venv
.venv/bin/pip install -q -r requirements.txt
mkdir -p datos
[ -f config.ini ] || cp config.ini.ejemplo config.ini
chown -R simulador:simulador $DEST
chmod 600 config.ini
cat > /etc/systemd/system/simulador.service <<UNIT
[Unit]
Description=IA Simulador de factura
After=network.target
[Service]
User=simulador
WorkingDirectory=$DEST
Environment=SIM_MODULO_ID=$MODULO_ID
ExecStart=$DEST/.venv/bin/uvicorn app:app --host 127.0.0.1 --port $PUERTO --proxy-headers --forwarded-allow-ips=127.0.0.1
Restart=on-failure
NoNewPrivileges=true
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now simulador
systemctl restart simulador
sleep 2
systemctl is-active simulador
REMOTO
echo "Listo. Falta (solo la primera vez): clave de Anthropic en $DEST/config.ini [anthropic] clave= para la lectura con IA, y copia diaria de $DEST/datos."
