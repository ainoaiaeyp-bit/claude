import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, name: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  recovery: boolean;
  resetPassword: (email: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
}
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === 'PASSWORD_RECOVERY') setRecovery(true);
      setUser(s?.user ?? null);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value: AuthCtx = {
    user,
    loading,
    signIn: async (email, password) =>
      (await supabase.auth.signInWithPassword({ email, password })).error?.message ?? null,
    signUp: async (email, password, name) =>
      (
        await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name }, emailRedirectTo: window.location.origin },
        })
      ).error?.message ?? null,
    signOut: async () => {
      await supabase.auth.signOut();
      // Evita dejar datos privados en la caché sin conexión de un dispositivo compartido.
      try { await (await caches.keys()).reduce(async (p, k) => { await p; if (k.includes('splitia-data')) await caches.delete(k); }, Promise.resolve()); } catch { /* sin Cache API */ }
    },
    recovery,
    resetPassword: async (email) =>
      (await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })).error?.message ?? null,
    updatePassword: async (password) => {
      const err = (await supabase.auth.updateUser({ password })).error?.message ?? null;
      if (!err) setRecovery(false);
      return err;
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth fuera de AuthProvider');
  return c;
}
