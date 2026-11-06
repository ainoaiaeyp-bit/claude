# IA Simulador de factura

Compara la factura de luz actual con una propuesta y calcula el ahorro a 12, 24, 36 meses (o los que se quiera).

## Qué contempla
- Tarifas de acceso 2.0TD, 3.0TD y 6.1TD, con todos sus periodos (potencia P1-P6, energía P1-P6; en 2.0TD, 2 de potencia y 3 de energía).
- Precio de potencia en €/kW·año, €/kW·mes o €/kW·día, por periodo o con un único precio.
- Precio de energía en €/kWh, céntimos o €/MWh, con 1, 2, 3... hasta 6 precios distintos, asignando a qué periodos se aplica cada uno.
- Excedentes de autoconsumo, alquiler de contador, otros conceptos (reactiva, exceso de potencia) con o sin impuesto de electricidad.
- Servicios adicionales (€/mes, €/año, €/día o pago único, con duración y IVA).
- Descuentos: %, € al mes, € por kWh o pago único; sobre potencia, energía, ambas, un servicio, todos los servicios o toda la factura;
  con mes de inicio y duración; y condicionados a que se contrate un servicio (si no, no se aplican).
- Permanencia de la actual (penalización por salir) y de la propuesta (cuánto se ahorra durante ella).
- Escenario "propuesta sin servicios": cuánto se ahorraría sin los servicios ni los descuentos que dependen de ellos.
- Cargar factura u oferta con IA (PDF o fotos, hasta 8 archivos): rellena el formulario y marca en verde lo leído.
- Guardar simulaciones (bajas lógicas), imprimir/PDF.

## Informe ampliado: factura en un año (06/11/2026)
- Sección nueva "Tu factura en un año": gráfico mensual hoy frente a propuesta con la línea del consumo (kWh), y un recuadro "De dónde sale el consumo" que explica el origen según el modo (reparto igual, variación por mes con su fuente, consumos reales o estimación por aparatos).
- Si no hay permanencia, servicios ni descuentos, el bloque de condiciones no aparece. Si solo hay servicios o descuentos, aparece sin la tabla de permanencia.

## Descarga directa del PDF (06/11/2026)
- El botón "Descargar PDF" genera el PDF en el navegador y lo descarga sin abrir la impresora: cada hoja A4 se dibuja con html2canvas y se añade con jsPDF (`static/lib/`, MIT, se cargan solo al pulsar). Es un PDF de imagen a alta resolución (unos 2 MB para 4 páginas): el texto no es seleccionable. Solo en ordenador (pantalla de 800 px o más).
- Si algún día se necesita texto seleccionable, la alternativa es generarlo en el servidor con un Chrome sin interfaz (no está instalado en el VPS).

## Informe ampliado (06/11/2026)
- En el paso Informe se elige "Una página" o "Ampliado". El ampliado es la misma primera página más páginas de detalle para clientes exigentes: datos de partida y precios llevados a una unidad común, la factura paso a paso (cada importe con su cuenta, hoy y propuesta), el mes a mes con tabla y gráficos, permanencia, servicios y descuentos, y cómo se ha calculado con avisos.
- Cada bloque se mide y se reparte en páginas A4 sin cortar ninguno; las tablas largas (cálculo, 12 a 48 meses) se trocean con la cabecera repetida. Cada sección se puede quitar. El PDF se guarda como `CUPS_12 meses_ampliado`.

## Informe de una página (versión final, 06/11/2026)
- Una sola hoja A4: logo oficial, nombre del cliente, cifra grande del ahorro, barras hoy frente a propuesta, gráfico mes a mes, la factura línea a línea y bloque final con datos de la empresa. Paleta corporativa, fondo blanco, bordes redondeados, tipografía de la marca: DM Serif Display para títulos y cifras y Outfit para el texto.
- Todas las cifras salen de `calculo.js`. Las líneas de la factura se alinean por concepto y suman exactamente su total (prueba en `prueba.mjs`); el ahorro mostrado es la resta de los importes ya redondeados, para que cuadre a la vista.
- El espaciado se ajusta solo: se busca el diseño más aireado que cabe en el A4 (variable CSS `--e`), y si aun así no cabe se reduce también la tipografía (niveles n1 a n3). Probado imprimiendo a PDF con 12 y 36 meses, una sola factura, sobrecoste, nombre largo y muchas líneas.
- Comprobación con la factura real: si se rellena el total real, el cálculo debe cuadrar (hay una prueba de regresión con una factura real 2.0TD de 29 días: 37,05 €). Opción "Esta factura" para comparar solo el periodo de la factura analizada.
- Avisos de sentido común: P2 de potencia mayor que P1, o valle más caro que punta.
- Todas las clases del informe llevan el prefijo `i-` (la app tiene sus propias clases `.cab`, `.hero`, `.fila`...). No volver a usar nombres sin prefijo.
- Para revisar el PDF sin tocar la app: `static/informe-ver.html` + `static/ejemplo.json` (no se despliegan).

