'use strict';
/* ============ Vida · app personal todo-en-uno (PWA, sin dependencias) ============ */

// ---------- Estado ----------
const KEY = 'vida.v1';
const DEFAULTS = { profile: { name: '' }, tx: [], subs: [], rem: [], biz: [], chat: [], settings: { apiKey: '', model: 'claude-sonnet-5-5' } };
let S = load();
function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); return Object.assign(structuredClone(DEFAULTS), d || {}); }
  catch { return structuredClone(DEFAULTS); }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('No se pudo guardar: almacenamiento lleno'); } }


// ---------- Utilidades ----------
const $ = s => document.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isoTime = d => `${iso(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const today = () => iso(new Date());
function monthKey(d) { return iso(d).slice(0, 7); }
const parseD = s => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const eur = (n, dec = true) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: dec ? 2 : 0, maximumFractionDigits: dec ? 2 : 0 }).format(n || 0);
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_L = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const fdate = s => { const d = parseD(s); return `${d.getDate()} ${MESES[d.getMonth()]}`; };
const fmonth = k => { const [y, m] = k.split('-').map(Number); return `${MESES_L[m - 1]} ${y}`; };
const shiftMonth = (k, n) => { const [y, m] = k.split('-').map(Number); return monthKey(new Date(y, m - 1 + n, 1)); };
function daysUntil(s) { return Math.round((parseD(s) - parseD(today())) / 864e5); }
function addCycle(s, cycle) {
  const d = parseD(s), day = d.getDate();
  if (cycle === 'semanal') d.setDate(day + 7);
  else if (cycle === 'diario') d.setDate(day + 1);
  else { const n = cycle === 'anual' ? 12 : cycle === 'trimestral' ? 3 : 1; d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); }
  return iso(d);
}
const monthlyOf = s => s.amount * ({ mensual: 1, anual: 1 / 12, trimestral: 1 / 3, semanal: 52 / 12 }[s.cycle] || 1);
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 3500); }

const CATS = {
  'Hogar': ['🏠', '#ff9f0a'], 'Comida': ['🍽️', '#ff453a'], 'Transporte': ['🚗', '#0a84ff'], 'Ocio': ['🎬', '#bf5af2'], 'Salud': ['❤️', '#ff375f'],
  'Compras': ['🛍️', '#64d2ff'], 'Viajes': ['✈️', '#30d158'], 'Trabajo': ['💼', '#5e5ce6'], 'Suscripciones': ['🔁', '#8e8e93'],
  'Nómina': ['💶', '#30d158'], 'Negocio': ['🏢', '#5e5ce6'], 'Otros': ['•••', '#8e8e93']
};
const catI = c => CATS[c] || CATS.Otros;
const CAT_OPTS = Object.keys(CATS).map(c => [c, `${CATS[c][0]} ${c}`]);

const ui = { tab: 'hoy', money: 'mov', scope: 'todo', month: monthKey(new Date()), busy: false };

// ---------- Automatismos ----------
// Renueva suscripciones vencidas y registra el cargo como gasto.
function rollSubs() {
  let changed = false;
  for (const s of S.subs) {
    if (!s.active && s.active !== undefined) continue;
    let guard = 0;
    while (s.next < today() && guard++ < 60) {
      S.tx.push({ id: uid(), type: 'out', amount: s.amount, cat: 'Suscripciones', note: s.name, date: s.next, scope: s.scope || 'personal', auto: true });
      s.next = addCycle(s.next, s.cycle); changed = true;
    }
  }
  if (changed) save();
}
// Recordatorios: aviso dentro de la app + notificación del sistema si hay permiso.
async function checkDue() {
  const now = isoTime(new Date()); let any = false;
  for (const r of S.rem) {
    if (!r.done && !r.notified && r.due && r.due <= now) {
      r.notified = true; any = true;
      toast(`⏰ ${r.title}`);
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          const reg = await navigator.serviceWorker?.getRegistration();
          reg ? reg.showNotification('Vida · Recordatorio', { body: r.title, icon: 'icons/icon-192.png', tag: r.id }) : new Notification('Vida · Recordatorio', { body: r.title });
        }
      } catch { /* sin notificaciones */ }
    }
  }
  if (any) { save(); if (ui.tab === 'hoy' || ui.tab === 'rec') render(); }
}

// ---------- Cálculos ----------
function summary(month, scope = 'todo') {
  const r = { in: 0, out: 0, cats: {} };
  for (const t of S.tx) {
    if (t.date.slice(0, 7) !== month) continue;
    if (scope !== 'todo' && (t.scope || 'personal') !== scope) continue;
    if (t.type === 'in') r.in += t.amount; else { r.out += t.amount; r.cats[t.cat] = (r.cats[t.cat] || 0) + t.amount; }
  }
  return r;
}
const subsMonthly = () => S.subs.filter(s => s.active !== false).reduce((a, s) => a + monthlyOf(s), 0);
const bizPending = () => S.biz.filter(b => b.status === 'pendiente').reduce((a, b) => a + b.amount, 0);

// ---------- Iconos de la tab bar ----------
const ICONS = {
  hoy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg>',
  money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M7 15h3"/></svg>',
  biz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7.5" width="18" height="12" rx="2.5"/><path d="M8.5 7.5v-1.5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5M3 13h18"/></svg>',
  rec: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15zM10 20.5a2 2 0 0 0 4 0"/></svg>',
  ia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/></svg>'
};
const TABS = [['hoy', 'Hoy', ICONS.hoy], ['money', 'Dinero', ICONS.money], ['biz', 'Negocio', ICONS.biz], ['rec', 'Recordar', ICONS.rec], ['ia', 'Asistente', ICONS.ia]];

// ---------- Vistas ----------
function head(title, subtitle, actions = '') {
  return `<div class="head"><div><h1 class="large">${title}</h1>${subtitle ? `<div class="sub">${subtitle}</div>` : ''}</div><div style="display:flex;gap:10px">${actions}</div></div>`;
}
const plusBtn = act => `<button class="icon-btn plus" data-act="${act}" aria-label="Añadir">+</button>`;

function viewHoy() {
  const h = new Date().getHours(), name = S.profile.name;
  const greet = (h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches') + (name ? `, ${esc(name)}` : '');
  const sm = summary(ui.month === monthKey(new Date()) ? ui.month : monthKey(new Date()));
  const mk = monthKey(new Date());
  const m = summary(mk);
  const upcoming = [];
  for (const r of S.rem) if (!r.done && r.due && daysUntil(r.due) <= 7) upcoming.push({ kind: 'rem', date: r.due, r });
  for (const s of S.subs) if (s.active !== false && daysUntil(s.next) <= 7) upcoming.push({ kind: 'sub', date: s.next, s });
  for (const b of S.biz) if (b.status === 'pendiente' && b.due && daysUntil(b.due) <= 7) upcoming.push({ kind: 'biz', date: b.due, b });
  upcoming.sort((a, b) => a.date.localeCompare(b.date));
  const rel = d => { const n = daysUntil(d); return n < 0 ? `hace ${-n} d` : n === 0 ? 'hoy' : n === 1 ? 'mañana' : `en ${n} d`; };
  const rows = upcoming.map(u => {
    if (u.kind === 'rem') return `<div class="row ${daysUntil(u.date) < 0 ? '' : ''}"><div class="ico" style="background:var(--orange)">⏰</div><div class="grow"><div class="t">${esc(u.r.title)}</div><div class="s">Recordatorio · ${rel(u.date)}</div></div></div>`;
    if (u.kind === 'sub') return `<div class="row"><div class="ico" style="background:${catI('Suscripciones')[1]}">🔁</div><div class="grow"><div class="t">${esc(u.s.name)}</div><div class="s">Se renueva ${rel(u.date)}</div></div><div class="amt">${eur(u.s.amount)}</div></div>`;
    return `<div class="row"><div class="ico" style="background:var(--blue)">🏢</div><div class="grow"><div class="t">Cobrar a ${esc(u.b.client)}</div><div class="s">${esc(u.b.concept || '')} · ${rel(u.date)}</div></div><div class="amt">${eur(u.b.amount)}</div></div>`;
  }).join('');
  return `${head(greet, new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }), `<button class="icon-btn" data-act="settings" aria-label="Ajustes">⚙︎</button>`)}
  <div class="hero"><div class="lbl">Balance de ${fmonth(mk)}</div><div class="big">${eur(m.in - m.out)}</div>
    <div class="two"><div class="pill"><span class="lbl">Ingresos</span><b>${eur(m.in, false)}</b></div><div class="pill"><span class="lbl">Gastos</span><b>${eur(m.out, false)}</b></div></div></div>
  <div class="grid2">
    <div class="card kpi" data-act="goto" data-id="money:subs"><div class="n">${eur(subsMonthly(), 0)}</div><div class="l">Suscripciones / mes</div></div>
    <div class="card kpi" data-act="goto" data-id="biz"><div class="n">${eur(bizPending(), 0)}</div><div class="l">Pendiente de cobro</div></div>
  </div>
  <div class="section-title">Próximos 7 días</div>
  <div class="group">${rows || '<div class="empty">Nada urgente. ¡Todo al día! 🎉</div>'}</div>
  <div class="card" style="display:flex;gap:12px;align-items:center" data-act="goto" data-id="ia"><div class="ico" style="background:linear-gradient(135deg,#5e5ce6,#bf5af2)">✨</div><div class="grow"><div class="t">Pregunta a tu asistente</div><div class="s">“¿Cuánto he gastado este mes?”</div></div><span class="chev">›</span></div>`;
}

function viewMoney() {
  const seg = `<div class="seg">${[['mov', 'Movimientos'], ['subs', 'Suscripciones'], ['sum', 'Resumen']].map(([k, l]) => `<button class="${ui.money === k ? 'on' : ''}" data-act="seg" data-id="${k}">${l}</button>`).join('')}</div>`;
  const act = ui.money === 'subs' ? plusBtn('add-sub') : plusBtn('add-tx');
  let body = '';
  if (ui.money === 'subs') body = bodySubs(); else body = monthBar() + (ui.money === 'mov' ? bodyMov() : bodySum());
  return head('Dinero', '', act) + seg + body;
}
function monthBar() {
  return `<div style="display:flex;align-items:center;justify-content:space-between;margin:0 4px 12px"><button class="icon-btn" data-act="month" data-id="-1">‹</button><b>${fmonth(ui.month)}</b><button class="icon-btn" data-act="month" data-id="1">›</button></div>
  <div class="seg">${[['todo', 'Todo'], ['personal', 'Personal'], ['negocio', 'Negocio']].map(([k, l]) => `<button class="${ui.scope === k ? 'on' : ''}" data-act="scope" data-id="${k}">${l}</button>`).join('')}</div>`;
}
function bodyMov() {
  const list = S.tx.filter(t => t.date.slice(0, 7) === ui.month && (ui.scope === 'todo' || (t.scope || 'personal') === ui.scope)).sort((a, b) => b.date.localeCompare(a.date));
  const sm = summary(ui.month, ui.scope);
  const rows = list.map(t => {
    const [e, c] = catI(t.cat);
    return `<div class="row" data-act="edit-tx" data-id="${t.id}"><div class="ico" style="background:${c}">${e}</div><div class="grow"><div class="t">${esc(t.note || t.cat)}</div><div class="s">${esc(t.cat)} · ${fdate(t.date)} · ${t.scope === 'negocio' ? 'Negocio' : 'Personal'}${t.auto ? ' · auto' : ''}</div></div><div class="amt ${t.type === 'in' ? 'pos' : 'neg'}">${t.type === 'in' ? '+' : '−'}${eur(t.amount)}</div></div>`;
  }).join('');
  return `<div class="grid2"><div class="card kpi"><div class="n pos">${eur(sm.in, 0)}</div><div class="l">Ingresos</div></div><div class="card kpi"><div class="n">${eur(sm.out, 0)}</div><div class="l">Gastos</div></div></div>
  <div class="group">${rows || '<div class="empty">Sin movimientos este mes.<br>Pulsa + para añadir el primero.</div>'}</div>`;
}
function bodySum() {
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(ui.month, i - 5));
  const data = months.map(k => ({ k, ...summary(k, ui.scope) }));
  const max = Math.max(1, ...data.flatMap(d => [d.in, d.out]));
  const bars = data.map(d => `<div class="col"><div class="pair"><div class="b" style="height:${d.in / max * 100}%;background:var(--green)"></div><div class="b" style="height:${d.out / max * 100}%;background:var(--red)"></div></div><div class="m">${MESES[+d.k.slice(5) - 1]}</div></div>`).join('');
  const sm = summary(ui.month, ui.scope);
  const cats = Object.entries(sm.cats).sort((a, b) => b[1] - a[1]);
  const cat = cats.map(([c, v]) => `<div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between"><span>${catI(c)[0]} ${esc(c)}</span><b>${eur(v)}</b></div><div class="catbar"><i style="width:${v / sm.out * 100}%;background:${catI(c)[1]}"></i></div></div>`).join('');
  return `<div class="card"><div class="t">Últimos 6 meses</div><div class="s"><span class="pos">●</span> Ingresos &nbsp; <span style="color:var(--red)">●</span> Gastos</div><div class="bars">${bars}</div></div>
  <div class="card"><div class="t" style="margin-bottom:12px">Gastos por categoría</div>${cat || '<div class="empty">Sin gastos este mes</div>'}</div>`;
}
function bodySubs() {
  const subs = [...S.subs].sort((a, b) => a.next.localeCompare(b.next));
  const rows = subs.map(s => `<div class="row" data-act="edit-sub" data-id="${s.id}" style="${s.active === false ? 'opacity:.5' : ''}"><div class="ico" style="background:${s.scope === 'negocio' ? 'var(--blue)' : 'var(--purple)'}">🔁</div><div class="grow"><div class="t">${esc(s.name)}</div><div class="s">${s.active === false ? 'Pausada' : `Próximo cargo ${fdate(s.next)} · ${s.cycle}`}${s.scope === 'negocio' ? ' · Negocio' : ''}</div></div><div class="amt">${eur(s.amount)}</div></div>`).join('');
  const tot = subsMonthly();
  return `<div class="grid2"><div class="card kpi"><div class="n">${eur(tot)}</div><div class="l">Al mes</div></div><div class="card kpi"><div class="n">${eur(tot * 12, 0)}</div><div class="l">Al año</div></div></div>
  <div class="group">${rows || '<div class="empty">Añade tus suscripciones (Netflix, hosting, software…) y te aviso antes de cada cargo.</div>'}</div>`;
}

