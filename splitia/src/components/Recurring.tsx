import { useCallback, useEffect, useState } from 'react';
import { Repeat, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import type { GroupBundle } from '../lib/data';
import { supabase } from '../lib/supabase';
import { money } from '../lib/format';
import { Button, Field, Row, Section, Sheet, Toggle, useToast } from './ui';

interface Rec { id: string; concept: string; amount: number; day_of_month: number; paid_by: string; is_active: boolean; created_by: string }

export function Recurring({ g }: { g: GroupBundle }) {
  const { user } = useAuth();
  const toast = useToast();
  const [list, setList] = useState<Rec[]>([]);
  const [open, setOpen] = useState(false);
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState(1);
  const [paidBy, setPaidBy] = useState(user!.id);

  const load = useCallback(async () => {
    const { data } = await supabase.from('recurring_expenses').select('*').eq('group_id', g.group.id).order('day_of_month');
    setList(((data ?? []) as Rec[]).map((r) => ({ ...r, amount: Number(r.amount) })));
  }, [g.group.id]);
  useEffect(() => { void load(); }, [load]);

  const name = (id: string) => g.members.find((m) => m.user_id === id)?.display_name ?? '';
  const amt = parseFloat(amount.replace(',', '.')) || 0;

  const create = async () => {
    const { error } = await supabase.from('recurring_expenses').insert({
      group_id: g.group.id, concept: concept.trim(), amount: amt, paid_by: paidBy, day_of_month: day,
      split_type: 'split_equal', created_by: user!.id,
    } as never);
    if (error) return toast(error.message, 'error');
    setOpen(false); setConcept(''); setAmount(''); toast('Gasto recurrente creado'); void load();
  };

  return (
    <>
      <Section title="Gastos recurrentes" footer="Se añaden solos el día elegido de cada mes (alquiler, internet…). Requiere el cron del servidor: ver README.">
        {list.map((r) => (
          <Row key={r.id} icon={<Repeat size={20} className="text-tint" />} title={r.concept} subtitle={`Día ${r.day_of_month} · ${name(r.paid_by)} · ${money(r.amount)}`}>
            <Toggle checked={r.is_active} label={`Activar ${r.concept}`} onChange={async (v) => { await supabase.from('recurring_expenses').update({ is_active: v } as never).eq('id', r.id); void load(); }} />
            {r.created_by === user!.id && <button aria-label={`Eliminar ${r.concept}`} onClick={async () => { await supabase.from('recurring_expenses').delete().eq('id', r.id); void load(); }} className="text-sub"><Trash2 size={18} /></button>}
          </Row>
        ))}
        <Row onClick={() => setOpen(true)} title={<span className="text-tint">Añadir gasto recurrente</span>} />
      </Section>
      <Sheet open={open} onClose={() => setOpen(false)} title="Gasto recurrente">
        <Section>
          <div className="px-4"><Field placeholder="Concepto (Alquiler…)" value={concept} onChange={(e) => setConcept(e.target.value)} /></div>
          <div className="px-4"><Field inputMode="decimal" placeholder="Importe €" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <Row title="Día del mes" value={<select aria-label="Día del mes" value={day} onChange={(e) => setDay(Number(e.target.value))} className="bg-transparent text-tint">{Array.from({ length: 28 }, (_, i) => <option key={i + 1}>{i + 1}</option>)}</select>} />
          <Row title="Lo paga" value={<select aria-label="Lo paga" value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className="bg-transparent text-tint">{g.members.map((m) => <option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}</select>} />
        </Section>
        <div className="mx-4 mt-5"><Button className="w-full" disabled={!concept.trim() || amt <= 0} onClick={create}>Crear (a partes iguales)</Button></div>
      </Sheet>
    </>
  );
}
