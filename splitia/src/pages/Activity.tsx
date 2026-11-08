import { useMemo } from 'react';
import { ArrowRightLeft, Receipt, Undo2 } from 'lucide-react';
import { useData } from '../hooks/useData';
import { CATEGORIES } from '../lib/categories';
import { money } from '../lib/format';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Empty, IconBadge, NavBar, Row, Section, Skeletons } from '../components/ui';

export default function Activity() {
  const { snap, loading } = useData();
  const items = useMemo(() => {
    if (!snap) return [];
    const name = (id: string) => snap.profiles[id] ?? 'Alguien';
    return snap.groups
      .flatMap((g) => [
        ...g.expenses.slice(0, 40).map((e) => ({
          at: e.created_at, key: e.id, group: g.group.name,
          icon: e.is_refund ? <IconBadge color="#ff9f0a"><Undo2 size={18} /></IconBadge> : <IconBadge color={CATEGORIES[e.category]?.color ?? '#8e8e93'}><Receipt size={18} /></IconBadge>,
          title: `${name(e.paid_by)} ${e.is_refund ? 'registró una devolución' : 'añadió'} «${e.concept}»`,
          amount: money(e.amount),
        })),
        ...g.adjustments.slice(0, 40).map((a) => ({
          at: a.created_at, key: a.id, group: g.group.name,
          icon: <IconBadge color="#34c759"><ArrowRightLeft size={18} /></IconBadge>,
          title: `${name(a.from_user)} pagó a ${name(a.to_user)}`,
          amount: money(Number(a.amount)),
        })),
      ])
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 60);
  }, [snap]);

  return (
    <>
      <NavBar large title="Actividad" />
      {loading && !snap ? <Skeletons /> : items.length === 0 ? (
        <Empty icon={<Receipt size={48} />} title="Sin actividad" text="Aquí verás los últimos gastos y pagos de tus grupos." />
      ) : (
        <Section>
          {items.map((i) => (
            <Row key={i.key} icon={i.icon} title={<span className="text-[15px] whitespace-normal line-clamp-2">{i.title}</span>}
              subtitle={`${i.group} · ${formatDistanceToNow(parseISO(i.at), { addSuffix: true, locale: es })}`} value={<span className="text-[15px] font-semibold tabular-nums">{i.amount}</span>} />
          ))}
        </Section>
      )}
    </>
  );
}