const STATUS = { presupuesto: ['Presupuesto', 'var(--orange)'], pendiente: ['Por cobrar', 'var(--blue)'], cobrado: ['Cobrado', 'var(--green)'] };
function viewBiz() {
  const mk = monthKey(new Date()), m = summary(mk, 'negocio');
  const open = S.biz.filter(b => b.status === 'presupuesto').reduce((a, b) => a + b.amount, 0);
  const order = { pendiente: 0, presupuesto: 1, cobrado: 2 };
  const list = [...S.biz].sort((a, b) => order[a.status] - order[b.status] || (b.date || '').localeCompare(a.date || ''));
  const rows = list.map(b => `<div class="row" data-act="edit-biz" data-id="${b.id}"><div class="ico" style="background:${STATUS[b.status][1]}">${b.status === 'cobrado' ? '✓' : '€'}</div><div class="grow"><div class="t">${esc(b.client)}</div><div class="s">${esc(b.concept || '—')}${b.due ? ` · vence ${fdate(b.due)}` : ''}</div></div><div style="text-align:right"><div class="amt">${eur(b.amount)}</div><span class="badge" style="background:${STATUS[b.status][1]}">${STATUS[b.status][0]}</span></div></div>`).join('');
  return `${head('Negocio', fmonth(mk), plusBtn('add-biz'))}
  <div class="hero" style="background:linear-gradient(135deg,#0a84ff,#5e5ce6)"><div class="lbl">Resultado del mes</div><div class="big">${eur(m.in - m.out)}</div>
    <div class="two"><div class="pill"><span class="lbl">Facturado</span><b>${eur(m.in, 0)}</b></div><div class="pill"><span class="lbl">Gastos</span><b>${eur(m.out, 0)}</b></div></div></div>
  <div class="grid2"><div class="card kpi"><div class="n">${eur(bizPending(), 0)}</div><div class="l">Por cobrar</div></div><div class="card kpi"><div class="n">${eur(open, 0)}</div><div class="l">En presupuesto</div></div></div>
  <div class="section-title">Clientes y trabajos</div>
  <div class="group">${rows || '<div class="empty">Añade presupuestos y facturas. Al marcar “Cobrado” se registra el ingreso solo.</div>'}</div>`;
}

