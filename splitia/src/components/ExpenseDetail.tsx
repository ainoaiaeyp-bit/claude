import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Pencil, Send, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import type { GroupBundle } from '../lib/data';
import { expenseShares } from '../lib/balances';
import { CATEGORIES } from '../lib/categories';
import { dayLabel, money } from '../lib/format';
import { addComment, deleteComment, deleteExpense, loadAttachments, loadComments, type Attachment, type Comment } from '../lib/mutations';
import type { Expense } from '../lib/types';
import { Avatar, Button, ConfirmSheet, Row, Section, Sheet, useToast } from './ui';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export function ExpenseDetail({ expense, g, onClose }: { expense: Expense | null; g: GroupBundle; onClose: () => void }) {
  const { user } = useAuth();
  const { reload } = useData();
  const nav = useNavigate();
  const toast = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [text, setText] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const id = expense?.id;
  useEffect(() => {
    if (!id) return;
    setComments([]); setFiles([]);
    loadComments(id).then(setComments).catch(() => {});
    loadAttachments(id).then(setFiles).catch(() => {});
  }, [id]);

  const name = (uid: string) => g.members.find((m) => m.user_id === uid)?.display_name ?? 'Alguien';
  const avatar = (uid: string) => g.members.find((m) => m.user_id === uid)?.avatar_url;

  const send = async () => {
    if (!expense || !text.trim()) return;
    try {
      await addComment(expense.id, user!.id, text.trim());
      setText('');
      setComments(await loadComments(expense.id));
    } catch (e) { toast(e instanceof Error ? e.message : 'No se pudo comentar', 'error'); }
  };

  const remove = async () => {
    if (!expense) return;
    setBusy(true);
    try {
      await deleteExpense(expense.id);
      await reload();
      toast('Gasto eliminado');
      setConfirm(false); onClose();
    } catch (e) { toast(e instanceof Error ? e.message : 'No se pudo eliminar', 'error'); }
    finally { setBusy(false); }
  };

  const shares = expense ? expenseShares(expense, g.splits, g.members.map((m) => m.user_id)) : {};
  const cat = expense ? (g.customCategories.find((c) => c.id === expense.custom_category_id)?.name ?? CATEGORIES[expense.category]?.label) : '';

  return (
    <>
      <Sheet open={!!expense} onClose={onClose} title="Gasto"
        action={expense && <button aria-label="Editar" onClick={() => nav(`/group/${g.group.id}/expense/${expense.id}`)} className="press text-tint"><Pencil size={20} /></button>}>
        {expense && (
          <>
            <div className="text-center pt-2 px-6">
              <div className="text-[38px] font-bold tabular-nums tracking-tight">{expense.is_refund ? '−' : ''}{money(expense.amount)}</div>
              <div className="text-[19px] font-medium">{expense.concept}</div>
              <div className="text-sub text-[14px]">{dayLabel(expense.expense_date ?? expense.created_at)} · {cat}</div>
            </div>

            <Section title={`Pagó ${name(expense.paid_by)} · reparto`}>
              {Object.entries(shares).map(([uid, amt]) => (
                <Row key={uid} icon={<Avatar name={name(uid)} url={avatar(uid)} size={32} />} title={name(uid)}
                  subtitle={uid === expense.paid_by ? 'Adelantó el pago' : undefined}
                  value={<span className="tabular-nums">{money(amt)}</span>} />
              ))}
            </Section>

            {expense.observations && <Section title="Notas"><div className="px-4 py-3 text-[15px] whitespace-pre-line">{expense.observations}</div></Section>}

            {files.length > 0 && (
              <Section title="Adjuntos">
                {files.map((f) => (
                  <Row key={f.id} icon={f.file_type?.startsWith('image/') && f.signed ? <img src={f.signed} alt="" className="size-12 rounded-lg object-cover" /> : <FileText size={22} className="text-tint" />}
                    title={<span className="text-[15px]">{f.file_name}</span>}
                    onClick={f.signed ? () => window.open(f.signed, '_blank', 'noopener') : undefined} chevron={!!f.signed} />
                ))}
              </Section>
            )}

            <Section title="Comentarios">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3 px-4 py-2.5">
                  <Avatar name={name(c.user_id)} url={avatar(c.user_id)} size={30} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-sub">{name(c.user_id)} · {formatDistanceToNow(parseISO(c.created_at), { addSuffix: true, locale: es })}</div>
                    <div className="text-[15px] whitespace-pre-line break-words">{c.content}</div>
                  </div>
                  {c.user_id === user!.id && <button aria-label="Borrar comentario" onClick={async () => { await deleteComment(c.id); setComments(await loadComments(expense.id)); }} className="text-sub self-start"><Trash2 size={16} /></button>}
                </div>
              ))}
              <div className="flex items-center gap-2 px-4">
                <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void send()} placeholder="Escribe un comentario…" maxLength={1000} className="flex-1 bg-transparent py-3 placeholder:text-sub/60" />
                <button aria-label="Enviar" onClick={() => void send()} disabled={!text.trim()} className="press text-tint disabled:opacity-30"><Send size={20} /></button>
              </div>
            </Section>

            <div className="mx-4 mt-6"><Button variant="danger" className="w-full" onClick={() => setConfirm(true)}><Trash2 size={18} />Eliminar gasto</Button></div>
          </>
        )}
      </Sheet>
      <ConfirmSheet open={confirm} title="¿Eliminar este gasto?" text="Se recalcularán los saldos del grupo. No se puede deshacer." confirmLabel="Eliminar" busy={busy} onConfirm={remove} onClose={() => setConfirm(false)} />
    </>
  );
}
