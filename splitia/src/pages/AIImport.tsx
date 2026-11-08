import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Camera, FileText, ImagePlus, Sparkles, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { extractFromImages, type ImportMode } from '../lib/ai';
import { findDuplicate } from '../lib/balances';
import { CATEGORIES, SPLIT_LABELS } from '../lib/categories';
import { createExpenses } from '../lib/save';
import { money, todayISO } from '../lib/format';
import type { DetectedExpense, ExpenseCategory, SplitType } from '../lib/types';
import { Button, Checkbox, Empty, NavBar, Row, Section, cx, useToast } from '../components/ui';

interface Line { d: DetectedExpense; on: boolean; dup: boolean }

export default function AIImport() {
  const { id, mode: m } = useParams();
  const mode: ImportMode = m === 'statement' ? 'statement' : 'receipt';
  const nav = useNavigate();
  const { user } = useAuth();
  const { group, reload } = useData();
  const toast = useToast();
  const g = group(id);
  const input = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [lines, setLines] = useState<Line[] | null>(null);
  const [paidBy, setPaidBy] = useState(user!.id);
  const [split, setSplit] = useState<SplitType>('split_equal');
  const [splitWith, setSplitWith] = useState('');
  const [saving, setSaving] = useState(false);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  if (!g) return <NavBar back="/" title="Importar" />;

  const isStatement = mode === 'statement';
  const title = isStatement ? 'Extracto bancario' : 'Tickets';

  const analyze = async () => {
    setProgress([0, files.length]);
    const { expenses, failed } = await extractFromImages(files, mode, (d, t) => setProgress([d, t]));
    setProgress(null);
    if (failed.length) toast(failed[0].message, 'error');
    if (!expenses.length) { if (!failed.length) toast('No se detectó ningún gasto', 'error'); return; }
    setLines(expenses.map((d) => {
      const dup = findDuplicate(g.expenses, { amount: d.amount, date: d.date });
      return { d, dup, on: d.kind === 'expense' && !dup };
    }));
  };

  const patch = (i: number, p: Partial<DetectedExpense>) => setLines((ls) => ls!.map((l, k) => (k === i ? { ...l, d: { ...l.d, ...p } } : l)));
  const toggle = (i: number, on: boolean) => setLines((ls) => ls!.map((l, k) => (k === i ? { ...l, on } : l)));

  const chosen = lines?.filter((l) => l.on) ?? [];
  const total = chosen.reduce((s, l) => s + (l.d.is_refund ? -l.d.amount : l.d.amount), 0);
  const needsWith = split === 'other_full';
  const canSave = chosen.length > 0 && (!needsWith || (splitWith && splitWith !== paidBy));

  const save = async () => {
    setSaving(true);
    try {
      const { saved, attachmentErrors } = await createExpenses(
        chosen.map(({ d }) => ({
          group_id: g.group.id, concept: d.concept, amount: d.amount, paid_by: paidBy, split_type: split,
          split_with: needsWith ? splitWith : null, category: d.category, expense_date: d.date ?? todayISO(),
          is_refund: d.is_refund,
          observations: d.items.length ? `Items:\n${d.items.map((i) => `• ${i.name}: ${i.price.toFixed(2)}€`).join('\n')}` : null,
          attachment: isStatement ? undefined : files[d.source],
        })),
        user!.id,
      );
      await reload();
      toast(`${saved} gastos guardados${attachmentErrors ? ' (alguna foto no se pudo adjuntar)' : ''}`);
      nav(`/group/${g.group.id}`, { replace: true });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo guardar', 'error');
    } finally { setSaving(false); }
  };

  /* ---------- Paso 3: revisión ---------- */
  if (lines) {
    return (
      <>
        <NavBar back title="Revisar" right={<button onClick={() => setLines(null)} className="press text-tint text-[17px]">Otra vez</button>} />
        <p className="mx-6 mt-3 text-[14px] text-sub">La IA detectó {lines.length} movimientos. Revisa, corrige lo que haga falta y desmarca lo que no quieras.</p>

        <Section title="Aplicar a todos">
          <Row title="Pagado por" value={
            <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className="bg-transparent text-tint text-right">
              {g.members.map((x) => <option key={x.user_id} value={x.user_id}>{x.user_id === user!.id ? 'Yo' : x.display_name}</option>)}
            </select>} />
          <Row title="Reparto" value={
            <select value={split} onChange={(e) => setSplit(e.target.value as SplitType)} className="bg-transparent text-tint text-right max-w-[200px]">
              {(['split_equal', 'payer_full', 'other_full'] as SplitType[]).map((s) => <option key={s} value={s}>{SPLIT_LABELS[s]}</option>)}
            </select>} />
          {needsWith && <Row title="¿Quién lo paga?" value={
            <select value={splitWith} onChange={(e) => setSplitWith(e.target.value)} className="bg-transparent text-tint text-right">
              <option value="">Elegir…</option>
              {g.members.filter((x) => x.user_id !== paidBy).map((x) => <option key={x.user_id} value={x.user_id}>{x.display_name}</option>)}
            </select>} />}
        </Section>

        <Section title={`Movimientos (${chosen.length}/${lines.length})`}>
          {lines.map((l, i) => (
            <div key={i} className={cx('px-4 py-3 flex gap-3', !l.on && 'opacity-50')}>
              <div className="pt-1"><Checkbox checked={l.on} onChange={(v) => toggle(i, v)} /></div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <input value={l.d.concept} onChange={(e) => patch(i, { concept: e.target.value })} aria-label="Concepto" className="w-full bg-transparent text-[17px] font-medium" />
                <div className="flex items-center gap-2 flex-wrap">
                  <input value={l.d.amount} inputMode="decimal" aria-label="Importe" onChange={(e) => patch(i, { amount: Math.abs(parseFloat(e.target.value.replace(',', '.'))) || 0 })} className="w-20 bg-fill/10 rounded-md px-2 py-1 text-[15px] tabular-nums" />
                  <span className="text-sub text-[15px]">€</span>
                  <input type="date" value={l.d.date ?? ''} max={todayISO()} aria-label="Fecha" onChange={(e) => patch(i, { date: e.target.value || null })} className="bg-fill/10 rounded-md px-2 py-1 text-[14px]" />
                  <select value={l.d.category} aria-label="Categoría" onChange={(e) => patch(i, { category: e.target.value as ExpenseCategory })} className="bg-fill/10 rounded-md px-2 py-1 text-[14px]">
                    {Object.entries(CATEGORIES).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
                  </select>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {l.dup && <Badge tone="warn"><AlertTriangle size={11} />Posible duplicado</Badge>}
                  {l.d.kind !== 'expense' && <Badge tone="info">{l.d.kind === 'income' ? 'Ingreso' : 'Transferencia'}</Badge>}
                  {l.d.is_refund && <Badge tone="info">Devolución</Badge>}
                  {l.d.confidence < 0.6 && <Badge tone="warn">Revisar: poca certeza</Badge>}
                  {l.d.items.length > 0 && <Badge tone="info">{l.d.items.length} artículos</Badge>}
                </div>
              </div>
            </div>
          ))}
        </Section>

        <div className="fixed bottom-0 inset-x-0 z-40 glass border-t hairline px-4 pt-3" style={{ paddingBottom: 'calc(var(--sab) + 12px)' }}>
          <div className="max-w-xl mx-auto"><Button className="w-full" loading={saving} disabled={!canSave} onClick={save}>Guardar {chosen.length} gastos · {money(total)}</Button></div>
        </div>
      </>
    );
  }

  /* ---------- Pasos 1-2: elegir fotos y analizar ---------- */
  return (
    <>
      <NavBar back title={title} />
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { const picked = Array.from(e.target.files ?? []); e.target.value = ''; setFiles((f) => [...f, ...picked]); }} />

      {files.length === 0 ? (
        <Empty
          icon={isStatement ? <FileText size={56} /> : <Camera size={56} />}
          title={isStatement ? 'Sube capturas de tu extracto' : 'Sube fotos de tus tickets'}
          text={isStatement ? 'Pantallazos de tu app del banco o del PDF. La IA lee cada movimiento y tú eliges cuáles registrar.' : 'Una o varias fotos a la vez. La IA lee comercio, fecha, importe y categoría.'}
          action={<Button onClick={() => input.current?.click()}><ImagePlus size={20} />Elegir imágenes</Button>}
        />
      ) : (
        <>
          <div className="mx-4 mt-4 grid grid-cols-3 gap-2">
            {previews.map((src, i) => (
              <div key={src} className="relative aspect-[3/4] rounded-ios overflow-hidden bg-card">
                <img src={src} alt={`Imagen ${i + 1}`} className="size-full object-cover" />
                {!progress && <button aria-label="Quitar" onClick={() => setFiles((f) => f.filter((_, k) => k !== i))} className="absolute top-1 right-1 size-6 rounded-full bg-black/60 text-white grid place-items-center"><X size={14} /></button>}
              </div>
            ))}
            {!progress && <button onClick={() => input.current?.click()} className="press aspect-[3/4] rounded-ios border-2 border-dashed border-line/60 grid place-items-center text-tint"><ImagePlus size={28} /></button>}
          </div>
          <div className="mx-4 mt-6">
            <Button className="w-full" loading={!!progress} onClick={analyze}>
              <Sparkles size={20} />{progress ? `Analizando ${progress[0]}/${progress[1]}…` : `Analizar ${files.length} ${files.length === 1 ? 'imagen' : 'imágenes'}`}
            </Button>
            {progress && <div className="h-1.5 rounded-full bg-fill/15 mt-3 overflow-hidden"><div className="h-full bg-tint transition-all" style={{ width: `${(progress[0] / progress[1]) * 100}%` }} /></div>}
          </div>
        </>
      )}
    </>
  );
}

function Badge({ tone, children }: { tone: 'warn' | 'info'; children: React.ReactNode }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', tone === 'warn' ? 'bg-warn/15 text-warn' : 'bg-fill/15 text-sub')}>{children}</span>;
}
