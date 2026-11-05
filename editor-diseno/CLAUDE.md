# Lienzo — guía para Claude Code

Editor de diseño tipo Canva, 100 % estático y autoalojado (sin CDNs). JS vanilla + Fabric.js 5.3, jsPDF, pdf.js, todo en `vendor/`.

## Archivos clave
- `app.js` núcleo (editor, exportar, nube, IA). `import.js` importar PDF/SVG/texto. `agent.js` agente de IA (órdenes → operaciones JSON) y OCR. Se cargan en ese orden y comparten ámbito global (`let/const` no cuelgan de `window`).
- `config.js` claves públicas de Supabase y `LIENZO_AI_PROXY`. `sw.js` service worker: **sube `CACHE` (lienzo-vN) cada vez que cambies archivos del CORE**.
- `server/ai-proxy.js` proxy de IA (la clave de Anthropic vive solo aquí). `supabase/schema.sql` esquema idempotente con RLS.
- `Dockerfile`, `Caddyfile` (CSP estricta), `docker-compose.yml` (perfil `ai`), `deploy/` scripts.

## Reglas
- Nunca añadir CDNs ni scripts inline (la CSP los bloquea). Cualquier archivo JS nuevo: añadirlo a `index.html`, `Dockerfile`, `sw.js` y `Caddyfile`/nginx.
- Nunca commitear `.env` ni claves. La clave de Anthropic solo en `.env` del servidor.
- Tests: `npm i && npx playwright install chromium && npm test` (humo) y `npm run test:sql` (PostgreSQL local).

## Desplegar en el VPS
Sigue `DEPLOY.md` o ejecuta `bash deploy/install.sh` (admite `--dry-run`). Actualizar: `bash deploy/update.sh`. Copia de seguridad: `bash deploy/backup.sh`.
Pide al usuario: dominio con registro A hacia la IP, claves de Supabase y (opcional) clave de Anthropic. No pegues secretos en el chat si puedes escribirlos tú en `.env` por terminal.
