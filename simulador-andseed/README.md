# Simulador de financiación Andseed

Un único archivo, `index.html`, con CSS y JS inline. La única dependencia externa es la fuente DM Sans de Google Fonts.

## Pegarlo en Elementor

1. Abre `index.html` y copia todo lo que hay entre `INICIO BLOQUE ELEMENTOR` y `FIN BLOQUE ELEMENTOR`.
2. En la página, añade un widget **HTML** y pega el bloque.
3. Publica. El simulador toma el ancho del contenedor (máximo 760 px) y todo su CSS lleva el prefijo `#as-sim`, así que no choca con el tema.

Si lo incrustas en un iframe, la página contenedora puede enviar el contexto de campaña con `postMessage`:

```js
iframe.contentWindow.postMessage({
  type: 'andseed-sim-context',
  utm_source: '...', utm_medium: '...', utm_campaign: '...', utm_term: '...', utm_content: '...',
  gclid: '...', page_url: location.href
}, '*');
```

El simulador avisa con `{ type: 'andseed-sim-ready' }` cuando está listo y envía `{ type: 'andseed-sim-height', height }` cuando cambia de alto. Sin iframe no hace falta nada: lee la URL de la página.

## Variables a configurar

Están al principio del script `as-engine`, en el bloque CONFIGURACIÓN.

| Variable | Qué es |
|---|---|
| `WEBHOOK_URL` | URL del webhook de n8n. Con la cadena vacía el envío falla y se muestra el error con reintento, para que no se pierdan leads sin darte cuenta. |
| `PRIVACY_URL` | Política de privacidad (enlace de la casilla RGPD). Valor actual por verificar. |
| `AGENDA_URL` | Calendario de la llamada gratuita. Si queda vacía, el botón no aparece. Valor actual por verificar. |
| `DRY_RUN` | `true` para probar sin enviar: escribe el JSON en la consola y simula el éxito. Déjalo en `false` en producción. |

En n8n, activa en el nodo Webhook la opción **Allowed Origins (CORS)** con `https://andseed.com`, porque el navegador envía una petición previa OPTIONS al mandar JSON. Cada lead lleva un `lead_id` que se reutiliza en los reintentos, por si quieres deduplicar.

## Datos que recibe el webhook

`schema_version`, `lead_id`, `submitted_at`, `page_url`, `answers`, `result` (estado de ENISA y NEOTEC, importes y códigos de motivo), `score`, `qualified`, `contact` (incluye `consent`, `consent_at` y el texto aceptado) y `tracking` (`utm_*` y `gclid`).

## Eventos en dataLayer

`simulador_inicio`, `simulador_paso` (con `paso`), `simulador_resultado` y `simulador_lead`. Ninguno lleva datos personales.

## Actualizar las reglas

Todas las reglas están en el objeto `RULES`, con la fuente y la fecha en el comentario. Cambia el valor y la lógica no se toca:

- ENISA: `RULES.enisa` (mínimo, máximos, umbral de auditoría, ratios de fondos propios). Pendiente: **TODO verificar en enisa.es**, porque hay fuentes que indican que ENISA reorganizó sus líneas en 2026.
- NEOTEC: `RULES.neotec` (fechas de la convocatoria, antigüedad, meses de escritura, capital mínimo, ayuda máxima). Cuando se publique la convocatoria 2027, actualiza `convocatoria`, `windowStart`, `windowEnd` y revisa los requisitos.
- Tramos de las preguntas: `RULES.tramos`. Si cambias un mínimo o un máximo de ENISA, revisa que los cortes de importe sigan alineados.
- Puntuación: `RULES.score` y `RULES.qualifiedMinScore` (la fórmula está documentada encima).
- Sube `RULES.version` cada vez que cambies algo: viaja en cada lead.

Después de cualquier cambio, ejecuta las pruebas:

```
node rules.test.js
```

Las pruebas cargan el motor directamente de `index.html` y no necesitan instalar nada.

## Pendiente (TODO)

- Verificar en enisa.es líneas, importes y requisitos.
- Criterios para distinguir las líneas Emprendedores, Crecimiento y Jóvenes Emprendedores. Hoy se asume Emprendedores hasta 300.000 € y Crecimiento por encima; la regla del 50 % de Jóvenes solo aparece como nota.
- Confirmar si ENISA exige sociedad constituida. Mientras tanto, una empresa sin constituir queda como "por revisar".
- Comprobar las URLs de privacidad y agenda.
