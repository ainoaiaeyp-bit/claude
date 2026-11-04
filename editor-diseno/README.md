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

## Biblioteca de imágenes, organización e impresión
- **Mi biblioteca** (pestaña *Imágenes*, con sesión iniciada): lista las imágenes que has subido a Supabase Storage. Un clic la añade al diseño; puedes subir más o eliminarlas. **Limpiar sin usar** borra las imágenes que no aparecen en ningún diseño ni versión guardada (y que tienen más de una hora, para no tocar lo que acabas de subir). Antes de borrar te muestra cuántas son y cuánto ocupan.
- **Mis diseños** (botón *Nube*): buscador por nombre o etiqueta, carpetas, etiquetas, renombrar y duplicar. Requiere volver a ejecutar `supabase/schema.sql` (añade las columnas `folder` y `tags`); sin ellas el editor sigue funcionando y oculta carpetas y etiquetas.
- **Impresión** (Exportar → PDF → *Impresión*): indica la resolución a la que está pensado el diseño (p. ej. 150 ppp para un A4 de 1240×1754 px) y elige sangrado (3 o 5 mm) y marcas de corte. El PDF sale en milímetros; el fondo se extiende por el sangrado y las marcas quedan fuera de él (6 mm de margen). No genera CMYK: el PDF es RGB, así que confirma los colores con tu imprenta.
- **Recortar con el ratón**: doble clic sobre una imagen (o el botón *Recortar con el ratón*), ajusta el recuadro, **Enter** aplica y **Esc** cancela. La imagen debe estar sin rotar (0°).

## Compartir con personas y comentarios
- **Compartir con personas concretas**: botón *Nube* → en un diseño tuyo, **Personas…** → escribe su correo y elige **Puede editar** o **Solo ver y comentar**. La persona debe tener ya una cuenta; no se envía ningún correo, lo verá en *Nube → Compartidos conmigo*. Puedes cambiar el permiso o quitarla cuando quieras.
- **Qué puede hacer cada rol**: el propietario lo puede todo. Un *editor* modifica el contenido y el nombre, pero **no** puede cambiar el propietario, hacerlo público, moverlo de carpeta ni etiquetarlo (lo impide un trigger en la base de datos). Un *lector* abre el diseño en modo lectura (cualquier cambio es una copia local; al guardar se crea **su propia copia**) y puede comentar.
- **Comentarios**: botón *Comentarios* → «Comentar en el lienzo», clic donde quieras anclarlo, escribe y publica. Cada comentario es un pin numerado en el lienzo, con respuestas, **Resolver/Reabrir** y borrado (el autor y el propietario). Se actualizan cada 15 s mientras el panel está abierto. Requiere que el diseño esté en la nube.
- **Privacidad**: la función de invitar por correo permite al propietario comprobar si un correo tiene cuenta (porque informa de si existe). Si eso te preocupa, quita `share_design` o cámbiala por invitaciones pendientes.
- Hay que **volver a ejecutar `supabase/schema.sql`** para activar todo esto (crea las tablas `design_members` y `design_comments`, la función `design_role` y las políticas).

## Mis plantillas, contraste y accesibilidad
- **Mis plantillas** (pestaña *Plantillas*): «Guardar esta página como plantilla» guarda la página actual (con su tamaño). Con sesión iniciada se guarda en tu cuenta (tabla `user_templates`; las imágenes van a Storage) y, si no, en este navegador (máximo 8). Un clic la aplica, reemplazando la página actual; la cruz la elimina. Hay que volver a ejecutar `supabase/schema.sql`.
- **Contraste del texto**: al seleccionar un texto, el panel muestra la relación de contraste (WCAG) entre su color y el fondo que tiene detrás (se mide sobre lo que realmente hay dibujado debajo). Si no llega al mínimo (4,5:1 en texto normal, 3:1 en texto grande) aparece **Mejorar contraste**, que elige blanco o negro. No mide texto con degradado.
- **Accesibilidad**: los botones con solo icono tienen etiqueta (`aria-label`), el foco con teclado es visible y los diálogos se cierran con `Esc`.

## Avisos, menciones y probar otro estilo con IA
- **Menciones**: en un comentario escribe `@` y elige a alguien de la lista (las personas con acceso al diseño). `@nombre` es la parte del correo antes de la `@`. Quien es mencionado recibe un aviso de tipo *mención*.
- **Notificaciones** (campana *Avisos*): llegan cuando comparten un diseño contigo, alguien comenta en un diseño tuyo o compartido, te responden en un hilo o te mencionan. Un clic abre el diseño y el comentario. Se actualizan cada 45 s y salen como aviso emergente al llegar uno nuevo. Las crea la base de datos con *triggers* (el navegador no puede insertarlas ni falsificarlas) y solo se puede cambiar su estado de leído.
- **Avisos por correo** (opcional): como los avisos están en la tabla `notifications`, puedes enviarlos por correo con un *Database Webhook* de Supabase (evento INSERT en `notifications`) que llame a una Edge Function o a tu servidor y use Resend/SendGrid/SMTP. El editor no incluye ese envío porque necesita tus credenciales de correo.
- **Probar otro estilo** (botón *IA* → «Probar otro estilo»): describe el estilo (p. ej. «más elegante, tonos pastel») y la IA propone nuevos colores y fuentes para el diseño actual; después se ajusta el contraste de los textos automáticamente. Se puede deshacer con `Ctrl+Z`.
- **Pruebas del esquema SQL** (`npm run test:sql` con una base PostgreSQL vacía de pruebas): comprueba con roles reales las políticas de seguridad, los triggers y las notificaciones (ver `tests/sql/run.sh`).
