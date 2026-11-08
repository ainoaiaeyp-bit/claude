import { money } from '../lib/format';

export interface Slice { label: string; value: number; color: string }

/** Donut SVG accesible: el texto central muestra el total y la lista da el detalle. */
export function Donut({ slices, size = 150 }: { slices: Slice[]; size?: number }) {
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0);
  const r = 15.9155; // circunferencia = 100
  let offset = 25;
  return (
    <div className="flex items-center gap-5 px-4 py-4">
      <svg viewBox="0 0 42 42" width={size} height={size} role="img" aria-label={`Gasto total ${money(total)}`}>
        <circle cx="21" cy="21" r={r} fill="none" stroke="rgb(var(--fill) / .15)" strokeWidth="5" />
        {total > 0 && slices.map((s) => {
          const pct = (Math.max(0, s.value) / total) * 100;
          const el = <circle key={s.label} cx="21" cy="21" r={r} fill="none" stroke={s.color} strokeWidth="5" strokeDasharray={`${Math.max(0, pct - 0.6)} ${100 - Math.max(0, pct - 0.6)}`} strokeDashoffset={offset} style={{ animation: 'ring .8s cubic-bezier(.32,.72,0,1) both' }} />;
          offset -= pct;
          return el;
        })}
        <text x="21" y="20.5" textAnchor="middle" className="fill-ink" style={{ font: '700 4.6px -apple-system, sans-serif' }}>{Math.round(total)}</text>
        <text x="21" y="25.5" textAnchor="middle" className="fill-sub" style={{ font: '500 2.6px -apple-system, sans-serif' }}>€ en total</text>
      </svg>
      <ul className="flex-1 min-w-0 space-y-1.5">
        {slices.slice(0, 6).map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-[14px]">
            <span className="size-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="flex-1 truncate">{s.label}</span>
            <span className="tabular-nums text-sub">{total ? Math.round((s.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Bars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2 h-40 px-4 pt-4 pb-3" role="img" aria-label="Gasto mensual">
      {data.map((d, i) => (
        <div key={d.label} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
          <span className="text-[10px] text-sub tabular-nums">{Math.round(d.value)}</span>
          <div className="w-full rounded-t-lg" style={{ height: `${Math.max(3, (d.value / max) * 78)}%`, background: i === data.length - 1 ? 'linear-gradient(180deg, rgb(var(--grad-b)), rgb(var(--grad-a)))' : 'rgb(var(--tint) / .35)' }} />
          <span className="text-[11px] text-sub capitalize">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
