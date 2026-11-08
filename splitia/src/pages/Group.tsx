import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Camera, CheckCircle2, Copy, Download, FileText, HandCoins, LogOut, Pencil, Plus, Receipt, Search, Share2, Trash2, Undo2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { simplifyDebts } from '../lib/balances';
import { CATEGORIES } from '../lib/categories';
import { downloadText, expensesToCsv } from '../lib/csv';
import { dayLabel, money, shortDate, signedMoney } from '../lib/format';
import { addPayment, deleteGroup, deletePayment, leaveGroup, renameGroup } from '../lib/mutations';
import { expenseShares } from '../lib/balances';
import type { Expense } from '../lib/types';
import { Bars, Donut } from '../components/Charts';
import { ExpenseDetail } from '../components/ExpenseDetail';
import { Recurring } from '../components/Recurring';
import { AnimatedNumber, Avatar, Button, ConfirmSheet, Empty, Field, IconBadge, NavBar, PullIndicator, Row, Section, Segmented, Sheet, Skeletons, cx, useToast, usePullToRefresh } from '../components/ui';
import { format, parseISO, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

type Tab = 'expenses' | 'balances' | 'summary' | 'more';

export default function GroupPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { group, loading, reload } = useData();
  const toast = useToast();
  const g = group(id);
  const { pull, busy: pulling } = usePullToRefresh(reload);

  const [tab, setTab] = useState<Tab>('expenses');
  const [open, setOpen] = useState<Expense | null>(null);
  const [addMenu, setAddMenu] = useState(false);
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [settle, setSettle] = useState<{ from: string; to: string; amount: string } | null>(null);
  const [rename, setRename] = useState<string | null>(null);
  const [danger, setDanger] = useState<'leave' | 'delete' | null>(null);
  const [payDel, setPayDel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const me = user!.id;
  const name = (uid: string) => g?.members.find((m) => m.user_id === uid)?.display_name ?? 'Alguien';
  const avatar = (uid: string) => g?.members.find((m) => m.user_id === uid)?.avatar_url;
  const catOf = (e: Expense) => {
    const c = g?.customCategories.find((x) => x.id === e.custom_category_id);
    return c ? { label: c.name, color: c.color, key: c.id } : { ...(CATEGORIES[e.category] ?? CATEGORIES.otros), key: e.category };
  };

  const filtered = useMemo(() => {
    if (!g) return [];
    const q = query.trim().toLowerCase();
    return g.expenses.filter((e) => (!q || e.concept.toLowerCase().includes(q)) && (!catFilter || (e.custom_category_id ?? e.category) === catFilter));
  }, [g, query, catFilter]);

  const grouped = useMemo(() => {
    const m = new Map<string, Expense[]>();
    filtered.forEach((e) => { const k = (e.expense_date ?? e.created_at).slice(0, 10); m.set(k, [...(m.get(k) ?? []), e]); });
    return [...m.entries()];
  }, [filtered]);

  if (loading && !g) return <><NavBar back="/" title="Grupo" /><Skeletons /></>;
  if (!g) return <><NavBar back="/" title="Grupo" /><Empty icon={<Receipt size={48} />} title="Grupo no encontrado" /></>;

  const memberIds = g.members.map((m) => m.user_id);
  const myBal = g.balances[me] ?? 0;
  const transfers = simplifyDebts(g.balances);
  const signed = (e: Expense) => (e.is_refund ? -e.amount : e.amount);
  const total = g.expenses.reduce((s, e) => s + signed(e), 0);
  const isCreator = g.group.created_by === me;
  const shareOf = (e: Expense) => {
    const sh = expenseShares(e, g.splits, memberIds);
    const mine = sh[me] ?? 0;
    const sign = e.is_refund ? -1 : 1;
    return e.paid_by === me ? sign * (e.amount - mine) : -sign * mine;
  };

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try { await fn(); await reload(); toast(ok); } catch (e) { toast(e instanceof Error ? e.message : 'Error', 'error'); } finally { setBusy(false); }
  };

  const doSettle = (from: string, to: string, amount: number) => run(() => addPayment({ group_id: g.group.id, from_user: from, to_user: to, amount, created_by: me }), 'Pago registrado');

  const monthKeys = Array.from({ length: 6 }, (_, i) => format(subMonths(new Date(), 5 - i), 'yyyy-MM'));
  const byMonth = Object.fromEntries(monthKeys.map((k) => [k, 0]));
  const byCat = new Map<string, { label: string; color: string; value: number }>();
  const paidBy: Record<string, number> = {};
  g.expenses.forEach((e) => {
    const v = signed(e);
    const k = (e.expense_date ?? e.created_at).slice(0, 7);
    if (k in byMonth) byMonth[k] += v;
    const c = catOf(e);
    byCat.set(c.label, { label: c.label, color: c.color, value: (byCat.get(c.label)?.value ?? 0) + v });
    paidBy[e.paid_by] = (paidBy[e.paid_by] ?? 0) + v;
  });
  const slices = [...byCat.values()].filter((s) => s.value > 0).sort((a, b) => b.value - a.value);

  const share = async () => {
    const text = `Únete a «${g.group.name}» en SplitIA con el código ${g.group.invite_code}`;
    if (navigator.share) { try { await navigator.share({ title: 'SplitIA', text }); } catch { /* cancelado */ } }
    else { await navigator.clipboard?.writeText(text); toast('Invitación copiada'); }
  };

  return (
    <>
      <NavBar back="/" title={g.group.name} right={<button aria-label="Añadir gasto" onClick={() => setAddMenu(true)} className="press text-tint"><Plus size={28} /></button>} />
      <PullIndicator pull={pull} busy={pulling} />

      <div className="hero mx-4 mt-4 rounded-ios-lg p-5 text-center">
        <div className="text-[13px] opacity-80">{Math.abs(myBal) < 0.005 ? 'Estás al día' : myBal > 0 ? 'Te deben' : 'Debes'}</div>
        <div className="text-[44px] font-bold tracking-tight tabular-nums leading-tight"><AnimatedNumber value={Math.abs(myBal)} format={money} /></div>
        <div className="text-[13px] opacity-80">Total del grupo {money(total)}</div>
        <div className="flex justify-center -space-x-2 mt-3">
          {g.members.slice(0, 6).map((m) => <div key={m.user_id} className="ring-2 ring-white/60 rounded-full"><Avatar name={m.display_name} url={m.avatar_url} size={28} /></div>)}
        </div>
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[
            { l: 'Gasto', i: <Plus size={20} />, f: () => nav(`/group/${g.group.id}/expense/new`) },
            { l: 'Tickets', i: <Camera size={20} />, f: () => nav(`/group/${g.group.id}/ai/receipt`) },
            { l: 'Extracto', i: <FileText size={20} />, f: () => nav(`/group/${g.group.id}/ai/statement`) },
            { l: 'Liquidar', i: <HandCoins size={20} />, f: () => setSettle({ from: me, to: memberIds.find((x) => x !== me) ?? me, amount: '' }) },
          ].map((a) => (
            <button key={a.l} onClick={a.f} className="press flex flex-col items-center gap-1 rounded-2xl bg-white/20 py-2.5 text-[12px] font-semibold">{a.i}{a.l}</button>
          ))}
        </div>
      </div>

      <Segmented value={tab} onChange={setTab} options={[{ value: 'expenses', label: 'Gastos' }, { value: 'balances', label: 'Saldos' }, { value: 'summary', label: 'Resumen' }, { value: 'more', label: 'Más' }]} />

      {tab === 'expenses' && (
        <>
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-[10px] bg-fill/12 px-3">
            <Search size={16} className="text-sub" />
            <input aria-label="Buscar gastos" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar gastos" className="flex-1 bg-transparent py-2 text-[16px]" />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pt-3">
            {[...Object.entries(CATEGORIES).map(([k, c]) => ({ key: k, label: c.label })), ...g.customCategories.map((c) => ({ key: c.id, label: c.name }))].map((c) => (
              <button key={c.key} onClick={() => setCatFilter(catFilter === c.key ? null : c.key)} className={cx('press shrink-0 h-8 px-3 rounded-full text-[13px] font-medium border', catFilter === c.key ? 'bg-tint text-white border-transparent' : 'border-line/50')}>{c.label}</button>
            ))}
          </div>
          {grouped.length === 0 ? (
            <Empty icon={<Receipt size={48} />} title={g.expenses.length ? 'Sin resultados' : 'Aún no hay gastos'} text={g.expenses.length ? 'Prueba con otra búsqueda o filtro.' : 'Añade uno a mano o sube fotos de tickets.'} />
          ) : grouped.map(([day, list]) => (
            <Section key={day} title={dayLabel(day)}>
              {list.map((e) => {
                const c = catOf(e);
                const Icon = (CATEGORIES[e.category] ?? CATEGORIES.otros).icon;
                const s = shareOf(e);
                return (
                  <Row key={e.id} onClick={() => setOpen(e)} icon={<IconBadge color={c.color}>{e.is_refund ? <Undo2 size={18} /> : <Icon size={18} />}</IconBadge>}
                    title={e.concept} subtitle={e.paid_by === me ? 'Pagaste tú' : `Pagó ${name(e.paid_by)}`}>
                    <div className="text-right">
                      <div className="text-[17px] font-medium tabular-nums">{e.is_refund ? '−' : ''}{money(e.amount)}</div>
                      {Math.abs(s) > 0.005 && <div className={`text-[12px] tabular-nums ${s > 0 ? 'text-pos' : 'text-neg'}`}>{s > 0 ? 'te deben ' : 'debes '}{money(Math.abs(s))}</div>}
                    </div>
                  </Row>
                );
              })}
            </Section>
          ))}
        </>
      )}

      {tab === 'balances' && (
        <>
          <Section title="Saldos">
            {g.members.map((m) => {
              const b = g.balances[m.user_id] ?? 0;
              return <Row key={m.user_id} icon={<Avatar name={m.display_name} url={m.avatar_url} />} title={m.user_id === me ? `${m.display_name} (tú)` : m.display_name}
                subtitle={b > 0.005 ? 'recibe' : b < -0.005 ? 'debe' : 'al día'}
                value={<span className={`font-semibold tabular-nums ${b > 0.005 ? 'text-pos' : b < -0.005 ? 'text-neg' : 'text-sub'}`}>{signedMoney(b)}</span>} />;
            })}
          </Section>
          <Section title="Para dejarlo a cero" footer={transfers.length ? 'Pagos mínimos. «Pagado» registra el pago y actualiza los saldos.' : undefined}>
            {transfers.length === 0 ? (
              <div className="flex flex-col items-center gap-1 py-8 text-pos"><CheckCircle2 size={40} /><span className="font-semibold">¡Todo saldado!</span></div>
            ) : transfers.map((t) => (
              <div key={`${t.from}-${t.to}`} className="flex items-center gap-2 px-4 py-3">
                <Avatar name={name(t.from)} url={avatar(t.from)} size={30} /><ArrowRight size={16} className="text-sub" /><Avatar name={name(t.to)} url={avatar(t.to)} size={30} />
                <div className="flex-1 min-w-0 text-[15px] truncate">{name(t.from)} → {name(t.to)}</div>
                <span className="font-semibold tabular-nums">{money(t.amount)}</span>
                <Button variant="tinted" className="!h-8 !px-3 text-[14px] !rounded-full" disabled={busy} onClick={() => doSettle(t.from, t.to, t.amount)}>Pagado</Button>
              </div>
            ))}
          </Section>
          {g.adjustments.length > 0 && (
            <Section title="Pagos registrados">
              {[...g.adjustments].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 20).map((a) => (
                <Row key={a.id} icon={<IconBadge color="#34c759"><HandCoins size={18} /></IconBadge>} title={`${name(a.from_user)} pagó a ${name(a.to_user)}`} subtitle={shortDate(a.created_at)}>
                  <span className="tabular-nums">{money(Number(a.amount))}</span>
                  <button aria-label="Eliminar pago" onClick={() => setPayDel(a.id)} className="text-sub"><Trash2 size={17} /></button>
                </Row>
              ))}
            </Section>
          )}
        </>
      )}

      {tab === 'summary' && (
        <>
          <Section title="Últimos 6 meses"><Bars data={monthKeys.map((k) => ({ label: format(parseISO(`${k}-01`), 'MMM', { locale: es }), value: byMonth[k] }))} /></Section>
          <Section title="Por categoría">{slices.length ? <Donut slices={slices} /> : <div className="p-6 text-center text-sub">Sin gastos todavía</div>}</Section>
          <Section title="Quién ha pagado más">
            {g.members.map((m) => <Row key={m.user_id} icon={<Avatar name={m.display_name} url={m.avatar_url} size={32} />} title={m.display_name} value={<span className="tabular-nums">{money(paidBy[m.user_id] ?? 0)}</span>} />)}
          </Section>
        </>
      )}

      {tab === 'more' && (
        <>
          <Recurring g={g} />
          <Section title="Grupo">
            <Row onClick={share} icon={<Share2 size={20} className="text-tint" />} title="Invitar" subtitle="Comparte el código de invitación" value={<span className="font-mono text-[15px]">{g.group.invite_code}</span>} />
            <Row onClick={async () => { await navigator.clipboard?.writeText(g.group.invite_code); toast('Código copiado'); }} icon={<Copy size={20} className="text-tint" />} title="Copiar código" />
            <Row onClick={() => downloadText(`${g.group.name}.csv`, expensesToCsv(g.expenses, name))} icon={<Download size={20} className="text-tint" />} title="Exportar gastos a CSV" subtitle="Para abrir en Excel" />
            {isCreator && <Row onClick={() => setRename(g.group.name)} icon={<Pencil size={20} className="text-tint" />} title="Cambiar nombre" />}
          </Section>
          <Section>
            {!isCreator && <Row onClick={() => setDanger('leave')} danger icon={<LogOut size={20} className="text-neg" />} title="Salir del grupo" />}
            {isCreator && <Row onClick={() => setDanger('delete')} danger icon={<Trash2 size={20} className="text-neg" />} title="Eliminar grupo" subtitle="Borra el grupo y todos sus gastos" />}
          </Section>
        </>
      )}

      <Sheet open={addMenu} onClose={() => setAddMenu(false)} title="Añadir">
        <Section>
          <Row onClick={() => nav(`/group/${g.group.id}/expense/new`)} icon={<IconBadge color="#5e5ce6"><Plus size={20} /></IconBadge>} title="Gasto manual" chevron />
          <Row onClick={() => nav(`/group/${g.group.id}/ai/receipt`)} icon={<IconBadge color="#34c759"><Camera size={20} /></IconBadge>} title="Fotos de tickets con IA" subtitle="Una o varias a la vez" chevron />
          <Row onClick={() => nav(`/group/${g.group.id}/ai/statement`)} icon={<IconBadge color="#bf5af2"><FileText size={20} /></IconBadge>} title="Extracto bancario con IA" subtitle="Sube capturas de pantalla" chevron />
        </Section>
      </Sheet>

      <Sheet open={!!settle} onClose={() => setSettle(null)} title="Registrar pago">
        {settle && (
          <>
            <Section>
              <Row title="Quién paga" value={<select aria-label="Quién paga" value={settle.from} onChange={(e) => setSettle({ ...settle, from: e.target.value })} className="bg-transparent text-tint">{g.members.map((m) => <option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}</select>} />
              <Row title="A quién" value={<select aria-label="A quién" value={settle.to} onChange={(e) => setSettle({ ...settle, to: e.target.value })} className="bg-transparent text-tint">{g.members.map((m) => <option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}</select>} />
              <div className="px-4"><Field inputMode="decimal" placeholder="Importe €" value={settle.amount} onChange={(e) => setSettle({ ...settle, amount: e.target.value })} /></div>
            </Section>
            <div className="mx-4 mt-5">
              <Button className="w-full" loading={busy} disabled={settle.from === settle.to || !(parseFloat(settle.amount.replace(',', '.')) > 0)}
                onClick={async () => { await doSettle(settle.from, settle.to, parseFloat(settle.amount.replace(',', '.'))); setSettle(null); }}>Registrar pago</Button>
            </div>
          </>
        )}
      </Sheet>

      <Sheet open={rename !== null} onClose={() => setRename(null)} title="Nombre del grupo">
        <Section><div className="px-4"><Field value={rename ?? ''} onChange={(e) => setRename(e.target.value)} /></div></Section>
        <div className="mx-4 mt-5"><Button className="w-full" loading={busy} disabled={!rename?.trim()} onClick={async () => { await run(() => renameGroup(g.group.id, rename!.trim()), 'Nombre actualizado'); setRename(null); }}>Guardar</Button></div>
      </Sheet>

      <ConfirmSheet open={danger === 'leave'} title="¿Salir del grupo?" text="Dejarás de ver sus gastos." confirmLabel="Salir" busy={busy}
        onConfirm={async () => { await run(() => leaveGroup(g.group.id, me), 'Has salido del grupo'); setDanger(null); nav('/', { replace: true }); }} onClose={() => setDanger(null)} />
      <ConfirmSheet open={danger === 'delete'} title="¿Eliminar el grupo?" text="Se borrarán todos sus gastos, pagos y comentarios para todos. No se puede deshacer." confirmLabel="Eliminar grupo" busy={busy}
        onConfirm={async () => { await run(() => deleteGroup(g.group.id), 'Grupo eliminado'); setDanger(null); nav('/', { replace: true }); }} onClose={() => setDanger(null)} />
      <ConfirmSheet open={!!payDel} title="¿Eliminar este pago?" text="Los saldos volverán a como estaban antes del pago." confirmLabel="Eliminar" busy={busy}
        onConfirm={async () => { await run(() => deletePayment(payDel!), 'Pago eliminado'); setPayDel(null); }} onClose={() => setPayDel(null)} />

      <ExpenseDetail expense={open} g={g} onClose={() => setOpen(null)} />
    </>
  );
}
