// Configuración de Lienzo. Este archivo se sirve tal cual al navegador: no pongas aquí secretos.

// --- Nube (Supabase) -------------------------------------------------------------
// Si rellenas estos dos valores, todos los visitantes tendrán cuentas y guardado en la nube
// sin configurar nada. La clave "anon public" está pensada para ser pública: la seguridad
// la dan las políticas RLS de supabase/schema.sql. NUNCA pongas aquí la clave "service_role".
// Project Settings > API:  Project URL  y  anon public key
window.LIENZO_SUPABASE = {
  url: '',   // p. ej. 'https://abcdxyz.supabase.co'
  key: ''    // p. ej. 'eyJhbGciOi...'
};

// --- IA a través de TU servidor ----------------------------------------------------
// Si arrancas el proxy de IA (server/ai-proxy.js), pon aquí su ruta. Entonces la clave de
// Anthropic vive solo en el servidor y los usuarios inician sesión para usar la IA.
// Déjalo vacío para que cada usuario use su propia clave de Anthropic desde el navegador.
window.LIENZO_AI_PROXY = '';   // p. ej. '/api/ai'
