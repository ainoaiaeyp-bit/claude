# Signa · plataforma para aprender lengua de signos

Web estática (sin dependencias ni build). Abre `index.html` o sirve la carpeta con cualquier servidor estático.

- **Lecciones** con signos, tarjetas de repaso y test (≥70 % para completar).
- **Progreso** en `localStorage`: XP, racha diaria y dominio por signo (cajas 0–3).
- **Diccionario** con búsqueda, **modo oscuro**, accesible por teclado y móvil.

## Añadir contenido
Edita `data.js`. Cada signo: `{ id, word, emoji, how, media }`. Pon en `media` la URL de un vídeo (`.mp4/.webm`) o imagen y se mostrará automáticamente.

## Importante
Las descripciones de `data.js` son un **borrador**. Antes de publicar, valídalas con una persona sorda signante o con el diccionario de la CNSE, y sustituye las descripciones por vídeos.
