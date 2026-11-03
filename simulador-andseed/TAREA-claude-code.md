# Tarea: conectar los leads del simulador al prospector y a Resend

Objetivo: cada lead que recoja el simulador de Andseed (ENISA y NEOTEC) debe (1) entrar en el prospector/CRM y (2) generar dos emails por Resend: un aviso interno al correo que indique el usuario y el informe completo al propio lead. Sin n8n, salvo que el usuario prefiera usarlo.

## Estado actual (ya hecho)

Rama `claude/happy-davinci-143zc8` del repositorio `ainoaiaeyp-bit/claude`. Carpeta `simulador-andseed/`:

- `index.html`: simulador completo (CSS y JS inline). El script `#as-engine` contiene la configuración (`WEBHOOK_URL`, `PRIVACY_URL`, `AGENDA_URL`, `DRY_RUN`), el objeto `RULES` y la lógica. El script `#as-ui` es la interfaz.
- `elementor-bloque.html`: copia de lo que hay entre los comentarios `INICIO BLOQUE ELEMENTOR` y `FIN BLOQUE ELEMENTOR` de `index.html`, lista para pegar en un widget HTML de Elementor. Se regenera con:
  `sed -n '/INICIO BLOQUE ELEMENTOR/,/FIN BLOQUE ELEMENTOR/p' index.html | sed '1d;$d' > elementor-bloque.html`
  Regenérala siempre que cambies `index.html`.
- `rules.test.js`: 8 casos (`node rules.test.js`, todos pasan). Carga el motor desde `index.html`.
- `n8n/workflow-leads.json`: alternativa con n8n. El nodo Code "Preparar emails" contiene la lógica de los dos emails (HTML escapado, asunto con `[CUALIFICADO]`); úsalo como referencia para las plantillas.
- `README.md`: instrucciones de uso.

Comportamiento: al terminar las 6 preguntas se ve solo el estado de ENISA y NEOTEC. El informe completo (importes, motivos, siguientes pasos) se desbloquea en pantalla cuando el visitante deja sus datos. El simulador hace un único POST JSON a `WEBHOOK_URL` (15 s de tiempo máximo, mensaje de error y reintento reutilizando el mismo `lead_id`).

## Payload que recibe el endpoint (JSON)

`schema_version`, `lead_id` (UUID, reutilizado en reintentos), `submitted_at`, `page_url`,
`answers` {anio_constitucion, constituida, capital_tramo, fondos_propios, tecnologia, importe_tramo, ampliacion},
`result` {rules_version, enisa {status, max_amount, line, reasons (códigos), reason_texts}, neotec {status, convocatoria, closed, max_aid, reasons, reason_texts}, next_steps},
`score` (0-100), `qualified` (bool),
`contact` {name, email, phone, company, consent (true), consent_at, consent_text},
`tracking` {utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid}.
Estados posibles: encaja, a_confirmar, no_encaja, no_evaluable.

## Qué hacer

1. Localiza en el ordenador del usuario el prospector (la aplicación con CRM). Si no está claro cuál es, su lenguaje o dónde guarda los datos, pregunta antes de escribir código. La carpeta `mailer/` de la rama `claude/great-pasteur-z4czu0` ya usa Resend y puede dar el patrón.
2. Implementa en el prospector un endpoint `POST /api/leads` (ajusta la ruta a la convención del proyecto) que:
   - Permita CORS desde `https://andseed.com` (y responda a OPTIONS), con la lista de orígenes configurable por variable de entorno.
   - Valide el payload: email y teléfono válidos, `contact.consent === true`, campos obligatorios, tamaños máximos. Rechace con 400 si falla.
   - Limite peticiones por IP.
   - Sea idempotente por `lead_id`: un reintento no duplica el lead ni los emails.
   - Guarde el lead en el CRM en una sección nueva "Simulador" con todos los campos, incluidos `qualified`, `score`, el estado ENISA/NEOTEC y el tracking.
   - Envíe por Resend (a) un aviso interno al correo configurable por variable de entorno, con `[CUALIFICADO]` en el asunto si `qualified` es true, y (b) el informe completo al email del lead, con el botón "Agenda una llamada gratuita" (`AGENDA_URL` configurable). Escapa siempre en HTML los datos del visitante. Si falla Resend, el lead ya guardado no se pierde: el endpoint responde con éxito y deja el fallo registrado para reintentar.
   - Responda 200 al simulador en cuanto el lead esté guardado.
3. Añade pruebas del endpoint y de las plantillas (validación, idempotencia, escape de HTML, fallo de Resend).
4. Con el navegador del usuario (tiene la sesión iniciada): crea la clave de API de Resend con permiso solo de envío, añade y verifica el dominio emisor con SPF y DKIM, y guarda la clave como variable de entorno del servidor. Nunca la escribas en el código, en el front ni en un commit.
5. En `simulador-andseed/index.html` pon en `WEBHOOK_URL` la URL del endpoint, regenera `elementor-bloque.html`, ejecuta `node simulador-andseed/rules.test.js` y prueba un envío real con un lead de prueba (usa `DRY_RUN = true` primero). Actualiza `simulador-andseed/README.md`.

## Pendientes conocidos (no inventar valores)

- `PRIVACY_URL` y `AGENDA_URL` en `index.html` llevan URLs supuestas con TODO: confirmar las reales con el usuario.
- Las reglas de ENISA llevan TODO: verificar en enisa.es. No cambies reglas sin confirmación.
- Pregunta al usuario a qué correo debe llegar el aviso interno de cada lead.

## Criterio de hecho

Un lead de prueba enviado desde el simulador aparece en la sección Simulador del CRM, llega el aviso interno al correo indicado y llega el informe al correo del lead, sin duplicados al reintentar; las pruebas pasan y no hay secretos en el repositorio.
