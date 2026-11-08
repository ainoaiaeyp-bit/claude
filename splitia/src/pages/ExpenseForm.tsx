import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, Paperclip, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { CATEGORIES } from '../lib/categories';
import { saveExpense } from '../lib/mutations';
import { supabase } from '../lib/supabase';
import { computeSplits, splitError, toStorage, type SplitMode } from '../lib/splits';
import { money, todayISO } from '../lib/format';
import type { ExpenseCategory } from '../lib/types';
import { Avatar, Button, Checkbox, Field, NavBar, Row, Section, Segmented, Toggle, cx, useToast } from '../components/ui';

const MODES: { value: SplitMode; label: string }[] = [
  { value: 'equal', label: 'Igual' }, { value: 'exact', label: 'Importes' },
  { value: 'percent', label: '%' }, { value: 'shares', label: 'Partes' },
];

export default function ExpenseForm() {
  const { id, eid } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { group, reload } = useData();
  const toast = useToast();
  const g = group(id);
  const editing = g?.expenses.find((e) => e.id === eid);
  const memberIds = useMemo(() => g?.members.map((m) => m.user_id) ?? [], [g]);

  // Estado inicial: vacío o el gasto que se edita.
  const init = useMemo(() => {
    if (!editing || !g) return null;
    const sp = g.splits.filter((s) => s.expense_id === editing.id);
    let participants = memberIds, mode: SplitMode = 'equal';
    const values: Record<string, number> = {};
    if (editing.split_type === 'other_full' && editing.split_with) participants = [editing.split_with];
    else if (editing.split_type === 'payer_full') participants = [editing.paid_by];
    else if (editing.split_type === 'custom') {
      participants = sp.map((s) => s.user_id); mode = 'exact';
      sp.forEach((s) => (values[s.user_id] = Number(s.amount)));
    }
    return { participants, mode, values };
  }, [editing, g, memberIds]);

  const [amount, setAmount] = useState(editing ? String(editing.amount).replace('.', ',') : '');
  const [concept, setConcept] = useState(editing?.concept ?? '');
  const [category, setCategory] = useState<string>(editing?.custom_category_id ?? editing?.category ?? 'otros');
  const [paidBy, setPaidBy] = useState(editing?.paid_by ?? user!.id);
  const [date, setDate] = useState(editing?.expense_date ?? todayISO());
  const [notes, setNotes] = useState(editing?.observations ?? '');
  const [refund, setRefund] = useState(editing?.is_refund ?? false);
  const [mode, setMode] = useState<SplitMode>(init?.mode ?? 'equal');
  const [participants, setParticipants] = useState<string[]>(init?.participants ?? memberIds);
  const [values, setValues] = useState<Record<string, number>>(init?.values ?? {});
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!g) return <NavBar back="/" title="Gasto" />;
  if (eid && !editing) return <NavBar back={`/group/${g.group.id}`} title="Gasto no encontrado" />;

  const total = parseFloat(amount.replace(',', '.')) || 0;
  const err = total > 0 ? splitError(mode, total, participants, values) : null;
  const preview = total > 0 && !err ? computeSplits(mode, total, participants, values) : [];
  const valid = total > 0 && concept.trim().length > 0 && !err;

  const toggle = (uid: string) => setParticipants((p) => (p.includes(uid) ? p.filter((x) => x !== uid) : [...p, uid]));
  const setVal = (uid: string, raw: string) => setValues((v) => ({ ...v, [uid]: parseFloat(raw.replace(',', '.')) || 0 }));

  const save = async () => {
    setBusy(true);
    try {
      const lines = computeSplits(mode, total, participants, values);
      const st = toStorage(lines, memberIds, paidBy);
      const isCustomCat = category.includes('-');
      const expenseId = await saveExpense({
        group_id: g.group.id, concept: concept.trim(), amount: Math.round(total * 100) / 100, paid_by: paidBy,
        category: (isCustomCat ? 'otros' : category) as ExpenseCategory, custom_category_id: isCustomCat ? category : null,
        split_type: st.split_type, split_with: st.split_with, expense_date: date,
        observations: notes.trim() || null, is_refund: refund,
      }, st.splits, editing?.id);
      for (const f of files) {
        const path = `${user!.id}/${expenseId}/${Date.now()}-${f.name.replace(/[^\w.-]/g, '_')}`;
        const up = await supabase.storage.from('expense-attachments').upload(path, f);
        if (!up.error) await supabase.from('expense_attachments').insert({ expense_id: expenseId, file_url: path, file_name: f.name, file_type: f.type } as never);
      }
      await reload();
      toast(editing ? 'Gasto actualizado' : 'Gasto guardado');
      nav(`/group/${g.group.id}`, { replace: true });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo guardar', 'error');
    } finally { setBusy(false); }
  };

  const recent = [...new Set(g.expenses.slice(0, 200).map((e) => e.concept))].slice(0, 30);

  return (
    <>
      <NavBar back title={editing ? 'Editar gasto' : 'Nuevo gasto'}
        right={<button onClick={save} disabled={!valid || busy} className="press text-tint font-semibold text-[17px] disabled:opacity-40">Guardar</button>} />

      <div className="text-center mt-6 px-8">
        <div className="flex items-baseline justify-center gap-1.5">
          <input aria-label="Importe" inputMode="decimal" autoFocus={!editing} placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)}
            style={{ width: `${Math.min(9, Math.max(4, amount.length + 1))}ch` }}
            className="bg-transparent text-center text-[60px] font-bold tracking-tight max-w-full placeholder:text-sub/40 tabular-nums" />
          <span className="text-[34px] font-semibold text-sub">€</span>
        </div>
      </div>

      <Section>
        <div className="px-4">
          <Field list="recent" placeholder="Concepto (Mercadona, gasolina…)" value={concept} onChange={(e) => setConcept(e.target.value)} maxLength={200} />
          <datalist id="recent">{recent.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-3">
          {(Object.keys(CATEGORIES) as ExpenseCategory[]).map((c) => {
            const { label, color, icon: Icon } = CATEGORIES[c];
            const on = category === c;
            return (
              <button key={c} onClick={() => setCategory(c)} className={cx('press shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-full text-[14px] font-medium border', on ? 'text-white border-transparent' : 'border-line/50')} style={on ? { background: color } : undefined}>
                <Icon size={15} />{label}
              </button>
            );
          })}
          {g.customCategories.map((c) => (
            <button key={c.id} onClick={() => setCategory(c.id)} className={cx('press shrink-0 h-9 px-3 rounded-full text-[14px] font-medium border', category === c.id ? 'text-white border-transparent' : 'border-line/50')} style={category === c.id ? { background: c.color } : undefined}>{c.name}</button>
          ))}
        </div>
      </Section>

      <Section>
        <Row title="Pagado por" value={
          <select aria-label="Pagado por" value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className="bg-transparent text-tint text-right">
            {g.members.map((m) => <option key={m.user_id} value={m.user_id}>{m.user_id === user!.id ? 'Yo' : m.display_name}</option>)}
          </select>} />
        <Row title="Fecha" value={<input aria-label="Fecha" type="date" max={todayISO()} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="bg-transparent text-tint" />} />
        <Row title="Es una devolución" subtitle="Resta del total y revierte saldos"><Toggle checked={refund} onChange={setRefund} label="Devolución" /></Row>
      </Section>

      <Segmented value={mode} onChange={(m) => { setMode(m); setValues({}); }} options={MODES} />
      <Section title="Dividir entre" footer={err ?? (mode === 'equal' ? 'Elige quién participa en el gasto.' : undefined)}>
        {g.members.map((m) => {
          const on = participants.includes(m.user_id);
          const share = preview.find((p) => p.user_id === m.user_id)?.amount;
          return (
            <div key={m.user_id} className="flex items-center gap-3 px-4 py-2.5 min-h-[52px]">
              {mode === 'equal' && <Checkbox checked={on} onChange={() => toggle(m.user_id)} />}
              <Avatar name={m.display_name} url={m.avatar_url} size={34} />
              <div className="flex-1 min-w-0 truncate text-[17px]">{m.user_id === user!.id ? `${m.display_name} (tú)` : m.display_name}</div>
              {mode === 'equal' ? (
                on && share !== undefined && <span className="tabular-nums text-sub">{money(share)}</span>
              ) : (
                <div className="flex items-center gap-2">
                  <input aria-label={`Valor de ${m.display_name}`} inputMode="decimal" placeholder="0" value={values[m.user_id] ? String(values[m.user_id]).replace('.', ',') : ''}
                    onChange={(e) => { setVal(m.user_id, e.target.value); setParticipants((p) => (p.includes(m.user_id) ? p : [...p, m.user_id])); }}
                    className="w-20 text-right bg-fill/10 rounded-md px-2 py-1 tabular-nums" />
                  <span className="text-sub w-9 text-[14px]">{mode === 'exact' ? '€' : mode === 'percent' ? '%' : 'partes'}</span>
                </div>
              )}
            </div>
          );
        })}
      </Section>

      <Section title="Notas y adjuntos">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} placeholder="Notas (opcional)" className="w-full bg-transparent px-4 py-3 resize-none placeholder:text-sub/60" />
        {!editing && (
          <>
            <input ref={fileRef} type="file" accept="image/*,.pdf" multiple hidden onChange={(e) => { const p = Array.from(e.target.files ?? []); e.target.value = ''; setFiles((f) => [...f, ...p]); }} />
            <Row onClick={() => fileRef.current?.click()} icon={<Paperclip size={20} className="text-tint" />} title="Adjuntar foto o PDF" />
            {files.map((f, i) => (
              <Row key={i} title={<span className="text-[15px]">{f.name}</span>}>
                <button aria-label="Quitar" onClick={() => setFiles((x) => x.filter((_, k) => k !== i))} className="text-sub"><X size={18} /></button>
              </Row>
            ))}
          </>
        )}
      </Section>

      {!editing && (
        <div className="mx-4 mt-5">
          <Button variant="tinted" className="w-full" onClick={() => nav(`/group/${g.group.id}/ai/receipt`)}><Camera size={20} />Mejor: escanear tickets con IA</Button>
        </div>
      )}
    </>
  );
}
