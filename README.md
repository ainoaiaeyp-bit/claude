# Noelia Duque Make up Artist — web + sistema de citas

Web profesional con reserva online y panel de administración. **Sin dependencias**: solo Node ≥ 22.13 (SQLite integrado).

```bash
npm start            # http://localhost:3000   · panel: /admin
npm test             # tests de la API
```

La primera vez que arranca imprime la contraseña del panel (o usa `ADMIN_PASSWORD=...`). Cámbiala en *Ajustes*.

## Qué incluye
- **Web pública**: portada, servicios (dinámicos), sobre mí, portfolio (aparece al subir fotos), proceso, FAQ, contacto, SEO (JSON-LD, sitemap, robots), responsive.
- **Reserva online**: servicio → calendario con huecos reales → datos → confirmación. Evita dobles reservas (transacción), respeta horarios, descansos, antelación mínima y días bloqueados. Anti-spam (honeypot + límite por IP).
- **Cliente**: enlace privado para ver/cancelar su cita y archivo `.ics` para su calendario.
- **Panel `/admin`**: agenda con estadísticas, confirmar/cancelar/realizada/no asistió, citas manuales, WhatsApp/email con un clic, CRUD de servicios, horarios por tramos, días bloqueados, subida de fotos, ajustes y cambio de contraseña.

## Configuración (variables de entorno)
| Variable | Uso |
|---|---|
| `PORT` | Puerto (3000) |
| `ADMIN_PASSWORD` | Contraseña inicial del panel |
| `DATA_DIR` | Carpeta de la base de datos SQLite (`./data`) — **haz copia de seguridad** |
| `NODE_ENV=production` | Cookies `Secure` (usar tras HTTPS) |
| `TRUST_PROXY=1` | Leer la IP real tras un proxy |
| `SITE_URL` | URL pública para sitemap |
| `WEBHOOK_URL` | Recibe cada alta/confirmación/cancelación en JSON (Make/Zapier/n8n → emails/WhatsApp) |

## Antes de publicar
1. Rellenar contacto, WhatsApp, Instagram y dirección en *Ajustes*; revisar servicios y precios (los actuales son de ejemplo).
2. Subir fotos en *Portfolio*.
3. Completar `public/privacidad.html` con los datos fiscales reales.

## Panel de gestión (CRM, contabilidad, rentabilidad)

Acceso: `/admin.html`. Contraseña inicial en `ADMIN_PASSWORD` (se guarda con scrypt).

- **Clientas**: fichas con notas, cumpleaños, alergias, fichas técnicas de micropigmentación, historial, tareas, segmentos y seguimiento.
- **Agenda**: calendario semanal, mover/confirmar/cancelar citas, bloqueos.
- **Automatizaciones por email**: confirmación, recordatorio, reseña, retoque, cumpleaños, reactivación. Los envíos de marketing exigen consentimiento y llevan enlace de baja.
- **Contabilidad**: subida de varias facturas (borrador, revisión, confirmación), IVA/IRPF, paquete trimestral en ZIP y envío a la asesoría. Son estimaciones, no presentaciones oficiales. El panel no emite facturas.
- **Rentabilidad (CFO)**: costes fijos, umbral de rentabilidad, margen y €/hora por servicio.

Variables de entorno: `PORT`, `DATA_DIR`, `ADMIN_PASSWORD`, `SITE_URL`, `TRUST_PROXY`, `WEBHOOK_URL`,
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE`,
y opcionalmente `ANTHROPIC_API_KEY` + `npm install @anthropic-ai/sdk` (lectura automática de facturas; `INVOICE_MODEL`).

Scripts: `npm start`, `npm test`, `npm run demo` (datos ficticios, contraseña `demo-1234`), `npm run preview:panel`.
Copia de seguridad y restauración desde Ajustes. Requiere Node ≥ 22.13 (no funciona en hosting compartido PHP).
