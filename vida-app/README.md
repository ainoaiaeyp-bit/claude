# Vida

App personal todo-en-uno (PWA instalable, sin dependencias ni build). Tema automático/claro/oscuro.

| Pestaña | Contenido |
|---|---|
| **Hoy** | Balance del mes, agenda de hoy y próximos 7 días, hábitos, nutrición y agua |
| **Calendario** | Vista mensual con eventos, cumpleaños, tareas, recordatorios, cargos de suscripciones y cobros |
| **Dinero** | Movimientos (personal/negocio), suscripciones con renovación automática, resumen, presupuestos por categoría |
| **Negocio** | Presupuestos / por cobrar / cobrado (al cobrar se registra el ingreso) |
| **Más** | Salud y nutrición (comidas, kcal y macros, agua, peso, ejercicio), tareas, recordatorios, cumpleaños, hábitos con rachas, objetivos de ahorro, notas, ajustes |
| **Asistente** (botón de chat en la cabecera) | Chat con IA que conoce tus datos y puede **crear** tareas, eventos, recordatorios, gastos, comidas (estimando kcal), peso y ejercicio |

## Probar en local
```bash
python3 -m http.server 8765   # y abrir http://localhost:8765
```

## Instalar en iPhone
Publicar la carpeta en HTTPS (GitHub Pages, Netlify, Cloudflare Pages…), abrir en Safari →
Compartir → **Añadir a pantalla de inicio**.

## Asistente IA
Ajustes (⚙︎) → pega tu API key de Anthropic. Se guarda solo en el dispositivo.
Para uso real conviene un pequeño proxy (Cloudflare Worker) que guarde la clave en el servidor.
Las estimaciones nutricionales son aproximadas y no sustituyen a un profesional.

## Datos
Todo en `localStorage` del dispositivo. Ajustes permite exportar/importar JSON (copia de seguridad)
y exportar los movimientos en CSV (para la gestoría).
