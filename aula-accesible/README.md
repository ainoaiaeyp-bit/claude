# Aula Accesible (prototipo)

Subtítulos en tiempo real + signos en vídeo/imagen de los términos clave, para un alumno sordo.
Una sola página (`index.html`), sin dependencias ni servidor propio. Los datos se quedan en el navegador.

## Uso
1. Sirve la carpeta (el micrófono necesita `localhost` o https):
   `python3 -m http.server 8000` y abre http://localhost:8000
2. **Empezar a escuchar** (Chrome o Edge) → subtítulos grandes en directo.
3. **Pantalla alumno** abre una segunda ventana sincronizada (arrástrala al proyector/monitor del alumno).
4. **Glosario**: añade términos con vídeo o foto de un signante. Al decirlos se resaltan y se muestra su signo.
5. **Apuntes** descarga la transcripción de la clase.
6. La barra inferior permite escribir o simular texto (útil en Firefox/Safari, sin micro).

## Límites actuales
- Reconocimiento de voz del navegador (Chrome/Edge; necesita internet). Revisar términos técnicos.
- La pantalla del alumno sincroniza solo en el mismo ordenador (otra ventana). Para otra tablet haría falta un servidor (WebSocket/WebRTC).
- Los signos son clips que tú aportas; no hay traducción automática a LSE.
