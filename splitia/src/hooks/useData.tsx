import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './useAuth';
import { loadSnapshot, type GroupBundle, type Snapshot } from '../lib/data';

interface DataCtx {
  snap: Snapshot | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  group: (id: string | undefined) => GroupBundle | undefined;
}
const Ctx = createContext<DataCtx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setSnap(await loadSnapshot());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setLoading(true);
      void reload();
    } else {
      setSnap(null);
    }
  }, [user, reload]);

  return (
    <Ctx.Provider value={{ snap, loading, error, reload, group: (id) => snap?.groups.find((g) => g.group.id === id) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useData() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useData fuera de DataProvider');
  return c;
}
