import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Activity as ActivityIcon, Camera, FileText, Plus, UserCircle, Users } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useData } from './hooks/useData';
import { backendConfigured } from './lib/supabase';
import { Empty, GroupAvatar, IconBadge, OfflineBanner, Row, Section, Sheet, Spinner, TabBar } from './components/ui';
import Auth, { SetPassword } from './pages/Auth';
import Home from './pages/Home';
import GroupPage from './pages/Group';
import ExpenseForm from './pages/ExpenseForm';
import AIImport from './pages/AIImport';
import Activity from './pages/Activity';
import Account from './pages/Account';

function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { snap } = useData();
  const nav = useNavigate();
  const [picked, setPicked] = useState<string | null>(null);
  const groups = snap?.groups ?? [];
  const gid = picked ?? (groups.length === 1 ? groups[0].group.id : null);
  const go = (path: string) => { onClose(); setPicked(null); nav(path); };
  return (
    <Sheet open={open} onClose={() => { onClose(); setPicked(null); }} title={gid ? 'Añadir' : 'Elige un grupo'}>
      {groups.length === 0 ? (
        <Empty icon={<Users size={44} />} title="Primero crea un grupo" action={<button className="text-tint font-semibold" onClick={() => go('/')}>Ir a grupos</button>} />
      ) : !gid ? (
        <Section>{groups.map((g) => <Row key={g.group.id} onClick={() => setPicked(g.group.id)} icon={<GroupAvatar name={g.group.name} size={38} />} title={g.group.name} chevron />)}</Section>
      ) : (
        <Section>
          <Row onClick={() => go(`/group/${gid}/expense/new`)} icon={<IconBadge color="#5e5ce6"><Plus size={20} /></IconBadge>} title="Gasto manual" chevron />
          <Row onClick={() => go(`/group/${gid}/ai/receipt`)} icon={<IconBadge color="#34c759"><Camera size={20} /></IconBadge>} title="Fotos de tickets con IA" subtitle="Una o varias a la vez" chevron />
          <Row onClick={() => go(`/group/${gid}/ai/statement`)} icon={<IconBadge color="#bf5af2"><FileText size={20} /></IconBadge>} title="Extracto bancario con IA" subtitle="Sube capturas de pantalla" chevron />
        </Section>
      )}
    </Sheet>
  );
}

export default function App() {
  const { user, loading, recovery } = useAuth();
  const { pathname } = useLocation();
  const [quick, setQuick] = useState(false);
  useEffect(() => { if (new URLSearchParams(window.location.search).get('action') === 'scan') setQuick(true); }, []);

  if (!backendConfigured) {
    return <Empty icon={<Users size={48} />} title="Falta configurar el servidor" text="Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY al compilar (ver README)." />;
  }
  if (loading) return <Spinner />;
  if (recovery) return <SetPassword />;
  if (!user) return <Auth />;

  const showTabs = pathname === '/' || pathname === '/activity' || pathname === '/account';
  return (
    <div className="max-w-xl mx-auto min-h-full pb-28">
      <OfflineBanner />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/account" element={<Account />} />
        <Route path="/group/:id" element={<GroupPage />} />
        <Route path="/group/:id/expense/new" element={<ExpenseForm />} />
        <Route path="/group/:id/expense/:eid" element={<ExpenseForm />} />
        <Route path="/group/:id/ai/:mode" element={<AIImport />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showTabs && (
        <TabBar onAdd={() => setQuick(true)} items={[
          { to: '/', label: 'Grupos', icon: <Users size={24} />, active: pathname === '/' },
          { to: '/activity', label: 'Actividad', icon: <ActivityIcon size={24} />, active: pathname === '/activity' },
          { to: '/account', label: 'Cuenta', icon: <UserCircle size={24} />, active: pathname === '/account' },
        ]} />
      )}
      <QuickAdd open={quick} onClose={() => setQuick(false)} />
    </div>
  );
}
