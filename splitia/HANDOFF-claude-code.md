# Encargo para Claude Code: poner SplitIA en producción

Contexto: `splitia/` es una PWA (React + Vite + Supabase) tipo Splitwise con IA (Claude) para leer tickets y extractos.
Todo el código, tests y el README (guía paso a paso) ya están escritos. Falta ejecutarlo contra servicios reales.

## Reglas
- La app vieja «Gastos hogar» (Lovable, Supabase `yctgxfcyyzexgaxnyqeg`) es **solo lectura**: no borres ni modifiques nada allí.
- Nunca pidas ni escribas secretos en el chat ni en git (service role key, ANTHROPIC_API_KEY, contraseñas, CRON_SECRET). Pídelos con el mecanismo seguro de credenciales o que el usuario los exporte como variables de entorno.
- `migration/` y `.env*` no se commitean.

## Tareas (en orden; sigue el README)
1. `cd splitia && npm install && npm test && npm run build` → todo debe pasar.
2. Supabase propio (el usuario crea el proyecto): `supabase link`, `supabase db push` (22 migraciones + `20261108000000_splitia.sql`). Verifica que no falle `realtime.messages` ni los `ALTER PUBLICATION`; si falla algo, corrige la migración, no el esquema a mano.
3. Secretos y funciones: `ANTHROPIC_API_KEY`, `CRON_SECRET`; desplegar `extract-expenses` y `process-recurring-expenses` (esta con `--no-verify-jwt`).
4. Migración de datos: `node scripts/migrate-from-lovable.mjs --dry-run`, rellenar `migration/users.json` con el usuario, luego sin `--dry-run`. Debe terminar con todos los recuentos ✔ y la suma de importes igual. Esperado en origen: 1 grupo, 2 miembros, 327 gastos.
5. Probar la IA de verdad con 2 fotos de ticket y 1 captura de extracto (flujo: Grupo → Tickets/Extracto → revisar → guardar). Comprobar que los gastos aparecen y los saldos cuadran.
6. VPS: `docker compose up -d --build` con `.env` (URL, anon key, DOMAIN). Verificar HTTPS, que Chrome ofrece instalar la PWA y que en iPhone/Safari funciona «Añadir a pantalla de inicio». Configurar en Supabase Auth: Site URL y Redirect URLs = el dominio.
7. Cron diario de recurrentes (ver README §5).
8. Informar de cada paso como pasado / bloqueado (por qué) / no probado.

## Sin verificar todavía (no se pudo desde el entorno que lo escribió)
Script de migración contra el Supabase real, imagen Docker (nunca se construyó), función de IA desplegada, migraciones sobre un Postgres real.
