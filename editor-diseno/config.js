// Configuración opcional de Supabase para Lienzo.
// Si rellenas estos dos valores, todos los visitantes tendrán cuentas y guardado en la nube
// sin tener que configurar nada. La clave "anon public" está pensada para ser pública:
// la seguridad la dan las políticas RLS de supabase/schema.sql. NUNCA pongas aquí la clave "service_role".
//
// Project Settings > API:  Project URL  y  anon public key
window.LIENZO_SUPABASE = {
  url: '',   // p. ej. 'https://abcdxyz.supabase.co'
  key: ''    // p. ej. 'eyJhbGciOi...'
};
