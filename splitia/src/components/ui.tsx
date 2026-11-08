import {
  createContext, useContext, useEffect, useState, useCallback,
  type ReactNode, type ButtonHTMLAttributes,
} from 'react';
import { ChevronLeft, ChevronRight, Loader2, Check, X, Plus, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { colorFor, initial } from '../lib/format';

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

/* ---------- Navegación ---------- */
export function NavBar({
  title, large, back, right, subtitle,
}: { title: string; large?: boolean; back?: string | boolean; right?: ReactNode; subtitle?: string }) {
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-30 glass border-b hairline" style={{ paddingTop: 'var(--sat)' }}>
      <div className="flex items-center h-11 px-2">
        <div className="w-24 flex">
          {back && (
            <button onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))} className="press flex items-center text-tint -ml-0.5 pr-2 h-11" aria-label="Atrás">
              <ChevronLeft size={28} strokeWidth={2.4} />
              <span className="text-[17px] -ml-1">Atrás</span>
            </button>
          )}
        </div>
        <h1 className={cx('flex-1 text-center font-semibold text-[17px] truncate transition-opacity', large && 'opacity-0')}>{title}</h1>
        <div className="w-24 flex justify-end pr-2">{right}</div>
      </div>
      {large && (
        <div className="px-4 pb-2 -mt-0.5">
          <div className="text-[34px] font-bold tracking-tight leading-tight">{title}</div>
          {subtitle && <div className="text-sub text-[15px]">{subtitle}</div>}
        </div>
      )}
    </header>
  );
}

export function TabBar({ items, onAdd }: { items: { to: string; label: string; icon: ReactNode; active: boolean }[]; onAdd: () => void }) {
  const nav = useNavigate();
  const half = Math.floor(items.length / 2);
  const tab = (it: (typeof items)[number]) => (
    <button key={it.to} onClick={() => nav(it.to)} aria-current={it.active ? 'page' : undefined} className={cx('press flex-1 flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[10px] font-medium', it.active ? 'text-tint' : 'text-sub')}>
      {it.icon}
      {it.label}
    </button>
  );
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 glass border-t hairline" style={{ paddingBottom: 'var(--sab)' }}>
      <div className="flex items-center max-w-xl mx-auto">
        {items.slice(0, half).map(tab)}
        <div className="flex-1 flex justify-center">
          <button onClick={onAdd} aria-label="Añadir gasto" className="fab press -mt-6 size-14 rounded-full grid place-items-center text-white">
            <Plus size={28} strokeWidth={2.6} />
          </button>
        </div>
        {items.slice(half).map(tab)}
      </div>
    </nav>
  );
}

/* ---------- Listas agrupadas (inset grouped) ---------- */
export function Section({ title, footer, children, className }: { title?: string; footer?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cx('mx-4 mt-5', className)}>
      {title && <h2 className="px-4 pb-1.5 text-[13px] uppercase tracking-wide text-sub">{title}</h2>}
      <div className="bg-card rounded-ios overflow-hidden divide-y divide-line/40">{children}</div>
      {footer && <p className="px-4 pt-1.5 text-[13px] text-sub">{footer}</p>}
    </section>
  );
}

export function Row({
  icon, title, subtitle, value, chevron, onClick, danger, children,
}: {
  icon?: ReactNode; title?: ReactNode; subtitle?: ReactNode; value?: ReactNode;
  chevron?: boolean; onClick?: () => void; danger?: boolean; children?: ReactNode;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className={cx('w-full flex items-center gap-3 px-4 py-2.5 min-h-[48px] text-left', onClick && 'row-press')}>
      {icon}
      {(title || subtitle) && (
        <div className="flex-1 min-w-0">
          <div className={cx('text-[17px] truncate', danger && 'text-neg')}>{title}</div>
          {subtitle && <div className="text-[13px] text-sub truncate">{subtitle}</div>}
        </div>
      )}
      {children}
      {value !== undefined && <div className="text-[17px] shrink-0">{value}</div>}
      {chevron && <ChevronRight size={18} className="text-sub/60 shrink-0" />}
    </Tag>
  );
}