function viewRec() {
  const pend = S.rem.filter(r => !r.done).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
  const done = S.rem.filter(r => r.done).sort((a, b) => (b.due || '').localeCompare(a.due || '')).slice(0, 15);
  const row = r => {
    const late = !r.done && r.due && r.due < isoTime(new Date());
    return `<div class="row noicon ${r.done ? 'done' : ''}"><button class="check ${r.done ? 'on' : ''}" data-act="toggle-rem" data-id="${r.id}" aria-label="Completar">${r.done ? '✓' : ''}</button>
    <div class="grow" data-act="edit-rem" data-id="${r.id}"><div class="t">${esc(r.title)}</div><div class="s" style="${late ? 'color:var(--red)' : ''}">${r.due ? `${fdate(r.due)} · ${r.due.slice(11, 16)}` : 'Sin fecha'}${r.repeat && r.repeat !== 'no' ? ` · ${r.repeat}` : ''}</div></div></div>`;
  };
  const perm = 'Notification' in window && Notification.permission !== 'granted' ? `<div class="card" data-act="notif" style="display:flex;gap:12px;align-items:center"><div class="ico" style="background:var(--red)">🔔</div><div class="grow"><div class="t">Activar avisos</div><div class="s">Recibe una notificación a su hora</div></div><span class="chev">›</span></div>` : '';
  return `${head('Recordatorios', '', plusBtn('add-rem'))}${perm}
  <div class="group">${pend.map(row).join('') || '<div class="empty">Sin recordatorios pendientes ✨</div>'}</div>
  ${done.length ? `<div class="section-title">Completados</div><div class="group">${done.map(row).join('')}</div>` : ''}`;
}

