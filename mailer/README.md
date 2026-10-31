# Mailer — mini Mailchimp sobre Resend

Listas, contactos, formulario de suscripción, campañas con editor HTML y estadísticas. Sin dependencias: solo Node 22.13+ (SQLite integrado) y la API REST de Resend.

## Arrancar

```bash
cp .env.example .env     # rellena ADMIN_PASSWORD como mínimo
npm start                # http://localhost:3000  (usuario: admin)
npm test                 # 27 pruebas, sin red
```

Sin `RESEND_API_KEY` funciona en **modo simulación**: hace todo menos enviar (registra «[simulación] lote de N emails»). Úsalo para probar el flujo.

## Conectar Resend

1. **Dominio**: en Resend → Domains, añade y verifica tu dominio (SPF/DKIM). `FROM_EMAIL` debe ser de ese dominio.
2. **API key**: Resend → API Keys, permiso *Sending access* → `RESEND_API_KEY`.
3. **Webhook** (para entregas, aperturas, clics, rebotes y quejas): Resend → Webhooks → *Add*.
   - URL: `https://TU_DOMINIO/webhooks/resend`
   - Eventos: `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`
   - Copia el *Signing secret* (`whsec_…`) a `RESEND_WEBHOOK_SECRET`.
4. **Aperturas y clics**: actívalos en Resend → Domains → tu dominio (*Open tracking* / *Click tracking*). Sin esto no llegan esos eventos.
5. `BASE_URL` debe ser la URL **pública y HTTPS** de la app: va dentro de los enlaces de baja y confirmación.

## Qué hace

| | |
|---|---|
| **Contactos** | Importar CSV/pegar emails (`,` `;` o tabulador, con o sin cabecera), buscar, filtrar, exportar, borrar. |
| **Listas** | Varias listas; cada una con su formulario embebible (`/subscribe?list=1` o el HTML que muestra el panel). |
| **Alta pública** | Doble opt-in por defecto (`DOUBLE_OPT_IN`), honeypot anti-bots, límite por IP, y misma respuesta exista o no el contacto. |
| **Campañas** | HTML propio con `{{first_name\|amigo}}`, `{{last_name}}`, `{{email}}`, `{{unsubscribe_url}}`; asunto personalizable, preheader, vista previa en vivo, envío de prueba. |
| **Envío** | Lotes de 100 por la API *batch*, con `Idempotency-Key`, reintentos en 429/5xx y pausa entre lotes. Es **reanudable**: si Resend cae o reinicias la app, retoma sin duplicar. |
| **Bajas** | Pie automático con baja y dirección postal si la plantilla no trae `{{unsubscribe_url}}`; cabeceras `List-Unsubscribe` + One-Click (Gmail/Yahoo). |
| **Estadísticas** | Entregados, aperturas, clics, rebotes, bajas, quejas y fallidos por campaña. |
| **Higiene** | Rebote permanente o queja → el contacto deja de recibir. Una importación nunca reactiva a una baja, rebote o queja. |

## Seguridad

- Panel con HTTP Basic (comparación en tiempo constante) y protección CSRF por `Sec-Fetch-Site`/`Origin`. **Ponlo detrás de HTTPS**: Basic viaja en claro sobre HTTP.
- Todo lo que viene de contactos se escapa en el panel y en los emails (un nombre con `<script>` no se ejecuta).
- La baja necesita un POST (el GET solo muestra el botón), para que los escáneres de enlaces no den de baja a nadie.
- Webhook con verificación de firma Svix y tolerancia de 5 min; eventos idempotentes.
- La vista previa va en un iframe con `sandbox`.

## Despliegue

Necesita un proceso Node persistente y un **disco persistente** para `DB_PATH` (SQLite). Sirve un VPS, Fly.io con volumen o Railway con volumen. No sirve para serverless sin disco. Haz copia de seguridad de `data/mailer.db`.

## Límites conocidos (no está hecho)

- Sin programación de envíos, segmentos/etiquetas, automatizaciones, A/B ni editor visual (el contenido es HTML).
- Un solo usuario administrador.
- Las aperturas no son exactas (Apple Mail precarga imágenes); fíate más de los clics.
- Un lote que Resend rechaza por validación (4xx) se marca como *fallido* y **no** se reintenta solo.
- Borrar un contacto lo elimina de esta base de datos, pero Resend conserva sus propios registros de envío.
- Cumplimiento legal (RGPD/LSSI): tener consentimiento y una política de privacidad es responsabilidad tuya; la app da las herramientas (doble opt-in, baja, dirección en el pie).
