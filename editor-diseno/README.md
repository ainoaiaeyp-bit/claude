# Lienzo – editor de diseño

Editor de diseño tipo Canva (`index.html` + `app.js`, sin paso de compilación). Funciona sin servidor; con Supabase añade **cuentas, guardado en la nube, historial de versiones y enlaces para compartir**.

## Uso sin nube
Abre `index.html` en el navegador (por ejemplo con `python3 -m http.server`). Las librerías (`vendor/`) y las fuentes (`fonts/`) van incluidas: **no necesita internet** salvo para la nube y la IA. El autoguardado local usa el navegador; también puedes exportar/abrir proyectos `.json`.

**Para publicarlo en tu VPS con HTTPS, Docker y proxy de IA, mira [`DEPLOY.md`](DEPLOY.md).**

## Activar la nube (Supabase)

1. Crea un proyecto en <https://supabase.com> (el plan gratuito basta).
2. En **SQL Editor → New query**, pega el contenido de [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**.
3. En **Authentication → Providers**, deja habilitado **Email**. Para probar rápido puedes desactivar *Confirm email*; en producción es mejor dejarlo activo.
4. En **Authentication → URL Configuration**, pon como *Site URL* la dirección donde alojes el editor (para los enlaces de confirmación por correo).
5. En **Project Settings → API**, copia **Project URL** y **anon public key**.
6. Elige una de estas dos opciones:
   - Pégalos en [`config.js`](config.js): todos los visitantes tendrán la nube activada.
   - O pégalos en el editor, botón **Nube**: se guardan solo en tu navegador.
7. Aloja la carpeta en cualquier hosting estático (GitHub Pages, Netlify, Vercel, Cloudflare Pages…).

## Qué guarda y cómo se protege
- Tabla `designs`: un diseño por fila (JSON de Fabric.js, miniatura, nombre, tamaño, si es público).
- Tabla `design_versions`: hasta 20 versiones por diseño (se crea una en cada guardado manual).
- Bucket de Storage `design-images`: las imágenes de tus diseños, en la carpeta de tu usuario (sin duplicados: el nombre es el hash del contenido).
- **RLS activado**: cada usuario solo ve y modifica sus diseños. Un diseño marcado como *público* puede **leerse** con su enlace (`index.html?d=<id>`), pero nadie salvo su dueño puede modificarlo.
- Solo se usa la clave `anon`. No pongas nunca la `service_role` en el navegador.

## Limitaciones
- En la nube, las imágenes se guardan en **Supabase Storage** (bucket `design-images`, creado por `schema.sql`) y el diseño solo guarda su URL, así pesa muy poco. Si el bucket no existe, el editor guarda las imágenes dentro del diseño (en base64) y avisa. Sin sesión y en local, las imágenes siguen yendo dentro del diseño.
- Las imágenes borradas de un diseño no se eliminan de Storage automáticamente (puedes limpiar el bucket desde el panel de Supabase). Cualquiera que conozca la URL exacta de una imagen puede verla; las URL no son adivinables, pero tenlo en cuenta con contenido sensible.
- La edición colaborativa sincroniza la página actual; si dos personas tocan el mismo elemento a la vez, gana el último cambio (ver abajo).
- El asistente de IA usa la clave de Anthropic de cada usuario (guardada solo en su navegador) o, si montas el proxy de `server/`, la clave de tu servidor con límites por usuario (ver `DEPLOY.md`).

## Colaboración en tiempo real
Botón **Colaborar** → *Crear sala* → copia el enlace (`index.html?room=<código>`). Quien lo abra entra en la misma sala y edita el diseño contigo, con cursores en vivo y lista de participantes.

- Usa el canal **Realtime/Broadcast** de Supabase (activado por defecto en los proyectos; el editor se conecta por WebSocket a `wss://<tu-proyecto>.supabase.co/realtime/v1/websocket`). Si usas Supabase autoalojado, puedes fijar otra dirección con `window.LIENZO_REALTIME_URL` en `config.js`.
- **El enlace de la sala es la «contraseña»**: cualquiera que lo tenga puede entrar y editar. El código es aleatorio (96 bits), pero compártelo solo con quien quieras.
- Los cambios se envían al soltar (no durante el arrastre). Se sincroniza la página actual; al entrar, quien llega recibe el estado de la sala (se pide confirmación porque reemplaza su página actual).
- Los datos de la sala viajan entre navegadores; no se guardan en Supabase. Para conservar el resultado, guarda el diseño (botón **Nube** o exportar `.json`).
- Mensajes de más de ~2,5 MB (imágenes enormes) no se envían; reduce el tamaño de las fotos.

## Reglas y guías
Botón **Reglas**: arrastra desde la regla superior o izquierda para crear guías; arrástralas para moverlas o llévalas de vuelta a la regla para quitarlas. Los elementos se imantan a las guías y se guardan con el diseño.

## Atajos y pruebas
- Atajos de herramientas: `T` texto, `R` rectángulo, `O` círculo, `L` línea, `P` lápiz, `G` cuadrícula (la lista completa está en el botón `?`).
- Prueba de humo automática (comprueba también que no hay violaciones de la CSP ni peticiones externas):
  ```bash
  npm install && npx playwright install chromium && npm test
  ```