const SUGGEST = ['¿Cuánto he gastado este mes?', '¿Qué suscripciones podría cancelar?', '¿Qué me deben mis clientes?', '¿Qué tengo pendiente esta semana?', 'Hazme un resumen de mis finanzas'];
function viewIA() {
  const msgs = S.chat.map(m => `<div class="msg ${m.role === 'user' ? 'me' : 'ai'}">${esc(m.content)}</div>`).join('');
  const intro = !S.chat.length ? `<div class="card" style="text-align:center"><div style="font-size:40px">✨</div><div class="t" style="margin:6px 0">Tu asistente de Vida</div><div class="s">Conoce tus gastos, negocio, suscripciones y recordatorios. Pregúntale lo que quieras.</div></div>` : '';
  const key = S.settings.apiKey ? '' : `<div class="card" data-act="settings" style="border:1px solid var(--orange)"><div class="t">Falta la clave de la IA</div><div class="s">Toca aquí y pega tu API key de Anthropic en Ajustes.</div></div>`;
  return `${head('Asistente', '', S.chat.length ? '<button class="icon-btn" data-act="clear-chat" aria-label="Borrar">🗑</button>' : '')}${key}${intro}
  <div class="chat">${msgs}${ui.busy ? '<div class="msg ai"><span class="dots"><span></span><span></span><span></span></span></div>' : ''}</div>
  <div style="height:70px"></div>
  <div class="composer"><input id="q" placeholder="Pregunta algo…" autocomplete="off" enterkeyhint="send"><button data-act="send" aria-label="Enviar">↑</button></div>`;
}

