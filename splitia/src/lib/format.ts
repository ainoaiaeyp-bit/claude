import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
export const money = (n: number) => eur.format(Math.abs(n) < 0.005 ? 0 : n);
export const signedMoney = (n: number) => (n > 0.005 ? '+' : '') + money(n);

export const initial = (name: string) => (name.trim()[0] ?? '?').toUpperCase();

export function dayLabel(iso: string | null): string {
  if (!iso) return 'Sin fecha';
  const d = parseISO(iso.length <= 10 ? iso : iso);
  if (isToday(d)) return 'Hoy';
  if (isYesterday(d)) return 'Ayer';
  return format(d, "EEEE d 'de' MMMM", { locale: es });
}

export const shortDate = (iso: string | null) =>
  iso ? format(parseISO(iso), 'd MMM', { locale: es }) : '—';

export const todayISO = () => format(new Date(), 'yyyy-MM-dd');

const PALETTE = ['#0a84ff', '#34c759', '#ff9f0a', '#bf5af2', '#ff375f', '#64d2ff', '#ffd60a', '#ac8e68'];
export const colorFor = (key: string) => {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
};
