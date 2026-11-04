# Signa · plataforma para aprender lengua de signos

Web estática (sin dependencias ni build). Abre `index.html` o sirve la carpeta con cualquier servidor estático.

- **10 lecciones y 57 signos** con ilustración animada (mano, lugar del cuerpo y trayectoria), tarjetas, test y juego de parejas.
- **Repaso espaciado**, meta diaria, nivel, racha, logros y estadísticas en `localStorage`.
- **Diccionario** con búsqueda, **modo oscuro**, accesible por teclado y móvil.

## Añadir contenido
Edita `data.js`. Cada signo: `{ id, word, emoji, how, media }`. Pon en `media` la URL de un vídeo (`.mp4/.webm`) o imagen y se mostrará automáticamente.

## Importante
Las descripciones de `data.js` son un **borrador**. Antes de publicar, valídalas con una persona sorda signante o con el diccionario de la CNSE, y sustituye las descripciones por vídeos.

## Versión de un solo archivo
`python3 build.py` regenera `signa-artifact.html` (CSS, datos y JS en línea) a partir de los fuentes.