// ---------- Render ----------
function render() {
  const v = $('#view');
  const y = window.scrollY;
  v.innerHTML = { hoy: viewHoy, money: viewMoney, biz: viewBiz, rec: viewRec, ia: viewIA }[ui.tab]();
  $('#tabbar').innerHTML = TABS.map(([k, l, i]) => `<button class="${ui.tab === k ? 'on' : ''}" data-act="tab" data-id="${k}">${i}<span>${l}</span></button>`).join('');
  if (ui.tab === 'ia') { window.scrollTo(0, document.body.scrollHeight); }
  else window.scrollTo(0, y);
}

// ---------- Hojas (formularios) ----------
function sheet(title, fields, { onSave, onDelete, saveLabel = 'Guardar', extra = '' } = {}) {
  const root = $('#sheet-root');
  const inp = f => {
    const v = f.value ?? '';
    if (f.type === 'select') return `<select name="${f.k}">${f.options.map(([val, l]) => `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    if (f.type === 'number') return `<input name="${f.k}" type="text" inputmode="decimal" placeholder="${f.placeholder || '0,00'}" value="${esc(v)}">`;
    if (f.type === 'password') return `<input name="${f.k}" type="password" autocomplete="off" placeholder="${f.placeholder || ''}" value="${esc(v)}">`;
    return `<input name="${f.k}" type="${f.type || 'text'}" placeholder="${f.placeholder || ''}" value="${esc(v)}">`;
  };
  root.innerHTML = `<div class="backdrop" data-sheet="close"></div><form class="sheet" novalidate><div class="grab"></div><h2>${esc(title)}</h2>
    <div class="group">${fields.map(f => `<div class="field"><label>${esc(f.label)}</label>${inp(f)}</div>`).join('')}</div>${extra}
    ${onSave ? `<button class="btn" type="submit">${saveLabel}</button>` : ''}${onDelete ? '<button class="btn danger" type="button" data-sheet="delete">Eliminar</button>' : ''}
    <button class="btn alt" type="button" data-sheet="close">Cancelar</button></form>`;
  const form = root.querySelector('form');
  const close = () => { root.innerHTML = ''; };
  const read = () => Object.fromEntries(fields.map(f => {
    let v = form.elements[f.k].value;
    if (f.type === 'number') v = parseFloat(String(v).replace(',', '.')) || 0;
    return [f.k, typeof v === 'string' ? v.trim() : v];
  }));
  form.addEventListener('submit', e => { e.preventDefault(); if (onSave && onSave(read(), close) !== false) close(); });
  root.onclick = e => {
    const a = e.target.closest('[data-sheet]')?.dataset.sheet;
    if (a === 'close') close();
    if (a === 'delete' && confirm('¿Eliminar definitivamente?')) { onDelete(); close(); }
    const x = e.target.closest('[data-x]'); if (x && sheet.extra) sheet.extra(x.dataset.x, close);
  };
  sheet.extra = null;
  setTimeout(() => form.querySelector('input:not([type=date]):not([type=datetime-local])')?.focus(), 300);
}
const need = (v, msg) => { if (!v) { toast(msg); return false; } return true; };

