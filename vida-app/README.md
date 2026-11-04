# Vida

App personal todo-en-uno (PWA instalable, sin dependencias ni build).

- **Hoy**: balance del mes, suscripciones, cobros pendientes y lo próximo de los siguientes 7 días.
- **Dinero**: movimientos (personal/negocio), suscripciones con renovación automática y resumen por meses y categorías.
- **Negocio**: presupuestos, por cobrar y cobrado (al cobrar se registra el ingreso solo).
- **Recordar**: recordatorios con hora, repetición y notificaciones.
- **Asistente**: chat con IA (Anthropic) que conoce tus datos.

## Probar en local
```bash
python3 -m http.server 8765   # y abrir http://localhost:8765
```

## Instalar en iPhone
Publicar la carpeta en HTTPS (GitHub Pages, Netlify, Cloudflare Pages…), abrir en Safari →
Compartir → **Añadir a pantalla de inicio**.

## Asistente IA
Ajustes (⚙︎ en Hoy) → pega tu API key de Anthropic. Se guarda solo en el dispositivo.
Para uso real conviene un pequeño proxy (Cloudflare Worker) que guarde la clave en el servidor.

## Datos
Todo en `localStorage` del dispositivo. Ajustes permite exportar/importar JSON como copia de seguridad.
