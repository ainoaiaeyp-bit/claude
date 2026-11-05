# Cómo desplegar con Claude Code normal

En tu VPS (con un usuario normal con sudo, no root):

```bash
git clone -b claude/wonderful-wright-ccmbws https://github.com/ainoaiaeyp-bit/claude.git
cd claude/editor-diseno
claude
```

Pega este prompt:

> Lee CLAUDE.md y DEPLOY.md. Despliega Lienzo en este VPS con Docker y Caddy en el dominio TU_DOMINIO. Primero ejecuta `bash deploy/install.sh --dry-run` y enséñame qué hará. Pídeme los secretos por terminal (no los imprimas). Después verifica HTTPS, `/api/health` si activé la IA, y que el service worker y la CSP funcionan abriendo el sitio. Si algo falla, diagnostica con `docker compose logs` antes de cambiar nada.

Antes: registro DNS `A` del dominio hacia la IP del VPS y puertos 80/443 abiertos.
Para la nube: crea un proyecto en Supabase, ejecuta `supabase/schema.sql`, pon URL y clave `anon` en `config.js` y el *Site URL* en Authentication → URL Configuration.