function txSheet(t) {
  const isNew = !t;
  t = t || { type: 'out', amount: 0, cat: 'Comida', note: '', date: today(), scope: 'personal' };
  sheet(isNew ? 'Nuevo movimiento' : 'Editar movimiento', [
    { k: 'type', label: 'Tipo', type: 'select', value: t.type, options: [['out', 'Gasto'], ['in', 'Ingreso']] },
    { k: 'amount', label: 'Importe', type: 'number', value: t.amount || '' },
    { k: 'note', label: 'Concepto', value: t.note, placeholder: 'Opcional' },
    { k: 'cat', label: 'Categoría', type: 'select', value: t.cat, options: CAT_OPTS },
    { k: 'scope', label: 'Ámbito', type: 'select', value: t.scope || 'personal', options: [['personal', 'Personal'], ['negocio', 'Negocio']] },
    { k: 'date', label: 'Fecha', type: 'date', value: t.date }
  ], {
    onSave: v => { if (!need(v.amount > 0, 'Pon un importe')) return false; if (isNew) S.tx.push({ id: uid(), ...v }); else Object.assign(t, v); save(); render(); },
    onDelete: isNew ? null : () => { S.tx = S.tx.filter(x => x !== t); save(); render(); }
  });
}
function subSheet(s) {
  const isNew = !s;
  s = s || { name: '', amount: 0, cycle: 'mensual', next: today(), scope: 'personal', active: true };
  sheet(isNew ? 'Nueva suscripción' : 'Editar suscripción', [
    { k: 'name', label: 'Nombre', value: s.name, placeholder: 'Netflix, hosting…' },
    { k: 'amount', label: 'Importe', type: 'number', value: s.amount || '' },
    { k: 'cycle', label: 'Periodo', type: 'select', value: s.cycle, options: [['mensual', 'Mensual'], ['anual', 'Anual'], ['trimestral', 'Trimestral'], ['semanal', 'Semanal']] },
    { k: 'next', label: 'Próximo cargo', type: 'date', value: s.next },
    { k: 'scope', label: 'Ámbito', type: 'select', value: s.scope || 'personal', options: [['personal', 'Personal'], ['negocio', 'Negocio']] },
    { k: 'active', label: 'Estado', type: 'select', value: s.active === false ? 'no' : 'si', options: [['si', 'Activa'], ['no', 'Pausada']] }
  ], {
    onSave: v => { if (!need(v.name, 'Pon un nombre') || !need(v.amount > 0, 'Pon un importe')) return false; v.active = v.active !== 'no'; if (isNew) S.subs.push({ id: uid(), ...v }); else Object.assign(s, v); rollSubs(); save(); render(); },
    onDelete: isNew ? null : () => { S.subs = S.subs.filter(x => x !== s); save(); render(); }
  });
}
function bizSheet(b) {
  const isNew = !b;
  b = b || { client: '', concept: '', amount: 0, status: 'presupuesto', date: today(), due: '' };
  sheet(isNew ? 'Nuevo trabajo' : 'Editar trabajo', [
    { k: 'client', label: 'Cliente', value: b.client },
    { k: 'concept', label: 'Concepto', value: b.concept, placeholder: 'Proyecto, factura…' },
    { k: 'amount', label: 'Importe', type: 'number', value: b.amount || '' },
    { k: 'status', label: 'Estado', type: 'select', value: b.status, options: Object.entries(STATUS).map(([k, v]) => [k, v[0]]) },
    { k: 'date', label: 'Fecha', type: 'date', value: b.date },
    { k: 'due', label: 'Vence', type: 'date', value: b.due }
  ], {
    onSave: v => {
      if (!need(v.client, 'Pon el cliente') || !need(v.amount > 0, 'Pon un importe')) return false;
      const was = isNew ? null : b.status;
      if (isNew) { b = { id: uid(), ...v }; S.biz.push(b); } else Object.assign(b, v);
      if (b.status === 'cobrado' && was !== 'cobrado') { S.tx.push({ id: uid(), type: 'in', amount: b.amount, cat: 'Negocio', note: `${b.client}${b.concept ? ' · ' + b.concept : ''}`, date: today(), scope: 'negocio', bizId: b.id }); toast('Ingreso registrado en Dinero'); }
      save(); render();
    },
    onDelete: isNew ? null : () => { S.biz = S.biz.filter(x => x !== b); save(); render(); }
  });
}
function remSheet(r) {
  const isNew = !r;
  const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0);
  r = r || { title: '', due: isoTime(d), repeat: 'no' };
  sheet(isNew ? 'Nuevo recordatorio' : 'Editar recordatorio', [
    { k: 'title', label: 'Qué', value: r.title, placeholder: 'Llamar a…' },
    { k: 'due', label: 'Cuándo', type: 'datetime-local', value: r.due },
    { k: 'repeat', label: 'Repetir', type: 'select', value: r.repeat || 'no', options: [['no', 'Nunca'], ['diario', 'Cada día'], ['semanal', 'Cada semana'], ['mensual', 'Cada mes'], ['anual', 'Cada año']] }
  ], {
    onSave: v => { if (!need(v.title, 'Escribe el recordatorio')) return false; v.notified = false; if (isNew) S.rem.push({ id: uid(), done: false, ...v }); else Object.assign(r, v); save(); render(); },
    onDelete: isNew ? null : () => { S.rem = S.rem.filter(x => x !== r); save(); render(); }
  });
}
function settingsSheet() {
  sheet('Ajustes', [
    { k: 'name', label: 'Tu nombre', value: S.profile.name },
    { k: 'apiKey', label: 'API key IA', type: 'password', value: S.settings.apiKey, placeholder: 'sk-ant-…' },
    { k: 'model', label: 'Modelo', value: S.settings.model }
  ], {
    onSave: v => { S.profile.name = v.name; S.settings.apiKey = v.apiKey; S.settings.model = v.model || 'claude-sonnet-5-5'; save(); render(); },
    extra: `<div class="section-title">Datos</div><div class="group"><div class="row noicon" data-x="export"><div class="grow t" style="color:var(--blue)">Exportar copia (JSON)</div></div><div class="row noicon" data-x="import"><div class="grow t" style="color:var(--blue)">Importar copia</div></div><div class="row noicon" data-x="wipe"><div class="grow t" style="color:var(--red)">Borrar todos los datos</div></div></div>
    <div class="s" style="margin:-6px 16px 10px">Todo se guarda solo en este dispositivo. La clave de IA se envía únicamente a Anthropic.</div>`
  });
  sheet.extra = (x, close) => {
    if (x === 'export') {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' })); a.download = `vida-${today()}.json`; a.click();
    } else if (x === 'import') {
      const i = document.createElement('input'); i.type = 'file'; i.accept = 'application/json';
      i.onchange = async () => { try { S = Object.assign(structuredClone(DEFAULTS), JSON.parse(await i.files[0].text())); save(); rollSubs(); close(); render(); toast('Copia importada'); } catch { toast('Archivo no válido'); } };
      i.click();
    } else if (x === 'wipe' && confirm('Se borrará todo. ¿Seguro?')) { S = structuredClone(DEFAULTS); save(); close(); render(); }
  };
}

