# Transcriptor — tu propio TurboScribe, sin límites

Transcribe audio y vídeo con Whisper **en tu máquina**: sin límite de minutos, de tamaño ni de archivos, sin suscripción y sin que el audio salga de tu equipo.

## Arrancar

```bash
cd transcriptor
pip install -r requirements.txt     # y ffmpeg instalado en el sistema
uvicorn app.main:app --port 8000    # http://localhost:8000
```

El primer uso de cada modelo lo descarga (small ≈ 500 MB, large-v3 ≈ 3 GB). Con GPU NVIDIA va mucho más rápido; sin ella usa CPU (`tiny`/`base`/`small` recomendados).

## Funcionalidades

- Subida múltiple por arrastrar y soltar, en cola, **sin límite de duración ni tamaño** (streaming a disco; Whisper procesa por segmentos).
- **Enlaces** de YouTube y +1000 sitios (yt-dlp), varios a la vez.
- Detección automática de idioma, o forzado; **traducción al inglés** de cualquier idioma.
- Modelos `tiny` → `large-v3`, `large-v3-turbo`, `distil-large-v3`; filtro de silencios (VAD); tiempos por palabra.
- Editor: reproductor sincronizado (la frase activa se resalta), clic en un tiempo para saltar, edición en línea con autoguardado, buscar y reemplazar.
- Biblioteca con **búsqueda en todo el contenido** de todas las transcripciones.
- Exportar a **TXT** (con tiempos), **SRT, VTT, JSON, Markdown, CSV**.
- Resúmenes con IA (opcional): define `ANTHROPIC_API_KEY`.
- Reanuda la cola tras reiniciar; reintentar errores.

## Configuración (variables de entorno)

| Variable | Para qué |
|---|---|
| `TRANSCRIPTOR_PASSWORD` | Protege la app con contraseña (usuario libre) — **actívala si la expones a Internet** |
| `TRANSCRIPTOR_DATA` | Carpeta de datos (por defecto `./data`) |
| `TRANSCRIPTOR_DEVICE` / `TRANSCRIPTOR_COMPUTE` | `cuda`/`cpu` y `float16`/`int8`… (por defecto `auto`) |
| `ANTHROPIC_API_KEY` / `SUMMARY_MODEL` | Activa el botón de resumen |

## Tests

```bash
python -m pytest -q    # usa un motor simulado, no descarga modelos
```

## Ideas siguientes

Separación de hablantes (pyannote), cuentas de usuario, API pública con tokens, Docker + GPU.
