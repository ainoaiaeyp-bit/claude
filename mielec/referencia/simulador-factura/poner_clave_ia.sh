#!/bin/bash
# Pide la clave de Anthropic sin mostrarla y la guarda en el VPS (/opt/simulador/config.ini).
# La clave no se imprime, no se guarda en este equipo y no pasa por el chat.
set -e
VPS=${VPS:-root@194.164.163.53}
printf 'Pega la clave de Anthropic (no se vera al pegarla) y pulsa Intro: '
read -rs KEY
echo
[ -n "$KEY" ] || { echo "Vacia: no se hace nada."; exit 1; }
case "$KEY" in sk-ant-*) ;; *) echo "No parece una clave de Anthropic (debe empezar por sk-ant-). No se hace nada."; exit 1;; esac

printf '%s\n' "$KEY" | ssh "$VPS" 'IFS= read -r K; umask 077; printf "[anthropic]\nclave = %s\nmodelo = claude-sonnet-5-5\n" "$K" > /opt/simulador/config.ini; chown simulador:simulador /opt/simulador/config.ini; chmod 600 /opt/simulador/config.ini; systemctl restart simulador; sleep 2; echo "Servicio: $(systemctl is-active simulador)"'
unset KEY

# Comprueba que la clave sirve: solo se imprime el codigo HTTP
ssh "$VPS" 'cd /opt/simulador && sudo -u simulador .venv/bin/python -' <<'PY'
import configparser, json, urllib.request, urllib.error
c = configparser.ConfigParser(); c.read('config.ini')
k = c.get('anthropic', 'clave'); m = c.get('anthropic', 'modelo')
req = urllib.request.Request('https://api.anthropic.com/v1/messages',
    data=json.dumps({'model': m, 'max_tokens': 5, 'messages': [{'role': 'user', 'content': 'Hola'}]}).encode(),
    headers={'x-api-key': k, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'})
try:
    print('Prueba de la clave: HTTP', urllib.request.urlopen(req, timeout=30).status, '(200 = vale)')
except urllib.error.HTTPError as e:
    print('Prueba de la clave: HTTP', e.code, '(401 = clave incorrecta)')
except Exception as e:
    print('Prueba de la clave: error', type(e).__name__)
PY
echo "Hecho. Ya puedes cerrar esta pestana."
