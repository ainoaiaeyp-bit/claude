# Despliegue de Lienzo en tu VPS

Lienzo es un sitio **estático** (HTML + JS + fuentes locales). Ya no depende de ningún CDN ni de Google Fonts: todo se sirve desde tu propio dominio. Hay tres opciones; la más rápida es Docker.

Qué necesitas: un VPS con Linux, un dominio (o subdominio) apuntando a su IP con un registro `A`, y los puertos 80 y 443 abiertos.

## Opción A · Docker + Caddy (HTTPS automático) — recomendada

```bash
git clone <tu-repositorio> && cd <tu-repositorio>/editor-diseno
cp .env.example .env
nano .env            # pon DOMAIN=lienzo.midominio.com
nano config.js       # (opcional) claves de Supabase, ver más abajo
docker compose up -d --build
```

Caddy pide y renueva solo el certificado de Let's Encrypt. Abre `https://lienzo.midominio.com`.

Para actualizar tras cambiar archivos: `docker compose up -d --build`.
`config.js` está montado como volumen: puedes editarlo sin reconstruir (recarga la página con Ctrl+F5).

## Opción B · nginx sin Docker

1. Copia al VPS **solo** estos archivos a `/var/www/lienzo`: `index.html`, `app.js`, `config.js`, `sw.js`, `manifest.webmanifest`, `fonts.css`, y las carpetas `vendor/`, `fonts/` e `icons/`.
2. Usa `deploy/nginx.conf.example` como sitio de nginx (cambia `server_name`).
3. `sudo certbot --nginx -d lienzo.midominio.com` para el HTTPS.

## Opción C · cualquier hosting estático
Sube los mismos archivos a Netlify, Cloudflare Pages, GitHub Pages, etc. Vale, pero el proxy de IA (abajo) necesitaría un servidor aparte.

---

## Nube con cuentas (Supabase)
Sigue `README.md`: crea el proyecto, ejecuta `supabase/schema.sql`, y pon la URL y la clave `anon` en `config.js`.
Después, en Supabase → **Authentication → URL Configuration**, pon como *Site URL* tu dominio `https://lienzo.midominio.com` (para los enlaces de confirmación del correo) y añádelo también en *Redirect URLs*.

## IA segura desde tu servidor (opcional pero recomendado)
Sin proxy, cada usuario pega su propia clave de Anthropic en el navegador. Con el proxy, **tu clave se queda en el servidor**, solo pueden usarla usuarios con sesión y cada uno tiene un límite por hora.

Con Docker:
```bash
nano .env      # ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, AI_RATE_PER_HOUR
nano config.js # window.LIENZO_AI_PROXY = '/api/ai';
docker compose --profile ai up -d --build
curl https://lienzo.midominio.com/api/health     # -> {"ok":true}
```
Sin Docker: copia `server/ai-proxy.js` a `/opt/lienzo/`, crea `/etc/lienzo-ai.env` y activa `deploy/lienzo-ai.service` (instrucciones dentro del archivo). El ejemplo de nginx ya reenvía `/api/` a `127.0.0.1:8787`.

Controles del proxy: verifica el token de sesión con Supabase, límite por usuario (`AI_RATE_PER_HOUR`), tope de tokens (`AI_MAX_TOKENS`), lista de modelos permitidos (`AI_MODELS`) y entradas limitadas a 20 000 caracteres. **Pon un límite de gasto en tu cuenta de Anthropic** igualmente.

## Seguridad (CSP)
El editor se sirve con una *Content-Security-Policy* estricta (ya incluida en `Caddyfile` y en `deploy/nginx.conf.example`): solo se ejecuta JavaScript de tu propio dominio y solo se permiten conexiones a tu dominio, `*.supabase.co`, y `api.anthropic.com`; las imágenes de los diseños en la nube se cargan desde `*.supabase.co` (Storage). Esto frena la mayoría de ataques XSS.
- Si usas **Supabase autoalojado** u otro dominio, añádelo a `connect-src` (https y wss) y a `img-src`.
- Si no usas la IA con clave propia en el navegador (solo el proxy), puedes quitar `https://api.anthropic.com`.

## Instalable (PWA) y modo sin conexión
Con HTTPS el navegador ofrece «Instalar» (aparece un botón en la cabecera) y el editor funciona sin conexión gracias a `sw.js`.
Cuando cambies archivos estáticos, sube el número de `CACHE` en `sw.js` (por ejemplo `lienzo-v2`) para que los usuarios reciban la versión nueva.

## Copias de seguridad
- **Base de datos** (diseños, versiones, comentarios, plantillas): activa las copias automáticas de Supabase (planes de pago) o haz tu propia con `pg_dump` desde el VPS, usando la cadena de conexión de *Project Settings → Database*:
  ```bash
  pg_dump "postgresql://postgres:TU_CLAVE@db.TU_PROYECTO.supabase.co:5432/postgres" --schema=public -Fc -f lienzo-$(date +%F).dump
  ```
  Prográmalo con `cron` (por ejemplo cada noche) y copia el archivo fuera del servidor.
- **Imágenes** (Storage): el bucket `design-images` es compatible con S3. Puedes copiarlo con `rclone` apuntando al endpoint S3 de Supabase (*Project Settings → Storage → S3 connection*).
- **Este servidor**: no guarda datos de usuarios. Solo conserva `config.js` y `.env`; guárdalos en tu gestor de contraseñas o repositorio privado.

## Pruebas automáticas en CI (opcional)
Hay un ejemplo de flujo de GitHub Actions en `deploy/github-actions-test.yml.example`. Cópialo a `.github/workflows/test.yml` en tu repositorio para ejecutar la prueba de humo en cada cambio.

## Lista de comprobación
- [ ] `https://tu-dominio` carga y las fuentes se ven bien (pestaña Red del navegador: sin peticiones a dominios externos, salvo Supabase/Anthropic).
- [ ] Botón **Nube**: puedes registrarte, guardar y abrir un diseño.
- [ ] Un diseño compartido abre en una ventana de incógnito.
- [ ] Si usas el proxy: `/api/health` responde y la IA funciona con sesión iniciada.
- [ ] `.env` **no** está en git ni se sirve públicamente (la imagen de Docker solo copia los archivos estáticos).
- [ ] Copias de seguridad: los datos viven en Supabase (activa sus backups); el VPS no guarda datos de usuarios.