// ---------- Asistente IA ----------
function context() {
  const mk = monthKey(new Date()), pm = shiftMonth(mk, -1);
  const r2 = n => Math.round(n * 100) / 100;
  return JSON.stringify({
    hoy: today(), nombre: S.profile.name || undefined,
    mes_actual: { mes: mk, ...summary(mk), personal: summary(mk, 'personal'), negocio: summary(mk, 'negocio') },
    mes_anterior: { mes: pm, ...summary(pm) },
    suscripciones: S.subs.map(s => ({ nombre: s.name, importe: s.amount, periodo: s.cycle, proximo_cargo: s.next, ambito: s.scope, activa: s.active !== false })),
    coste_mensual_suscripciones: r2(subsMonthly()),
    negocio_trabajos: S.biz.map(b => ({ cliente: b.client, concepto: b.concept, importe: b.amount, estado: b.status, vence: b.due || undefined })),
    recordatorios_pendientes: S.rem.filter(r => !r.done).map(r => ({ que: r.title, cuando: r.due, repetir: r.repeat })),
    ultimos_movimientos: [...S.tx].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60).map(t => ({ fecha: t.date, tipo: t.type === 'in' ? 'ingreso' : 'gasto', importe: t.amount, categoria: t.cat, concepto: t.note, ambito: t.scope }))
  });
}
async function ask(text) {
  if (!text || ui.busy) return;
  if (!S.settings.apiKey) { toast('Añade tu API key en Ajustes'); return settingsSheet(); }
  S.chat.push({ role: 'user', content: text }); ui.busy = true; save(); render();
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': S.settings.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({
        model: S.settings.model || 'claude-sonnet-5-5', max_tokens: 1024,
        system: `Eres el asistente personal de la app "Vida" del usuario. Responde siempre en español, de forma breve, clara y útil, con importes en euros. Usa SOLO los datos de abajo para cifras concretas; si falta información, dilo y sugiere qué registrar. No inventes datos.\n\nDATOS ACTUALES (JSON):\n${context()}`,
        messages: S.chat.slice(-20).map(m => ({ role: m.role, content: m.content }))
      })
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error?.message || `Error ${res.status}`);
    S.chat.push({ role: 'assistant', content: j.content.filter(b => b.type === 'text').map(b => b.text).join('\n') || '…' });
  } catch (e) {
    S.chat.push({ role: 'assistant', content: `⚠️ No he podido responder: ${e.message}` });
  }
  ui.busy = false; save(); render();
}

