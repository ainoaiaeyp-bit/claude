# Desplegar Vida en un VPS

La app es estática (HTML + CSS + JS): solo hace falta nginx y HTTPS. Los archivos a publicar son
`index.html`, `styles.css`, `app.js`, `sw.js`, `manifest.webmanifest` y la carpeta `icons/`.
(`vida.html` y `tools/` son solo para previsualizar; no hace falta subirlos.)

## Prompt para pegar en Claude Code

> Estoy en el repo `ainoaiaeyp-bit/claude`, rama `claude/epic-brahmagupta-icia3e`, carpeta `vida-app/`.
> Es una PWA estática (sin build). Despliégala en mi VPS así:
> 1. Lee `vida-app/DEPLOY.md`, `vida-app/deploy/nginx-vida.conf` y `vida-app/deploy/deploy.sh`.
> 2. Instala nginx y certbot si faltan (Debian/Ubuntu) y crea `/var/www/vida`.
> 3. Copia `deploy/nginx-vida.conf` a `/etc/nginx/sites-available/vida`, cambia `vida.TUDOMINIO.com` por
>    **MI_DOMINIO**, actívalo con un enlace en `sites-enabled`, y comprueba con `nginx -t` antes de recargar.
> 4. Sube los archivos a `/var/www/vida` (rsync o `deploy.sh`).
> 5. Saca el certificado con `certbot --nginx -d MI_DOMINIO` y confirma que renueva solo.
> 6. Verifica con `curl -I https://MI_DOMINIO` que responde 200 y que `/sw.js` y `/manifest.webmanifest`
>    se sirven bien. No toques otros sitios que ya haya en nginx.
> Antes de ejecutar nada que modifique el servidor, dime qué vas a hacer.

Sustituye `MI_DOMINIO` por el dominio o subdominio que vayas a usar (por ejemplo `vida.tuempresa.com`).
Antes, apunta un registro DNS **A** de ese dominio a la IP del VPS.

## O a mano
```bash
cd vida-app
VPS_HOST=IP_DEL_VPS VPS_USER=usuario ./deploy/deploy.sh
```
Después, en el VPS: configurar nginx con `deploy/nginx-vida.conf` y `sudo certbot --nginx -d MI_DOMINIO`.

## Instalar en el iPhone
Abrir `https://MI_DOMINIO` en Safari → Compartir → **Añadir a pantalla de inicio**.

## Actualizar más adelante
Vuelve a ejecutar `deploy.sh`. Si cambias `app.js` o `styles.css`, sube el número de `CACHE` en `sw.js`
(`vida-v4` → `vida-v5`) para que los móviles recojan la versión nueva.

## Notas
- Los datos viven en el navegador de cada dispositivo (no hay base de datos en el servidor).
- La API key de la IA se pega en Ajustes y se guarda en el dispositivo. Si quieres que no salga del
  servidor, el siguiente paso es un pequeño proxy en el VPS que añada la clave; pídeselo a Claude Code.
- Opcional: proteger el sitio con contraseña (`auth_basic` en nginx) si no quieres que sea público.
