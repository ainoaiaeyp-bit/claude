# SplitIA

Gastos compartidos al estilo Splitwise, con IA que lee tickets y extractos, interfaz de app de iPhone y **PWA instalable** (funciona sin conexión). Tus datos viven en **tu propio** backend: sin depender de Lovable.

## Qué incluye

- **Splitwise completo**: grupos con código de invitación, gastos (crear / editar / eliminar), reparto **igual entre quienes elijas, por importes, por % o por partes**, devoluciones, pagos y liquidación con los pagos mínimos, comentarios y adjuntos por gasto, búsqueda y filtros, resumen con gráficos, gastos recurrentes, exportar a CSV, foto de perfil.
- **IA (Claude)**: sube **una o varias fotos de tickets** o **capturas de extractos bancarios** → revisas → se guardan en bloque. Detecta duplicados, separa ingresos y transferencias y avisa de lecturas dudosas.
- **PWA**: instalable, service worker, datos en caché para leer sin conexión, actualización automática.
- Los saldos se calculan con la misma lógica que «Gastos hogar» (tests incluidos).

## Puesta en marcha (≈ 20 min)

### 1. Backend: tu proyecto de Supabase
1. Crea un proyecto gratis en <https://supabase.com> (región UE).
2. Instala la CLI y enlaza: `npx supabase login` y `npx supabase link --project-ref TU_REF`.
3. Crea el esquema (22 migraciones copiadas de «Gastos hogar» + mejoras de SplitIA):
   ```bash
   npx supabase db push
   ```
4. Auth → URL Configuration: **Site URL** = `https://TU_DOMINIO` y añade esa URL a *Redirect URLs*. (Auth → SMTP: configura un SMTP propio si vas a invitar a más gente; el de Supabase tiene límite bajo.)

### 2. IA (clave de Anthropic)
```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# opcional: modelo (por defecto claude-sonnet-5-5)
npx supabase secrets set ANTHROPIC_MODEL=claude-opus-5-5
npx supabase functions deploy extract-expenses
```
La función exige sesión iniciada. Coste orientativo: céntimos por foto con el modelo por defecto.

### 3. Copiar los datos de «Gastos hogar»
**Solo lee** de la app vieja; no modifica ni borra nada allí. Se puede repetir sin duplicar datos.

```bash
export OLD_EMAIL=tu@correo OLD_PASSWORD='tu contraseña de Gastos hogar'
export NEW_URL=https://TU_REF.supabase.co
export NEW_SERVICE_ROLE_KEY=...   # Supabase → Settings → API (¡secreta, no la subas a ningún sitio!)

node scripts/migrate-from-lovable.mjs --dry-run   # 1ª vez: crea migration/users.json
# rellena el correo de cada persona en migration/users.json y repite:
node scripts/migrate-from-lovable.mjs --dry-run   # comprueba, no escribe
node scripts/migrate-from-lovable.mjs             # copia de verdad
```
Qué hace: crea los usuarios en el backend nuevo, copia **todas** las tablas (grupos, gastos, repartos, pagos, categorías, recurrentes, tareas, compra, chat…) conservando ids y fechas, copia los **adjuntos**, y al final **compara recuentos y la suma de importes** (antigua → nueva). Termina con error si algo no cuadra.

> Las contraseñas no se pueden copiar. Cada persona entra con **«He olvidado mi contraseña»** y elige la suya.
> Tareas, lista de la compra, chat, calendario, etc. de la app vieja **se copian a la base de datos**, pero SplitIA todavía no tiene pantallas para ellos.

### 4. Desplegar en el VPS (HTTPS automático con Caddy)
En el VPS (Docker + Docker Compose; el dominio debe apuntar a su IP):
```bash
git clone <tu repo> && cd splitia      # o copia la carpeta
cp .env.example .env                   # rellena URL, anon key y DOMAIN
docker compose up -d --build
```
Una PWA solo se instala bajo **HTTPS**; Caddy obtiene el certificado solo.
Actualizar: `git pull && docker compose up -d --build`.

### 5. Gastos recurrentes (opcional)
Despliega la función y prográmala una vez al día:
```bash
npx supabase secrets set CRON_SECRET=una-cadena-larga-aleatoria
npx supabase functions deploy process-recurring-expenses --no-verify-jwt
# crontab del VPS (cada día a las 06:05):
5 6 * * * curl -s -X POST -H "x-cron-secret: TU_CRON_SECRET" https://TU_REF.supabase.co/functions/v1/process-recurring-expenses
```

### 6. Instalar en el iPhone
Abre la URL en **Safari** → Compartir → **Añadir a pantalla de inicio**. En Android/escritorio aparece el botón *Instalar* en Cuenta.

## Desarrollo
```bash
npm install
cp .env.example .env.local   # tu Supabase
npm run dev                  # http://localhost:5173
npm test                     # saldos, repartos y migración
npm run build
```

## Estructura
`src/lib` (saldos, repartos, IA, datos) · `src/components` (kit iOS, gráficos, detalle) · `src/pages` · `supabase/migrations` · `supabase/functions` · `scripts/migrate-from-lovable.mjs`

## Límites conocidos
- Un solo pagador por gasto (multipagador no está soportado por el esquema heredado).
- Moneda única (EUR).
- Gastos entre amigos fuera de grupo: de momento solo dentro de grupos.
- Sin cola de escritura sin conexión: offline solo se **lee**.
