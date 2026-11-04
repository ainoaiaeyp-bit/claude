#!/bin/bash
# Prueba de seguridad del esquema de Supabase contra un PostgreSQL de PRUEBAS.
#
#   createdb lienzo_test
#   DATABASE_URL=postgresql://postgres@localhost/lienzo_test ./run.sh
#
# ⚠ Usa una base VACÍA y desechable. NO la ejecutes contra tu proyecto de Supabase:
#   supabase_shim.sql crea el esquema "auth" y los roles anon/authenticated/service_role
#   (que ya existen allí) y fallará a propósito para protegerte.
#
# Qué hace: imita lo mínimo de Supabase, aplica supabase/schema.sql DOS veces (comprueba que es
# idempotente) y ejecuta rls_test.sql, que verifica con roles reales (dueña, editora, lector,
# extraña y anónimo) las políticas RLS, los triggers, Storage, notificaciones y menciones.
set -euo pipefail
: "${DATABASE_URL:?Define DATABASE_URL (base de pruebas vacía)}"
cd "$(dirname "$0")"
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f supabase_shim.sql >/dev/null
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f ../../supabase/schema.sql 2>&1 | grep -v NOTICE | grep -v '^$' || true
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f ../../supabase/schema.sql 2>&1 | grep -v NOTICE | grep -v '^$' || true
OUT=$(psql "$DATABASE_URL" -q -f rls_test.sql 2>&1 | grep -v NOTICE | grep -v '^$')
echo "$OUT"
echo "$OUT" | grep -q '0 fallidas'
