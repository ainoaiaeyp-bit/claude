# Mielec

App web para móvil (instalable en la pantalla de inicio, estilo iPhone) con el precio de la luz de REE, el precio del usuario, avisos, un simulador de factura y descarga directa del informe en PDF.

## Qué tiene
- **Hoy**: precio de ahora y por horas (hoy y mañana) de REE, con marcador de lo barato/caro que está, mejores y peores horas, y comparación con el precio del usuario. Se puede elegir PVPC (luz regulada) o mercado mayorista.
- **Simular**: modo **Simple** (consumo, potencia y precios de hoy y de la oferta) o **Completo** (2.0TD/3.0TD/6.1TD, periodos, servicios, descuentos, permanencia, 12 a 48 meses). Sin pantalla de resultado: la barra inferior muestra el ahorro en vivo y el botón **Descargar informe** genera el PDF (2 hojas A4) en el propio móvil.
- **Factura**: la factura interactiva, de hoy o de la oferta. Cada concepto se toca y abre una hoja con qué es, cómo sale la cifra con los números reales, la comparación con la otra opción y un consejo.
- **Alertas**: el usuario pone su precio y los días seguidos (2 a 10). Si la media diaria de REE lleva esos días por debajo, avisa con el ahorro estimado al mes. Notificación local al abrir la app si se activa.

## Uso
    python3 server.py                    # http://127.0.0.1:8160 (solo biblioteca estándar)
    MIELEC_DEMO=1 python3 server.py      # datos de ejemplo, sin llamar a REE
    node prueba.mjs                      # pruebas de la lógica

Si REE no responde, el servidor devuelve datos de ejemplo y la app lo marca con la etiqueta «Datos de ejemplo». No se mezclan con datos reales sin avisar.

## Cómo está hecho
- `ree.py`: API pública de REE (sin clave): PVPC (indicador 1001) y mercado spot (600), por horas y media diaria.
- `static/js/calculo.js`: motor de cálculo del simulador original (funciones puras). El modo simple lo usa con 2.0TD, 30 días y un único precio de energía; el alquiler del contador se fija en 0,81 €/mes.
- `static/js/`: `hoy`, `simular`, `factura`, `alertas`, `informe` (PDF con html2canvas + jsPDF, en `static/lib/`, se cargan al pulsar), `graficos` (SVG propio).
- El estado se guarda en el navegador (localStorage).

## Límites conocidos
- Los avisos solo se comprueban al abrir la app. Para recibirlos con la app cerrada hace falta un servidor de notificaciones push (no incluido).
- El PDF es de imagen (texto no seleccionable), como en el simulador original.
- No se incluyen la lectura de facturas con IA, el simulador por aparatos ni el guardado de simulaciones del simulador anterior.
- Sin desplegar: pensado para un `python3 server.py` detrás de un proxy con HTTPS (el modo instalable y las notificaciones lo exigen).
