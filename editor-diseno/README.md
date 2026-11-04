# Lienzo – editor de diseño

Editor de diseño tipo Canva en un solo archivo (`index.html`). Funciona sin servidor; con Supabase añade **cuentas, guardado en la nube, historial de versiones y enlaces para compartir**.

## Uso sin nube
Abre `index.html` en el navegador (necesita internet para cargar las librerías y las fuentes). El autoguardado local usa el navegador; también puedes exportar/abrir proyectos `.json`.

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
- **RLS activado**: cada usuario solo ve y modifica sus diseños. Un diseño marcado como *público* puede **leerse** con su enlace (`index.html?d=<id>`), pero nadie salvo su dueño puede modificarlo.
- Solo se usa la clave `anon`. No pongas nunca la `service_role` en el navegador.

## Limitaciones
- Las imágenes subidas se guardan dentro del JSON del diseño (en base64). Con muchas fotos grandes el diseño puede pesar varios MB.
- No hay edición colaborativa en tiempo real: el último guardado gana.
- El asistente de IA usa tu propia clave de Anthropic, guardada solo en tu navegador.
