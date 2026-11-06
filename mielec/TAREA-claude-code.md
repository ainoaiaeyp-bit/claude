# Tarea: desplegar Mielec en el VPS y portar lo que falta del simulador anterior

Rama `claude/sharp-darwin-2r0m7q` del repositorio `ainoaiaeyp-bit/claude`, carpeta `mielec/`. Léete primero `README.md`.

## 1. Desplegar en el VPS (lo primero)

`desplegar.sh` está escrito pero **no se ha ejecutado nunca** (la sesión en la que se creó no tenía acceso al VPS). Sigue el mismo patrón que el simulador anterior (`referencia/simulador-factura/desplegar.sh`): usuario `mielec`, `/opt/mielec`, servicio systemd `mielec`, escucha solo en `127.0.0.1:8160`.

Pasos:
1. Confirma con Ainoa el VPS (`VPS=root@194.164.163.53` por defecto, el del simulador anterior) y el **subdominio** que quiere para Mielec. No lo inventes.
2. Comprueba que el puerto 8160 está libre en el VPS (el script ya lo hace, pero verifícalo tú).
3. En Plesk: subdominio con proxy a `127.0.0.1:8160` y Let's Encrypt. **HTTPS es obligatorio**: sin él no se instala en el iPhone ni funcionan el service worker ni las notificaciones. Si no puedes tocar Plesk, dile a Ainoa exactamente qué configurar.
4. Lanza `./desplegar.sh`. Ejecuta antes `node prueba.mjs` (el script ya lo hace).
5. **Verificación que no se puede saltar**: el script imprime si REE responde de verdad. Si sale `"demo": true`, el VPS no llega a `apidatos.ree.es` y la app está sirviendo datos de ejemplo (la app lo marca con la etiqueta «Datos de ejemplo», pero hay que arreglarlo: red, DNS, firewall). Abre además la URL pública desde un móvil y comprueba: Hoy con datos en directo, Simular (simple y completo), «Descargar informe» baja un PDF, la factura abre la hoja al tocar una línea, y se puede añadir a la pantalla de inicio.
6. No toques el servicio `simulador` ni su puerto 8150: es otra app.

Nota: en la sesión de creación **nunca se llegó a REE** (el entorno bloqueaba `apidatos.ree.es`), así que las llamadas reales están sin probar. `ree.py` viene del simulador anterior, donde funcionaba, y se le ha añadido `diario()` (media diaria para las alertas): **pruébala con datos reales y corrígela si hace falta**. Tiene que filtrar días incompletos (menos de 20 horas) y devolver `pvpc`/`spot` en €/kWh.

## 2. Lo que falta respecto al simulador anterior

El código original está en `referencia/simulador-factura/` (sin logos ni fuentes). Mielec reutiliza su motor de cálculo (`static/js/calculo.js`, idéntico) pero tiene una interfaz nueva y mucho menos funcionalidad. **No está** esto:

| Falta | Dónde está en el original | Notas |
|---|---|---|
| **Leer factura u oferta con IA** (PDF o hasta 8 fotos; rellena el formulario) | `app.py` `/api/leer`, `PROMPT`, `_limpiar`; `app.js` `aplicarLectura`, `subirArchivos`, `cajaIA` | Necesita clave de Anthropic (`config.ini`, `poner_clave_ia.sh`). Es lo que más ayudaría al modo simple. Hay que pasar a un backend con endpoint; el `server.py` de Mielec es solo biblioteca estándar. |
| **Simulador de consumo por aparatos** | `static/aparatos.js`, `app.js` `htmlAparatos`, `aplicarAparatos` | Rellena kWh por periodo y por mes. |
| **Guardar simulaciones** (lista, abrir, baja lógica) y **usuarios/SSO de IA Unity** | `app.py` (SQLite, `/api/simulaciones`, `/sso`, sesiones) | Mielec guarda todo solo en el navegador (localStorage). Decidir con Ainoa si Mielec es público o va detrás de IA Unity. |
| **Consumo del año realista**: reparto igual, variación por mes, consumos reales por mes, estacionalidad de REE | `calculo.js` ya lo soporta (`perfil`); UI en `app.js` `htmlPerfil`; `ree.py` `estacionalidad` y `/api/ree/estacionalidad` | Mielec usa siempre reparto igual. |
| **Precios de energía de REE para el periodo de una factura** (PVPC o spot + margen, por P1–P6) | `ree.py` `medias`, `/api/ree/periodos`; `app.js` `bloqueREE`, `reeConsultar` | Mielec solo enseña los precios de hoy y la media de 14 días. |
| **Excedentes de autoconsumo** (compensación) | motor ya lo soporta; UI en `htmlCliente`/`htmlLado` | Sin pantalla en Mielec. |
| **Otros conceptos** (reactiva, exceso de potencia), **cargos regulados**, alquiler propio por lado, opciones del impuesto eléctrico | motor ya lo soporta; UI en `cardCargos`, `htmlLado` | Mielec solo tiene alquiler común. |
| **Descuentos y servicios avanzados**: descuento condicionado a un servicio, €/kWh, descuento propio y permanencia por servicio | motor ya lo soporta; UI en `htmlLado` | Mielec solo ofrece %, €/mes y pago único sobre potencia/energía/total. |
| **Comprobar contra la factura real** (total real → cuadre) y **avisos de sentido común** | `comparar()` ya devuelve `recon` y `avisos`; UI en `app.js` | Los avisos solo salen en el PDF; el total real no se pide. |
| **Propuesta sin servicios** y **comparar solo «esta factura»** (`horizonte = 'f'`) | `comparar()` ya devuelve `sinServ`; selector en `app.js` | `sinServ` ya sale en el PDF; falta el selector «solo esta factura». |
| **Informe ampliado** (datos de partida, factura paso a paso, mes a mes en tabla, permanencia, supuestos), secciones activables | `static/informe.js`, `informe.css`, `informe-ver.html`, `ejemplo.json` | Mielec genera un PDF fijo de 2 hojas. |
| Tarifas **3.0TD y 6.1TD completas** | motor sí; formulario | El formulario Completo las permite, pero no se ha probado con 6 periodos en móvil. |

Quitado a propósito (a petición de Ainoa, no portar): la imagen corporativa (logo, fuentes DM Serif/Outfit), el paso **Resultado** interactivo («¿y si…?», gráficos con ratón) y el paso Resumen.

Orden sugerido: 1) desplegar, 2) lectura de factura con IA (mejora más el modo simple), 3) precios de REE para el periodo de la factura, 4) guardado de simulaciones si Ainoa quiere cuentas, 5) el resto según demanda.

## 3. Alertas con la app cerrada (opcional)

Hoy los avisos solo se comprueban al abrir la app. Para avisar con la app cerrada hace falta Web Push: claves VAPID, guardar suscripciones en el servidor, una tarea diaria (cron/systemd timer) que calcule la racha con `ree.diario()` y envíe la notificación. En iPhone solo funciona con la app añadida a la pantalla de inicio (iOS 16.4 o superior). Pregunta a Ainoa antes de hacerlo.

## Restricciones
- Todo el texto de la app en español, sin tuteo forzado ni jerga técnica: es para usuarios finales.
- Nada de datos inventados: si REE no responde se usa el aviso de «Datos de ejemplo», nunca se mezclan datos de ejemplo con reales sin avisar.
- No borres nada en el VPS ni toques otras apps. Confirma con Ainoa antes de cualquier cambio fuera de `/opt/mielec`, el servicio `mielec` y el subdominio nuevo.