/* ---------- Controles ---------- */
export function Avatar({ name, size = 36, url }: { name: string; size?: number; url?: string | null }) {
  if (url) return <img src={url} alt={name} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  return (
    <div className="rounded-full grid place-items-center text-white font-semibold shrink-0" style={{ width: size, height: size, background: colorFor(name), fontSize: size * 0.42 }}>
      {initial(name)}
    </div>
  );
}

export function IconBadge({ color, children, size = 36 }: { color: string; children: ReactNode; size?: number }) {
  return (
    <div className="rounded-[10px] grid place-items-center text-white shrink-0" style={{ width: size, height: size, background: color }}>
      {children}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="mx-4 mt-3 p-0.5 rounded-[9px] bg-fill/15 flex">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} className={cx('flex-1 h-8 rounded-[7px] text-[13px] font-semibold transition-all', value === o.value ? 'bg-card shadow-sm' : 'text-ink/80')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cx('relative w-[51px] h-[31px] rounded-full transition-colors shrink-0', checked ? 'bg-pos' : 'bg-fill/30')}>
      <span className={cx('absolute top-0.5 left-0.5 size-[27px] rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
    </button>
  );
}

export function Checkbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="checkbox" aria-checked={checked} onClick={() => onChange(!checked)} className={cx('size-6 rounded-full border-2 grid place-items-center shrink-0 transition-colors', checked ? 'bg-tint border-tint text-white' : 'border-line')}>
      {checked && <Check size={15} strokeWidth={3.5} />}
    </button>
  );
}

export function Button({ variant = 'primary', loading, className, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'tinted' | 'plain' | 'danger'; loading?: boolean }) {
  const styles = {
    primary: 'bg-tint text-white',
    tinted: 'bg-tint/15 text-tint',
    plain: 'text-tint',
    danger: 'bg-neg/15 text-neg',
  }[variant];
  return (
    <button {...p} disabled={p.disabled || loading} className={cx('press h-[50px] px-5 rounded-[14px] font-semibold text-[17px] inline-flex items-center justify-center gap-2 disabled:opacity-40', styles, className)}>
      {loading && <Loader2 className="animate-spin" size={18} />}
      {children}
    </button>
  );
}

