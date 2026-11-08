import { createClient } from '@supabase/supabase-js';

// Backend propio (tu Supabase). Se configura al compilar: ver .env.example y README.
const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const backendConfigured = Boolean(URL && KEY);

export const supabase = createClient(URL ?? 'http://localhost:54321', KEY ?? 'missing', {
  auth: { persistSession: true, autoRefreshToken: true, storage: localStorage },
});