## Resultado interactivo e informe comercial (06/11/2026)
- Paso Resultado (interactivo, `static/resultado.js`): se puede probar "¿y si...?" sin tocar los datos: consumo de -50 a +100 %, 12 a 48 meses, quitar servicios y restar o no la penalización. Gráficos que responden al ratón y al dedo: cada mes con la línea de consumo, ahorro acumulado, y fijo y variable (explica por qué el consumo mueve poco el total cuando la potencia pesa mucho).
- Paso Informe (`static/informe.js` + `informe.css`): pieza comercial para el cliente, con cifra grande, comparación hoy frente a propuesta, gráficos anotados, factura de ejemplo, condiciones y bloque de contacto con datos verificados de la empresa. Se pueden activar o quitar secciones (se guardan con la simulación).
- Paginación: cada bloque se mide y se reparte en páginas A4 sin cortar ninguno (`renderInforme`). Probado con 1, 12 y 36 meses, con sobrecoste y con pocas secciones.
- Nombre automático al guardar: `CUPS_12 meses` (o nombre del cliente si no hay CUPS). El PDF se guarda con ese nombre.
- El aviso "falta algún precio de energía" se ha quitado. Un precio vacío cuenta como 0: el campo se marca en rojo.

## Alquiler, cargos regulados y precios que faltan
- Alquiler del contador: se pone en el paso de la factura actual; la propuesta usa el mismo salvo que se marque "es distinto".
- Cargos regulados comunes (financiación del bono social, tasas): importe fijo por día, mes o año, o % sobre potencia + energía; iguales en las dos facturas. El alquiler puede entrar o no en la base del impuesto de electricidad (las fuentes no coinciden).
- Si falta un precio (potencia o energía), el informe NO calcula: muestra qué falta, porque un precio vacío contaría como 0 y haría parecer más barata la opción incompleta. Los campos vacíos se marcan en rojo.
- 2.0TD con solo punta y valle: elegir "2 precios distintos"; el llano (P2) se cobra al precio de punta y el valle es el P3.

## Simulador de consumo por aparatos
- Tarjeta "Simular el consumo con aparatos" en el paso Consumo: modelos (vivienda, local comercial, nave) y catálogo de aparatos con potencia, cantidad, horas al día, días de la semana, época del año y franja horaria. Todo editable; los valores del catálogo son típicos y orientativos (`static/aparatos.js`).
- Calcula kWh al año, por meses y por periodos de la tarifa (calendario peninsular), y qué aparatos consumen más. "Usar este consumo en la simulación" rellena el consumo del periodo y el consumo mes a mes por periodos.

## Año realista y informe
- El alquiler del contador es común a las dos facturas (se pone en el paso Consumo).
- Cada servicio puede tener su propio descuento y su propia permanencia (con penalización); se suman al resumen de compromisos.
- Consumo del año: reparto igual, variación por mes (%), o consumos reales (total del mes o por periodos). Calendario real con los días de cada mes; el perfil se repite por mes del calendario si se compara a más de 12 meses.
- Estacionalidad de REE: índice por día de la demanda peninsular de los últimos 12 meses completos, relativo al mes de la factura de referencia. Es del sistema eléctrico, no del cliente.
- Informe (`static/informe.js` + `informe.css`, guía de estilo de documentos de la empresa): hoja blanca A4 en 3 páginas con barra de acento, logo oficial recortado, título con una palabra en verde, tesis, métricas, bloque total negro, gráficos y tablas con cabecera negra. Los bloques no se cortan entre páginas. Para probar el PDF: `static/informe-ver.html` + `static/ejemplo.json` (no se despliegan) e imprimir con Chrome.
- (antes) Informe: portada con ahorro, veredicto, gráficos (mensual, ahorro acumulado con mes de recuperación, composición, consumo), factura de ejemplo, compromisos y supuestos. Imprimir / PDF desde el navegador.

## Red Eléctrica (sin clave)
- `ree.py` usa la API pública de datos de REE (apidatos.ree.es): PVPC (2.0TD) y mercado spot, por horas.
- Calcula el precio medio de cualquier periodo de factura por periodo tarifario (P1-P3 en 2.0TD; P1-P6 en 3.0TD/6.1TD con el calendario peninsular y festivos nacionales) y rellena los precios de energía (PVPC, o spot + margen).
- La pantalla principal muestra "La luz hoy" y "mañana" por horas. Son medias simples por horas, no ponderadas por la curva del cliente.

## Interfaz
- Por pasos (Consumo, Hoy, Oferta, Resultado) con resumen en directo; en móvil, barra de pestañas inferior estilo iPhone, instalable en la pantalla de inicio.

## Cómo se calcula
- Potencia: kW x precio x días (año se divide entre 365, mes se multiplica por 12/365).
- Energía: kWh de cada periodo x precio del grupo al que pertenece. Los descuentos nunca dejan un concepto por debajo de 0.
- Impuesto de electricidad: 5,11269632 % sobre potencia + energía + otros conceptos (con mínimo de 0,5 €/MWh doméstico, 1 €/MWh resto). IVA 21 %. Ambos se pueden cambiar en la pantalla.
- Proyección: el consumo del periodo se reparte por igual en meses de 365/12 días. Un descuento o servicio con duración limitada solo cuenta esos meses.
- El motor está en `static/calculo.js` (sin DOM). Pruebas: `node prueba.mjs`.

## Local
    python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
    SIM_DEV=1 .venv/bin/uvicorn app:app --port 8151      # entrada directa en /sso
    SIM_DEV=1 SIM_FAKE=1 ...                               # lectura con IA simulada (sin gastar clave)

## VPS
Pensado como un módulo más de IA Unity (/opt/simulador, servicio systemd `simulador`, 127.0.0.1:8150, subdominio de Plesk con proxy y Let's Encrypt).
Variables: SIM_HUB, SIM_MODULO_ID (id del módulo en IA Unity), SIM_ANTHROPIC_KEY o config.ini (ver config.ini.ejemplo).
Ver `desplegar.sh`.