// ---------- Eventos ----------
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const id = el.dataset.id, a = el.dataset.act;
  const byId = (arr) => arr.find(x => x.id === id);
  switch (a) {
    case 'tab': ui.tab = id; render(); break;
    case 'goto': { const [t, sub] = id.split(':'); ui.tab = t; if (sub) ui.money = sub; render(); break; }
    case 'seg': ui.money = id; render(); break;
    case 'scope': ui.scope = id; render(); break;
    case 'month': ui.month = shiftMonth(ui.month, +id); render(); break;
    case 'add-tx': txSheet(); break;
    case 'edit-tx': txSheet(byId(S.tx)); break;
    case 'add-sub': subSheet(); break;
    case 'edit-sub': subSheet(byId(S.subs)); break;
    case 'add-biz': bizSheet(); break;
    case 'edit-biz': bizSheet(byId(S.biz)); break;
    case 'add-rem': remSheet(); break;
    case 'edit-rem': remSheet(byId(S.rem)); break;
    case 'toggle-rem': {
      const r = byId(S.rem);
      if (r.repeat && r.repeat !== 'no' && !r.done && r.due) { r.due = addCycle(r.due.slice(0, 10), r.repeat) + r.due.slice(10); r.notified = false; toast('Reprogramado'); }
      else { r.done = !r.done; r.notified = r.done; }
      save(); render(); break;
    }
    case 'notif': Notification.requestPermission().then(() => render()); break;
    case 'settings': settingsSheet(); break;
    case 'send': { const q = $('#q'); const v = q.value.trim(); q.value = ''; ask(v); break; }
    case 'ask': ask(el.textContent); break;
    case 'clear-chat': if (confirm('¿Borrar la conversación?')) { S.chat = []; save(); render(); } break;
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'q') { e.preventDefault(); $('[data-act=send]').click(); } });

// Sugerencias rápidas en el chat (se añaden tras cada render de la pestaña IA)
const _render = render;
render = function () {
  _render();
  if (ui.tab === 'ia' && !S.chat.length) {
    const chat = document.querySelector('.chat');
    chat?.insertAdjacentHTML('beforebegin', `<div class="chips">${SUGGEST.map(s => `<button data-act="ask">${esc(s)}</button>`).join('')}</div>`);
  }
};

// ---------- Arranque ----------
rollSubs();
render();
checkDue();
setInterval(() => { rollSubs(); checkDue(); }, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { rollSubs(); checkDue(); render(); } });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
