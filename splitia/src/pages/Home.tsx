import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Wallet, KeyRound } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { supabase } from '../lib/supabase';
import { money, signedMoney } from '../lib/format';
import { AnimatedNumber, Button, Empty, Field, GroupAvatar, IconBadge, NavBar, PullIndicator, Row, Section, Sheet, Skeletons, useToast, usePullToRefresh } from '../components/ui';

export default function Home() {
  const { user } = useAuth();
  const { snap, loading, error, reload } = useData();
  const nav = useNavigate();
  const toast = useToast();
  const { pull, busy: pulling } = usePullToRefresh(reload);
  const [sheet, setSheet] = useState<'new' | 'join' | 'menu' | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const mine = (b: Record<string, number>) => b[user!.id] ?? 0;
  const groups = snap?.groups ?? [];
  const owed = groups.reduce((s, g) => s + Math.max(0, mine(g.balances)), 0);
  const owe = groups.reduce((s, g) => s + Math.max(0, -mine(g.balances)), 0);
  const net = owed - owe;

  const create = async () => {
    setBusy(true);
    const { error: e } = await supabase.from('groups').insert({ name: text.trim(), created_by: user!.id } as never);
    setBusy(false);
    if (e) return toast(e.message, 'error');
    setSheet(null); setText(''); toast('Grupo creado'); void reload();
  };
  const join = async () => {
    setBusy(true);
    const { error: e } = await supabase.rpc('join_group_by_code', { code: text.trim() });
    setBusy(false);
    if (e) return toast(e.message, 'error');
    setSheet(null); setText(''); toast('Te has unido al grupo'); void reload();
  };

  return (
    <>
      <NavBar large title="Grupos" right={<button aria-label="Nuevo grupo" onClick={() => setSheet('menu')} className="press text-tint"><Plus size={28} /></button>} />
      <PullIndicator pull={pull} busy={pulling} />
      {loading && !snap ? <Skeletons /> : error ? (
        <Empty icon={<Wallet size={48} />} title="No se pudo cargar" text={error} action={<Button onClick={() => void reload()}>Reintentar</Button>} />
      ) : (
        <>
          <div className="hero mx-4 mt-4 rounded-ios-lg p-5">
            <div className="text-[13px] opacity-80">Balance total</div>
            <div className="text-[40px] font-bold tracking-tight tabular-nums leading-tight">
              {net > 0.005 ? '+' : net < -0.005 ? '−' : ''}<AnimatedNumber value={Math.abs(net)} format={money} />
            </div>
            <div className="flex gap-6 mt-2 text-[14px]">
              <div><div className="opacity-75 text-[12px]">Te deben</div><div className="font-semibold tabular-nums">{money(owed)}</div></div>
              <div><div className="opacity-75 text-[12px]">Debes</div><div className="font-semibold tabular-nums">{money(owe)}</div></div>
            </div>
          </div>
          {groups.length === 0 ? (
            <Empty icon={<Users size={56} />} title="Sin grupos" text="Crea un grupo o únete con un código de invitación." action={<Button onClick={() => setSheet('new')}>Crear grupo</Button>} />
          ) : (
            <Section title="Tus grupos">
              {groups.map((g) => {
                const b = mine(g.balances);
                return (
                  <Row key={g.group.id} onClick={() => nav(`/group/${g.group.id}`)} chevron icon={<GroupAvatar name={g.group.name} />}
                    title={g.group.name} subtitle={`${g.members.length} personas · ${g.expenses.length} gastos`}>
                    <span className={`text-[15px] font-semibold tabular-nums ${b > 0.005 ? 'text-pos' : b < -0.005 ? 'text-neg' : 'text-sub'}`}>{Math.abs(b) < 0.005 ? 'Saldado' : signedMoney(b)}</span>
                  </Row>
                );
              })}
            </Section>
          )}
        </>
      )}

      <Sheet open={sheet === 'menu'} onClose={() => setSheet(null)} title="Añadir">
        <Section>
          <Row onClick={() => setSheet('new')} icon={<IconBadge color="#34c759"><Plus size={20} /></IconBadge>} title="Crear grupo" chevron />
          <Row onClick={() => setSheet('join')} icon={<IconBadge color="#ff9f0a"><KeyRound size={20} /></IconBadge>} title="Unirme con código" chevron />
        </Section>
      </Sheet>
      <Sheet open={sheet === 'new' || sheet === 'join'} onClose={() => { setSheet(null); setText(''); }} title={sheet === 'new' ? 'Nuevo grupo' : 'Unirse a un grupo'}>
        <Section footer={sheet === 'join' ? 'Pídele el código de invitación a quien creó el grupo.' : undefined}>
          <div className="px-4"><Field autoFocus placeholder={sheet === 'new' ? 'Nombre del grupo' : 'Código de invitación'} value={text} onChange={(e) => setText(e.target.value)} autoCapitalize="off" /></div>
        </Section>
        <div className="mx-4 mt-5"><Button className="w-full" loading={busy} disabled={!text.trim()} onClick={sheet === 'new' ? create : join}>{sheet === 'new' ? 'Crear' : 'Unirme'}</Button></div>
      </Sheet>
    </>
  );
}