export const Field = ({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={cx('w-full bg-transparent py-3 placeholder:text-sub/60', className)} />
);

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-sub">
      <Loader2 className="animate-spin" />
      {label && <span className="text-[15px]">{label}</span>}
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center px-10 py-14 gap-2">
      <div className="text-sub/50">{icon}</div>
      <h3 className="font-semibold text-[20px]">{title}</h3>
      {text && <p className="text-sub text-[15px]">{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Skeletons({ n = 5 }: { n?: number }) {
  return (
    <div className="mx-4 mt-5 space-y-2">
      {Array.from({ length: n }, (_, i) => <div key={i} className="skeleton h-14" />)}
    </div>
  );
}

/* ---------- Hoja inferior ---------- */
export function Sheet({ open, onClose, title, children, action }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; action?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', esc); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 anim-fade" onClick={onClose} />
      <div role="dialog" aria-modal className="anim-sheet relative w-full max-w-xl max-h-[92%] flex flex-col rounded-t-[22px] bg-bg" style={{ paddingBottom: 'var(--sab)' }}>
        <div className="mx-auto mt-2 h-1.5 w-9 rounded-full bg-fill/30" />
        <div className="flex items-center h-12 px-4">
          <button onClick={onClose} className="press text-tint text-[17px] w-20 text-left">Cerrar</button>
          <h2 className="flex-1 text-center font-semibold text-[17px] truncate">{title}</h2>
          <div className="w-20 flex justify-end">{action}</div>
        </div>
        <div className="overflow-y-auto pb-6">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Toasts ---------- */
type ToastKind = 'ok' | 'error';
const ToastCtx = createContext<(msg: string, kind?: ToastKind) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ msg: string; kind: ToastKind; id: number } | null>(null);
  const show = useCallback((msg: string, kind: ToastKind = 'ok') => {
    const id = Date.now();
    setT({ msg, kind, id });
    setTimeout(() => setT((c) => (c?.id === id ? null : c)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {t && (
        <div role="status" className="fixed left-1/2 z-[60] glass border hairline rounded-full shadow-lg px-4 py-2.5 flex items-center gap-2 text-[15px] font-medium max-w-[90vw]" style={{ top: 'calc(var(--sat) + 10px)', animation: 'toast-in .3s cubic-bezier(.32,.72,0,1) both' }}>
          {t.kind === 'ok' ? <Check size={16} className="text-pos shrink-0" /> : <X size={16} className="text-neg shrink-0" />}
          <span className="truncate">{t.msg}</span>
        </div>
      )}
    </ToastCtx.Provider>
  );
}

/* ---------- Extras ---------- */
const EMOJIS = ['🏠', '✈️', '🍕', '🎉', '🛒', '🚗', '🏖️', '🎬', '💡', '🐶', '⚽', '🎁'];
export function GroupAvatar({ name, size = 44 }: { name: string; size?: number }) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const color = colorFor(name);
  return (
    <div className="rounded-[14px] grid place-items-center shrink-0" style={{ width: size, height: size, fontSize: size * 0.5, background: `linear-gradient(135deg, ${color}33, ${color}66)` }}>
      {EMOJIS[h % EMOJIS.length]}
    </div>
  );
}

/** Número que "cuenta" hasta su valor al aparecer o cambiar. */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setShown(value); return; }
    const from = shown, start = performance.now(), dur = 600;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      setShown(from + (value - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{format(shown)}</>;
}

export function useOnline() {
  const [on, setOn] = useState(navigator.onLine);
  useEffect(() => {
    const a = () => setOn(true), b = () => setOn(false);
    window.addEventListener('online', a); window.addEventListener('offline', b);
    return () => { window.removeEventListener('online', a); window.removeEventListener('offline', b); };
  }, []);
  return on;
}

export function OfflineBanner() {
  const on = useOnline();
  if (on) return null;
  return (
    <div role="status" className="fixed top-0 inset-x-0 z-[55] bg-warn text-white text-[13px] font-semibold flex items-center justify-center gap-1.5 py-1.5" style={{ paddingTop: 'calc(var(--sat) + 6px)' }}>
      <WifiOff size={14} /> Sin conexión · mostrando la última copia
    </div>
  );
}

/** Hoja de confirmación para acciones destructivas. */
export function ConfirmSheet({ open, title, text, confirmLabel, onConfirm, onClose, busy }: { open: boolean; title: string; text?: string; confirmLabel: string; onConfirm: () => void; onClose: () => void; busy?: boolean }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {text && <p className="px-6 pt-2 text-center text-[15px] text-sub">{text}</p>}
      <div className="mx-4 mt-5 space-y-2">
        <Button variant="danger" className="w-full" loading={busy} onClick={onConfirm}>{confirmLabel}</Button>
        <Button variant="tinted" className="w-full" onClick={onClose}>Cancelar</Button>
      </div>
    </Sheet>
  );
}

/** Tirar hacia abajo para recargar (solo táctil, en la parte superior de la página). */
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let startY = 0, active = false, dist = 0;
    const down = (e: TouchEvent) => { if (window.scrollY <= 0 && !busy) { startY = e.touches[0].clientY; active = true; dist = 0; } };
    const move = (e: TouchEvent) => { if (!active) return; dist = Math.max(0, e.touches[0].clientY - startY); if (dist > 0) setPull(Math.min(80, dist * 0.5)); };
    const up = async () => {
      if (!active) return; active = false;
      if (dist * 0.5 > 56) { setBusy(true); setPull(48); try { await onRefresh(); } finally { setBusy(false); } }
      setPull(0);
    };
    window.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', up);
    return () => { window.removeEventListener('touchstart', down); window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up); };
  }, [onRefresh, busy]);
  return { pull, busy };
}

export function PullIndicator({ pull, busy }: { pull: number; busy: boolean }) {
  if (pull <= 0 && !busy) return null;
  return (
    <div className="flex justify-center overflow-hidden text-sub transition-[height]" style={{ height: pull }}>
      <Loader2 size={22} className={cx('mt-2', busy && 'animate-spin')} style={{ opacity: Math.min(1, pull / 48) }} />
    </div>
  );
}
