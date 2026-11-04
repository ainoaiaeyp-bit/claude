# Imagen del editor (solo archivos estáticos) servida por Caddy con HTTPS automático.
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY index.html app.js config.js sw.js manifest.webmanifest fonts.css /srv/
COPY vendor /srv/vendor
COPY fonts /srv/fonts
COPY icons /srv/icons
